// Funciones compartidas por las páginas de cursos, temas y preguntas.

// Pide datos a la API y devuelve el campo `data`. Si la sesión expiró, vuelve al login.
async function pedirDatos(url) {
    const res = await fetch(url);
    if (res.status === 401) {
        window.location.href = '../../pub/pages/login.html';
        throw new Error('Tu sesión expiró');
    }

    const respuesta = await res.json();
    if (!res.ok) {
        throw new Error(respuesta.message || 'No se pudieron cargar los datos');
    }
    return respuesta.data;
}

// Crea un elemento HTML con clase y texto. Usa textContent para no interpretar HTML.
function crearElemento(etiqueta, clase, texto) {
    const elemento = document.createElement(etiqueta);
    if (clase) elemento.className = clase;
    if (texto !== undefined && texto !== null) elemento.textContent = texto;
    return elemento;
}

// El banco escribe las fórmulas con $$...$$ dentro de la oración, así que se muestran en línea (KaTeX)
const OPCIONES_KATEX = {
    delimiters: [
        { left: '$$', right: '$$', display: false },
        { left: '$', right: '$', display: false }
    ],
    throwOnError: false
};

function renderizarFormulas(elemento) {
    if (typeof window.renderMathInElement === 'function') {
        window.renderMathInElement(elemento, OPCIONES_KATEX);
    }
}

function mostrarError(contenedor, error) {
    contenedor.replaceChildren(crearElemento('p', 'error', error.message));
}
