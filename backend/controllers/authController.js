const bcrypt = require('bcrypt');
const { buscarPorEmail, crearEstudiante } = require('../data/users');

exports.registrarEstudiante = async (req, res) => {
    const { nombre, carrera, email, password } = req.body;

    if (!carrera?.trim()) {
        return res.status(400).json({ status: 'fail', message: 'La carrera es obligatoria' });
    }

    try {
        const passwordHash = await bcrypt.hash(password, 10);
        const nuevoEstudiante = await crearEstudiante(nombre, carrera, email, passwordHash);

        req.session.usuario = nuevoEstudiante;
        res.status(201).json({ status: 'success', message: 'Registro exitoso', data: nuevoEstudiante });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ status: 'fail', message: 'El correo electrónico ya está registrado' });
        }
        res.status(500).json({ status: 'fail', message: 'Error al registrar estudiante' });
    }
};

exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const usuario = await buscarPorEmail(email);
        if (!usuario) {
            return res.status(404).json({ status: 'fail', message: 'Usuario no encontrado' });
        }

        if (!(await bcrypt.compare(password, usuario.password_hash))) {
            return res.status(401).json({ status: 'fail', message: 'Contraseña incorrecta' });
        }

        req.session.usuario = {
            id: usuario.id,
            nombre: usuario.nombre,
            carrera: usuario.carrera,
            email: usuario.email,
            rol: usuario.rol
        };

        return res.status(200).json({ status: 'success', message: 'Inicio de sesión exitoso', data: req.session.usuario });
    } catch (error) {
        // Imprime el error real tanto en la terminal como en la respuesta HTTP
        console.error('>>> EXCEPCIÓN DETECTADA:', error);
        return res.status(500).json({
            status: 'fail',
            message: 'Error interno en el servidor',
            error_real: error.message
        });
    }
};
exports.logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) return res.status(500).json({ status: 'fail', message: 'Error al cerrar sesión' });
        res.clearCookie('connect.sid').status(200).json({ status: 'success', message: 'Sesión cerrada correctamente' });
    });
};