const pool = require('../db');

// Autenticación y registro
const buscarPorEmail = async (email) => {
    const res = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    return res.rows[0];
};

const crearEstudiante = async (nombre, carrera, email, passwordHash) => {
    const res = await pool.query(
        `INSERT INTO usuarios (nombre, carrera, email, password_hash, rol) 
         VALUES ($1, $2, $3, $4, 'estudiante') 
         RETURNING id, nombre, carrera, email, rol`,
        [nombre, carrera, email, passwordHash]
    );
    return res.rows[0];
};

// Perfil de estudiante
const obtenerUsuarioPorId = async (id) => {
    const res = await pool.query(
        `SELECT id, nombre, carrera, email, rol, fecha_creacion 
         FROM usuarios 
         WHERE id = $1`,
        [id]
    );
    return res.rows[0];
};

const actualizarEstudiantePorId = async (id, nombre, carrera) => {
    const res = await pool.query(
        `UPDATE usuarios 
         SET nombre = $1, carrera = $2 
         WHERE id = $3 
         RETURNING id, nombre, carrera, email, rol`,
        [nombre, carrera, id]
    );
    return res.rows[0];
};

// Panel de administración
const crearAdmin = async (nombre, email, passwordHash) => {
    const res = await pool.query(
        `INSERT INTO usuarios (nombre, carrera, email, password_hash, rol) 
         VALUES ($1, $2, $3, $4, 'admin') 
         RETURNING id, nombre, carrera, email, rol`,
        [nombre, 'Administrador', email, passwordHash]
    );
    return res.rows[0];
};

const obtenerEstudiantes = async () => {
    const res = await pool.query(
        `SELECT id, nombre, carrera, email, fecha_creacion 
         FROM usuarios 
         WHERE rol = 'estudiante' 
         ORDER BY id DESC`
    );
    return res.rows;
};

const eliminarEstudiantePorId = async (id) => {
    const res = await pool.query(
        `DELETE FROM usuarios 
         WHERE id = $1 AND rol = 'estudiante' 
         RETURNING id, nombre`,
        [id]
    );
    return res.rows[0];
};

module.exports = {
    buscarPorEmail,
    crearEstudiante,
    obtenerUsuarioPorId,
    actualizarEstudiantePorId,
    crearAdmin,
    obtenerEstudiantes,
    eliminarEstudiantePorId
};