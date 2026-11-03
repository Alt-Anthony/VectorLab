// Inicio: muestra las tarjetas de los cursos.

function crearTarjetaCurso(curso) {
    const tarjeta = crearElemento('a', 'tarjeta');
    tarjeta.href = `curso.html?curso=${encodeURIComponent(curso.clave)}`;
    tarjeta.append(
        crearElemento('h3', '', curso.nombre),
        crearElemento('p', 'texto-suave', `${curso.total_temas} temas · ${curso.total_preguntas} preguntas`)
    );
    return tarjeta;
}

async function cargarCursos() {
    const contenedor = document.getElementById('listaCursos');
    try {
        const cursos = await pedirDatos('/api/cursos');
        contenedor.replaceChildren(...cursos.map(crearTarjetaCurso));
    } catch (error) {
        mostrarError(contenedor, error);
    }
}

cargarCursos();
