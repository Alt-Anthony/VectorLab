// Pruebas del dibujo de geometría con un "document" falso y mínimo (sin navegador):
// cada tipo de objeto se dibuja sin números rotos (NaN) y los textos van como texto, nunca como HTML.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { cargarScripts, leerEscenas } = require('./ayuda');

// Lo justo del DOM que usa dibujo-geometria.js: crear nodos, ponerles atributos, hijos y texto
function crearNodo(etiqueta) {
    return {
        etiqueta,
        atributos: {},
        hijos: [],
        textContent: '',
        innerHTML: '',
        setAttribute(nombre, valor) {
            this.atributos[nombre] = String(valor);
        },
        append(...hijos) {
            this.hijos.push(...hijos);
        },
        querySelector(selector) {
            if (selector !== '.texto' || !this.innerHTML.includes('class="texto"')) return null;
            this.textoDeCota = this.textoDeCota || { textContent: '' };
            return this.textoDeCota;
        }
    };
}

const dibujo = cargarScripts(
    ['frontend/priv/js/laboratorio/cota.js', 'frontend/priv/js/geometria/motor-geometria.js', 'frontend/priv/js/geometria/dibujo-geometria.js'],
    ['TIPOS', 'resolverFigura', 'dibujarObjeto', 'dibujarResaltado', 'ordenDeCapa'],
    { SVG_NS: 'http://www.w3.org/2000/svg', document: { createElementNS: (espacio, etiqueta) => crearNodo(etiqueta) } }
);

const OPCIONES = { centro: { x: 0, y: 0 }, medir: true, escala: 20, unidad: 'm' };

// Una figura que usa todos los tipos de objeto, con sus opciones (marcas, rayado, corona, texto en la punta...)
const TODOS_LOS_TIPOS = [
    { id: 'A', tipo: 'punto', x: -100, y: 0 },
    { id: 'B', tipo: 'punto', x: 100, y: 0 },
    { id: 'C', tipo: 'punto', desde: 'A', angulo: 60, distancia: 200, lado: 'arriba-izquierda' },
    { id: 'AB', tipo: 'segmento', de: ['A', 'B'], medir: true, marcas: 2 },
    { id: 'AC', tipo: 'rayo', desde: 'A', hacia: 'C', texto: 'v⃗', textoEn: 'punta' },
    { id: 'BC', tipo: 'recta', por: ['B', 'C'], estilo: 'punteado' },
    { id: 'M', tipo: 'punto_medio', de: ['A', 'B'] },
    { id: 'H', tipo: 'punto_en', en: 'AB', t: 0.25, etiqueta: '' },
    { id: 'I', tipo: 'punto_bisectriz', vertice: 'A', desde: 'B', hasta: 'C', distancia: 80 },
    { id: 'par', tipo: 'paralela', por: 'C', a: 'AB' },
    { id: 'per', tipo: 'perpendicular', por: 'C', a: 'AB' },
    { id: 'P', tipo: 'proyeccion', punto: 'C', sobre: 'AB' },
    { id: 'X', tipo: 'interseccion', de: ['per', 'AB'] },
    { id: 'circ', tipo: 'circunferencia', centro: 'M', por: 'B' },
    { id: 'Y', tipo: 'interseccion', de: ['BC', 'circ'], cual: 1 },
    { id: 'angA', tipo: 'angulo', vertice: 'A', desde: 'B', hasta: 'C', texto: 'θ', medir: true },
    { id: 'angP', tipo: 'angulo', vertice: 'P', desde: 'B', hasta: 'C', recto: true },
    { id: 'sec', tipo: 'sector', centro: 'M', desde: 'B', hasta: 'Y', texto: 'S', interno: 'H' },
    { id: 'tri', tipo: 'poligono', vertices: ['A', 'B', 'C'], relleno: 'rayado' },
    { id: 'cotaAB', tipo: 'cota', de: ['A', 'B'] },
    { id: 'nota', tipo: 'texto', x: 0, y: 50, texto: '<b>no es HTML</b>' },
    { id: 'O2', tipo: 'punto', x: 300, y: 300, etiqueta: '' },
    { id: 'E', tipo: 'ejes', origen: 'O2', escala: 20, rango: [-2, 6, -2, 4] },
    { id: 'Q', tipo: 'punto_coord', ejes: 'E', coord: [2, 3], etiqueta: 'Q (2; 3)' },
    { id: 'R', tipo: 'reflejo', de: 'Q', ejes: 'E', eje: 'x' },
    { id: 'g', tipo: 'grafica', ejes: 'E', puntos: [[0, 0], [2, 2], [4, 2], [5, 3]], guias: true, suave: true },
    { id: 'el', tipo: 'elipse', centro: 'O2', ejes: 'E', a: 3, b: 2, parte: 'superior' },
    { id: 'arc', tipo: 'arco', centro: 'M', desde: 'B', hasta: 'Y', texto: '100 + α', mayor: true },
    { id: 'T', tipo: 'tangente', desde: 'C', a: 'circ' },
    { id: 'angG', tipo: 'angulo', vertice: 'A', desde: 'B', hasta: 'C', mayor: true },
    { id: 'cil', tipo: 'cilindro', centro: 'O2', radio: 30, alto: 60 },
    { id: 'con', tipo: 'cono', centro: 'O2', radio: 30, alto: 60 },
    { id: 'esf', tipo: 'esfera', centro: 'O2', radio: 30 },
    { id: 'tro', tipo: 'tronco', centro: 'O2', base: 60, tope: 30, alto: 50 }
];

// Recorre un nodo y todos sus hijos
const recorrer = (nodo) => [nodo, ...nodo.hijos.flatMap(recorrer)];
const textos = (nodo) => recorrer(nodo).map((n) => n.textContent).filter(Boolean);

test('la figura de prueba usa todos los tipos de objeto y no tiene errores', () => {
    const tiposUsados = new Set(TODOS_LOS_TIPOS.map((o) => o.tipo));
    assert.deepEqual([...tiposUsados].sort(), Object.keys(dibujo.TIPOS).sort());
    const { errores } = dibujo.resolverFigura(TODOS_LOS_TIPOS);
    assert.equal(errores.length, 0, errores.join(' | '));
});

test('cada objeto y su resaltado se dibujan sin números rotos', () => {
    const { calculados } = dibujo.resolverFigura(TODOS_LOS_TIPOS);
    calculados.forEach((calculado, id) => {
        [dibujo.dibujarObjeto(calculado, OPCIONES), dibujo.dibujarResaltado(calculado)].forEach((nodo) => {
            recorrer(nodo).forEach((n) => {
                Object.entries(n.atributos).forEach(([nombre, valor]) => {
                    assert.ok(!/NaN|undefined|Infinity/.test(valor), `${id}: ${nombre}="${valor}"`);
                });
            });
        });
    });
});

test('los textos se escriben como texto y las medidas reemplazan al texto cuando se mide', () => {
    const { calculados } = dibujo.resolverFigura(TODOS_LOS_TIPOS);
    const dibujar = (id, opciones = OPCIONES) => dibujo.dibujarObjeto(calculados.get(id), opciones);
    assert.deepEqual(textos(dibujar('nota')), ['<b>no es HTML</b>']);
    assert.ok(!recorrer(dibujar('nota')).some((n) => n.innerHTML.includes('<b>')), 'el texto no se mete como HTML');
    assert.deepEqual(textos(dibujar('angA')), ['60°']);
    assert.deepEqual(textos(dibujar('angA', { ...OPCIONES, medir: false })), ['θ']);
    assert.deepEqual(textos(dibujar('AB')), ['10 m']);
    assert.deepEqual(textos(dibujar('C')), ['C']);
    assert.deepEqual(textos(dibujar('H')), [], 'con etiqueta vacía no se escribe nada');
    assert.equal(dibujar('cotaAB').hijos[0].textoDeCota.textContent, '10 m', 'una cota sin texto muestra su medida');
});

test('los puntos libres se pueden arrastrar y los que dependen de otros no', () => {
    const { calculados } = dibujo.resolverFigura(TODOS_LOS_TIPOS);
    assert.ok(dibujo.dibujarObjeto(calculados.get('A'), OPCIONES).atributos.class.includes('libre'));
    assert.ok(!dibujo.dibujarObjeto(calculados.get('M'), OPCIONES).atributos.class.includes('libre'));
});

test('la figura guardada de la pregunta 32415 se dibuja completa, con las regiones debajo y los puntos encima', () => {
    const { escena } = leerEscenas('bd/05_geometria.sql').find((f) => f.codigo === 32415);
    const { calculados } = dibujo.resolverFigura(escena.objetos);
    const orden = [...calculados.values()].sort((a, b) => dibujo.ordenDeCapa(a) - dibujo.ordenDeCapa(b)).map((c) => c.clase);
    assert.equal(orden[0], 'angulo');
    assert.equal(orden.at(-1), 'punto');
    calculados.forEach((calculado) => assert.ok(dibujo.dibujarObjeto(calculado, OPCIONES)));
});

test('las marcas de lados iguales, el rayado y el texto en la punta del vector se dibujan', () => {
    const { calculados } = dibujo.resolverFigura(TODOS_LOS_TIPOS);
    const dibujar = (id) => dibujo.dibujarObjeto(calculados.get(id), OPCIONES);
    assert.equal(recorrer(dibujar('AB')).filter((n) => n.atributos.class === 'marca-igual').length, 2);
    assert.ok(recorrer(dibujar('tri')).some((n) => (n.atributos.class || '').includes('rayado')));
    const ejes = recorrer(dibujar('E'));
    assert.ok(ejes.some((n) => n.textContent === 'x') && ejes.some((n) => n.textContent === 'y'), 'los ejes llevan su nombre');
    assert.ok(ejes.filter((n) => n.atributos.class === 'numero').length > 4, 'y sus números');
    assert.ok(recorrer(dibujar('cil')).some((n) => (n.atributos.class || '').includes('oculto')), 'la parte de atrás del cilindro va punteada');
});
