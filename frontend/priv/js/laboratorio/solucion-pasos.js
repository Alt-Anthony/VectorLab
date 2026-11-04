// Resolución paso a paso (modo solución).
// Cada paso puede resaltar piezas (cuadros rojos), dibujar flechas de fuerza y cotas, y simular.
// La explicación de cada paso la muestra la página de la solución (ventana padre) al recibir un mensaje.
// Usa de editor-lienzo.js: $, SVG_NS, lienzo, piezas, iniciarSimulacion, detenerSimulacion y botones;
// de cargar-figura.js: desplazamientoEscena; de dibujo-piezas.js: dibujoDe y dibujarCota; de api.js: renderizarFormulas.

const LARGO_FLECHA = 60;
const ANCHO_TEXTO = 280;      // ancho de la explicación y de la columna de fórmulas
const ALTO_TEXTO = 280;
const ALTO_FORMULA = 36;
const SEPARACION = 28;        // espacio entre la figura y el texto
const capaAnotaciones = $('capaAnotaciones');
const controlesPasos = $('controlesPasos');
const botonAnterior = $('btnAnterior');
const botonSiguiente = $('btnSiguiente');
const contadorPaso = $('contadorPaso');

let pasos = [];
let indicePaso = -1;
let marco = null; // rectángulo que ocupa la figura en el lienzo: { izquierda, derecha, arriba, abajo }

function prepararPasos(lista) {
    pasos = Array.isArray(lista) ? lista.filter((p) => p && typeof p.titulo === 'string') : [];
}

const hayPasos = () => pasos.length > 0;

function crearSvg(etiqueta, atributos = {}) {
    const elemento = document.createElementNS(SVG_NS, etiqueta);
    Object.entries(atributos).forEach(([nombre, valor]) => elemento.setAttribute(nombre, valor));
    return elemento;
}

function crearTspan(texto, atributos) {
    const tspan = crearSvg('tspan', atributos);
    tspan.textContent = String(texto);
    return tspan;
}

// Las coordenadas de los pasos están en el mismo sistema que la escena guardada
const aLienzo = (x, y) => ({ x: x + desplazamientoEscena.dx, y: y + desplazamientoEscena.dy });

/* ---------- Anotaciones ---------- */

function resaltarPieza(ref) {
    const pieza = piezas.find((p) => p.ref === ref);
    if (!pieza) return null;
    const { zona: [x, y, ancho, alto] } = dibujoDe(pieza);
    const grupo = crearSvg('g', { transform: `translate(${pieza.x} ${pieza.y}) rotate(${pieza.rotacion})` });
    grupo.append(crearSvg('rect', { x: x - 6, y: y - 6, width: ancho + 12, height: alto + 12, rx: 6, class: 'resaltado' }));
    return grupo;
}

// Texto como "T" + subíndice "B" + " = 40 N"
function crearEtiquetaFlecha(punta, { texto, sub, despues, lado }) {
    const izquierda = lado === 'izquierda';
    const etiqueta = crearSvg('text', {
        x: punta.x + (izquierda ? -8 : 8),
        y: punta.y + 5,
        'text-anchor': izquierda ? 'end' : 'start'
    });
    etiqueta.append(String(texto));
    if (sub) etiqueta.append(crearTspan(sub, { dy: 4, 'font-size': 10 }));
    if (despues) etiqueta.append(crearTspan(despues, sub ? { dy: -4 } : {}));
    return etiqueta;
}

function crearFlecha({ x, y, dx = 0, dy = -1, largo = LARGO_FLECHA, texto = '', sub = '', despues = '', lado = 'derecha' }) {
    if (![x, y, dx, dy, largo].every(Number.isFinite)) return null;
    const inicio = aLienzo(x, y);
    const norma = Math.hypot(dx, dy) || 1;
    const ux = dx / norma;
    const uy = dy / norma;
    const punta = { x: inicio.x + ux * largo, y: inicio.y + uy * largo };
    const base = { x: punta.x - ux * 12, y: punta.y - uy * 12 };

    const grupo = crearSvg('g', { class: 'flecha-paso' });
    grupo.append(
        crearSvg('line', { x1: inicio.x, y1: inicio.y, x2: base.x, y2: base.y }),
        crearSvg('polygon', { points: `${punta.x},${punta.y} ${base.x - uy * 6},${base.y + ux * 6} ${base.x + uy * 6},${base.y - ux * 6}` }),
        crearEtiquetaFlecha(punta, { texto, sub, despues, lado })
    );
    return grupo;
}

function crearCotaPaso({ x, y, largo, texto }) {
    if (![x, y, largo].every(Number.isFinite)) return null;
    const posicion = aLienzo(x, y);
    const grupo = crearSvg('g', { class: 'cota-paso', transform: `translate(${posicion.x} ${posicion.y})` });
    grupo.innerHTML = dibujarCota({ largo }); // marcado fijo; el texto se pone con textContent
    grupo.querySelector('.texto').textContent = String(texto ?? '');
    return grupo;
}

/* ---------- Texto y fórmulas dibujados en los espacios vacíos del lienzo ---------- */

function calcularMarco() {
    const cajas = piezas.map((p) => {
        const { zona: [x, y, ancho, alto] } = dibujoDe(p);
        return { x1: p.x + x, y1: p.y + y, x2: p.x + x + ancho, y2: p.y + y + alto };
    });
    return {
        izquierda: Math.min(...cajas.map((c) => c.x1)),
        derecha: Math.max(...cajas.map((c) => c.x2)),
        arriba: Math.min(...cajas.map((c) => c.y1)),
        abajo: Math.max(...cajas.map((c) => c.y2))
    };
}

// La explicación va a la izquierda de la figura; si no cabe, debajo
function posicionTexto() {
    const x = marco.izquierda - SEPARACION - ANCHO_TEXTO;
    return x >= 10 ? { x, y: marco.arriba } : { x: marco.izquierda, y: marco.abajo + SEPARACION };
}

// Las fórmulas van a la derecha de la figura; si no caben, debajo de la explicación
function posicionFormulas() {
    const x = marco.derecha + SEPARACION;
    const cabe = x + ANCHO_TEXTO <= lienzo.getBoundingClientRect().width - 10;
    return cabe ? { x, y: marco.arriba } : { x: marco.izquierda, y: marco.abajo + SEPARACION + ALTO_TEXTO / 2 };
}

// HTML dentro del SVG (foreignObject) para poder usar texto con saltos de línea y KaTeX
function crearHtmlEnSvg({ x, y }, ancho, alto, clase) {
    const objeto = crearSvg('foreignObject', { x, y, width: ancho, height: alto, class: 'html-en-svg' });
    const div = document.createElement('div');
    div.className = clase;
    objeto.append(div);
    return { objeto, div };
}

function crearTextoPaso(paso) {
    const { objeto, div } = crearHtmlEnSvg(posicionTexto(), ANCHO_TEXTO, ALTO_TEXTO, 'texto-paso');
    const titulo = document.createElement('strong');
    titulo.textContent = `Paso ${indicePaso + 1} · ${paso.titulo}`;
    div.append(titulo, String(paso.explicacion || ''));
    renderizarFormulas(div);
    return objeto;
}

function escribirFormula(div, latex) {
    if (window.katex) {
        window.katex.render(latex, div, { throwOnError: false });
    } else {
        div.textContent = latex;
    }
}

// Fórmulas acumuladas: las de pasos anteriores en gris, las del paso actual en rojo
function crearFormulas() {
    const inicio = posicionFormulas();
    const lista = pasos.slice(0, indicePaso + 1).flatMap((paso, i) =>
        (Array.isArray(paso.formulas) ? paso.formulas : []).map((latex) => ({ latex: String(latex), nueva: i === indicePaso }))
    );
    return lista.map(({ latex, nueva }, i) => {
        const posicion = { x: inicio.x, y: inicio.y + i * ALTO_FORMULA };
        const { objeto, div } = crearHtmlEnSvg(posicion, ANCHO_TEXTO + 80, ALTO_FORMULA, nueva ? 'formula-paso nueva' : 'formula-paso');
        if (!nueva) objeto.classList.add('anterior');
        escribirFormula(div, latex);
        return objeto;
    });
}

function dibujarAnotaciones(paso) {
    const elementos = [
        ...(paso.resaltar || []).map(resaltarPieza),
        ...(paso.cotas || []).map(crearCotaPaso),
        ...(paso.flechas || []).map(crearFlecha),
        crearTextoPaso(paso),
        ...crearFormulas()
    ].filter(Boolean);
    capaAnotaciones.replaceChildren(...elementos);
}

/* ---------- Navegación ---------- */

function actualizarControles() {
    contadorPaso.textContent = `Paso ${indicePaso + 1} de ${pasos.length}`;
    botonAnterior.disabled = indicePaso === 0;
    botonSiguiente.disabled = indicePaso === pasos.length - 1;
}

function avisarALaSolucion(paso) {
    if (window.parent === window) return;
    window.parent.postMessage({ tipo: 'paso', indice: indicePaso, total: pasos.length, paso }, window.location.origin);
}

function irAPaso(indice) {
    if (indice < 0 || indice >= pasos.length) return;
    indicePaso = indice;
    const paso = pasos[indice];
    if (paso.simular) {
        iniciarSimulacion();
    } else {
        detenerSimulacion();
    }
    dibujarAnotaciones(paso);
    actualizarControles();
    avisarALaSolucion(paso);
}

function empezarPasos() {
    marco = calcularMarco();
    botones.simular.hidden = true;
    controlesPasos.hidden = false;
    irAPaso(0);
}

botonAnterior.addEventListener('click', () => irAPaso(indicePaso - 1));
botonSiguiente.addEventListener('click', () => irAPaso(indicePaso + 1));
