// Figuras listas para arrastrar desde la pestaña Geometría del laboratorio.
// Cada plantilla trae sus puntos libres (posiciones relativas a donde se suelta) y los objetos que dependen de ellos.
// Los puntos se nombran con las siguientes letras libres (A, B, C...) y los demás objetos llevan un prefijo
// único (f1_, f2_...), así se puede agregar la misma figura varias veces sin repetir nombres.
// No dibuja nada: solo arma la lista de objetos que luego calcula motor-geometria.js.

// puntos: [dx, dy] o [dx, dy, { más datos del punto }]. objetos(letras, prefijo): las primeras letras son de los
// puntos libres; "extras" pide letras para puntos que dependen de otros
const PLANTILLAS = Object.freeze({
    segmento: {
        nombre: 'Segmento',
        puntos: [[-80, 0], [80, 0]],
        objetos: ([a, b], f) => [{ id: `${f}seg`, tipo: 'segmento', de: [a, b], medir: true }]
    },
    triangulo: {
        nombre: 'Triángulo',
        puntos: [[0, -80], [-90, 60], [90, 60]],
        objetos: ([a, b, c], f) => [
            { id: `${f}ab`, tipo: 'segmento', de: [a, b], medir: true },
            { id: `${f}bc`, tipo: 'segmento', de: [b, c], medir: true },
            { id: `${f}ca`, tipo: 'segmento', de: [c, a], medir: true },
            { id: `${f}ang1`, tipo: 'angulo', vertice: a, desde: b, hasta: c, medir: true },
            { id: `${f}ang2`, tipo: 'angulo', vertice: b, desde: c, hasta: a, medir: true },
            { id: `${f}ang3`, tipo: 'angulo', vertice: c, desde: a, hasta: b, medir: true }
        ]
    },
    angulo: {
        nombre: 'Ángulo',
        puntos: [[-60, 40], [80, 40], [30, -70]],
        objetos: ([o, a, b], f) => [
            { id: `${f}rayo1`, tipo: 'rayo', desde: o, hacia: a },
            { id: `${f}rayo2`, tipo: 'rayo', desde: o, hacia: b },
            { id: `${f}ang`, tipo: 'angulo', vertice: o, desde: a, hasta: b, radio: 40, medir: true }
        ]
    },
    circunferencia: {
        nombre: 'Circunferencia',
        puntos: [[0, 0], [70, 0]],
        objetos: ([o, p], f) => [
            { id: `${f}circ`, tipo: 'circunferencia', centro: o, por: p },
            { id: `${f}radio`, tipo: 'segmento', de: [o, p], medir: true, estilo: 'punteado' }
        ]
    },
    punto_medio: {
        nombre: 'Punto medio',
        puntos: [[-80, 0], [80, 0]],
        extras: 1,
        objetos: ([a, b, m], f) => [
            { id: `${f}seg`, tipo: 'segmento', de: [a, b] },
            { id: m, tipo: 'punto_medio', de: [a, b] }
        ]
    },
    ejes: {
        nombre: 'Ejes',
        puntos: [[-60, 40, { etiqueta: '' }]],
        objetos: ([o], f) => [{ id: `${f}ejes`, tipo: 'ejes', origen: o, escala: 20, rango: [-2, 8, -2, 5] }]
    },
    elipse: {
        nombre: 'Elipse',
        puntos: [[0, 0]],
        objetos: ([o], f) => [{ id: `${f}elipse`, tipo: 'elipse', centro: o, a: 80, b: 50 }]
    },
    tangente: {
        nombre: 'Tangentes',
        puntos: [[-40, 0], [10, 0, { etiqueta: '' }], [110, 0]],
        extras: 2,
        objetos: ([o, borde, p, t1, t2], f) => [
            { id: `${f}circ`, tipo: 'circunferencia', centro: o, por: borde },
            { id: t1, tipo: 'tangente', desde: p, a: `${f}circ` },
            { id: t2, tipo: 'tangente', desde: p, a: `${f}circ`, cual: 1 },
            { id: `${f}tan1`, tipo: 'segmento', de: [p, t1], medir: true },
            { id: `${f}tan2`, tipo: 'segmento', de: [p, t2], medir: true }
        ]
    },
    cilindro: {
        nombre: 'Cilindro',
        puntos: [[0, 45, { etiqueta: '' }]],
        objetos: ([o], f) => [{ id: `${f}cilindro`, tipo: 'cilindro', centro: o, radio: 40, alto: 90 }]
    },
    cono: {
        nombre: 'Cono',
        puntos: [[0, 50, { etiqueta: '' }]],
        objetos: ([o], f) => [{ id: `${f}cono`, tipo: 'cono', centro: o, radio: 40, alto: 100 }]
    },
    esfera: {
        nombre: 'Esfera',
        puntos: [[0, 0]],
        objetos: ([o], f) => [{ id: `${f}esfera`, tipo: 'esfera', centro: o, radio: 45 }]
    },
    tronco: {
        nombre: 'Tronco de pirámide',
        puntos: [[-15, 40, { etiqueta: '' }]],
        objetos: ([o], f) => [{ id: `${f}tronco`, tipo: 'tronco', centro: o, base: 90, tope: 60, alto: 70 }]
    },
    perpendicular: {
        nombre: 'Perpendicular',
        puntos: [[-80, 40], [80, 40], [0, -50]],
        extras: 1,
        objetos: ([a, b, p, h], f) => [
            { id: `${f}seg`, tipo: 'segmento', de: [a, b] },
            { id: h, tipo: 'proyeccion', punto: p, sobre: `${f}seg` },
            { id: `${f}altura`, tipo: 'segmento', de: [p, h], medir: true, estilo: 'punteado' },
            { id: `${f}recto`, tipo: 'angulo', vertice: h, desde: b, hasta: p, recto: true }
        ]
    }
});

// A, B, ..., Z, A1, B1, ..., Z1, A2... saltando las que ya se usan
function letrasLibres(cantidad, usados) {
    const letras = [];
    for (let n = 0; letras.length < cantidad; n += 1) {
        const letra = String.fromCharCode(65 + (n % 26)) + (n >= 26 ? String(Math.floor(n / 26)) : '');
        if (!usados.has(letra)) letras.push(letra);
    }
    return letras;
}

// El primer prefijo f1_, f2_... que ningún objeto usa todavía
function prefijoLibre(usados) {
    const ids = [...usados];
    for (let n = 1; n <= ids.length + 1; n += 1) {
        const prefijo = `f${n}_`;
        if (!ids.some((id) => id.startsWith(prefijo))) return prefijo;
    }
    return `f${ids.length + 2}_`;
}

// Arma una plantilla alrededor de `centro`. Devuelve { objetos, puntos } (puntos: ids de los puntos libres)
function crearPlantilla(clave, centro, usados) {
    const plantilla = PLANTILLAS[clave];
    if (!plantilla) return null;
    const letras = letrasLibres(plantilla.puntos.length + (plantilla.extras || 0), usados);
    const puntos = plantilla.puntos.map(([dx, dy, extra = {}], i) => ({
        id: letras[i],
        tipo: 'punto',
        x: Math.round(centro.x + dx),
        y: Math.round(centro.y + dy),
        ...extra
    }));
    return { puntos: puntos.map((p) => p.id), objetos: [...puntos, ...plantilla.objetos(letras, prefijoLibre(usados))] };
}
