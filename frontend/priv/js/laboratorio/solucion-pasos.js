// La solución paso a paso, como si se resolviera en la pizarra. La usan los dos laboratorios (física y geometría).
// En cada paso se marcan piezas en rojo, se dibujan flechas y medidas, y a veces se simula (o se mide).
// Cada paso le avisa a la página de la solución en qué paso vamos (en el último marca la alternativa correcta).
// Cada laboratorio le presta su figura con el objeto figuraParaPasos:
//   marco()          → { izquierda, derecha, arriba, abajo }: lo que ocupa la figura en el lienzo
//   resaltar(ref)    → el dibujo rojo que marca esa pieza u objeto (o null si no existe)
//   aLienzo(x, y)    → pasa una posición guardada con la figura a su lugar en el lienzo
//   simular(activo)  → arranca o detiene la simulación (en geometría: muestra las medidas)
//   mostrar(ids)     → (opcional) hace aparecer los objetos ocultos que ya mostró algún paso
// Además usa $, SVG_NS y lienzo del laboratorio, dibujarCota de cota.js y renderizarFormulas de api.js.

const LARGO_FLECHA = 60;
const ANCHO_TEXTO = 280;      // ancho del texto de la explicación y de las fórmulas
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
let marco = null; // el espacio que ocupa la figura, para escribir alrededor sin taparla: { izquierda, derecha, arriba, abajo }

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

// Las posiciones de los pasos se miden igual que la figura guardada; aquí se pasan al lienzo
const aLienzo = (x, y) => figuraParaPasos.aLienzo(x, y);

/* ---------- Anotaciones ---------- */

// El texto de la flecha, por ejemplo T con subíndice B y luego " = 40 N"
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
    grupo.innerHTML = dibujarCota({ largo }); // el dibujo de la cota es fijo; la medida se escribe aparte como texto
    grupo.querySelector('.texto').textContent = String(texto ?? '');
    return grupo;
}

/* ---------- Explicación y fórmulas escritas en los espacios vacíos, como en una pizarra ---------- */

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

// Para escribir texto con saltos de línea y fórmulas dentro del dibujo se mete HTML en el SVG (foreignObject)
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

// Las fórmulas se van acumulando: las de pasos anteriores en gris y las del paso actual en rojo
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
        ...(paso.resaltar || []).map((ref) => figuraParaPasos.resaltar(ref)),
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

// Lo que mostró un paso sigue visible en los siguientes (por ejemplo, un ángulo que ya se marcó)
const mostradosHasta = (indice) =>
    pasos.slice(0, indice + 1).flatMap((paso) => (Array.isArray(paso.mostrar) ? paso.mostrar.map(String) : []));

function irAPaso(indice) {
    if (indice < 0 || indice >= pasos.length) return;
    indicePaso = indice;
    const paso = pasos[indice];
    figuraParaPasos.mostrar?.(mostradosHasta(indice));
    figuraParaPasos.simular(Boolean(paso.simular));
    dibujarAnotaciones(paso);
    actualizarControles();
    avisarALaSolucion(paso);
}

function empezarPasos() {
    marco = figuraParaPasos.marco();
    $('btnSimular').hidden = true;
    controlesPasos.hidden = false;
    irAPaso(0);
}

botonAnterior.addEventListener('click', () => irAPaso(indicePaso - 1));
botonSiguiente.addEventListener('click', () => irAPaso(indicePaso + 1));
