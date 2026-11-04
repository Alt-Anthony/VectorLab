// Pruebas del laboratorio: unidades, escenas guardadas, conexiones y física.
// Carga dibujo-piezas.js y motor-fisica.js igual que el navegador (scripts con variables globales) usando vm.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const Matter = require('matter-js');

const RAIZ = path.join(__dirname, '..', '..');
const CARPETA_LABORATORIO = path.join(RAIZ, 'frontend/priv/js/laboratorio');
const ANCHO = 1700;
const SUELO_Y = 800;

function cargarLaboratorio() {
    let siguienteCuadro = null;
    const contexto = vm.createContext({
        Matter,
        requestAnimationFrame: (funcion) => {
            siguienteCuadro = funcion;
            return 1;
        },
        cancelAnimationFrame: () => {}
    });
    ['dibujo-piezas.js', 'motor-fisica.js'].forEach((archivo) => {
        vm.runInContext(fs.readFileSync(path.join(CARPETA_LABORATORIO, archivo), 'utf8'), contexto, { filename: archivo });
    });
    const globales = vm.runInContext('({ PIEZAS, VALORES, UNIDADES, G, detectarConexiones, crearSimulacion })', contexto);
    const avanzar = (cuadros) => {
        for (let i = 0; i < cuadros; i += 1) siguienteCuadro();
    };
    return { ...globales, avanzar };
}

// Escenas y pasos guardados en bd/04_escenas.sql
function leerEscenas() {
    const sql = fs.readFileSync(path.join(RAIZ, 'bd/04_escenas.sql'), 'utf8');
    const patron = /escena = '([\s\S]*?)'::jsonb,\s*pasos = '([\s\S]*?)'::jsonb\s*WHERE codigo_banco = (\d+)/g;
    return [...sql.matchAll(patron)].map(([, escena, pasos, codigo]) => ({
        codigo: Number(codigo),
        escena: JSON.parse(escena),
        pasos: JSON.parse(pasos)
    }));
}

const conIds = (lista) => lista.map((p, i) => ({ id: i + 1, rotacion: 0, valor: null, texto: null, largo: null, ...p }));

function simular(lab, piezas, cuadros) {
    const ultimas = {};
    const simulacion = lab.crearSimulacion({
        piezas,
        ancho: ANCHO,
        sueloY: SUELO_Y,
        alDibujar: (id, punto, grados) => { ultimas[id] = { x: punto.x, y: punto.y, grados }; }
    });
    lab.avanzar(cuadros);
    simulacion.detener();
    return ultimas;
}

const lab = cargarLaboratorio();
const escenas = leerEscenas();
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
