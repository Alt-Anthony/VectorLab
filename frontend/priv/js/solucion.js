// Solución de una pregunta: enunciado, figura y alternativas a la izquierda; laboratorio con su figura a la derecha.

const idPregunta = new URLSearchParams(window.location.search).get('pregunta');

function crearAlternativas(alternativas) {
    const lista = crearElemento('ul', 'alternativas');
    lista.append(...alternativas.map((a) => crearElemento('li', a.es_correcta ? 'correcta' : '', `${a.letra}) ${a.texto}`)));
    return lista;
}

// Al abrir la resolución también se marca en verde la alternativa correcta
function crearResolucion(pregunta, lista) {
    const detalles = crearElemento('details', 'respuesta');
    const correcta = pregunta.alternativas.find((a) => a.es_correcta);
    detalles.append(
        crearElemento('summary', '', 'Ver respuesta y resolución'),
        crearElemento('p', 'correcta-texto', correcta ? `Respuesta: ${correcta.letra}) ${correcta.texto}` : 'Sin respuesta registrada'),
        crearElemento('p', '', pregunta.resolucion || 'Sin resolución.')
    );
    detalles.addEventListener('toggle', () => lista.classList.toggle('revelada', detalles.open));
    return detalles;
}

function mostrarPregunta(pregunta) {
    document.title = `${pregunta.tema} · Pregunta ${pregunta.numero} - VectorLab`;
    document.getElementById('ubicacion').textContent = `${pregunta.curso} · ${pregunta.tema} · Pregunta ${pregunta.numero}`;

    const contenedor = document.getElementById('pregunta');
    const lista = crearAlternativas(pregunta.alternativas);
    const elementos = [
        crearElemento('h1', '', `Pregunta ${pregunta.numero}`),
        crearElemento('p', 'sol-fuente', pregunta.fuente),
        crearElemento('p', 'enunciado', pregunta.enunciado)
    ];
    if (pregunta.imagen) {
        const figura = crearElemento('figure', 'figura');
        const img = crearElemento('img');
        img.src = pregunta.imagen;
        img.alt = 'Figura de la pregunta';
        figura.append(img);
        elementos.push(figura);
    }
    elementos.push(lista, crearResolucion(pregunta, lista));
    contenedor.replaceChildren(...elementos);
    renderizarFormulas(contenedor);
}

// El laboratorio (iframe) avisa qué paso muestra; en el paso de la respuesta se marca la alternativa correcta
window.addEventListener('message', (evento) => {
    if (evento.origin !== window.location.origin || evento.data?.tipo !== 'paso') return;
    document.querySelector('.alternativas')?.classList.toggle('revelada', Boolean(evento.data.paso?.respuesta));
});

async function iniciar() {
    const contenedor = document.getElementById('pregunta');
    if (!/^[1-9]\d*$/.test(idPregunta || '')) {
        mostrarError(contenedor, new Error('No se indicó la pregunta'));
        return;
    }

    document.getElementById('laboratorio').src = `/laboratorio?pregunta=${idPregunta}&modo=solucion`;
    try {
        mostrarPregunta(await pedirDatos(`/api/preguntas/${idPregunta}`));
    } catch (error) {
        mostrarError(contenedor, error);
    }
}

iniciar();
