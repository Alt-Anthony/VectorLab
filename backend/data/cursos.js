const pool = require('../db');

// Cursos con la cantidad de temas y preguntas que tienen
exports.listarCursos = async () => {
    const res = await pool.query(
        `SELECT c.clave, c.nombre,
                COUNT(DISTINCT p.tema_id)::int AS total_temas,
                COUNT(p.id)::int AS total_preguntas
         FROM cursos c
         LEFT JOIN preguntas p ON p.curso_id = c.id
         GROUP BY c.id
         ORDER BY c.orden`
    );
    return res.rows;
};

exports.buscarCurso = async (clave) => {
    const res = await pool.query('SELECT id, clave, nombre FROM cursos WHERE clave = $1', [clave]);
    return res.rows[0];
};

exports.buscarTema = async (clave) => {
    const res = await pool.query('SELECT id, clave, nombre, descripcion FROM temas WHERE clave = $1', [clave]);
    return res.rows[0];
};

// Temas que tienen preguntas en un curso, con una imagen de muestra
exports.listarTemasDeCurso = async (cursoId) => {
    const res = await pool.query(
        `SELECT t.clave, t.nombre, t.descripcion,
                COUNT(p.id)::int AS total_preguntas,
                MIN(p.imagen) AS imagen
         FROM temas t
         JOIN preguntas p ON p.tema_id = t.id
         WHERE p.curso_id = $1
         GROUP BY t.id
         ORDER BY t.nombre`,
        [cursoId]
    );
    return res.rows;
};

// Una pregunta con su curso, tema, número dentro del tema, escena y alternativas
exports.buscarPregunta = async (id) => {
    const res = await pool.query(
        `SELECT p.id, p.enunciado, p.imagen, p.fuente, p.resolucion, p.escena, p.pasos,
                c.nombre AS curso, t.nombre AS tema,
                (SELECT COUNT(*)::int FROM preguntas q
                 WHERE q.curso_id = p.curso_id AND q.tema_id = p.tema_id AND q.id <= p.id) AS numero
         FROM preguntas p
         JOIN cursos c ON c.id = p.curso_id
         JOIN temas t ON t.id = p.tema_id
         WHERE p.id = $1`,
        [id]
    );
    const pregunta = res.rows[0];
    if (!pregunta) return null;

    const alternativas = await pool.query(
        'SELECT letra, texto, es_correcta FROM alternativas WHERE pregunta_id = $1 ORDER BY letra',
        [id]
    );
    return { ...pregunta, alternativas: alternativas.rows };
};

// Preguntas de un curso y tema, cada una con sus alternativas
exports.listarPreguntas = async (cursoId, temaId) => {
    const preguntas = await pool.query(
        `SELECT id, codigo_banco, enunciado, imagen, fuente, resolucion
         FROM preguntas
         WHERE curso_id = $1 AND tema_id = $2
         ORDER BY id`,
        [cursoId, temaId]
    );
    if (preguntas.rows.length === 0) return [];

    const alternativas = await pool.query(
        `SELECT pregunta_id, letra, texto, es_correcta
         FROM alternativas
         WHERE pregunta_id = ANY($1)
         ORDER BY pregunta_id, letra`,
        [preguntas.rows.map((p) => p.id)]
    );

    return preguntas.rows.map((pregunta) => ({
        ...pregunta,
        alternativas: alternativas.rows
            .filter((a) => a.pregunta_id === pregunta.id)
            .map(({ letra, texto, es_correcta }) => ({ letra, texto, es_correcta }))
    }));
};
