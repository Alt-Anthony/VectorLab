// Escenas: cargar la figura de una pregunta (?pregunta=ID) y copiar la figura armada en el editor como JSON.
// Formato: { "unidad": "N" | "kg" | "kgf", "piezas": [{ tipo, x, y, rotacion?, valor?, texto?, largo?, ref? }] }
//   valor en unidades internas (kg para bloques y barras, N para fuerzas); ref es el nombre que usan los pasos.
// Usa del editor: $, piezas, unidadActual, entradas, lienzo, parametrosUrl, agregarPieza, seleccionar,
// actualizarConexiones, ajustarACuadricula y TEXTO_MAXIMO; de piezas.js: PIEZAS, VALORES y UNIDADES;
// de api.js: pedirDatos; de pasos.js: prepararPasos.

const MARGEN_SUPERIOR = 120;     // altura a la que se coloca la figura de una pregunta
const REF_VALIDA = /^[A-Za-z0-9_]{1,30}$/;
const DURACION_AVISO_MS = 1500;
const botonCopiarEscena = $('btnCopiarEscena');
const tituloLaboratorio = $('tituloLaboratorio');

let desplazamientoEscena = { dx: 0, dy: 0 }; // cuánto se movió la escena al centrarla (lo usan los pasos)

/* ---------- Cargar ---------- */

// Solo se aceptan los datos que tienen sentido para ese tipo de pieza
function datosExtra(p) {
    const definicion = PIEZAS[p.tipo];
    const extra = { rotacion: Number(p.rotacion) || 0 };
    if (VALORES[p.tipo] && Number.isFinite(p.valor)) extra.valor = p.valor;
    if (definicion.textoInicial !== undefined && typeof p.texto === 'string') extra.texto = p.texto.slice(0, TEXTO_MAXIMO);
    if (definicion.largoInicial !== undefined && Number.isInteger(p.largo) && p.largo > 0) extra.largo = p.largo;
    if (typeof p.ref === 'string' && REF_VALIDA.test(p.ref)) extra.ref = p.ref;
    return extra;
}

// Coloca las piezas centradas a lo ancho del lienzo
function cargarEscena(escena) {
    if (!escena || !Array.isArray(escena.piezas)) return;
    if (UNIDADES[escena.unidad]) {
        unidadActual = escena.unidad;
        entradas.unidad.value = escena.unidad;
    }
    const validas = escena.piezas.filter((p) => PIEZAS[p.tipo] && Number.isFinite(p.x) && Number.isFinite(p.y));
    if (validas.length === 0) return;

    const xs = validas.map((p) => p.x);
    const ys = validas.map((p) => p.y);
    const dx = ajustarACuadricula(lienzo.getBoundingClientRect().width / 2 - (Math.min(...xs) + Math.max(...xs)) / 2);
    const dy = ajustarACuadricula(MARGEN_SUPERIOR - Math.min(...ys));
    desplazamientoEscena = { dx, dy };
    validas.forEach((p) => agregarPieza(p.tipo, p.x + dx, p.y + dy, datosExtra(p)));
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

/* ---------- Copiar (para armar la escena de una pregunta nueva) ---------- */

function piezaParaExportar(p) {
    const datos = { tipo: p.tipo, x: p.x, y: p.y };
    if (p.rotacion) datos.rotacion = p.rotacion;
    if (p.valor !== null) datos.valor = Number(p.valor.toFixed(4));
    if (p.texto !== null) datos.texto = p.texto;
    if (p.largo !== null) datos.largo = p.largo;
    if (p.ref) datos.ref = p.ref;
    return datos;
}

// Una pieza por línea, listo para pegar en bd/04_escenas.sql
function escenaComoJson() {
    const lineas = piezas.map((p) => `        ${JSON.stringify(piezaParaExportar(p))}`);
    return `{\n    "unidad": "${unidadActual}",\n    "piezas": [\n${lineas.join(',\n')}\n    ]\n}`;
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

botonCopiarEscena.addEventListener('click', copiarEscena);
cargarPreguntaDeLaUrl();
