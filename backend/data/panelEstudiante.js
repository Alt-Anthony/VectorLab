const pool = require('../db');

exports.listarIntentos = async (usuarioId, limite = 50) => {
    const res = await pool.query(
        `SELECT i.id, i.respuesta, i.es_correcta, i.fecha_creacion,
                p.codigo_banco, p.enunciado,
                c.nombre AS curso, t.nombre AS tema
         FROM intentos i
         JOIN preguntas p ON p.id = i.pregunta_id
         JOIN cursos c ON c.id = p.curso_id
         JOIN temas t ON t.id = p.tema_id
         WHERE i.usuario_id = $1
         ORDER BY i.fecha_creacion DESC
         LIMIT $2`,
        [usuarioId, limite]
    );
    return res.rows;
};

exports.obtenerProgreso = async (usuarioId) => {
    const porCurso = await pool.query(
        `SELECT c.nombre AS curso,
                COUNT(DISTINCT p.id)::int AS total,
                COUNT(DISTINCT i.pregunta_id)::int AS resueltas
         FROM cursos c
         JOIN preguntas p ON p.curso_id = c.id
         LEFT JOIN intentos i ON i.pregunta_id = p.id AND i.usuario_id = $1 AND i.es_correcta
         GROUP BY c.id, c.nombre, c.orden
         ORDER BY c.orden`,
        [usuarioId]
    );
    const intentos = await pool.query(
        'SELECT COUNT(*)::int AS total_intentos FROM intentos WHERE usuario_id = $1',
        [usuarioId]
    );
    const cursos = porCurso.rows;
    return {
        total_intentos: intentos.rows[0].total_intentos,
        total_preguntas: cursos.reduce((suma, c) => suma + c.total, 0),
        resueltas: cursos.reduce((suma, c) => suma + c.resueltas, 0),
        por_curso: cursos
    };
};

// preguntaId = preguntas.id, respuesta = letra elegida ('A'..'E')
exports.registrarIntento = async (usuarioId, preguntaId, respuesta, esCorrecta) => {
    const res = await pool.query(
        `INSERT INTO intentos (usuario_id, pregunta_id, respuesta, es_correcta)
         VALUES ($1, $2, $3, $4)
         RETURNING id, pregunta_id, es_correcta, fecha_creacion`,
        [usuarioId, preguntaId, respuesta, esCorrecta]
    );
    return res.rows[0];
};

exports.actualizarPasswordHash = async (id, passwordHash) => {
    await pool.query('UPDATE usuarios SET password_hash = $1 WHERE id = $2', [passwordHash, id]);
};