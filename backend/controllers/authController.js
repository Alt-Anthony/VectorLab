const bcrypt = require('bcrypt');
const { buscarPorEmail, crearEstudiante } = require('../data/users');

const registrarEstudiante = async (req, res) => {
    const { nombre, carrera, email, password } = req.body;

    if (!carrera?.trim()) {
        return res.status(400).json({ mensaje: 'La carrera es obligatoria.' });
    }

    try {
        const passwordHash = await bcrypt.hash(password, 10);
        req.session.usuario = await crearEstudiante(nombre, carrera, email, passwordHash);

        res.status(201).json({ mensaje: 'Registro exitoso', usuario: req.session.usuario });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ mensaje: 'El correo electrónico ya está registrado.' });
        }
        res.status(500).json({ mensaje: 'Error al registrar', error: error.message });
    }
};

const login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const usuario = await buscarPorEmail(email);
        if (!usuario) {
            return res.status(404).json({ mensaje: 'Usuario no encontrado.' });
        }

        if (!(await bcrypt.compare(password, usuario.password_hash))) {
            return res.status(401).json({ mensaje: 'Contraseña incorrecta.' });
        }

        req.session.usuario = {
            id: usuario.id,
            nombre: usuario.nombre,
            carrera: usuario.carrera,
            email: usuario.email,
            rol: usuario.rol
        };

        res.json({ mensaje: 'Inicio de sesión exitoso', usuario: req.session.usuario });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al iniciar sesión', error: error.message });
    }
};

const logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) return res.status(500).json({ mensaje: 'Error al cerrar sesión.' });
        res.clearCookie('connect.sid').json({ mensaje: 'Sesión cerrada correctamente.' });
    });
};

module.exports = { registrarEstudiante, login, logout };