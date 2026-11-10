// Mecanismos del laboratorio que Matter.js no trae hechos:
//   · Resorte de tope: un resorte con una punta libre. En esa punta va una placa liviana que solo se mueve a lo
//     largo del resorte: lo que cae sobre ella comprime el resorte y rebota.
//   · Polea con cuerda (máquina de Atwood): la cuerda pasa por la polea y su largo total no cambia, así que si un
//     lado baja, el otro sube lo mismo (con a = g·(m1 − m2)/(m1 + m2) si cuelgan libres).
//   · Recipiente con líquido: empuje de Arquímedes, E = ρ·g·V sumergido, y algo de freno dentro del líquido.
//   · Velocidad inicial: la flecha de velocidad le da su rapidez al cuerpo que toca, al empezar.
//   · La pista curva y el recipiente son cuerpos fijos hechos de varias partes.
// Usa de motor-fisica.js: aMundo, rotarPunto, relativo, enMundo, cuerpoEn, rectangulo, crearFuerza, OPCIONES_FIJO,
// RAD, LARGO_CUERDA, GRAVEDAD_MATTER y PASO_MS; de dibujo-piezas.js, las medidas de las piezas.

const ELASTICIDAD_TOPE = { stiffness: 0.08, damping: 0.002 };
const MASA_PLACA = 0.05;
const PX_POR_METRO_MATTER = 100;   // con g = 10 m/s² y la gravedad de Matter.js, 1 m son 100 px
const DENSIDAD_AGUA = 1 / 1000;    // kg por px²: un líquido de 1 g/cm³
const FRENO_EN_LIQUIDO = 0.97;     // lo que conserva de su velocidad, en cada paso, algo que está sumergido
const PARTES_PISTA = 18;
const GROSOR_PISTA = 10;
const ROZAMIENTO_PISTA = 0.02;     // la pista es lisa, para ver cómo se conserva la energía

const unidad = ({ x, y }) => {
    const largo = Math.hypot(x, y) || 1;
    return { x: x / largo, y: y / largo };
};

/* ---------- Resorte de tope ---------- */

// apoyo: la punta que sí está atada ({ cuerpo, punto }); signoLibre: -1 si la punta libre es la de arriba, 1 si es la de abajo
function crearTope(pieza, apoyo, signoLibre) {
    const libre = aMundo(pieza, 0, 40 * signoLibre);
    const placa = Matter.Bodies.rectangle(libre.x, libre.y, 26, 6, { angle: pieza.rotacion * RAD, inertia: Infinity, friction: 1 });
    Matter.Body.setMass(placa, MASA_PLACA);
    const resorte = Matter.Constraint.create({
        bodyA: apoyo.cuerpo,
        pointA: relativo(apoyo.cuerpo, apoyo.punto),
        bodyB: placa,
        pointB: { x: 0, y: 0 },
        length: LARGO_CUERDA,
        ...ELASTICIDAD_TOPE
    });
    const eje = apoyo.cuerpo.isStatic ? { origen: apoyo.punto, direccion: unidad({ x: libre.x - apoyo.punto.x, y: libre.y - apoyo.punto.y }) } : null;
    return Object.assign(resorte, { placa, eje });
}

// La placa de un tope apoyado en algo fijo solo se mueve a lo largo del resorte
function mantenerTopesEnSuEje(topes) {
    topes.forEach(({ placa, eje }) => {
        if (!eje) return;
        const { origen, direccion } = eje;
        const avance = (placa.position.x - origen.x) * direccion.x + (placa.position.y - origen.y) * direccion.y;
        Matter.Body.setPosition(placa, { x: origen.x + direccion.x * avance, y: origen.y + direccion.y * avance });
        const rapidez = placa.velocity.x * direccion.x + placa.velocity.y * direccion.y;
        Matter.Body.setVelocity(placa, { x: direccion.x * rapidez, y: direccion.y * rapidez });
    });
}

/* ---------- Polea con cuerda ---------- */

const puntaDeCuerda = (lado) => enMundo(lado.cuerpo, rotarPunto(lado.local, lado.cuerpo.angle - lado.anguloInicial));

// Cada lado de la cuerda baja desde la polea (a RADIO_POLEA_CUERDA del centro) hasta lo que cuelga en su punta
function crearPoleaConCuerda(pieza, cuerpos) {
    const lados = [-1, 1].map((lado) => {
        const x = lado * RADIO_POLEA_CUERDA;
        const cuerpo = cuerpoEn(cuerpos, [4, 0, -4].map((d) => aMundo(pieza, x, pieza.largo + d)));
        if (!cuerpo) return null;
        return { cuerpo, tangente: aMundo(pieza, x, 0), local: relativo(cuerpo, aMundo(pieza, x, pieza.largo)), anguloInicial: cuerpo.angle };
    });
    if (lados.some((lado) => !lado) || lados[0].cuerpo === lados[1].cuerpo) return null;
    const largoTotal = lados.reduce((suma, lado) => suma + Math.hypot(lado.tangente.x - puntaDeCuerda(lado).x, lado.tangente.y - puntaDeCuerda(lado).y), 0);
    return { lados, largoTotal };
}

// Después de cada paso: si la cuerda quedó más larga de lo que es, se acortan los dos lados (cada cuerpo se mueve
// según su masa) y se quita la velocidad que la estiraría. Así el pesado baja y el liviano sube lo mismo.
function sostenerCuerdasDePolea(poleas) {
    poleas.forEach(({ lados, largoTotal }) => {
        const datos = lados.map((lado) => {
            const punta = puntaDeCuerda(lado);
            const hacia = { x: lado.tangente.x - punta.x, y: lado.tangente.y - punta.y };
            return { cuerpo: lado.cuerpo, largo: Math.hypot(hacia.x, hacia.y), u: unidad(hacia), w: lado.cuerpo.isStatic ? 0 : 1 / lado.cuerpo.mass };
        });
        const pesoTotal = datos[0].w + datos[1].w;
        if (pesoTotal === 0) return;
        const exceso = datos[0].largo + datos[1].largo - largoTotal;
        if (exceso > 0) {
            datos.filter(({ w }) => w > 0).forEach(({ cuerpo, u, w }) => {
                Matter.Body.setPosition(cuerpo, { x: cuerpo.position.x + (u.x * w * exceso) / pesoTotal, y: cuerpo.position.y + (u.y * w * exceso) / pesoTotal });
            });
        }
        const seEstira = -datos.reduce((suma, { cuerpo, u }) => suma + cuerpo.velocity.x * u.x + cuerpo.velocity.y * u.y, 0);
        if (exceso > -0.5 && seEstira > 0) {
            datos.filter(({ w }) => w > 0).forEach(({ cuerpo, u, w }) => {
                Matter.Body.setVelocity(cuerpo, { x: cuerpo.velocity.x + (u.x * w * seEstira) / pesoTotal, y: cuerpo.velocity.y + (u.y * w * seEstira) / pesoTotal });
            });
        }
    });
}

// Los tramos de cuerda que hay que dibujar (de la polea a lo que cuelga)
const tramosDeCuerda = (poleas) => poleas.flatMap(({ lados }) => lados.map((lado) => ({ desde: lado.tangente, hasta: puntaDeCuerda(lado) })));

/* ---------- Recipiente con líquido ---------- */

function regionDeLiquido(pieza) {
    const mitad = pieza.largo / 2;
    return {
        izquierda: pieza.x - mitad + GROSOR_PARED,
        derecha: pieza.x + mitad - GROSOR_PARED,
        superficie: pieza.y - ALTO_RECIPIENTE * NIVEL_LIQUIDO,
        fondo: pieza.y - GROSOR_PARED,
        densidad: (pieza.valor > 0 ? pieza.valor : 1) * DENSIDAD_AGUA
    };
}

// Empuje = densidad del líquido × parte sumergida × g (la parte sumergida se calcula con la caja que rodea al cuerpo)
function aplicarEmpuje(liquidos, moviles) {
    moviles.forEach((cuerpo) => {
        const { min, max } = cuerpo.bounds;
        const areaCaja = (max.x - min.x) * (max.y - min.y);
        liquidos.forEach((liquido) => {
            const ancho = Math.min(liquido.derecha, max.x) - Math.max(liquido.izquierda, min.x);
            const alto = Math.min(liquido.fondo, max.y) - Math.max(liquido.superficie, min.y);
            if (ancho <= 0 || alto <= 0 || areaCaja <= 0) return;
            const sumergida = (cuerpo.area * ancho * alto) / areaCaja;
            Matter.Body.applyForce(cuerpo, cuerpo.position, { x: 0, y: -liquido.densidad * sumergida * GRAVEDAD_MATTER });
            Matter.Body.setVelocity(cuerpo, { x: cuerpo.velocity.x * FRENO_EN_LIQUIDO, y: cuerpo.velocity.y * FRENO_EN_LIQUIDO });
        });
    });
}

/* ---------- Velocidad inicial ---------- */

// Con la misma regla que la flecha de fuerza: la flecha de velocidad actúa sobre lo que toca con su cola (o su punta)
function darVelocidadesIniciales(piezas, moviles) {
    piezas.filter((p) => p.tipo === 'velocidad' && p.valor > 0).forEach((pieza) => {
        const flecha = crearFuerza(pieza, moviles);
        if (!flecha) return;
        const rapidez = pieza.valor * PX_POR_METRO_MATTER * (PASO_MS / 1000); // Matter.js mide la velocidad en px por paso
        Matter.Body.setVelocity(flecha.cuerpo, { x: flecha.direccion.x * rapidez, y: flecha.direccion.y * rapidez });
    });
}

/* ---------- Cuerpos fijos de varias partes ---------- */

function cuerpoDeRecipiente(pieza) {
    const mitad = pieza.largo / 2;
    const pared = (cx, cy, ancho, alto) => rectangulo(pieza, cx, cy, ancho, alto, OPCIONES_FIJO);
    return Matter.Body.create({
        parts: [
            pared(-mitad + GROSOR_PARED / 2, -ALTO_RECIPIENTE / 2, GROSOR_PARED, ALTO_RECIPIENTE),
            pared(mitad - GROSOR_PARED / 2, -ALTO_RECIPIENTE / 2, GROSOR_PARED, ALTO_RECIPIENTE),
            pared(0, -GROSOR_PARED / 2, pieza.largo, GROSOR_PARED)
        ],
        isStatic: true
    });
}

// La pista es un cuarto de circunferencia (centro en (0, −R) del dibujo) hecho con tramos rectos cortitos
function cuerpoDePista(pieza) {
    const radio = pieza.largo;
    const centro = { x: 0, y: -radio };
    const puntos = Array.from({ length: PARTES_PISTA + 1 }, (_, i) => {
        const angulo = Math.PI - (i * Math.PI) / 2 / PARTES_PISTA;
        return { x: centro.x + radio * Math.cos(angulo), y: centro.y + radio * Math.sin(angulo) };
    });
    const partes = puntos.slice(1).map((b, i) => {
        const a = puntos[i];
        const medio = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const afuera = unidad({ x: medio.x - centro.x, y: medio.y - centro.y });
        const enLienzo = aMundo(pieza, medio.x + (afuera.x * GROSOR_PISTA) / 2, medio.y + (afuera.y * GROSOR_PISTA) / 2);
        const [mundoA, mundoB] = [aMundo(pieza, a.x, a.y), aMundo(pieza, b.x, b.y)];
        return Matter.Bodies.rectangle(enLienzo.x, enLienzo.y, Math.hypot(b.x - a.x, b.y - a.y) + 2, GROSOR_PISTA, {
            ...OPCIONES_FIJO,
            friction: ROZAMIENTO_PISTA,
            angle: Math.atan2(mundoB.y - mundoA.y, mundoB.x - mundoA.x)
        });
    });
    return Matter.Body.create({ parts: partes, isStatic: true });
}
