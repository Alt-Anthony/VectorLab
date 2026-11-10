// Pruebas del motor de geometría: cada objeto se calcula bien a partir de los que usa,
// los errores en una figura no rompen el resto y las figuras guardadas en bd/05_geometria.sql son válidas.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { cargarScripts, leerEscenas } = require('./ayuda');

const motor = cargarScripts(
    ['frontend/priv/js/geometria/motor-geometria.js'],
    ['TIPOS', 'resolverFigura', 'medirAngulo', 'textoDeMedida', 'limitesDeFigura', 'unirLimites']
);
const figuras = leerEscenas('bd/05_geometria.sql');

const casi = (real, esperado, mensaje) => assert.ok(Math.abs(real - esperado) < 1e-6, `${mensaje}: ${real} ≠ ${esperado}`);
// Lo que viene del motor se creó dentro de vm (otro "mundo" de JS), así que se compara por contenido
const sinErrores = (errores, mensaje) => assert.equal(errores.length, 0, `${mensaje}: ${errores.join(' | ')}`);
const casiPunto = (real, esperado) => {
    casi(real.x, esperado.x, 'x');
    casi(real.y, esperado.y, 'y');
};

function calcular(objetos) {
    const { calculados, errores } = motor.resolverFigura(objetos);
    sinErrores(errores, 'la figura no debería tener errores');
    return (id) => calculados.get(id).geo;
}

test('el punto medio queda a la mitad del segmento', () => {
    const geo = calcular([
        { id: 'A', tipo: 'punto', x: 0, y: 0 },
        { id: 'B', tipo: 'punto', x: 100, y: 40 },
        { id: 'M', tipo: 'punto_medio', de: ['A', 'B'] }
    ]);
    casiPunto(geo('M'), { x: 50, y: 20 });
});

test('un punto se puede ubicar con un ángulo y una distancia (90° es hacia arriba)', () => {
    const geo = calcular([
        { id: 'O', tipo: 'punto', x: 10, y: 10 },
        { id: 'A', tipo: 'punto', desde: 'O', angulo: 90, distancia: 50 },
        { id: 'B', tipo: 'punto', desde: 'O', angulo: 180, distancia: 30 }
    ]);
    casiPunto(geo('A'), { x: 10, y: -40 });
    casiPunto(geo('B'), { x: -20, y: 10 });
});

test('un punto sobre un segmento queda en la fracción indicada', () => {
    const geo = calcular([
        { id: 'A', tipo: 'punto', x: 0, y: 0 },
        { id: 'B', tipo: 'punto', x: 90, y: 0 },
        { id: 'AB', tipo: 'segmento', de: ['A', 'B'] },
        { id: 'H', tipo: 'punto_en', en: 'AB', t: 1 / 3 }
    ]);
    casiPunto(geo('H'), { x: 30, y: 0 });
});

test('dos segmentos que se cruzan dan su punto de intersección', () => {
    const geo = calcular([
        { id: 'A', tipo: 'punto', x: 0, y: 0 },
        { id: 'B', tipo: 'punto', x: 100, y: 100 },
        { id: 'C', tipo: 'punto', x: 0, y: 100 },
        { id: 'D', tipo: 'punto', x: 100, y: 0 },
        { id: 'AB', tipo: 'segmento', de: ['A', 'B'] },
        { id: 'CD', tipo: 'segmento', de: ['C', 'D'] },
        { id: 'I', tipo: 'interseccion', de: ['AB', 'CD'] }
    ]);
    casiPunto(geo('I'), { x: 50, y: 50 });
});

test('una recta corta a una circunferencia en dos puntos', () => {
    const geo = calcular([
        { id: 'O', tipo: 'punto', x: 0, y: 0 },
        { id: 'c', tipo: 'circunferencia', centro: 'O', radio: 50 },
        { id: 'P', tipo: 'punto', x: -100, y: 0 },
        { id: 'Q', tipo: 'punto', x: 100, y: 0 },
        { id: 'r', tipo: 'recta', por: ['P', 'Q'] },
        { id: 'I1', tipo: 'interseccion', de: ['r', 'c'] },
        { id: 'I2', tipo: 'interseccion', de: ['r', 'c'], cual: 1 }
    ]);
    casiPunto(geo('I1'), { x: -50, y: 0 });
    casiPunto(geo('I2'), { x: 50, y: 0 });
});

test('la proyección es el pie de la perpendicular', () => {
    const geo = calcular([
        { id: 'A', tipo: 'punto', x: 0, y: 0 },
        { id: 'B', tipo: 'punto', x: 100, y: 0 },
        { id: 'AB', tipo: 'segmento', de: ['A', 'B'] },
        { id: 'P', tipo: 'punto', x: 30, y: -40 },
        { id: 'H', tipo: 'proyeccion', punto: 'P', sobre: 'AB' }
    ]);
    casiPunto(geo('H'), { x: 30, y: 0 });
});

test('la paralela mantiene la dirección y la perpendicular la gira 90°', () => {
    const geo = calcular([
        { id: 'A', tipo: 'punto', x: 0, y: 0 },
        { id: 'B', tipo: 'punto', x: 100, y: 0 },
        { id: 'AB', tipo: 'segmento', de: ['A', 'B'] },
        { id: 'P', tipo: 'punto', x: 20, y: -60 },
        { id: 'par', tipo: 'paralela', por: 'P', a: 'AB' },
        { id: 'per', tipo: 'perpendicular', por: 'P', a: 'AB' }
    ]);
    casi(geo('par').q.y, -60, 'la paralela sigue horizontal');
    casi(geo('per').q.x, 20, 'la perpendicular queda vertical');
});

test('el punto de la bisectriz parte el ángulo en dos iguales', () => {
    const geo = calcular([
        { id: 'O', tipo: 'punto', x: 0, y: 0 },
        { id: 'A', tipo: 'punto', desde: 'O', angulo: 180, distancia: 100 },
        { id: 'C', tipo: 'punto', desde: 'O', angulo: 90, distancia: 100 },
        { id: 'P', tipo: 'punto_bisectriz', vertice: 'O', desde: 'A', hasta: 'C', distancia: 100 }
    ]);
    const lado = 100 / Math.SQRT2;
    casiPunto(geo('P'), { x: -lado, y: -lado });
});

test('se miden ángulos y longitudes en las unidades de la figura', () => {
    const objetos = [
        { id: 'O', tipo: 'punto', x: 0, y: 0 },
        { id: 'A', tipo: 'punto', desde: 'O', angulo: 0, distancia: 90 },
        { id: 'B', tipo: 'punto', desde: 'O', angulo: 30, distancia: 90 },
        { id: 'OA', tipo: 'segmento', de: ['O', 'A'] },
        { id: 'ang', tipo: 'angulo', vertice: 'O', desde: 'A', hasta: 'B' }
    ];
    const { calculados } = motor.resolverFigura(objetos);
    casi(motor.medirAngulo({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 0, y: -10 }), 90, 'ángulo recto');
    assert.equal(motor.textoDeMedida(calculados.get('ang'), { escala: 20, unidad: 'm' }), '30°');
    assert.equal(motor.textoDeMedida(calculados.get('OA'), { escala: 20, unidad: 'm' }), '4,5 m');
    assert.equal(motor.textoDeMedida(calculados.get('O'), { escala: 20, unidad: 'm' }), null);
});

test('los límites de la figura encierran todos sus puntos', () => {
    const { calculados } = motor.resolverFigura([
        { id: 'A', tipo: 'punto', x: -10, y: 5 },
        { id: 'B', tipo: 'punto', x: 40, y: -20 },
        { id: 'c', tipo: 'circunferencia', centro: 'A', radio: 10 }
    ]);
    assert.deepEqual({ ...motor.limitesDeFigura(calculados) }, { izquierda: -20, derecha: 40, arriba: -20, abajo: 15 });
});

test('se pueden juntar los límites de la física y de la geometría aunque falte uno', () => {
    const a = { izquierda: 0, derecha: 10, arriba: 0, abajo: 10 };
    const b = { izquierda: -5, derecha: 5, arriba: 3, abajo: 20 };
    assert.deepEqual({ ...motor.unirLimites(a, b) }, { izquierda: -5, derecha: 10, arriba: 0, abajo: 20 });
    assert.equal(motor.unirLimites(a, null), a);
    assert.equal(motor.unirLimites(null, null), null);
});

test('un objeto con errores no rompe a los demás', () => {
    const { calculados, errores } = motor.resolverFigura([
        { id: 'A', tipo: 'punto', x: 0, y: 0 },
        { id: 'AB', tipo: 'segmento', de: ['A', 'B'] },
        { id: 'X', tipo: 'nave_espacial' },
        { id: 'A', tipo: 'punto', x: 5, y: 5 },
        { id: 'C', tipo: 'punto', x: 10, y: 0 },
        { id: 'M', tipo: 'punto_medio', de: ['A', 'C'] }
    ]);
    assert.equal(errores.length, 3, errores.join(' | '));
    assert.ok(errores[0].includes('B'), 'avisa que B no existe');
    assert.deepEqual([...calculados.keys()], ['A', 'C', 'M']);
});

test('un objeto no puede usar uno que aparece después ni uno de otra clase', () => {
    const { errores } = motor.resolverFigura([
        { id: 'AB', tipo: 'segmento', de: ['A', 'B'] },
        { id: 'A', tipo: 'punto', x: 0, y: 0 },
        { id: 'B', tipo: 'punto', x: 10, y: 0 },
        { id: 'c', tipo: 'circunferencia', centro: 'A', radio: 5 },
        { id: 'M', tipo: 'punto_medio', de: ['A', 'c'] }
    ]);
    assert.equal(errores.length, 2, errores.join(' | '));
});

test('cada figura guardada no tiene errores y sus pasos solo usan objetos que existen', () => {
    assert.ok(figuras.length > 0, 'no se encontró ninguna figura en 05_geometria.sql');
    figuras.forEach(({ codigo, escena, pasos }) => {
        assert.ok(Array.isArray(escena.objetos) && escena.objetos.length > 0, `pregunta ${codigo}: no tiene objetos`);
        const { calculados, errores } = motor.resolverFigura(escena.objetos);
        sinErrores(errores, `pregunta ${codigo}`);
        pasos.forEach((paso, i) => {
            assert.equal(typeof paso.titulo, 'string', `pregunta ${codigo}, paso ${i + 1}: falta el título`);
            [...(paso.resaltar || []), ...(paso.mostrar || [])].forEach((id) => {
                assert.ok(calculados.has(id), `pregunta ${codigo}, paso ${i + 1}: no existe "${id}"`);
            });
        });
    });
});

test('el motor comprueba la respuesta de la pregunta de ángulos 32415: ∠BOP = 30°', () => {
    const { escena } = figuras.find((f) => f.codigo === 32415);
    const { calculados } = motor.resolverFigura(escena.objetos);
    casi(calculados.get('angBOP').geo.medida, 30, '∠BOP');
    casi(calculados.get('angAOB').geo.medida * 5, calculados.get('angBOC').geo.medida, '∠BOC = 5·∠AOB');
    casi(calculados.get('angPOC').geo.medida, 45, '∠POC');
});

/* ---------- Ejes, gráficas, elipses, reflejos, arcos, tangentes y sólidos ---------- */

// Unos ejes con el origen en (100, 200) y 20 px por unidad
const EJES = [
    { id: 'O', tipo: 'punto', x: 100, y: 200 },
    { id: 'E', tipo: 'ejes', origen: 'O', escala: 20, rango: [-2, 10, -5, 5] }
];

test('un punto se ubica con sus coordenadas sobre los ejes (A(1; −1))', () => {
    const geo = calcular([...EJES, { id: 'A', tipo: 'punto_coord', ejes: 'E', coord: [1, -1] }]);
    casiPunto(geo('A'), { x: 120, y: 220 });
});

test('el reflejo respecto del eje X cambia el signo de la ordenada, y respecto de una recta también funciona', () => {
    const geo = calcular([
        ...EJES,
        { id: 'A', tipo: 'punto_coord', ejes: 'E', coord: [1, -1] },
        { id: 'A2', tipo: 'reflejo', de: 'A', ejes: 'E', eje: 'x' },
        { id: 'P', tipo: 'punto', x: 30, y: -40 },
        { id: 'Q', tipo: 'punto', x: 0, y: 0 },
        { id: 'R', tipo: 'punto', x: 90, y: 0 },
        { id: 'QR', tipo: 'segmento', de: ['Q', 'R'] },
        { id: 'P2', tipo: 'reflejo', de: 'P', sobre: 'QR' }
    ]);
    casiPunto(geo('A2'), { x: 120, y: 180 });
    casiPunto(geo('P2'), { x: 30, y: 40 });
});

test('una gráfica pasa por sus puntos dados en coordenadas', () => {
    const geo = calcular([...EJES, { id: 'g', tipo: 'grafica', ejes: 'E', puntos: [[0, 0], [2, 4], [5, 4]] }]);
    casiPunto(geo('g').puntos[1], { x: 140, y: 120 });
});

test('la elipse usa las unidades de los ejes (semiejes 4 y 3)', () => {
    const geo = calcular([...EJES, { id: 'el', tipo: 'elipse', centro: 'O', ejes: 'E', a: 4, b: 3, parte: 'superior' }]);
    assert.equal(geo('el').rx, 80);
    assert.equal(geo('el').ry, 60);
});

test('el ángulo mayor mide lo que le falta al menor para dar la vuelta', () => {
    const geo = calcular([
        { id: 'O', tipo: 'punto', x: 0, y: 0 },
        { id: 'A', tipo: 'punto', desde: 'O', angulo: 0, distancia: 50 },
        { id: 'B', tipo: 'punto', desde: 'O', angulo: 90, distancia: 50 },
        { id: 'menor', tipo: 'angulo', vertice: 'O', desde: 'A', hasta: 'B' },
        { id: 'mayor', tipo: 'angulo', vertice: 'O', desde: 'A', hasta: 'B', mayor: true },
        { id: 'arc', tipo: 'arco', centro: 'O', desde: 'A', hasta: 'B' }
    ]);
    casi(geo('menor').medida, 90, 'menor');
    casi(geo('mayor').medida, 270, 'mayor');
    casi(geo('arc').radio, 50, 'radio del arco');
});

test('el sector de corona va entre dos radios y el interno tiene que ser menor', () => {
    const base = [
        { id: 'O', tipo: 'punto', x: 0, y: 0 },
        { id: 'A', tipo: 'punto', desde: 'O', angulo: 0, distancia: 100 },
        { id: 'B', tipo: 'punto', desde: 'O', angulo: 30, distancia: 100 },
        { id: 'C', tipo: 'punto', desde: 'O', angulo: 0, distancia: 60 }
    ];
    const geo = calcular([...base, { id: 's', tipo: 'sector', centro: 'O', desde: 'A', hasta: 'B', interno: 'C' }]);
    casi(geo('s').radioInterno, 60, 'radio interno');
    const { errores } = motor.resolverFigura([...base, { id: 's', tipo: 'sector', centro: 'O', desde: 'C', hasta: 'B', interno: 'A' }]);
    assert.equal(errores.length, 1, 'un radio interno más grande que el externo es un error');
});

test('la tangente desde un punto toca la circunferencia formando un ángulo recto con el radio', () => {
    const geo = calcular([
        { id: 'O', tipo: 'punto', x: 0, y: 0 },
        { id: 'c', tipo: 'circunferencia', centro: 'O', radio: 50 },
        { id: 'P', tipo: 'punto', x: 130, y: 0 },
        { id: 'T1', tipo: 'tangente', desde: 'P', a: 'c' },
        { id: 'T2', tipo: 'tangente', desde: 'P', a: 'c', cual: 1 }
    ]);
    ['T1', 'T2'].forEach((id) => {
        const t = geo(id);
        casi(Math.hypot(t.x, t.y), 50, `${id} está sobre la circunferencia`);
        casi(t.x * (t.x - 130) + t.y * t.y, 0, `${id}: radio ⟂ tangente`);
    });
    assert.ok(geo('T1').y * geo('T2').y < 0, 'una tangente por arriba y otra por abajo');
});

test('los sólidos necesitan medidas positivas; el tronco con tope 0 es una pirámide', () => {
    const base = [{ id: 'O', tipo: 'punto', x: 0, y: 0 }];
    const { errores } = motor.resolverFigura([
        ...base,
        { id: 'cil', tipo: 'cilindro', centro: 'O', radio: 30, alto: 60 },
        { id: 'piramide', tipo: 'tronco', centro: 'O', base: 60, tope: 0, alto: 50 },
        { id: 'malo', tipo: 'cono', centro: 'O', radio: 0, alto: 60 }
    ]);
    assert.equal(errores.length, 1, errores.join(' | '));
    const { calculados } = motor.resolverFigura([...base, { id: 'cil', tipo: 'cilindro', centro: 'O', radio: 30, alto: 60 }]);
    const limites = motor.limitesDeFigura(calculados);
    assert.equal(limites.izquierda, -30);
    assert.ok(limites.arriba < -60, 'el cilindro llega por encima de su alto (su tapa es una elipse)');
});
