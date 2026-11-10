// Carga en el lienzo la figura de una pregunta (?pregunta=ID) y deja copiar una figura que armaste a mano.
// Así se guarda una figura (JSON); puede tener solo física, solo geometría o las dos cosas:
//   { "unidad": "N" | "kg" | "kgf", "piezas": [{ tipo, x, y, rotacion?, valor?, texto?, largo?, angulo?, espejo?, ref? }],
//     "escala": 20, "unidadLargo": "m", "objetos": [{ id, tipo, ... }] }
//   piezas: física. valor va en kg para bloques y barras y en N para fuerzas; ref es el nombre que usan los pasos.
//   objetos: geometría (ver motor-geometria.js). escala son los px que mide una unidad de largo.
// Se apoya en editor-lienzo.js (el lienzo y las piezas), dibujo-piezas.js (el catálogo),
// api.js (para pedir la pregunta al servidor) y solucion-pasos.js (para preparar los pasos).
// Al final le presta la figura a la solución paso a paso (figuraParaPasos).

const MARGEN_SUPERIOR = 120;     // a qué altura se pone la figura de la pregunta
const REF_VALIDA = /^[A-Za-z0-9_]{1,30}$/;
const DURACION_AVISO_MS = 1500;
const botonCopiarEscena = $('btnCopiarEscena');
const tituloLaboratorio = $('tituloLaboratorio');

let desplazamientoEscena = { dx: 0, dy: 0 }; // cuánto se movió la figura al centrarla; los pasos lo usan para dibujar en el mismo lugar

/* ---------- Cargar ---------- */

// De cada pieza solo se toman los datos que le corresponden (un techo no tiene peso, por ejemplo)
function datosExtra(p) {
    const definicion = PIEZAS[p.tipo];
    const extra = { rotacion: Number(p.rotacion) || 0 };
    if (VALORES[p.tipo] && Number.isFinite(p.valor)) extra.valor = p.valor;
    if (definicion.textoInicial !== undefined && typeof p.texto === 'string') extra.texto = p.texto.slice(0, TEXTO_MAXIMO);
    if (definicion.largoInicial !== undefined && Number.isInteger(p.largo) && p.largo > 0) extra.largo = p.largo;
    if (definicion.anguloInicial !== undefined && Number.isFinite(p.angulo)) extra.angulo = p.angulo;
    if (definicion.espejable && p.espejo === true) extra.espejo = true;
    if (typeof p.ref === 'string' && REF_VALIDA.test(p.ref)) extra.ref = p.ref;
    return extra;
}

// Hasta dónde llegan los centros de las piezas guardadas (o null si no hay)
function limitesDePiezas(lista) {
    if (lista.length === 0) return null;
    const xs = lista.map((p) => p.x);
    const ys = lista.map((p) => p.y);
    return { izquierda: Math.min(...xs), derecha: Math.max(...xs), arriba: Math.min(...ys), abajo: Math.max(...ys) };
}

// Pone la figura (física y geometría juntas) centrada a lo ancho del lienzo
function cargarEscena(escena) {
    if (!escena) return;
    if (UNIDADES[escena.unidad]) {
        unidadActual = escena.unidad;
        entradas.unidad.value = escena.unidad;
    }
    const validas = (Array.isArray(escena.piezas) ? escena.piezas : [])
        .filter((p) => PIEZAS[p.tipo] && Number.isFinite(p.x) && Number.isFinite(p.y));
    const objetos = Array.isArray(escena.objetos) ? escena.objetos : [];
    const limites = unirLimites(limitesDePiezas(validas), limitesDeFigura(resolverFigura(objetos).calculados));
    if (!limites) return;

    const dx = ajustarACuadricula(lienzo.getBoundingClientRect().width / 2 - (limites.izquierda + limites.derecha) / 2);
    const dy = ajustarACuadricula(MARGEN_SUPERIOR - limites.arriba);
    desplazamientoEscena = { dx, dy };
    validas.forEach((p) => agregarPieza(p.tipo, p.x + dx, p.y + dy, datosExtra(p)));
    cargarGeometria({ escala: escena.escala, unidadLargo: escena.unidadLargo, objetos }, desplazamientoEscena);
    // Una pregunta de pura geometría no necesita el suelo de la física
    document.body.classList.toggle('sin-suelo', MODO_SOLUCION && validas.length === 0);
    seleccionar(null);
    actualizarConexiones({ registrar: true, sonar: false });
}

async function cargarPreguntaDeLaUrl() {
    const id = parametrosUrl.get('pregunta');
    if (!/^[1-9]\d*$/.test(id || '')) return;
    try {
        const pregunta = await pedirDatos(`/api/preguntas/${id}`);
        tituloLaboratorio.textContent = `Laboratorio · ${pregunta.tema}`;
        document.title = `Laboratorio · ${pregunta.tema} - VectorLab`;
        cargarEscena(pregunta.escena);
        prepararPasos(pregunta.pasos);
    } catch (error) {
        console.error('No se pudo cargar la pregunta:', error);
    }
}

/* ---------- Copiar la figura (para preparar una pregunta nueva) ---------- */

function piezaParaExportar(p) {
    const datos = { tipo: p.tipo, x: p.x, y: p.y };
    if (p.rotacion) datos.rotacion = p.rotacion;
    if (p.valor !== null) datos.valor = Number(p.valor.toFixed(4));
    if (p.texto !== null) datos.texto = p.texto;
    if (p.largo !== null) datos.largo = p.largo;
    if (p.angulo !== null) datos.angulo = p.angulo;
    if (p.espejo) datos.espejo = true;
    if (p.ref) datos.ref = p.ref;
    return datos;
}

const listaJson = (lista) => `[\n${lista.map((elemento) => `        ${JSON.stringify(elemento)}`).join(',\n')}\n    ]`;

// Una pieza (o un objeto de geometría) por línea, lista para pegar en bd/04_escenas.sql o bd/05_geometria.sql
function escenaComoJson() {
    const partes = [`    "unidad": "${unidadActual}"`, `    "piezas": ${listaJson(piezas.map(piezaParaExportar))}`];
    const geometriaActual = geometriaParaExportar();
    if (geometriaActual) {
        partes.push(
            `    "escala": ${geometriaActual.escala}`,
            `    "unidadLargo": ${JSON.stringify(geometriaActual.unidadLargo)}`,
            `    "objetos": ${listaJson(geometriaActual.objetos)}`
        );
    }
    return `{\n${partes.join(',\n')}\n}`;
}

async function copiarEscena() {
    const textoOriginal = botonCopiarEscena.textContent;
    try {
        await navigator.clipboard.writeText(escenaComoJson());
        botonCopiarEscena.textContent = '✓ Copiada';
    } catch (error) {
        console.error('No se pudo copiar la escena:', error);
        botonCopiarEscena.textContent = 'No se pudo copiar';
    }
    setTimeout(() => { botonCopiarEscena.textContent = textoOriginal; }, DURACION_AVISO_MS);
}

/* ---------- Lo que la solución paso a paso necesita de esta figura (ver solucion-pasos.js) ---------- */

// El cuadro rojo que marca una pieza por su nombre (ref)
function resaltarPieza(ref) {
    const pieza = piezas.find((p) => p.ref === ref);
    if (!pieza) return null;
    const { zona: [x, y, ancho, alto] } = dibujoDe(pieza);
    const grupo = document.createElementNS(SVG_NS, 'g');
    grupo.setAttribute('transform', `translate(${pieza.x} ${pieza.y}) rotate(${pieza.rotacion})`);
    const cuadro = document.createElementNS(SVG_NS, 'rect');
    Object.entries({ x: x - 6, y: y - 6, width: ancho + 12, height: alto + 12, rx: 6, class: 'resaltado' })
        .forEach(([nombre, valor]) => cuadro.setAttribute(nombre, valor));
    grupo.append(cuadro);
    return grupo;
}

// Lo que ocupan todas las piezas juntas en el lienzo (o null si no hay piezas)
function marcoDePiezas() {
    if (piezas.length === 0) return null;
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

// Los pasos pueden marcar piezas de física (por su ref) u objetos de geometría (por su id).
// "Simular" arranca la física (si hay piezas) y hace que la geometría muestre sus medidas.
const figuraParaPasos = {
    marco: () => unirLimites(marcoDePiezas(), limitesDeGeometria()) || { izquierda: 0, derecha: 0, arriba: 0, abajo: 0 },
    resaltar: (ref) => resaltarPieza(ref) || resaltarObjeto(ref),
    aLienzo: (x, y) => ({ x: x + desplazamientoEscena.dx, y: y + desplazamientoEscena.dy }),
    simular: (activo) => {
        if (activo && piezas.length > 0) {
            iniciarSimulacion();
        } else {
            detenerSimulacion();
        }
        medirGeometria(activo);
    },
    mostrar: mostrarObjetos
};

botonCopiarEscena.addEventListener('click', copiarEscena);
// Se espera a que carguen todos los scripts (los pasos están en solucion-pasos.js, que va después)
document.addEventListener('DOMContentLoaded', cargarPreguntaDeLaUrl);
