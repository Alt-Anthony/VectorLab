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

exports.crearAdmin = async (nombre, email, passwordHash, creadoPorId = null) => {
    const res = await pool.query(
        `INSERT INTO usuarios (nombre, carrera, email, password_hash, rol, creado_por) 
         VALUES ($1, 'Administrador', $2, $3, 'admin', $4) 
         RETURNING id, nombre, carrera, email, rol, fecha_creacion, creado_por`,
        [nombre, email, passwordHash, creadoPorId]
    );
    return res.rows[0];
};

exports.obtenerEstudiantes = async () => {
    const res = await pool.query(
        `SELECT u.id, u.nombre, u.carrera, u.email, u.fecha_creacion,
                COALESCE(c.nombre || ' (' || c.email || ')', 'Autoregistro') AS creado_por
         FROM usuarios u
         LEFT JOIN usuarios c ON u.creado_por = c.id
         WHERE u.rol = 'estudiante'
         ORDER BY u.id DESC`
    );
    return res.rows;
};

exports.obtenerAdministradores = async () => {
    const res = await pool.query(
        `SELECT u.id, u.nombre, u.email, u.fecha_creacion,
                c.nombre AS creado_por_nombre,
                c.email AS creado_por_email
         FROM usuarios u
         LEFT JOIN usuarios c ON u.creado_por = c.id
         WHERE u.rol = 'admin'
         ORDER BY u.id DESC`
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