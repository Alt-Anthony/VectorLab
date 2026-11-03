const {
    listarCursos,
    buscarCurso,
    buscarTema,
    listarTemasDeCurso,
    listarPreguntas,
    buscarPregunta
} = require('../data/cursos');

const ID_VALIDO = /^[1-9]\d{0,9}$/;

exports.obtenerPregunta = async (req, res) => {
    const { id } = req.params;
    if (!ID_VALIDO.test(id)) {
        return res.status(400).json({ status: 'fail', message: 'Pregunta inválida' });
    }

    try {
        const pregunta = await buscarPregunta(Number(id));
        if (!pregunta) {
            return res.status(404).json({ status: 'fail', message: 'Pregunta no encontrada' });
        }
        res.status(200).json({ status: 'success', data: pregunta });
    } catch (error) {
        console.error('Error al obtener la pregunta:', error);
        res.status(500).json({ status: 'fail', message: 'Error al obtener la pregunta' });
    }
};

// Las claves de curso y tema solo tienen letras minúsculas y guion bajo (ej. "triangulo_rectangulo")
const CLAVE_VALIDA = /^[a-z_]{1,40}$/;

exports.obtenerCursos = async (req, res) => {
    try {
        const cursos = await listarCursos();
        res.status(200).json({ status: 'success', data: cursos });
    } catch (error) {
        console.error('Error al listar cursos:', error);
        res.status(500).json({ status: 'fail', message: 'Error al obtener los cursos' });
    }
};

exports.obtenerTemas = async (req, res) => {
    const { curso } = req.params;
    if (!CLAVE_VALIDA.test(curso)) {
        return res.status(400).json({ status: 'fail', message: 'Curso inválido' });
    }

    try {
        const cursoEncontrado = await buscarCurso(curso);
        if (!cursoEncontrado) {
            return res.status(404).json({ status: 'fail', message: 'Curso no encontrado' });
        }

        const temas = await listarTemasDeCurso(cursoEncontrado.id);
        res.status(200).json({
            status: 'success',
            data: { curso: { clave: cursoEncontrado.clave, nombre: cursoEncontrado.nombre }, temas }
        });
    } catch (error) {
        console.error('Error al listar temas:', error);
        res.status(500).json({ status: 'fail', message: 'Error al obtener los temas' });
    }
};

exports.obtenerPreguntas = async (req, res) => {
    const { curso, tema } = req.params;
    if (!CLAVE_VALIDA.test(curso) || !CLAVE_VALIDA.test(tema)) {
        return res.status(400).json({ status: 'fail', message: 'Curso o tema inválido' });
    }

    try {
        const [cursoEncontrado, temaEncontrado] = await Promise.all([buscarCurso(curso), buscarTema(tema)]);
        if (!cursoEncontrado || !temaEncontrado) {
            return res.status(404).json({ status: 'fail', message: 'Curso o tema no encontrado' });
        }

        const preguntas = await listarPreguntas(cursoEncontrado.id, temaEncontrado.id);
        res.status(200).json({
            status: 'success',
            data: {
                curso: { clave: cursoEncontrado.clave, nombre: cursoEncontrado.nombre },
                tema: { clave: temaEncontrado.clave, nombre: temaEncontrado.nombre, descripcion: temaEncontrado.descripcion },
                preguntas
            }
        });
    } catch (error) {
        console.error('Error al listar preguntas:', error);
        res.status(500).json({ status: 'fail', message: 'Error al obtener las preguntas' });
    }
};
