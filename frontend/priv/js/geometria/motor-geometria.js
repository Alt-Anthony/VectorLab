// Motor de geometría del laboratorio: calcula dónde queda cada objeto de una figura.
// Una figura es una lista de objetos (puntos, segmentos, ángulos...) y cada uno puede depender de otros:
// el punto medio depende de dos puntos, el ángulo de tres, etc. También hay ejes cartesianos (con puntos por
// coordenadas y gráficas), elipses, arcos, tangentes y sólidos en perspectiva (cilindro, cono, esfera, tronco). Por eso un objeto solo puede usar
// objetos que aparecen antes en la lista. Si se mueve un punto, se vuelve a calcular toda la figura.
// Las posiciones van en px del lienzo (x hacia la derecha, y hacia abajo).
// Los ángulos van en grados como en matemática: 0° hacia la derecha y 90° hacia arriba.
// Este archivo no dibuja nada (eso lo hace dibujo-geometria.js); así se puede probar en Node.

const RADIANES_POR_GRADO = Math.PI / 180;
const CASI_CERO = 1e-9;
const ID_OBJETO = /^[A-Za-z][A-Za-z0-9_]{0,29}$/;

/* ---------- Vectores ---------- */

const vector = (x, y) => ({ x, y });
const sumar = (a, b) => vector(a.x + b.x, a.y + b.y);
const restar = (a, b) => vector(a.x - b.x, a.y - b.y);
const escalar = (a, k) => vector(a.x * k, a.y * k);
const productoPunto = (a, b) => a.x * b.x + a.y * b.y;
const cruz = (a, b) => a.x * b.y - a.y * b.x;
const norma = (a) => Math.hypot(a.x, a.y);
const distanciaEntre = (a, b) => norma(restar(a, b));
const girar90 = (a) => vector(a.y, -a.x);
const esNumero = Number.isFinite;

function unitario(a) {
    const largo = norma(a);
    return largo < CASI_CERO ? null : escalar(a, 1 / largo);
}

// Dirección de a hacia b en grados (0° a la derecha, 90° arriba)
const direccion = (a, b) => ((Math.atan2(a.y - b.y, b.x - a.x) / RADIANES_POR_GRADO) + 360) % 360;

// El punto que está a `largo` px de `origen` en la dirección indicada
const enDireccion = (origen, grados, largo) =>
    vector(origen.x + largo * Math.cos(grados * RADIANES_POR_GRADO), origen.y - largo * Math.sin(grados * RADIANES_POR_GRADO));

// Ángulo entre los rayos vértice→desde y vértice→hasta, siempre por el lado corto (menos de 180°).
// barrido positivo: en contra de las agujas del reloj; negativo: a favor.
function barridoMenor(vertice, desde, hasta) {
    const inicio = direccion(vertice, desde);
    const vuelta = (direccion(vertice, hasta) - inicio + 360) % 360;
    return { inicio, barrido: vuelta > 180 ? vuelta - 360 : vuelta };
}

const medirAngulo = (vertice, desde, hasta) => Math.abs(barridoMenor(vertice, desde, hasta).barrido);

/* ---------- Cruces y proyecciones ---------- */
// Las líneas (segmento, rayo, recta) se guardan con dos puntos, p y q. Para cruzarlas se toman como rectas.

function cruceDeLineas(l1, l2) {
    const d1 = restar(l1.q, l1.p);
    const d2 = restar(l2.q, l2.p);
    const det = cruz(d1, d2);
    if (Math.abs(det) < CASI_CERO) return null; // son paralelas: no se cruzan
    return sumar(l1.p, escalar(d1, cruz(restar(l2.p, l1.p), d2) / det));
}

// Una recta corta a una circunferencia en dos puntos: cual = 0 da el primero y cual = 1 el segundo
function cruceLineaCirculo(l, circulo, cual) {
    const d = unitario(restar(l.q, l.p));
    const f = restar(l.p, circulo.centro);
    const b = productoPunto(f, d);
    const discriminante = b * b - (productoPunto(f, f) - circulo.radio ** 2);
    if (discriminante < 0) return null; // la recta no toca la circunferencia
    const raiz = Math.sqrt(discriminante);
    return sumar(l.p, escalar(d, cual === 1 ? -b + raiz : -b - raiz));
}

// El pie de la perpendicular que baja desde `punto` hasta la línea
function proyectar(punto, l) {
    const d = unitario(restar(l.q, l.p));
    return sumar(l.p, escalar(d, productoPunto(restar(punto, l.p), d)));
}

/* ---------- Cómo se calcula cada tipo de objeto ---------- */

const esCirculo = (geo) => 'radio' in geo;

// Una línea necesita dos puntos distintos para tener dirección
const crearLinea = (p, q, alcance) => (distanciaEntre(p, q) < CASI_CERO ? null : { p, q, alcance });

function calcularPunto({ x, y, desde, angulo, distancia }) {
    if (desde) return esNumero(angulo) && esNumero(distancia) ? enDireccion(desde, angulo, distancia) : null;
    return esNumero(x) && esNumero(y) ? vector(x, y) : null;
}

function calcularBisectriz({ vertice, desde, hasta, distancia }) {
    if (!esNumero(distancia)) return null;
    const { inicio, barrido } = barridoMenor(vertice, desde, hasta);
    return enDireccion(vertice, inicio + barrido / 2, distancia);
}

function calcularInterseccion({ de: [a, b], cual = 0 }) {
    if (esCirculo(a) && esCirculo(b)) return null; // el cruce de dos circunferencias aún no está
    if (esCirculo(a)) return cruceLineaCirculo(b, a, cual);
    if (esCirculo(b)) return cruceLineaCirculo(a, b, cual);
    return cruceDeLineas(a, b);
}

// La circunferencia se define con su centro y un radio en px, o con su centro y un punto por donde pasa
function calcularCircunferencia({ centro, por, radio }) {
    const r = por ? distanciaEntre(centro, por) : radio;
    return esNumero(r) && r > CASI_CERO ? { centro, radio: r } : null;
}

// El ángulo, arco o sector se toma por el lado corto, o por el largo (más de 180°) si se pide "mayor"
function barridoElegido(centro, desde, hasta, mayor) {
    const { inicio, barrido } = barridoMenor(centro, desde, hasta);
    return { inicio, barrido: mayor ? barrido - Math.sign(barrido || 1) * 360 : barrido };
}

function calcularAngulo({ vertice, desde, hasta, mayor }) {
    const { inicio, barrido } = barridoElegido(vertice, desde, hasta, mayor);
    return { vertice, inicio, barrido, medida: Math.abs(barrido) };
}

// Un sector puede ser de corona: entre el radio de "desde" y el de "interno"
function calcularSector({ centro, desde, hasta, interno, mayor }) {
    const radio = distanciaEntre(centro, desde);
    const radioInterno = interno ? distanciaEntre(centro, interno) : 0;
    if (radioInterno >= radio) return null;
    return { centro, radio, radioInterno, ...barridoElegido(centro, desde, hasta, mayor) };
}

/* ---------- Ejes cartesianos, gráficas, elipses, reflejos, tangentes y sólidos ---------- */

const ESCALA_EJES = 20;      // px por unidad en los ejes, si no se dice otra
const ACHATAMIENTO = 0.35;   // en perspectiva, un círculo acostado se ve como una elipse así de achatada
const PROFUNDIDAD = 0.5;     // en perspectiva, lo que va hacia el fondo se dibuja a la mitad...
const ANGULO_FONDO = 30;     // ...y en diagonal, a 30°

const esPar = (p) => Array.isArray(p) && p.length === 2 && p.every(esNumero);

// Los ejes salen de un punto (su origen): si el origen se mueve, se mueve todo lo que está en coordenadas
function calcularEjes({ origen, escala = ESCALA_EJES, rango = [-5, 5, -5, 5], nombres = ['x', 'y'] }) {
    if (!(escala > 0) || !Array.isArray(rango) || rango.length !== 4 || !rango.every(esNumero)) return null;
    const [xMin, xMax, yMin, yMax] = rango;
    if (xMin >= xMax || yMin >= yMax) return null;
    const nombre = (i, porDefecto) => (Array.isArray(nombres) && typeof nombres[i] === 'string' ? nombres[i] : porDefecto);
    return { origen, escala, xMin, xMax, yMin, yMax, nombres: [nombre(0, 'x'), nombre(1, 'y')] };
}

// De coordenadas (en unidades de los ejes) a px del lienzo
const enEjes = (ejes, [x, y]) => vector(ejes.origen.x + x * ejes.escala, ejes.origen.y - y * ejes.escala);

function calcularGrafica({ ejes, puntos }) {
    if (!Array.isArray(puntos) || puntos.length < 2 || !puntos.every(esPar)) return null;
    return { ejes, puntos: puntos.map((punto) => enEjes(ejes, punto)) };
}

// Con ejes, los semiejes a y b van en unidades de los ejes; sin ejes, en px
function calcularElipse({ centro, ejes, a, b, parte = 'completa' }) {
    if (!(a > 0) || !(b > 0) || !['completa', 'superior', 'inferior'].includes(parte)) return null;
    const factor = ejes ? ejes.escala : 1;
    return { centro, rx: a * factor, ry: b * factor, parte };
}

// El simétrico de un punto respecto de una línea, o respecto del eje x o y de unos ejes
function calcularReflejo({ de, sobre, ejes, eje }) {
    if (sobre) return restar(escalar(proyectar(de, sobre), 2), de);
    if (ejes && eje === 'x') return vector(de.x, 2 * ejes.origen.y - de.y);
    if (ejes && eje === 'y') return vector(2 * ejes.origen.x - de.x, de.y);
    return null;
}

// El punto donde toca la circunferencia una tangente trazada desde afuera (hay dos: cual = 0 o 1)
function calcularTangente({ desde, a, cual = 0 }) {
    const distancia = distanciaEntre(desde, a.centro);
    if (distancia <= a.radio) return null; // desde adentro no hay tangente
    const abertura = Math.acos(a.radio / distancia) / RADIANES_POR_GRADO;
    return enDireccion(a.centro, direccion(a.centro, desde) + (cual === 1 ? -abertura : abertura), a.radio);
}

// Sólidos en perspectiva: "centro" es el centro de la base (en la esfera, su centro). Medidas en px
const MEDIDAS_DE_SOLIDO = Object.freeze({
    cilindro: ['radio', 'alto'],
    cono: ['radio', 'alto'],
    esfera: ['radio'],
    tronco: ['base', 'tope', 'alto'] // tronco de pirámide de base cuadrada: con tope 0 es una pirámide
});

const calcularSolido = (forma) => (objeto) => {
    const medidas = MEDIDAS_DE_SOLIDO[forma].map((campo) => [campo, objeto[campo]]);
    const validas = medidas.every(([campo, valor]) => esNumero(valor) && (valor > 0 || (campo === 'tope' && valor === 0)));
    return validas ? { forma, centro: objeto.centro, ...Object.fromEntries(medidas) } : null;
};

// Un punto en 3D (x a la derecha, y hacia arriba, z hacia el fondo) dibujado en el plano (perspectiva caballera)
function enPerspectiva(centro, x, y, z) {
    const fondo = z * PROFUNDIDAD;
    const rad = ANGULO_FONDO * RADIANES_POR_GRADO;
    return vector(centro.x + x + fondo * Math.cos(rad), centro.y - y - fondo * Math.sin(rad));
}

// Las esquinas del tronco: abajo y arriba, en orden adelante-izquierda, adelante-derecha, atrás-derecha, atrás-izquierda
function esquinasDeTronco({ centro, base, tope, alto }) {
    const cuadrado = (lado, y) => [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz]) => enPerspectiva(centro, (sx * lado) / 2, y, (sz * lado) / 2));
    return { abajo: cuadrado(base, 0), arriba: cuadrado(tope, alto) };
}

function bordesDeSolido(geo) {
    const { forma, centro } = geo;
    if (forma === 'tronco') {
        const { abajo, arriba } = esquinasDeTronco(geo);
        return [...abajo, ...arriba];
    }
    if (forma === 'esfera') return [vector(centro.x - geo.radio, centro.y - geo.radio), vector(centro.x + geo.radio, centro.y + geo.radio)];
    const ry = geo.radio * ACHATAMIENTO;
    const tapa = forma === 'cilindro' ? ry : 0;
    return [vector(centro.x - geo.radio, centro.y + ry), vector(centro.x + geo.radio, centro.y - geo.alto - tapa)];
}

// Cada tipo dice de qué clase es, qué otros objetos usa (campo → clase que debe tener) y cómo se calcula.
// En `usa`: 'punto' es el id de un punto; 'punto?' puede faltar; 'punto[]' es una lista de puntos;
// ['punto', 'punto'] es una lista de dos; 'linea|circulo' acepta cualquiera de las dos clases.
const TIPOS = Object.freeze({
    punto: { clase: 'punto', usa: { desde: 'punto?' }, calcular: calcularPunto },
    punto_medio: { clase: 'punto', usa: { de: ['punto', 'punto'] }, calcular: ({ de: [a, b] }) => escalar(sumar(a, b), 0.5) },
    punto_en: {
        clase: 'punto',
        usa: { en: 'linea' },
        calcular: ({ en, t }) => (esNumero(t) ? sumar(en.p, escalar(restar(en.q, en.p), t)) : null)
    },
    punto_bisectriz: { clase: 'punto', usa: { vertice: 'punto', desde: 'punto', hasta: 'punto' }, calcular: calcularBisectriz },
    interseccion: { clase: 'punto', usa: { de: ['linea|circulo', 'linea|circulo'] }, calcular: calcularInterseccion },
    proyeccion: { clase: 'punto', usa: { punto: 'punto', sobre: 'linea' }, calcular: ({ punto, sobre }) => proyectar(punto, sobre) },
    segmento: { clase: 'linea', usa: { de: ['punto', 'punto'] }, calcular: ({ de: [p, q] }) => crearLinea(p, q, 'segmento') },
    rayo: { clase: 'linea', usa: { desde: 'punto', hacia: 'punto' }, calcular: ({ desde, hacia }) => crearLinea(desde, hacia, 'rayo') },
    recta: { clase: 'linea', usa: { por: ['punto', 'punto'] }, calcular: ({ por: [p, q] }) => crearLinea(p, q, 'recta') },
    paralela: {
        clase: 'linea',
        usa: { por: 'punto', a: 'linea' },
        calcular: ({ por, a }) => crearLinea(por, sumar(por, restar(a.q, a.p)), 'recta')
    },
    perpendicular: {
        clase: 'linea',
        usa: { por: 'punto', a: 'linea' },
        calcular: ({ por, a }) => crearLinea(por, sumar(por, girar90(restar(a.q, a.p))), 'recta')
    },
    circunferencia: { clase: 'circulo', usa: { centro: 'punto', por: 'punto?' }, calcular: calcularCircunferencia },
    angulo: { clase: 'angulo', usa: { vertice: 'punto', desde: 'punto', hasta: 'punto' }, calcular: calcularAngulo },
    sector: { clase: 'region', usa: { centro: 'punto', desde: 'punto', hasta: 'punto', interno: 'punto?' }, calcular: calcularSector },
    poligono: {
        clase: 'region',
        usa: { vertices: 'punto[]' },
        calcular: ({ vertices }) => (vertices.length >= 3 ? { puntos: vertices } : null)
    },
    cota: { clase: 'cota', usa: { de: ['punto', 'punto'] }, calcular: ({ de: [p, q] }) => crearLinea(p, q, 'segmento') },
    texto: { clase: 'texto', usa: {}, calcular: ({ x, y }) => (esNumero(x) && esNumero(y) ? vector(x, y) : null) },
    ejes: { clase: 'ejes', usa: { origen: 'punto' }, calcular: calcularEjes },
    punto_coord: { clase: 'punto', usa: { ejes: 'ejes' }, calcular: ({ ejes, coord }) => (esPar(coord) ? enEjes(ejes, coord) : null) },
    reflejo: { clase: 'punto', usa: { de: 'punto', sobre: 'linea?', ejes: 'ejes?' }, calcular: calcularReflejo },
    tangente: { clase: 'punto', usa: { desde: 'punto', a: 'circulo' }, calcular: calcularTangente },
    grafica: { clase: 'curva', usa: { ejes: 'ejes' }, calcular: calcularGrafica },
    elipse: { clase: 'elipse', usa: { centro: 'punto', ejes: 'ejes?' }, calcular: calcularElipse },
    arco: {
        clase: 'arco',
        usa: { centro: 'punto', desde: 'punto', hasta: 'punto' },
        calcular: ({ centro, desde, hasta, mayor }) => ({ centro, radio: distanciaEntre(centro, desde), ...barridoElegido(centro, desde, hasta, mayor) })
    },
    cilindro: { clase: 'solido', usa: { centro: 'punto' }, calcular: calcularSolido('cilindro') },
    cono: { clase: 'solido', usa: { centro: 'punto' }, calcular: calcularSolido('cono') },
    esfera: { clase: 'solido', usa: { centro: 'punto' }, calcular: calcularSolido('esfera') },
    tronco: { clase: 'solido', usa: { centro: 'punto' }, calcular: calcularSolido('tronco') }
});

/* ---------- Resolver la figura completa ---------- */

function resolverId(id, esperado, calculados) {
    if (id === undefined && esperado.endsWith('?')) return { valor: undefined };
    const clases = esperado.replace('?', '').split('|');
    const encontrado = typeof id === 'string' ? calculados.get(id) : undefined;
    if (!encontrado) return { error: `usa "${id}", que no existe antes en la lista` };
    if (!clases.includes(encontrado.clase)) return { error: `"${id}" tendría que ser ${clases.join(' o ')}` };
    return { valor: encontrado.geo };
}

const juntar = (resultados) => resultados.find((r) => r.error) || { valor: resultados.map((r) => r.valor) };

function resolverCampo(valor, esperado, calculados) {
    if (Array.isArray(esperado)) {
        if (!Array.isArray(valor) || valor.length !== esperado.length) return { error: `necesita una lista de ${esperado.length}` };
        return juntar(valor.map((id, i) => resolverId(id, esperado[i], calculados)));
    }
    if (esperado.endsWith('[]')) {
        if (!Array.isArray(valor)) return { error: 'necesita una lista' };
        return juntar(valor.map((id) => resolverId(id, esperado.slice(0, -2), calculados)));
    }
    return resolverId(valor, esperado, calculados);
}

// Todos los números del resultado tienen que ser números de verdad (ni NaN ni infinito)
function esFinito(valor) {
    if (typeof valor === 'number') return Number.isFinite(valor);
    if (valor && typeof valor === 'object') return Object.values(valor).every(esFinito);
    return true;
}

function calcularObjeto(objeto, calculados) {
    const id = objeto?.id;
    if (typeof id !== 'string' || !ID_OBJETO.test(id)) return { error: `id inválido: ${JSON.stringify(id)}` };
    if (calculados.has(id)) return { error: `${id}: el id está repetido` };
    const tipo = TIPOS[objeto.tipo];
    if (!tipo) return { error: `${id}: no existe el tipo "${objeto.tipo}"` };

    const campos = Object.entries(tipo.usa).map(([campo, esperado]) => [campo, resolverCampo(objeto[campo], esperado, calculados)]);
    const fallo = campos.find(([, resultado]) => resultado.error);
    if (fallo) return { error: `${id}: en "${fallo[0]}" ${fallo[1].error}` };

    const geo = tipo.calcular({ ...objeto, ...Object.fromEntries(campos.map(([campo, resultado]) => [campo, resultado.valor])) });
    if (!geo || !esFinito(geo)) return { error: `${id}: no se pudo calcular (revisa sus datos)` };
    return { calculado: { objeto, clase: tipo.clase, geo } };
}

// Calcula todos los objetos en orden. Los que tienen errores se saltan (y se dice por qué) sin romper al resto.
// Devuelve { calculados: Map id → { objeto, clase, geo }, errores: [texto] }
function resolverFigura(objetos) {
    const calculados = new Map();
    const errores = [];
    (Array.isArray(objetos) ? objetos : []).forEach((objeto) => {
        const resultado = calcularObjeto(objeto, calculados);
        if (resultado.error) {
            errores.push(resultado.error);
        } else {
            calculados.set(objeto.id, resultado.calculado);
        }
    });
    return { calculados, errores };
}

/* ---------- Medidas y tamaño de la figura ---------- */

const formatearNumero = (numero, decimales) => Number(numero.toFixed(decimales)).toLocaleString('es');

// Lo que mide el laboratorio: los ángulos en grados y los segmentos (y cotas) en las unidades de la figura
function textoDeMedida({ clase, geo }, { escala, unidad }) {
    if (clase === 'angulo') return `${formatearNumero(geo.medida, 1)}°`;
    const esLargo = clase === 'cota' || (clase === 'linea' && geo.alcance === 'segmento');
    if (!esLargo || !(escala > 0)) return null;
    const largo = formatearNumero(distanciaEntre(geo.p, geo.q) / escala, 2);
    return unidad ? `${largo} ${unidad}` : largo;
}

// Puntos hasta donde llega cada objeto (para centrar la figura y escribir alrededor sin taparla)
function puntosDeBorde({ clase, geo }) {
    if (clase === 'punto' || clase === 'texto') return [geo];
    if (clase === 'linea' || clase === 'cota') return [geo.p, geo.q];
    if (clase === 'angulo') return [geo.vertice];
    if (clase === 'curva') return geo.puntos;
    if (clase === 'ejes') return [enEjes(geo, [geo.xMin, geo.yMin]), enEjes(geo, [geo.xMax, geo.yMax])];
    if (clase === 'elipse') return [vector(geo.centro.x - geo.rx, geo.centro.y - geo.ry), vector(geo.centro.x + geo.rx, geo.centro.y + geo.ry)];
    if (clase === 'solido') return bordesDeSolido(geo);
    if (esNumero(geo.radio)) {
        const { centro, radio } = geo;
        return [vector(centro.x - radio, centro.y - radio), vector(centro.x + radio, centro.y + radio)];
    }
    return clase === 'region' ? geo.puntos : [];
}

function limitesDeFigura(calculados) {
    const puntos = [...calculados.values()].flatMap(puntosDeBorde);
    if (puntos.length === 0) return null;
    const xs = puntos.map((p) => p.x);
    const ys = puntos.map((p) => p.y);
    return { izquierda: Math.min(...xs), derecha: Math.max(...xs), arriba: Math.min(...ys), abajo: Math.max(...ys) };
}

// Junta dos rectángulos { izquierda, derecha, arriba, abajo } (cualquiera puede faltar): el laboratorio
// lo usa para saber cuánto ocupan juntas las piezas de física y los objetos de geometría
function unirLimites(a, b) {
    if (!a || !b) return a || b || null;
    return {
        izquierda: Math.min(a.izquierda, b.izquierda),
        derecha: Math.max(a.derecha, b.derecha),
        arriba: Math.min(a.arriba, b.arriba),
        abajo: Math.max(a.abajo, b.abajo)
    };
}
