// Pruebas del laboratorio de física: unidades, escenas guardadas, conexiones, física y piezas.
// Carga los scripts del laboratorio igual que el navegador (ver cargarFisica en ayuda.js).

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { cargarFisica, leerEscenas } = require('./ayuda');

const ANCHO = 1700;
const SUELO_Y = 800;

const casi = (real, esperado, tolerancia, mensaje) => assert.ok(Math.abs(real - esperado) <= tolerancia, `${mensaje}: ${real} ≠ ${esperado}`);
const conIds = (lista) => lista.map((p, i) => ({ id: i + 1, rotacion: 0, valor: null, texto: null, largo: null, angulo: null, espejo: false, ...p }));

function simular(lab, piezas, cuadros, extra = {}) {
    const ultimas = {};
    const simulacion = lab.crearSimulacion({
        piezas,
        ancho: ANCHO,
        sueloY: SUELO_Y,
        alDibujar: (id, punto, grados) => { ultimas[id] = { x: punto.x, y: punto.y, grados }; },
        ...extra
    });
    lab.avanzar(cuadros);
    simulacion.detener();
    return ultimas;
}

const lab = cargarFisica();
const escenas = leerEscenas('bd/04_escenas.sql');
const pregunta1 = escenas.find((e) => e.codigo === 32405);

test('las unidades muestran la masa interna (kg) como N, kg o kgf', () => {
    const masa = 2;
    assert.equal(masa * lab.UNIDADES.N.masa.factor, 20);
    assert.equal(masa * lab.UNIDADES.kg.masa.factor, 2);
    assert.equal(masa * lab.UNIDADES.kgf.masa.factor, 2);
    assert.equal(30 * lab.UNIDADES.kgf.fuerza.factor, 3);
});

test('cada escena guardada es válida y sus pasos solo resaltan piezas que existen', () => {
    assert.ok(escenas.length > 0, 'no se encontró ninguna escena en 04_escenas.sql');
    escenas.forEach(({ codigo, escena, pasos }) => {
        assert.ok(lab.UNIDADES[escena.unidad], `pregunta ${codigo}: unidad desconocida`);
        escena.piezas.forEach((p) => assert.ok(lab.PIEZAS[p.tipo], `pregunta ${codigo}: pieza desconocida ${p.tipo}`));
        const refs = new Set(escena.piezas.map((p) => p.ref).filter(Boolean));
        pasos.forEach((paso, i) => {
            assert.equal(typeof paso.titulo, 'string', `pregunta ${codigo}, paso ${i + 1}: falta el título`);
            (paso.resaltar || []).forEach((ref) => assert.ok(refs.has(ref), `pregunta ${codigo}, paso ${i + 1}: no existe "${ref}"`));
            (paso.formulas || []).forEach((f) => assert.equal(typeof f, 'string'));
        });
    });
});

test('en la pregunta 1 los seis extremos de cuerda quedan unidos', () => {
    const puntos = lab.detectarConexiones({ piezas: conIds(pregunta1.escena.piezas), ancho: ANCHO, sueloY: SUELO_Y });
    const cuerdas = puntos.filter((p) => p.clave.includes(':'));
    assert.equal(cuerdas.length, 6);
    assert.ok(cuerdas.every((p) => p.conectado));
});

test('una cuerda que no toca nada queda suelta en sus dos extremos', () => {
    const puntos = lab.detectarConexiones({ piezas: conIds([{ tipo: 'cuerda', x: 300, y: 300 }]), ancho: ANCHO, sueloY: SUELO_Y });
    assert.deepEqual(puntos.map((p) => p.conectado), [false, false]);
});

test('la varilla de la pregunta 1 queda en equilibrio al simular', () => {
    const piezas = conIds(pregunta1.escena.piezas);
    const barra = piezas.find((p) => p.ref === 'barra');
    const final = simular(lab, piezas, 300)[barra.id];
    assert.ok(Math.abs(final.grados) < 1, `la varilla giró ${final.grados}°`);
    assert.ok(Math.abs(final.y - barra.y) < 10, `la varilla bajó ${final.y - barra.y} px`);
});

test('una palanca con un bloque pesado en un extremo se inclina', () => {
    const piezas = conIds([
        { tipo: 'apoyo', x: 500, y: 560 },
        { tipo: 'barra', x: 500, y: 534, valor: 1 },
        { tipo: 'bloque', x: 600, y: 508, valor: 10 }
    ]);
    const final = simular(lab, piezas, 240)[2];
    assert.ok(Math.abs(final.grados) > 10, `la palanca solo giró ${final.grados}°`);
});

test('un bloque suelto cae hasta el suelo', () => {
    const final = simular(lab, conIds([{ tipo: 'bloque', x: 200, y: 100, valor: 1 }]), 240)[1];
    assert.ok(Math.abs(final.y - (SUELO_Y - 20)) < 2, `el bloque quedó en y = ${final.y}`);
});

/* ---------- Plano inclinado (rampa) ---------- */

// Un bloque apoyado al medio de una rampa puesta en el suelo. La rampa sube hacia la derecha (o hacia la
// izquierda si está en espejo); su ángulo va en "angulo" y su rozamiento μ en "valor"
function bloqueSobreRampa(angulo, rozamiento = 0.6, espejo = false) {
    const rad = (angulo * Math.PI) / 180;
    const lado = espejo ? -1 : 1;
    const sobreElPlano = { x: 500, y: SUELO_Y - lab.altoDeRampa(angulo) / 2 };
    const haciaAfuera = { x: -Math.sin(rad) * lado, y: -Math.cos(rad) };
    return conIds([
        { tipo: 'rampa', x: 500, y: SUELO_Y, angulo, valor: rozamiento, espejo },
        { tipo: 'bloque', x: sobreElPlano.x + haciaAfuera.x * 21, y: sobreElPlano.y + haciaAfuera.y * 21, rotacion: -angulo * lado, valor: 2 }
    ]);
}

test('un bloque se queda quieto sobre una rampa de 30° porque el rozamiento lo sostiene', () => {
    const piezas = bloqueSobreRampa(30);
    const final = simular(lab, piezas, 180)[2];
    const movido = Math.hypot(final.x - piezas[1].x, final.y - piezas[1].y);
    assert.ok(movido < 6, `el bloque se movió ${movido.toFixed(1)} px`);
});

test('en una rampa de 60° el bloque resbala hacia abajo', () => {
    const piezas = bloqueSobreRampa(60);
    const final = simular(lab, piezas, 180)[2];
    assert.ok(final.x < piezas[1].x - 40, `el bloque solo llegó a x = ${final.x.toFixed(1)}`);
});

/* ---------- Engranajes ---------- */

// Cuatro engranajes en fila, como en la pregunta de rotación: 10, 30, 15 y 45 dientes (radio = 2 px por diente),
// con el motor en el de 45 dientes
const TREN = conIds([
    { tipo: 'engranaje', x: 200, y: 300, valor: 10 },
    { tipo: 'engranaje', x: 280, y: 300, valor: 30 },
    { tipo: 'engranaje', x: 370, y: 300, valor: 15 },
    { tipo: 'engranaje', x: 490, y: 300, valor: 45 },
    { tipo: 'motor', x: 490, y: 300 }
]);

test('en un tren de engranajes cada uno gira al revés del anterior y el de menos dientes gira más rápido', () => {
    const giros = lab.calcularGiros(TREN);
    const [g10, g30, g15, g45] = [1, 2, 3, 4].map((id) => giros.get(id));
    casi(g45, lab.VUELTAS_POR_SEGUNDO, 1e-9, 'el del motor gira a la velocidad del motor');
    casi(Math.abs(g10 / g45), 4.5, 1e-9, 'si el de 45 dientes da 16 vueltas, el de 10 da 72');
    assert.ok(g45 > 0 && g15 < 0 && g30 > 0 && g10 < 0, 'los sentidos se alternan');
});

test('dos engranajes en el mismo eje giran juntos', () => {
    const giros = lab.calcularGiros(conIds([
        { tipo: 'engranaje', x: 100, y: 100, valor: 20 },
        { tipo: 'engranaje', x: 100, y: 100, valor: 50 }
    ]));
    assert.equal(giros.get(1), giros.get(2));
});

test('los engranajes que se tocan quedan conectados y el motor se une al engranaje de su eje', () => {
    const puntos = lab.detectarConexiones({ piezas: TREN, ancho: ANCHO, sueloY: SUELO_Y });
    assert.equal(puntos.filter((p) => p.clave.includes('~') && p.conectado).length, 3);
    assert.ok(puntos.find((p) => p.clave === '5').conectado, 'el motor está sobre el engranaje de 45 dientes');
    const suelto = lab.detectarConexiones({ piezas: conIds([{ tipo: 'motor', x: 50, y: 50 }]), ancho: ANCHO, sueloY: SUELO_Y });
    assert.equal(suelto[0].conectado, false, 'un motor sin engranaje queda suelto');
});

test('al simular un segundo, cada engranaje gira lo que le toca', () => {
    const final = simular(lab, TREN, 60); // 60 cuadros = 1 segundo
    casi(final[4].grados, 360 * lab.VUELTAS_POR_SEGUNDO, 1, 'engranaje de 45 dientes');
    casi(final[1].grados, -360 * lab.VUELTAS_POR_SEGUNDO * 4.5, 3, 'engranaje de 10 dientes');
});

test('la rampa y el engranaje se dibujan bien con cualquier valor permitido', () => {
    ['rampa', 'engranaje'].forEach((tipo) => {
        const { min, max } = lab.VALORES[tipo];
        [min, (min + max) / 2, max].forEach((valor) => {
            const { svg, zona } = lab.dibujoDe({ tipo, valor: Math.round(valor), angulo: 30 });
            assert.ok(!/NaN|undefined/.test(svg), `${tipo} con ${valor}`);
            assert.ok(zona.every(Number.isFinite), `${tipo} con ${valor}: zona`);
        });
    });
});

/* ---------- Resorte, carrito, pelota y edificio ---------- */

test('un bloque colgado de un resorte sube y baja sin soltarse', () => {
    const piezas = conIds([
        { tipo: 'techo', x: 400, y: 100 },
        { tipo: 'resorte', x: 400, y: 148 },
        { tipo: 'bloque', x: 400, y: 208, valor: 2 }
    ]);
    const puntos = lab.detectarConexiones({ piezas, ancho: ANCHO, sueloY: SUELO_Y });
    assert.ok(puntos.filter((p) => p.clave.startsWith('2:')).every((p) => p.conectado), 'las dos puntas del resorte quedan unidas');
    const alturas = [];
    const simulacion = lab.crearSimulacion({ piezas, ancho: ANCHO, sueloY: SUELO_Y, alDibujar: (id, punto) => { if (id === 3) alturas.push(punto.y); } });
    lab.avanzar(240);
    simulacion.detener();
    assert.ok(Math.max(...alturas) - Math.min(...alturas) > 10, 'el bloque oscila');
    assert.ok(alturas.at(-1) < SUELO_Y - 200, 'el resorte lo sigue sosteniendo');
});

test('el carrito casi no tiene rozamiento: baja por una rampa de 30° donde un bloque se queda quieto', () => {
    const rad = Math.PI / 6;
    const sobreElPlano = { x: 500, y: SUELO_Y - lab.altoDeRampa(30) / 2 };
    const carrito = { tipo: 'carrito', x: sobreElPlano.x - Math.sin(rad) * 18, y: sobreElPlano.y - Math.cos(rad) * 18, rotacion: -30, valor: 2 };
    const piezas = conIds([{ tipo: 'rampa', x: 500, y: SUELO_Y, angulo: 30, valor: 0.6 }, carrito]);
    const final = simular(lab, piezas, 90)[2];
    assert.ok(final.x < carrito.x - 40, `el carrito solo llegó a x = ${final.x.toFixed(1)}`);
});

test('la pelota rebota al caer al suelo', () => {
    const alturas = [];
    const piezas = conIds([{ tipo: 'pelota', x: 300, y: 300, valor: 1 }]);
    const simulacion = lab.crearSimulacion({ piezas, ancho: ANCHO, sueloY: SUELO_Y, alDibujar: (id, punto) => alturas.push(punto.y) });
    lab.avanzar(180);
    simulacion.detener();
    const enElSuelo = SUELO_Y - 15; // el centro de la pelota cuando toca el suelo
    const primerToque = alturas.findIndex((y) => y >= enElSuelo - 2);
    assert.ok(primerToque > 0, 'llega al suelo');
    assert.ok(Math.min(...alturas.slice(primerToque)) < enElSuelo - 50, 'después de tocar el suelo vuelve a subir');
});

test('un bloque se queda encima del edificio', () => {
    const piezas = conIds([
        { tipo: 'edificio', x: 600, y: SUELO_Y, largo: 200 },
        { tipo: 'bloque', x: 600, y: SUELO_Y - 220, valor: 2 }
    ]);
    const final = simular(lab, piezas, 120)[2];
    assert.ok(Math.abs(final.y - (SUELO_Y - 220)) < 3, `el bloque quedó en y = ${final.y.toFixed(1)}`);
});

/* ---------- Lanzador de proyectiles ---------- */

const PX_POR_METRO = 10;

test('un lanzamiento horizontal desde 20 m a 25 m/s cae a los 2 s y a 50 m (pregunta de tiro parabólico)', () => {
    const lanzador = { x: 100, y: SUELO_Y - 20 * PX_POR_METRO, valor: 25, angulo: 0 };
    const final = lab.posicionDeProyectil(lanzador, 5, SUELO_Y);
    assert.ok(final.enElSuelo);
    casi(final.tiempo, 2, 1e-9, 'tiempo de vuelo');
    casi(final.alcance, 50, 1e-9, 'alcance');
    casi(final.x, 100 + 50 * PX_POR_METRO, 1e-6, 'x en el lienzo');
    casi(final.y, SUELO_Y, 1e-6, 'y en el lienzo');
});

test('un lanzamiento a 45° desde el suelo llega a v²/g', () => {
    const final = lab.posicionDeProyectil({ x: 0, y: SUELO_Y, valor: 20, angulo: 45 }, 10, SUELO_Y);
    casi(final.alcance, 40, 1e-9, 'alcance');
    casi(final.tiempo, (2 * 20 * Math.SQRT1_2) / 10, 1e-9, 'tiempo de vuelo');
    const enElAire = lab.posicionDeProyectil({ x: 0, y: SUELO_Y, valor: 20, angulo: 45 }, 1, SUELO_Y);
    assert.ok(!enElAire.enElSuelo && enElAire.y < SUELO_Y, 'al segundo todavía está en el aire');
});

test('al simular, el lanzador avisa dónde va el proyectil y su recorrido', () => {
    let ultimo = null;
    const piezas = conIds([{ tipo: 'lanzador', x: 100, y: SUELO_Y - 200, valor: 25, angulo: 0 }]);
    simular(lab, piezas, 150, { alMoverProyectiles: (lista) => { ultimo = lista[0]; } });
    assert.ok(ultimo.enElSuelo, 'a los 2,5 s ya cayó');
    casi(ultimo.alcance, 50, 1e-6, 'alcance');
    assert.ok(ultimo.recorrido.length > 10, 'guarda el recorrido para dibujar la parábola');
});

/* ---------- Dibujo de las piezas nuevas ---------- */

test('cada pieza se dibuja sin números rotos, también giradas', () => {
    Object.keys(lab.PIEZAS).forEach((tipo) => {
        const definicion = lab.PIEZAS[tipo];
        [0, 90].forEach((rotacion) => {
            const pieza = { tipo, rotacion, valor: lab.VALORES[tipo]?.inicial ?? null, largo: definicion.largoInicial ?? null,
                angulo: definicion.anguloInicial ?? null, texto: definicion.textoInicial ?? null, espejo: rotacion === 90 };
            const { svg, zona } = lab.dibujoDe(pieza);
            assert.ok(!/NaN|undefined/.test(svg), `${tipo} girado ${rotacion}°`);
            assert.ok(zona.every(Number.isFinite), `${tipo}: zona`);
        });
    });
});

/* ---------- Rozamiento, espejo, tope, poleas, líquidos, discos, velocidad y cargas ---------- */

test('con rozamiento 0 el bloque resbala aunque la rampa sea de 30°', () => {
    const piezas = bloqueSobreRampa(30, 0);
    const final = simular(lab, piezas, 120)[2];
    assert.ok(final.x < piezas[1].x - 40, `el bloque solo llegó a x = ${final.x.toFixed(1)}`);
});

test('una rampa en espejo sube hacia la izquierda: el bloque resbala hacia la derecha', () => {
    const piezas = bloqueSobreRampa(30, 0, true);
    const final = simular(lab, piezas, 120)[2];
    assert.ok(final.x > piezas[1].x + 40, `el bloque solo llegó a x = ${final.x.toFixed(1)}`);
});

test('un resorte con una punta libre hace de tope: el bloque que cae rebota antes de tocar el piso', () => {
    const piezas = conIds([
        { tipo: 'piso', x: 400, y: 700, valor: 0.5 },
        { tipo: 'resorte', x: 400, y: 652 },
        { tipo: 'bloque', x: 400, y: 450, valor: 1 }
    ]);
    const alturas = [];
    const simulacion = lab.crearSimulacion({ piezas, ancho: ANCHO, sueloY: SUELO_Y, alDibujar: (id, punto) => { if (id === 3) alturas.push(punto.y); } });
    lab.avanzar(150);
    simulacion.detener();
    const masBajo = Math.max(...alturas);
    assert.ok(masBajo < 650, `el bloque llegó hasta y = ${masBajo.toFixed(1)} (sin resorte llegaría a 672)`);
    assert.ok(Math.min(...alturas.slice(alturas.indexOf(masBajo))) < masBajo - 20, 'después de comprimir el resorte vuelve a subir');
    const puntos = lab.detectarConexiones({ piezas, ancho: ANCHO, sueloY: SUELO_Y });
    assert.ok(puntos.filter((p) => p.clave.startsWith('2:')).every((p) => p.conectado), 'un tope con una punta apoyada cuenta como conectado');
});

test('en la máquina de Atwood el bloque más pesado baja y el liviano sube lo mismo', () => {
    const piezas = conIds([
        { tipo: 'polea_cuerda', x: 400, y: 200, largo: 120 },
        { tipo: 'bloque', x: 370, y: 340, valor: 2 },
        { tipo: 'bloque', x: 430, y: 340, valor: 1 }
    ]);
    const final = simular(lab, piezas, 30); // medio segundo
    const bajo = final[2].y - 340;
    const subio = 340 - final[3].y;
    // a = g (m1 − m2) / (m1 + m2) = 10/3 m/s² → en medio segundo baja a·t²/2 ≈ 0,42 m ≈ 42 px
    assert.ok(bajo > 25 && bajo < 60, `el pesado bajó ${bajo.toFixed(1)} px`);
    assert.ok(Math.abs(bajo - subio) < 6, `bajó ${bajo.toFixed(1)} y subió ${subio.toFixed(1)}`);
});

test('en el recipiente un bloque liviano flota y uno pesado se hunde', () => {
    // Recipiente de 240 px de ancho apoyado en el suelo: el agua llega a 112 px del fondo
    const piezas = conIds([
        { tipo: 'recipiente', x: 500, y: SUELO_Y, largo: 240, valor: 1 },
        { tipo: 'bloque', x: 440, y: SUELO_Y - 200, valor: 0.5 },
        { tipo: 'bloque', x: 560, y: SUELO_Y - 200, valor: 5 }
    ]);
    const final = simular(lab, piezas, 300);
    const superficie = SUELO_Y - 112;
    // Densidad del liviano: 0,5 kg / 1600 px² = 0,31 del agua → se hunde 0,31 × 40 = 12,5 px
    assert.ok(Math.abs(final[2].y - (superficie - 20 + 12.5)) < 8, `el liviano quedó en y = ${final[2].y.toFixed(1)}`);
    assert.ok(final[3].y > SUELO_Y - 40, `el pesado quedó en y = ${final[3].y.toFixed(1)}, no llegó al fondo`);
});

test('un disco gira con el engranaje de su eje y dos discos que se tocan giran según sus radios', () => {
    const giros = lab.calcularGiros(conIds([
        { tipo: 'disco', x: 300, y: 300, valor: 50 },
        { tipo: 'disco', x: 300, y: 300, valor: 120 },
        { tipo: 'motor', x: 300, y: 300 },
        { tipo: 'disco', x: 470, y: 300, valor: 50 }
    ]));
    assert.equal(giros.get(1), giros.get(2), 'mismo eje, mismo giro');
    casi(giros.get(4), -giros.get(2) * 120 / 50, 1e-9, 'el disco que toca al grande gira 120/50 veces más rápido y al revés');
});

test('una flecha de velocidad le da velocidad inicial al cuerpo que toca con su cola', () => {
    const piezas = conIds([
        { tipo: 'pelota', x: 300, y: SUELO_Y - 15, valor: 1 },
        { tipo: 'velocidad', x: 300 - 45, y: SUELO_Y - 15, rotacion: 90, valor: 5 } // apunta a la derecha
    ]);
    const final = simular(lab, piezas, 30)[1];
    // 5 m/s son 250 px en medio segundo; al empezar a rodar pierde parte de su rapidez (se va en el giro)
    assert.ok(final.x > 300 + 130, `la pelota solo llegó a x = ${final.x.toFixed(1)}`);
});

test('las líneas de campo salen de la carga positiva y llegan a la negativa', () => {
    const cargas = [{ x: 300, y: 300, valor: 2 }, { x: 600, y: 300, valor: -2 }];
    const lineas = lab.lineasDeCampo(cargas, { ancho: ANCHO, alto: 900 });
    assert.ok(lineas.length >= 8, `solo hay ${lineas.length} líneas`);
    const llegan = lineas.filter((linea) => { const fin = linea.at(-1); return Math.hypot(fin.x - 600, fin.y - 300) < 20; });
    assert.ok(llegan.length >= 4, `solo ${llegan.length} líneas llegan a la carga negativa`);
});

test('en un campo magnético entrante el protón gira al revés del reloj y el electrón al revés', () => {
    // Campo de 1 T: con 5 m/s el radio es 100 px y un cuarto de vuelta dura π/2 s
    const campo = { x: 600, y: 400, largo: 600, valor: 1 };
    const cuarto = Math.PI / 2;
    const proton = lab.moverParticula({ x: 600, y: 400, valor: 5, angulo: 0, tipo: 'proton' }, [campo], cuarto);
    const electron = lab.moverParticula({ x: 600, y: 400, valor: 5, angulo: 0, tipo: 'electron' }, [campo], cuarto);
    assert.ok(Math.hypot(proton.x - 700, proton.y - 300) < 4, `protón en (${proton.x.toFixed(1)}, ${proton.y.toFixed(1)})`);
    assert.ok(Math.hypot(electron.x - 700, electron.y - 500) < 4, `electrón en (${electron.x.toFixed(1)}, ${electron.y.toFixed(1)})`);
});
