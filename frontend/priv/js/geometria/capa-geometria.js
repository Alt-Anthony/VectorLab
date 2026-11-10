// Capa de geometría del laboratorio: puntos, segmentos, ángulos... dibujados encima de las piezas de física.
// motor-geometria.js calcula dónde queda cada objeto y dibujo-geometria.js lo dibuja.
// Los puntos libres se arrastran y todo lo que depende de ellos se vuelve a calcular.
// Desde la pestaña Geometría se arrastran figuras listas (plantillas-geometria.js).
// Usa de editor-lienzo.js: $, SVG_NS, lienzo, MODO_SOLUCION, simulacion, puntoEnLienzo, estaSobreElLienzo,
// seleccionar y botones. cargar-figura.js la usa para cargar la figura, copiarla y prestarla a los pasos.

const ESCALA_INICIAL = 20;    // px por unidad de largo, si la figura no dice otra cosa
const LETRAS_UNIDAD = 10;     // la unidad de largo es corta: "m", "cm", "u"...
const MARGEN_VISTA_PREVIA = 14;
const capaGeometria = $('capaGeometria');
const listaGeometria = $('listaGeometria');
const botonMedidas = $('btnMedidas');

let geometria = { escala: ESCALA_INICIAL, unidadLargo: 'u', objetos: [] };
let calculados = new Map();      // lo último que calculó el motor
let mostrados = new Set();       // objetos ocultos que ya hizo aparecer algún paso
let midiendo = !MODO_SOLUCION;   // si se escriben las medidas de los objetos con "medir"
let arrastrePuntos = null;       // los puntos que se están moviendo, dónde estaban y dónde se agarró
let puntoElegido = null;         // el punto seleccionado (se borra con Supr o con el botón Eliminar)

const estaVisible = ({ objeto }) => !objeto.oculto || mostrados.has(objeto.id);
const centroDeLimites = (l) => (l ? vector((l.izquierda + l.derecha) / 2, (l.arriba + l.abajo) / 2) : vector(0, 0));
const idsUsados = () => new Set(geometria.objetos.map((o) => o.id));

/* ---------- Dibujar ---------- */

function marcarElegido() {
    capaGeometria.querySelectorAll('.geo-punto').forEach((g) => g.classList.toggle('elegido', g.dataset.id === puntoElegido));
}

function dibujarGeometria() {
    calculados = resolverFigura(geometria.objetos).calculados;
    const opciones = {
        centro: centroDeLimites(limitesDeFigura(calculados)),
        medir: midiendo,
        escala: geometria.escala,
        unidad: geometria.unidadLargo
    };
    const visibles = [...calculados.values()].filter(estaVisible).sort((a, b) => ordenDeCapa(a) - ordenDeCapa(b));
    capaGeometria.replaceChildren(...visibles.map((calculado) => dibujarObjeto(calculado, opciones)));
    marcarElegido();
}

/* ---------- Elegir, mover y borrar puntos ---------- */

// Solo una cosa elegida a la vez: al elegir un punto se suelta la pieza de física elegida
function elegirPunto(id) {
    if (id !== null) seleccionar(null);
    puntoElegido = id;
    marcarElegido();
    if (id !== null) botones.eliminar.disabled = false;
}

// Un punto que se mueve a mano queda libre: deja de depender del punto desde el que se ubicó
function moverPunto(objeto, x, y) {
    const { desde, angulo, distancia, ...resto } = objeto;
    return { ...resto, x, y };
}

function empezarArrastrePuntos(evento, ids, esNueva) {
    const posiciones = new Map(ids.map((id) => [id, calculados.get(id).geo]));
    arrastrePuntos = { ids, posiciones, inicio: puntoEnLienzo(evento), esNueva };
    document.body.classList.add('arrastrando');
}

function alTocarGeometria(evento) {
    const grupo = evento.target.closest('.geo-punto.libre');
    const calculado = grupo && calculados.get(grupo.dataset.id);
    if (!calculado || simulacion || MODO_SOLUCION) return;
    evento.preventDefault();
    evento.stopPropagation(); // que el lienzo no lo tome como un clic en una zona vacía
    elegirPunto(calculado.objeto.id);
    empezarArrastrePuntos(evento, [calculado.objeto.id], false);
}

// Un clic en cualquier otra parte del lienzo suelta el punto elegido
function alTocarLienzo(evento) {
    if (!evento.target.closest('.geo-punto.libre')) elegirPunto(null);
}

function alMoverPuntos(evento) {
    if (!arrastrePuntos) return;
    const { x, y } = puntoEnLienzo(evento);
    const { posiciones, inicio } = arrastrePuntos;
    const moverA = (o) => {
        const antes = posiciones.get(o.id);
        return moverPunto(o, Math.round(antes.x + x - inicio.x), Math.round(antes.y + y - inicio.y));
    };
    geometria = { ...geometria, objetos: geometria.objetos.map((o) => (posiciones.has(o.id) ? moverA(o) : o)) };
    dibujarGeometria();
}

// Quita objetos y todo lo que dependía de ellos (lo que ya no se puede calcular)
function quitarObjetos(ids) {
    const quitar = new Set(ids);
    const restantes = geometria.objetos.filter((o) => !quitar.has(o.id));
    const validos = resolverFigura(restantes).calculados;
    geometria = { ...geometria, objetos: restantes.filter((o) => validos.has(o.id)) };
}

function alSoltarPuntos(evento) {
    if (!arrastrePuntos) return;
    // Si sueltas una figura nueva fuera del lienzo, no se agrega
    if (arrastrePuntos.esNueva && !estaSobreElLienzo(evento)) quitarObjetos(arrastrePuntos.ids);
    arrastrePuntos = null;
    document.body.classList.remove('arrastrando');
    dibujarGeometria();
}

function eliminarPuntoElegido() {
    if (puntoElegido === null) return;
    quitarObjetos([puntoElegido]);
    elegirPunto(null);
    botones.eliminar.disabled = true;
    dibujarGeometria();
}

const escribiendoEnUnCampo = (evento) => evento.target instanceof Element && evento.target.closest('input, select') !== null;

function alPresionarTeclaGeometria(evento) {
    if (puntoElegido === null || MODO_SOLUCION || escribiendoEnUnCampo(evento)) return;
    if (evento.key === 'Delete' || evento.key === 'Backspace') {
        evento.preventDefault();
        eliminarPuntoElegido();
    } else if (evento.key === 'Escape') {
        elegirPunto(null);
    }
}

/* ---------- Figuras listas de la pestaña Geometría ---------- */

function empezarDesdePlantilla(evento, clave) {
    if (simulacion || MODO_SOLUCION) return;
    evento.preventDefault();
    const { objetos, puntos } = crearPlantilla(clave, puntoEnLienzo(evento), idsUsados());
    geometria = { ...geometria, objetos: [...geometria.objetos, ...objetos] };
    dibujarGeometria();
    empezarArrastrePuntos(evento, puntos, true);
}

// El dibujito de cada figura en la barra lateral se hace con el mismo motor que el lienzo
function crearVistaPrevia(clave) {
    const { objetos } = crearPlantilla(clave, vector(0, 0), new Set());
    const previa = resolverFigura(objetos.map((o) => ({ ...o, etiqueta: '' }))).calculados;
    const l = limitesDeFigura(previa);
    const m = MARGEN_VISTA_PREVIA;
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', `${l.izquierda - m} ${l.arriba - m} ${l.derecha - l.izquierda + 2 * m} ${l.abajo - l.arriba + 2 * m}`);
    const opciones = { centro: vector(0, 0), medir: false, escala: ESCALA_INICIAL, unidad: '' };
    [...previa.values()].sort((a, b) => ordenDeCapa(a) - ordenDeCapa(b)).forEach((c) => svg.append(dibujarObjeto(c, opciones)));
    return svg;
}

function crearRecursoGeometria([clave, plantilla]) {
    const recurso = document.createElement('div');
    recurso.className = 'recurso';
    recurso.title = `Arrastra: ${plantilla.nombre}`;
    const etiqueta = document.createElement('span');
    etiqueta.textContent = plantilla.nombre;
    recurso.append(crearVistaPrevia(clave), etiqueta);
    recurso.addEventListener('pointerdown', (evento) => empezarDesdePlantilla(evento, clave));
    return recurso;
}

/* ---------- Medidas ---------- */

function reflejarMedidas() {
    botonMedidas.textContent = midiendo ? 'Ocultar medidas' : 'Mostrar medidas';
}

function alternarMedidas() {
    midiendo = !midiendo;
    reflejarMedidas();
    dibujarGeometria();
}

/* ---------- Lo que usan cargar-figura.js y editor-lienzo.js ---------- */

const hayGeometria = () => geometria.objetos.length > 0;
const limitesDeGeometria = () => limitesDeFigura(calculados);

// Carga la parte de geometría de una figura, movida igual que las piezas de física (dx, dy)
function cargarGeometria({ escala, unidadLargo, objetos }, { dx, dy }) {
    if (!Array.isArray(objetos) || objetos.length === 0) return;
    const { errores } = resolverFigura(objetos);
    if (errores.length > 0) console.error('La figura de geometría tiene errores:', errores);
    geometria = {
        escala: esNumero(escala) && escala > 0 ? escala : ESCALA_INICIAL,
        unidadLargo: typeof unidadLargo === 'string' ? unidadLargo.slice(0, LETRAS_UNIDAD) : 'u',
        objetos: objetos.map((o) => (esNumero(o?.x) && esNumero(o?.y) ? { ...o, x: o.x + dx, y: o.y + dy } : o))
    };
    dibujarGeometria();
}

// Para "Copiar escena": la parte de geometría, o null si no hay
const geometriaParaExportar = () => (hayGeometria() ? { ...geometria } : null);

function limpiarGeometria() {
    geometria = { ...geometria, objetos: [] };
    elegirPunto(null);
    dibujarGeometria();
}

function resaltarObjeto(id) {
    const calculado = calculados.get(String(id));
    return calculado ? dibujarResaltado(calculado) : null;
}

function medirGeometria(activo) {
    midiendo = activo;
    dibujarGeometria();
}

function mostrarObjetos(ids) {
    mostrados = new Set(ids);
    dibujarGeometria();
}

/* ---------- Inicio ---------- */

function iniciarGeometria() {
    listaGeometria.replaceChildren(...Object.entries(PLANTILLAS).map(crearRecursoGeometria));
    capaGeometria.addEventListener('pointerdown', alTocarGeometria);
    lienzo.addEventListener('pointerdown', alTocarLienzo, true);
    window.addEventListener('pointermove', alMoverPuntos);
    window.addEventListener('pointerup', alSoltarPuntos);
    document.addEventListener('keydown', alPresionarTeclaGeometria);
    botonMedidas.addEventListener('click', alternarMedidas);
    botones.eliminar.addEventListener('click', eliminarPuntoElegido);
    reflejarMedidas();
}

iniciarGeometria();
