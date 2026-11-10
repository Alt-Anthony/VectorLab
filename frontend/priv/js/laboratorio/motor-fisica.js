// Aquí está la física del laboratorio, hecha con la librería Matter.js.
// Cada pieza se vuelve un cuerpo con peso; las cuerdas y articulaciones los unen y Matter.js los mueve.
// Los engranajes no pasan por Matter.js: engranajes.js calcula cuánto gira cada uno y aquí solo se animan.
// Lo mismo el lanzador (proyectiles.js, tiro parabólico) y los circuitos (circuitos.js, ley de Ohm y Kirchhoff):
// aquí solo se avisa al editor para que los muestre. Las partículas en un campo magnético salen de cargas.js, y la
// polea con cuerda, el empuje del líquido, el resorte de tope y la velocidad inicial, de mecanismos.js.
// Usamos masa en kg, fuerza en N y g = 10 m/s², así un bloque de 1 kg pesa 10 N.

const GRAVEDAD_MATTER = 0.001;          // Matter.js usa su propia escala de gravedad
const NEWTON = GRAVEDAD_MATTER / 10;    // cuánto vale 1 N dentro de Matter.js
const PASO_MS = 1000 / 60;
const MAXIMO_POR_CUADRO_MS = 100;       // si pasa más tiempo entre dos cuadros (pestaña oculta), se toma solo esto
const RAD = Math.PI / 180;
const GROSOR_LIMITE = 60;

const LARGO_CUERDA = 80;
// Las cuerdas estiran un poquito: lo que cuelga baja, rebota y se queda quieto en 1,5 s más o menos.
// El resorte es más blando y casi no frena: lo que cuelga sube y baja un buen rato
const ELASTICIDAD = Object.freeze({
    cuerda: { stiffness: 0.01, damping: 0.01 },
    resorte: { stiffness: 0.004, damping: 0.001 }
});
const UNIONES_ELASTICAS = Object.keys(ELASTICIDAD);

const OPCIONES_FIJO = { isStatic: true, friction: 0.8 };
// Lo que queda quieto medio segundo "se duerme" (sleepThreshold, en cuadros): así un bloque en reposo sobre
// una rampa no se arrastra de a poquito, un defecto conocido de Matter.js. Un golpe lo vuelve a despertar.
// frictionAir: el aire casi no frena (Matter.js trae 0,01 por paso, que se come la velocidad)
const OPCIONES_MOVIL = { friction: 1, frictionStatic: 1, frictionAir: 0.001, sleepThreshold: 30 };  // el rozamiento lo pone la superficie (μ)
const OPCIONES_CARRITO = { friction: 0.002, frictionStatic: 0, frictionAir: 0.001, sleepThreshold: 30 };   // ruedas: casi sin rozamiento
const OPCIONES_PELOTA = { friction: 0.05, restitution: 0.7, frictionAir: 0.001, sleepThreshold: 30 };       // rebota
const RADIO_PELOTA = 15;
const LIMITE_RECORRIDO = 2000;          // puntos que se guardan del recorrido de cada proyectil

function rotarPunto({ x, y }, radianes) {
    const c = Math.cos(radianes);
    const s = Math.sin(radianes);
    return { x: x * c - y * s, y: x * s + y * c };
}

// Pasa un punto del dibujo de la pieza a su lugar real en el lienzo (si la pieza está en espejo, primero se voltea)
function aMundo(pieza, x, y) {
    const r = rotarPunto({ x: pieza.espejo ? -x : x, y }, pieza.rotacion * RAD);
    return { x: pieza.x + r.x, y: pieza.y + r.y };
}

const relativo = (cuerpo, punto) => ({ x: punto.x - cuerpo.position.x, y: punto.y - cuerpo.position.y });
const enMundo = (cuerpo, punto) => (cuerpo ? { x: cuerpo.position.x + punto.x, y: cuerpo.position.y + punto.y } : punto);

/* ---------- Cuerpos ---------- */

function rectangulo(pieza, cx, cy, ancho, alto, opciones) {
    const centro = aMundo(pieza, cx, cy);
    return Matter.Bodies.rectangle(centro.x, centro.y, ancho, alto, { ...opciones, angle: pieza.rotacion * RAD });
}

// Un cuerpo que se mueve pesa lo que dice su valor (en kg)
function conMasa(cuerpo, pieza) {
    Matter.Body.setMass(cuerpo, pieza.valor);
    return cuerpo;
}

const movil = (pieza, ancho, alto) => conMasa(rectangulo(pieza, 0, 0, ancho, alto, OPCIONES_MOVIL), pieza);

function trianguloFijo(pieza, puntos, opciones = OPCIONES_FIJO) {
    const vertices = puntos.map(([x, y]) => aMundo(pieza, x, y));
    const centro = Matter.Vertices.centre(vertices);
    const cuerpo = Matter.Bodies.fromVertices(centro.x, centro.y, [vertices], opciones);
    Matter.Body.set(cuerpo, 'friction', opciones.friction); // fromVertices no toma el rozamiento de las opciones
    return cuerpo;
}

// El piso y la rampa tienen rozamiento μ (su valor); lo que se apoya en ellos lo toma de ahí
const conRozamiento = (pieza) => ({ ...OPCIONES_FIJO, friction: Number.isFinite(pieza.valor) ? pieza.valor : OPCIONES_FIJO.friction });

const apoyo = (pieza) => trianguloFijo(pieza, [[0, -20], [18, 20], [-18, 20]]);

// El plano inclinado: un triángulo fijo cuya altura depende de su ángulo (pieza.angulo, en grados)
const rampa = (pieza) =>
    trianguloFijo(pieza, [[-BASE_RAMPA / 2, 0], [BASE_RAMPA / 2, -altoDeRampa(pieza.angulo)], [BASE_RAMPA / 2, 0]], conRozamiento(pieza));

// Qué cuerpo le toca a cada pieza; mide lo mismo que su dibujo en dibujo-piezas.js.
// Los engranajes no tienen cuerpo: no chocan, solo giran (engranajes.js)
const CONSTRUCTORES = Object.freeze({
    techo: (p) => rectangulo(p, 0, 4, 200, 8, OPCIONES_FIJO),
    piso: (p) => rectangulo(p, 0, -4, 200, 8, conRozamiento(p)),
    apoyo,
    rampa,
    pista: (p) => cuerpoDePista(p),            // mecanismos.js
    recipiente: (p) => cuerpoDeRecipiente(p),  // mecanismos.js
    polea: (p) => Matter.Bodies.circle(p.x, p.y, 20, OPCIONES_FIJO),
    edificio: (p) => rectangulo(p, 0, -p.largo / 2, 60, p.largo, OPCIONES_FIJO),
    barra: (p) => movil(p, 240, 12),
    bloque: (p) => movil(p, 40, 40),
    carrito: (p) => conMasa(rectangulo(p, 0, 1.5, 60, 31, OPCIONES_CARRITO), p),  // la caja y sus ruedas
    pelota: (p) => conMasa(Matter.Bodies.circle(p.x, p.y, RADIO_PELOTA, OPCIONES_PELOTA), p)
});

// El piso y dos paredes invisibles para que nada se salga del lienzo
function crearLimites(ancho, sueloY) {
    return [
        Matter.Bodies.rectangle(ancho / 2, sueloY + GROSOR_LIMITE / 2, ancho * 3, GROSOR_LIMITE, OPCIONES_FIJO),
        Matter.Bodies.rectangle(-GROSOR_LIMITE / 2, sueloY - 2000, GROSOR_LIMITE, 4000, OPCIONES_FIJO),
        Matter.Bodies.rectangle(ancho + GROSOR_LIMITE / 2, sueloY - 2000, GROSOR_LIMITE, 4000, OPCIONES_FIJO)
    ];
}

/* ---------- Uniones y fuerzas ---------- */

// Busca qué pieza está en ese punto (si hay una que se mueve y una fija, elige la que se mueve)
function cuerpoEn(cuerpos, puntos) {
    for (const punto of puntos) {
        const encontrados = Matter.Query.point(cuerpos, punto);
        if (encontrados.length > 0) return encontrados.find((c) => !c.isStatic) || encontrados[0];
    }
    return null;
}

// Busca a qué está atada una punta de la cuerda (-1 la de arriba, 1 la de abajo)
function extremoDeCuerda(pieza, signo, cuerpos) {
    const sondas = [44, 40, 36].map((d) => aMundo(pieza, 0, d * signo));
    const cuerpo = cuerpoEn(cuerpos, sondas);
    return cuerpo && { cuerpo, punto: aMundo(pieza, 0, 40 * signo) };
}

function crearCuerda(pieza, cuerpos) {
    const arriba = extremoDeCuerda(pieza, -1, cuerpos);
    const abajo = extremoDeCuerda(pieza, 1, cuerpos);
    // Un resorte con una sola punta atada hace de tope (mecanismos.js)
    if (pieza.tipo === 'resorte' && Boolean(arriba) !== Boolean(abajo)) return crearTope(pieza, arriba || abajo, arriba ? 1 : -1);
    if (!arriba || !abajo || arriba.cuerpo === abajo.cuerpo) return null; // una cuerda solo sirve si une dos cosas distintas
    return Matter.Constraint.create({
        bodyA: arriba.cuerpo,
        pointA: relativo(arriba.cuerpo, arriba.punto),
        bodyB: abajo.cuerpo,
        pointB: relativo(abajo.cuerpo, abajo.punto),
        length: LARGO_CUERDA,
        ...ELASTICIDAD[pieza.tipo]
    });
}

// La articulación es como un clavo: la pieza gira alrededor de ese punto, o dos piezas quedan unidas ahí
function crearArticulacion(pieza, cuerpos) {
    const punto = { x: pieza.x, y: pieza.y };
    const [a, b] = Matter.Query.point(cuerpos, punto).filter((c) => !c.isStatic);
    if (!a) return null;
    const otroExtremo = b ? { bodyB: b, pointB: relativo(b, punto) } : { pointB: punto };
    return Matter.Constraint.create({ bodyA: a, pointA: relativo(a, punto), ...otroExtremo, length: 0, stiffness: 1 });
}

// La flecha de fuerza empuja la pieza que toca con su cola (o con su punta)
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

// Revisa cada punta de cuerda, articulación y fuerza para saber si quedó unida a algo.
// Usa las mismas reglas que la simulación: si aquí sale verde, al simular de verdad está unida.
function detectarConexiones({ piezas, ancho, sueloY }) {
    const { soloCuerpos, todos } = construirCuerpos(piezas, ancho, sueloY);
    const moviles = soloCuerpos.filter((c) => !c.isStatic);
    // Donde se tocan dos engranajes que encajan
    const engranes = engranesDe(piezas).map(([a, b]) => ({ clave: `${a.id}~${b.id}`, ...puntoDeContacto(a, b), conectado: true }));
    const dePiezas = piezas.flatMap((pieza) => {
        if (pieza.tipo === 'motor') {
            const sobreUnEngranaje = engranajesDe(piezas).some((e) => compartenEje(e, pieza));
            return [{ clave: `${pieza.id}`, x: pieza.x, y: pieza.y, conectado: sobreUnEngranaje }];
        }
        if (UNIONES_ELASTICAS.includes(pieza.tipo)) {
            const atadas = [-1, 1].map((signo) => Boolean(extremoDeCuerda(pieza, signo, todos)));
            const esTope = pieza.tipo === 'resorte' && atadas.some(Boolean); // un resorte apoyado en una punta ya sirve
            return [-1, 1].map((signo, i) => ({ clave: `${pieza.id}:${signo}`, ...aMundo(pieza, 0, 40 * signo), conectado: atadas[i] || esTope }));
        }
        if (pieza.tipo === 'articulacion') {
            return [{ clave: `${pieza.id}`, x: pieza.x, y: pieza.y, conectado: Boolean(crearArticulacion(pieza, todos)) }];
        }
        if (pieza.tipo === 'polea_cuerda') {
            return [-1, 1].map((lado) => {
                const punta = aMundo(pieza, lado * RADIO_POLEA_CUERDA, pieza.largo);
                const atada = cuerpoEn(todos, [4, 0, -4].map((d) => aMundo(pieza, lado * RADIO_POLEA_CUERDA, pieza.largo + d)));
                return { clave: `${pieza.id}:${lado}`, ...punta, conectado: Boolean(atada) };
            });
        }
        if (pieza.tipo === 'fuerza' || pieza.tipo === 'velocidad') {
            const fuerza = crearFuerza(pieza, moviles);
            return [{ clave: `${pieza.id}`, ...aMundo(pieza, 0, fuerza ? fuerza.yLocal : 30), conectado: Boolean(fuerza) }];
        }
        return [];
    });
    return dePiezas.concat(engranes, puntosDeCircuito(piezas));
}

/* ---------- Simulación ---------- */

// En cada cuadro de la simulación, alDibujar mueve el dibujo de cada pieza a su nueva posición.
// alResolverCircuito recibe una vez la corriente de cada componente y alMoverProyectiles, en cada cuadro,
// dónde va cada proyectil, partícula o pelota y su recorrido; alMoverCuerdas, los tramos de las poleas con cuerda
// (los dibuja efectos-simulacion.js)
function crearSimulacion({ piezas, ancho, sueloY, alDibujar, alResolverCircuito = () => {}, alMoverProyectiles = () => {}, alMoverCuerdas = () => {} }) {
    const motor = Matter.Engine.create({ gravity: { x: 0, y: 1, scale: GRAVEDAD_MATTER }, enableSleeping: true });
    const { cuerpos, soloCuerpos, todos } = construirCuerpos(piezas, ancho, sueloY);
    const cuerdas = UNIONES_ELASTICAS.flatMap((tipo) => conDato(piezas, tipo, (p) => crearCuerda(p, todos)));
    const articulaciones = conDato(piezas, 'articulacion', (p) => crearArticulacion(p, todos));
    const fuerzas = conDato(piezas, 'fuerza', (p) => crearFuerza(p, soloCuerpos.filter((c) => !c.isStatic)));
    const giros = calcularGiros(piezas);
    const engranajes = piezas.filter((p) => giros.has(p.id));
    const lanzadores = piezas.filter((p) => p.tipo === 'lanzador' && p.valor > 0);
    const recorridos = new Map(lanzadores.map((l) => [l.id, { puntos: [], cayo: false }]));
    const moviles = soloCuerpos.filter((c) => !c.isStatic);
    const topes = cuerdas.map(({ dato }) => dato).filter((dato) => dato.placa);
    const poleas = conDato(piezas, 'polea_cuerda', (p) => crearPoleaConCuerda(p, todos)).map(({ dato }) => dato);
    const liquidos = piezas.filter((p) => p.tipo === 'recipiente').map(regionDeLiquido);
    const campos = piezas.filter((p) => p.tipo === 'campo').map(({ x, y, largo, valor }) => ({ x, y, largo, valor }));
    const particulas = piezas.filter((p) => (p.tipo === 'proton' || p.tipo === 'electron') && p.valor > 0)
        .map((pieza) => ({ pieza, estado: estadoDeParticula(pieza), recorrido: [] }));
    const pelotas = cuerpos.filter(({ pieza }) => pieza.tipo === 'pelota').map((c) => ({ ...c, recorrido: [] }));
    let segundos = 0;
    if (piezas.some(esDeCircuito)) alResolverCircuito(resolverCircuito(piezas));
    darVelocidadesIniciales(piezas, moviles);

    Matter.Composite.add(motor.world, [...todos, ...topes.map((t) => t.placa), ...cuerdas.map((c) => c.dato), ...articulaciones.map((a) => a.dato)]);

    const anotar = (recorrido, punto) => { if (recorrido.length < LIMITE_RECORRIDO) recorrido.push({ x: punto.x, y: punto.y }); };

    // Lo que se calcula en cada paso además de Matter.js: partículas en el campo y recorridos de las pelotas
    function avanzarExtras() {
        particulas.forEach((p) => {
            p.estado = pasoDeParticula(p.estado, campos, PASO_MS / 1000);
            anotar(p.recorrido, p.estado);
        });
        pelotas.forEach(({ cuerpo, recorrido }) => anotar(recorrido, cuerpo.position));
    }

    function moverProyectiles() {
        const deLanzadores = lanzadores.map((lanzador) => {
            const posicion = posicionDeProyectil(lanzador, segundos, sueloY);
            const recorrido = recorridos.get(lanzador.id);
            if (!recorrido.cayo && recorrido.puntos.length < LIMITE_RECORRIDO) recorrido.puntos.push({ x: posicion.x, y: posicion.y });
            recorrido.cayo = posicion.enElSuelo;
            return { id: lanzador.id, ...posicion, recorrido: recorrido.puntos };
        });
        const deParticulas = particulas.map(({ pieza, estado, recorrido }) => ({ id: pieza.id, x: estado.x, y: estado.y, recorrido, enElSuelo: false, clase: pieza.tipo }));
        const dePelotas = pelotas.map(({ pieza, cuerpo, recorrido }) => ({ id: pieza.id, x: cuerpo.position.x, y: cuerpo.position.y, recorrido, soloRecorrido: true }));
        const lista = deLanzadores.concat(deParticulas, dePelotas);
        if (lista.length > 0) alMoverProyectiles(lista);
    }

    function dibujar() {
        moverProyectiles();
        if (poleas.length > 0) alMoverCuerdas(tramosDeCuerda(poleas));
        engranajes.forEach((pieza) => alDibujar(pieza.id, pieza, pieza.rotacion + giros.get(pieza.id) * 360 * segundos));
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

    // La física avanza en pasos fijos de 1/60 s según el tiempo real que pasó, así va a la misma velocidad
    // en una pantalla de 60 Hz que en una de 120 Hz. Si la pestaña estuvo oculta, no se intenta recuperar todo.
    let idAnimacion = null;
    let anterior = null;
    let pendiente = 0;
    function paso(ahora) {
        const transcurrido = Number.isFinite(ahora) && anterior !== null ? Math.min(ahora - anterior, MAXIMO_POR_CUADRO_MS) : PASO_MS;
        anterior = Number.isFinite(ahora) ? ahora : null;
        pendiente += transcurrido;
        while (pendiente >= PASO_MS) {
            aplicarFuerzas(fuerzas);
            aplicarEmpuje(liquidos, moviles);
            Matter.Engine.update(motor, PASO_MS);
            mantenerTopesEnSuEje(topes);
            sostenerCuerdasDePolea(poleas);
            avanzarExtras();
            segundos += PASO_MS / 1000;
            pendiente -= PASO_MS;
        }
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
