// Página de un tema: muestra sus preguntas con figura, alternativas y resolución.

const parametros = new URLSearchParams(window.location.search);
const claveCurso = parametros.get('curso');
const claveTema = parametros.get('tema');

// Temas que ya se pueden armar en el laboratorio (se abre en otra pestaña, en la pestaña de recursos que les toca)
const LABORATORIO_GEOMETRIA = '/laboratorio?pestana=geometria';
const LABORATORIOS = Object.freeze({
    palanca_equilibrio: '/laboratorio',
    angulos: LABORATORIO_GEOMETRIA,
    triangulo_rectangulo: LABORATORIO_GEOMETRIA,
    triangulo_semejanza: LABORATORIO_GEOMETRIA,
    circunferencia: LABORATORIO_GEOMETRIA,
    poligonos_areas: LABORATORIO_GEOMETRIA,
    sector_circular: LABORATORIO_GEOMETRIA
});

function mostrarBotonLaboratorio(tema) {
    const ruta = LABORATORIOS[tema.clave];
    if (!ruta) return;
    const boton = crearElemento('a', 'boton-link', 'Abrir laboratorio');
    boton.href = ruta;
    boton.target = '_blank';
    boton.rel = 'noopener';
    document.getElementById('descripcionTema').after(boton);
}

// En los temas con laboratorio, la solución se abre en otra pestaña junto al laboratorio
function crearEnlaceSolucion(pregunta) {
    const contenedor = crearElemento('div', 'acciones-pregunta');
    const enlace = crearElemento('a', 'boton-link', 'Ver solución');
    enlace.href = `/solucion?pregunta=${pregunta.id}`;
    enlace.target = '_blank';
    enlace.rel = 'noopener';
    contenedor.append(enlace);
    return contenedor;
}

function crearAlternativas(alternativas) {
    const lista = crearElemento('ul', 'alternativas');
    lista.append(...alternativas.map((a) => crearElemento('li', '', `${a.letra}) ${a.texto}`)));
    return lista;
}

function crearRespuesta(pregunta) {
    const detalles = crearElemento('details', 'respuesta');
    const correcta = pregunta.alternativas.find((a) => a.es_correcta);
    detalles.append(
        crearElemento('summary', '', 'Ver respuesta y resolución'),
        crearElemento('p', 'success', correcta ? `Respuesta: ${correcta.letra}) ${correcta.texto}` : 'Sin respuesta registrada'),
        crearElemento('p', 'enunciado', pregunta.resolucion || 'Sin resolución.')
    );
    return detalles;
}

function crearFigura(imagen) {
    const figura = crearElemento('figure', 'figura');
    const img = crearElemento('img');
    img.src = imagen;
    img.alt = 'Figura de la pregunta';
    img.loading = 'lazy';
    figura.append(img);
    return figura;
}

function crearTarjetaPregunta(pregunta, indice) {
    const tarjeta = crearElemento('article', 'card');

    const cabecera = crearElemento('div', 'pregunta-cabecera');
    cabecera.append(crearElemento('h3', '', `Pregunta ${indice + 1}`), crearElemento('span', 'chip', pregunta.fuente));

    const texto = crearElemento('div');
    texto.append(crearElemento('p', 'enunciado', pregunta.enunciado), crearAlternativas(pregunta.alternativas));

    const cuerpo = crearElemento('div', pregunta.imagen ? 'pregunta-cuerpo con-imagen' : 'pregunta-cuerpo');
    if (pregunta.imagen) cuerpo.append(crearFigura(pregunta.imagen));
    cuerpo.append(texto);

    // Si la pregunta ya tiene su figura armada, abre la solución paso a paso; si no, muestra la respuesta escrita
    const conLaboratorio = LABORATORIOS[claveTema] && pregunta.tiene_solucion;
    tarjeta.append(cabecera, cuerpo, conLaboratorio ? crearEnlaceSolucion(pregunta) : crearRespuesta(pregunta));
    return tarjeta;
}

async function cargarPreguntas() {
    const contenedor = document.getElementById('listaPreguntas');
    if (!claveCurso || !claveTema) {
        mostrarError(contenedor, new Error('No se indicó el curso o el tema'));
        return;
    }

    const volver = document.getElementById('volverCurso');
    volver.href = `curso.html?curso=${encodeURIComponent(claveCurso)}`;

    try {
        const ruta = `/api/cursos/${encodeURIComponent(claveCurso)}/temas/${encodeURIComponent(claveTema)}/preguntas`;
        const { curso, tema, preguntas } = await pedirDatos(ruta);
        document.title = `${tema.nombre} - VectorLab`;
        volver.textContent = `← ${curso.nombre}`;
        document.getElementById('tituloTema').textContent = tema.nombre;
        document.getElementById('descripcionTema').textContent = `${curso.nombre} · ${tema.descripcion}`;
        mostrarBotonLaboratorio(tema);
        contenedor.replaceChildren(...preguntas.map(crearTarjetaPregunta));
        renderizarFormulas(contenedor);
    } catch (error) {
        document.getElementById('tituloTema').textContent = 'Tema';
        mostrarError(contenedor, error);
    }
}

cargarPreguntas();
