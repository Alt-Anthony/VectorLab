// Simulación física del laboratorio con Matter.js (motor de física 2D).
// Convierte las piezas del editor en cuerpos rígidos, uniones (cuerdas, articulaciones) y fuerzas, y avanza el tiempo.
// Unidades: masa en kg, fuerza en N y g = 10 m/s² (un bloque de 1 kg pesa 10 N).

const GRAVEDAD_MATTER = 0.001;          // escala de gravedad de Matter
const NEWTON = GRAVEDAD_MATTER / 10;    // 1 N expresado en unidades de Matter
const PASO_MS = 1000 / 60;
const RAD = Math.PI / 180;
const GROSOR_LIMITE = 60;

const LARGO_CUERDA = 80;
// Cuerdas algo elásticas: al simular, lo colgado baja un poco, rebota y se asienta (~1,5 s)
const ELASTICIDAD_CUERDA = { stiffness: 0.01, damping: 0.01 };

const OPCIONES_FIJO = { isStatic: true, friction: 0.8 };
const OPCIONES_MOVIL = { friction: 0.8, frictionStatic: 1 };

function rotarPunto({ x, y }, radianes) {
    const c = Math.cos(radianes);
    const s = Math.sin(radianes);
    return { x: x * c - y * s, y: x * s + y * c };
}

// Punto (x, y) del dibujo de una pieza, llevado a coordenadas del lienzo
function aMundo(pieza, x, y) {
    const r = rotarPunto({ x, y }, pieza.rotacion * RAD);
    return { x: pieza.x + r.x, y: pieza.y + r.y };
}

const relativo = (cuerpo, punto) => ({ x: punto.x - cuerpo.position.x, y: punto.y - cuerpo.position.y });
const enMundo = (cuerpo, punto) => (cuerpo ? { x: cuerpo.position.x + punto.x, y: cuerpo.position.y + punto.y } : punto);

/* ---------- Cuerpos ---------- */

function rectangulo(pieza, cx, cy, ancho, alto, opciones) {
    const centro = aMundo(pieza, cx, cy);
    return Matter.Bodies.rectangle(centro.x, centro.y, ancho, alto, { ...opciones, angle: pieza.rotacion * RAD });
}

function movil(pieza, ancho, alto) {
    const cuerpo = rectangulo(pieza, 0, 0, ancho, alto, OPCIONES_MOVIL);
    Matter.Body.setMass(cuerpo, pieza.valor);
    return cuerpo;
}

function apoyo(pieza) {
    const vertices = [[0, -20], [18, 20], [-18, 20]].map(([x, y]) => aMundo(pieza, x, y));
    const centro = Matter.Vertices.centre(vertices);
    return Matter.Bodies.fromVertices(centro.x, centro.y, [vertices], OPCIONES_FIJO);
}

// Cómo se convierte cada tipo de pieza en un cuerpo (las medidas coinciden con su dibujo en piezas.js)
const CONSTRUCTORES = Object.freeze({
    techo: (p) => rectangulo(p, 0, 4, 200, 8, OPCIONES_FIJO),
    piso: (p) => rectangulo(p, 0, -4, 200, 8, OPCIONES_FIJO),
    apoyo,
    polea: (p) => Matter.Bodies.circle(p.x, p.y, 20, OPCIONES_FIJO),
    barra: (p) => movil(p, 240, 12),
    bloque: (p) => movil(p, 40, 40)
});

// Suelo a lo ancho del lienzo y paredes invisibles a los lados
function crearLimites(ancho, sueloY) {
    return [
        Matter.Bodies.rectangle(ancho / 2, sueloY + GROSOR_LIMITE / 2, ancho * 3, GROSOR_LIMITE, OPCIONES_FIJO),
        Matter.Bodies.rectangle(-GROSOR_LIMITE / 2, sueloY - 2000, GROSOR_LIMITE, 4000, OPCIONES_FIJO),
        Matter.Bodies.rectangle(ancho + GROSOR_LIMITE / 2, sueloY - 2000, GROSOR_LIMITE, 4000, OPCIONES_FIJO)
    ];
}

/* ---------- Uniones y fuerzas ---------- */

// Primer cuerpo que contiene alguno de los puntos (prefiere los móviles)
function cuerpoEn(cuerpos, puntos) {
    for (const punto of puntos) {
        const encontrados = Matter.Query.point(cuerpos, punto);
        if (encontrados.length > 0) return encontrados.find((c) => !c.isStatic) || encontrados[0];
    }
    return null;
}

// Extremo de una cuerda (signo -1: arriba, 1: abajo) y el cuerpo al que está atado
function extremoDeCuerda(pieza, signo, cuerpos) {
    const sondas = [44, 40, 36].map((d) => aMundo(pieza, 0, d * signo));
    const cuerpo = cuerpoEn(cuerpos, sondas);
    return cuerpo && { cuerpo, punto: aMundo(pieza, 0, 40 * signo) };
}

function crearCuerda(pieza, cuerpos) {
    const arriba = extremoDeCuerda(pieza, -1, cuerpos);
    const abajo = extremoDeCuerda(pieza, 1, cuerpos);
    if (!arriba || !abajo || arriba.cuerpo === abajo.cuerpo) return null; // solo funciona si ata dos cuerpos
    return Matter.Constraint.create({
        bodyA: arriba.cuerpo,
        pointA: relativo(arriba.cuerpo, arriba.punto),
        bodyB: abajo.cuerpo,
        pointB: relativo(abajo.cuerpo, abajo.punto),
        length: LARGO_CUERDA,
        ...ELASTICIDAD_CUERDA
    });
}

// Una articulación clava un cuerpo móvil a ese punto (gira alrededor) o une dos cuerpos móviles
function crearArticulacion(pieza, cuerpos) {
    const punto = { x: pieza.x, y: pieza.y };
    const [a, b] = Matter.Query.point(cuerpos, punto).filter((c) => !c.isStatic);
    if (!a) return null;
    const otroExtremo = b ? { bodyB: b, pointB: relativo(b, punto) } : { pointB: punto };
    return Matter.Constraint.create({ bodyA: a, pointA: relativo(a, punto), ...otroExtremo, length: 0, stiffness: 1 });
}

// Una fuerza actúa sobre el cuerpo que toca con su cola (o con su punta)
function crearFuerza(pieza, moviles) {
    for (const yLocal of [30, -30]) {
        const signo = Math.sign(yLocal);
        const cuerpo = cuerpoEn(moviles, [yLocal + 4 * signo, yLocal, yLocal - 4 * signo].map((y) => aMundo(pieza, 0, y)));
        if (cuerpo) {
            return {
                cuerpo,
                yLocal,
                puntoLocal: relativo(cuerpo, aMundo(pieza, 0, yLocal)),
                anguloInicial: cuerpo.angle,
                direccion: rotarPunto({ x: 0, y: -1 }, pieza.rotacion * RAD),
                magnitud: pieza.valor
            };
        }
    }
    return null;
}

const puntoDeFuerza = (f) => enMundo(f.cuerpo, rotarPunto(f.puntoLocal, f.cuerpo.angle - f.anguloInicial));

function aplicarFuerzas(fuerzas) {
    fuerzas.forEach(({ dato: f }) => {
        const vector = { x: f.direccion.x * f.magnitud * NEWTON, y: f.direccion.y * f.magnitud * NEWTON };
        Matter.Body.applyForce(f.cuerpo, puntoDeFuerza(f), vector);
    });
}

function conDato(piezas, tipo, crear) {
    return piezas
        .filter((p) => p.tipo === tipo)
        .map((pieza) => ({ pieza, dato: crear(pieza) }))
        .filter(({ dato }) => dato);
}

function construirCuerpos(piezas, ancho, sueloY) {
    const cuerpos = piezas.filter((p) => CONSTRUCTORES[p.tipo]).map((pieza) => ({ pieza, cuerpo: CONSTRUCTORES[pieza.tipo](pieza) }));
    const soloCuerpos = cuerpos.map(({ cuerpo }) => cuerpo);
    return { cuerpos, soloCuerpos, todos: [...soloCuerpos, ...crearLimites(ancho, sueloY)] };
}

/* ---------- Conexiones (para el editor) ---------- */

// Puntos de unión de cuerdas, articulaciones y fuerzas, y si cada uno quedó unido a algo.
// Usa las mismas reglas que la simulación: lo que sale "conectado" aquí es lo que funciona al simular.
function detectarConexiones({ piezas, ancho, sueloY }) {
    const { soloCuerpos, todos } = construirCuerpos(piezas, ancho, sueloY);
    const moviles = soloCuerpos.filter((c) => !c.isStatic);
    return piezas.flatMap((pieza) => {
        if (pieza.tipo === 'cuerda') {
            return [-1, 1].map((signo) => ({
                clave: `${pieza.id}:${signo}`,
                ...aMundo(pieza, 0, 40 * signo),
                conectado: Boolean(extremoDeCuerda(pieza, signo, todos))
            }));
        }
        if (pieza.tipo === 'articulacion') {
            return [{ clave: `${pieza.id}`, x: pieza.x, y: pieza.y, conectado: Boolean(crearArticulacion(pieza, todos)) }];
        }
        if (pieza.tipo === 'fuerza') {
            const fuerza = crearFuerza(pieza, moviles);
            return [{ clave: `${pieza.id}`, ...aMundo(pieza, 0, fuerza ? fuerza.yLocal : 30), conectado: Boolean(fuerza) }];
        }
        return [];
    });
}

/* ---------- Simulación ---------- */

// alDibujar(id, punto, grados, estiramiento) mueve el dibujo de una pieza en cada cuadro
function crearSimulacion({ piezas, ancho, sueloY, alDibujar }) {
    const motor = Matter.Engine.create({ gravity: { x: 0, y: 1, scale: GRAVEDAD_MATTER } });
    const { cuerpos, soloCuerpos, todos } = construirCuerpos(piezas, ancho, sueloY);
    const cuerdas = conDato(piezas, 'cuerda', (p) => crearCuerda(p, todos));
    const articulaciones = conDato(piezas, 'articulacion', (p) => crearArticulacion(p, todos));
    const fuerzas = conDato(piezas, 'fuerza', (p) => crearFuerza(p, soloCuerpos.filter((c) => !c.isStatic)));

    Matter.Composite.add(motor.world, [...todos, ...cuerdas.map((c) => c.dato), ...articulaciones.map((a) => a.dato)]);

    function dibujar() {
        cuerpos.forEach(({ pieza, cuerpo }) => {
            if (!cuerpo.isStatic) alDibujar(pieza.id, cuerpo.position, cuerpo.angle / RAD);
        });
        cuerdas.forEach(({ pieza, dato: r }) => {
            const a = enMundo(r.bodyA, r.pointA);
            const b = enMundo(r.bodyB, r.pointB);
            const centro = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
            const estiramiento = Math.hypot(b.x - a.x, b.y - a.y) / LARGO_CUERDA;
            alDibujar(pieza.id, centro, Math.atan2(b.y - a.y, b.x - a.x) / RAD - 90, estiramiento);
        });
        articulaciones.forEach(({ pieza, dato: r }) => alDibujar(pieza.id, enMundo(r.bodyA, r.pointA), pieza.rotacion));
        fuerzas.forEach(({ pieza, dato: f }) => {
            const aplicacion = puntoDeFuerza(f);
            const desfase = rotarPunto({ x: 0, y: f.yLocal }, pieza.rotacion * RAD);
            alDibujar(pieza.id, { x: aplicacion.x - desfase.x, y: aplicacion.y - desfase.y }, pieza.rotacion);
        });
    }

    let idAnimacion = null;
    function paso() {
        aplicarFuerzas(fuerzas);
        Matter.Engine.update(motor, PASO_MS);
        dibujar();
        idAnimacion = requestAnimationFrame(paso);
    }
    idAnimacion = requestAnimationFrame(paso);

    return {
        detener() {
            cancelAnimationFrame(idAnimacion);
            Matter.Composite.clear(motor.world, false);
            Matter.Engine.clear(motor);
        }
    };
}
