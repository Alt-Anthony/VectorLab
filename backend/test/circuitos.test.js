// Pruebas de los circuitos eléctricos del laboratorio: las terminales se unen bien y la corriente sale
// como en los ejercicios (ley de Ohm, serie, paralelo, amperímetro, voltímetro y capacitor).

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { cargarFisica } = require('./ayuda');

const lab = cargarFisica();

const pieza = (tipo, x, y, extra = {}) => ({ tipo, x, y, rotacion: 0, valor: null, texto: null, largo: null, angulo: null, ...extra });
const conIds = (lista) => lista.map((p, i) => ({ id: i + 1, ...p }));
const de = (resultado, id) => resultado.elementos.find((e) => e.id === id);
const casi = (real, esperado, mensaje) => assert.ok(Math.abs(real - esperado) < 1e-3, `${mensaje}: ${real} ≠ ${esperado}`);

// Batería de 12 V con dos resistencias en serie (2 Ω y 4 Ω), cerrada con cables.
// Las terminales de cada componente están a 40 px de su centro; la batería tiene el + a la derecha.
const SERIE = conIds([
    pieza('bateria', 100, 100, { valor: 12 }),                     // − (60,100)   + (140,100)
    pieza('cable', 140, 100, { largo: 40 }),                       // (140,100) → (180,100)
    pieza('resistencia', 220, 100, { valor: 2 }),                  // (180,100) → (260,100)
    pieza('resistencia', 260, 140, { valor: 4, rotacion: 90 }),    // (260,100) → (260,180)
    pieza('cable', 60, 180, { largo: 200 }),                       // (60,180) → (260,180)
    pieza('cable', 60, 100, { largo: 80, rotacion: 90 })           // (60,100) → (60,180)
]);

// Dos resistencias de 6 Ω en paralelo con 12 V: la del medio toca los cables por la mitad
const PARALELO = conIds([
    pieza('bateria', 60, 150, { valor: 12, rotacion: 90 }),        // − (60,110)   + (60,190)
    pieza('resistencia', 180, 150, { valor: 6, rotacion: 90 }),
    pieza('resistencia', 300, 150, { valor: 6, rotacion: 90 }),
    pieza('cable', 60, 110, { largo: 240 }),
    pieza('cable', 60, 190, { largo: 240 })
]);

test('en serie la corriente es V / (R1 + R2) y la batería entrega esa corriente', () => {
    const resultado = lab.resolverCircuito(SERIE);
    assert.equal(resultado.error, null);
    casi(de(resultado, 1).corriente, 2, 'batería');
    casi(Math.abs(de(resultado, 3).corriente), 2, 'resistencia de 2 Ω');
    casi(Math.abs(de(resultado, 4).voltaje), 8, 'voltaje en la resistencia de 4 Ω');
    casi(de(resultado, 4).potencia, 16, 'potencia en la resistencia de 4 Ω');
});

test('en paralelo cada rama lleva su parte y la batería la suma (los cables se parten donde los tocan)', () => {
    const resultado = lab.resolverCircuito(PARALELO);
    casi(Math.abs(de(resultado, 2).corriente), 2, 'rama del medio');
    casi(Math.abs(de(resultado, 3).corriente), 2, 'rama de la derecha');
    casi(de(resultado, 1).corriente, 4, 'batería');
});

test('el amperímetro mide la corriente y el voltímetro el voltaje (batería de 10 V con r = 1 Ω y R = 4 Ω)', () => {
    const resultado = lab.resolverCircuito(conIds([
        pieza('bateria', 100, 100, { valor: 10 }),
        pieza('resistencia', 180, 100, { valor: 1 }),               // resistencia interna
        pieza('amperimetro', 260, 100),
        pieza('resistencia', 300, 140, { valor: 4, rotacion: 90 }),
        pieza('cable', 60, 180, { largo: 240 }),
        pieza('cable', 60, 100, { largo: 80, rotacion: 90 }),
        pieza('cable', 300, 100, { largo: 80 }),
        pieza('cable', 300, 180, { largo: 80 }),
        pieza('voltimetro', 380, 140, { rotacion: 90 })
    ]));
    casi(Math.abs(de(resultado, 3).corriente), 2, 'amperímetro');
    casi(Math.abs(de(resultado, 9).voltaje), 8, 'voltímetro');
    casi(de(resultado, 9).corriente, 0, 'por el voltímetro no pasa corriente');
});

test('el capacitor no deja pasar corriente y guarda Q = C·V', () => {
    const resultado = lab.resolverCircuito(conIds([
        pieza('bateria', 60, 150, { valor: 12, rotacion: 90 }),
        pieza('capacitor', 180, 150, { valor: 5, rotacion: 90 }),
        pieza('cable', 60, 110, { largo: 120 }),
        pieza('cable', 60, 190, { largo: 120 })
    ]));
    casi(Math.abs(de(resultado, 2).voltaje), 12, 'voltaje del capacitor');
    casi(Math.abs(de(resultado, 2).carga), 60, 'carga en μC');
    casi(de(resultado, 1).corriente, 0, 'la batería no entrega corriente');
});

test('si falta un cable el circuito queda abierto y no pasa corriente', () => {
    const resultado = lab.resolverCircuito(SERIE.slice(0, -1));
    casi(de(resultado, 1).corriente, 0, 'batería');
});

test('sin batería no hay nada que calcular', () => {
    const resultado = lab.resolverCircuito(conIds([pieza('resistencia', 100, 100, { valor: 5 })]));
    assert.ok(resultado.error);
    assert.equal(resultado.elementos.length, 0);
});

test('dos baterías distintas unidas directamente no se pueden resolver', () => {
    const resultado = lab.resolverCircuito(conIds([
        pieza('bateria', 100, 100, { valor: 12 }),
        pieza('bateria', 100, 100, { valor: 6 })
    ]));
    assert.ok(resultado.error);
});

test('las terminales unidas se marcan conectadas y las sueltas no', () => {
    assert.ok(lab.puntosDeCircuito(SERIE).every((p) => p.conectado), 'en el circuito en serie todo está unido');
    assert.ok(lab.puntosDeCircuito(PARALELO).every((p) => p.conectado), 'tocar un cable por la mitad también une');
    const suelta = lab.puntosDeCircuito(conIds([pieza('resistencia', 100, 100, { valor: 5 })]));
    assert.deepEqual(suelta.map((p) => p.conectado), [false, false]);
});

test('el editor recibe las terminales del circuito junto con las demás conexiones', () => {
    const puntos = lab.detectarConexiones({ piezas: SERIE, ancho: 1700, sueloY: 800 });
    assert.equal(puntos.filter((p) => p.clave.includes(':t')).length, 12);
});

test('dos capacitores en serie (3 μF y 6 μF con 12 V) guardan la misma carga: 24 μC', () => {
    const resultado = lab.resolverCircuito(conIds([
        pieza('bateria', 100, 100, { valor: 12 }),                // − (60,100)  + (140,100)
        pieza('capacitor', 180, 100, { valor: 3 }),               // (140,100) → (220,100)
        pieza('capacitor', 260, 100, { valor: 6 }),               // (220,100) → (300,100): el nodo del medio queda aislado
        pieza('cable', 300, 100, { largo: 80, rotacion: 90 }),
        pieza('cable', 60, 180, { largo: 240 }),
        pieza('cable', 60, 100, { largo: 80, rotacion: 90 })
    ]));
    casi(Math.abs(de(resultado, 2).voltaje), 8, 'voltaje en el de 3 μF');
    casi(Math.abs(de(resultado, 3).voltaje), 4, 'voltaje en el de 6 μF');
    casi(Math.abs(de(resultado, 2).carga), 24, 'carga del de 3 μF');
    casi(Math.abs(de(resultado, 3).carga), 24, 'carga del de 6 μF');
});
