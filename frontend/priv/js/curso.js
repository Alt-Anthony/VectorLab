// Página de un curso: muestra sus temas.

const claveCurso = new URLSearchParams(window.location.search).get('curso');

function crearTarjetaTema(tema) {
    const tarjeta = crearElemento('a', 'tarjeta');
    tarjeta.href = `tema.html?curso=${encodeURIComponent(claveCurso)}&tema=${encodeURIComponent(tema.clave)}`;

    if (tema.imagen) {
        const miniatura = crearElemento('img', 'miniatura');
        miniatura.src = tema.imagen;
        miniatura.alt = '';
        miniatura.loading = 'lazy';
        tarjeta.append(miniatura);
    }

    tarjeta.append(
        crearElemento('h3', '', tema.nombre),
        crearElemento('p', 'texto-suave', tema.descripcion),
        crearElemento('span', 'chip', `${tema.total_preguntas} preguntas`)
    );
    return tarjeta;
}

async function cargarTemas() {
    const contenedor = document.getElementById('listaTemas');
    if (!claveCurso) {
        mostrarError(contenedor, new Error('No se indicó el curso'));
        return;
    }

    try {
        const { curso, temas } = await pedirDatos(`/api/cursos/${encodeURIComponent(claveCurso)}/temas`);
        document.title = `${curso.nombre} - VectorLab`;
        document.getElementById('tituloCurso').textContent = curso.nombre;
        contenedor.replaceChildren(...temas.map(crearTarjetaTema));
    } catch (error) {
        document.getElementById('tituloCurso').textContent = 'Curso';
        mostrarError(contenedor, error);
    }
}

cargarTemas();
