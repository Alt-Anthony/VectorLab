const pool = require('../db');

exports.buscarPorEmail = async (email) => {
    const res = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    return res.rows[0];
};

exports.crearEstudiante = async (nombre, carrera, email, passwordHash) => {
    const res = await pool.query(
        `INSERT INTO usuarios (nombre, carrera, email, password_hash, rol) 
         VALUES ($1, $2, $3, $4, 'estudiante') 
         RETURNING id, nombre, carrera, email, rol`,
        [nombre, carrera, email, passwordHash]
    );
    return res.rows[0];
};

exports.obtenerUsuarioPorId = async (id) => {
    const res = await pool.query(
        `SELECT id, nombre, carrera, email, rol, fecha_creacion FROM usuarios WHERE id = $1`,
        [id]
    );
    return res.rows[0];
};

exports.actualizarEstudiantePorId = async (id, nombre, carrera) => {
    const res = await pool.query(
        `UPDATE usuarios SET nombre = $1, carrera = $2 WHERE id = $3 RETURNING id, nombre, carrera, email, rol`,
        [nombre, carrera, id]
    );
    return res.rows[0];
};

exports.crearAdmin = async (nombre, email, passwordHash) => {
    const res = await pool.query(
        `INSERT INTO usuarios (nombre, carrera, email, password_hash, rol) 
         VALUES ($1, 'Administrador', $2, $3, 'admin') 
         RETURNING id, nombre, carrera, email, rol`,
        [nombre, email, passwordHash]
    );
    return res.rows[0];
};

exports.obtenerEstudiantes = async () => {
    const res = await pool.query(
        `SELECT id, nombre, carrera, email, fecha_creacion FROM usuarios WHERE rol = 'estudiante' ORDER BY id DESC`
    );
    return res.rows;
};

exports.eliminarEstudiantePorId = async (id) => {
    const res = await pool.query(
        `DELETE FROM usuarios WHERE id = $1 AND rol = 'estudiante' RETURNING id, nombre, email`,
        [id]
    );
    return res.rows[0];
};