const bcrypt = require('bcrypt');
const { crearAdmin, obtenerEstudiantes, eliminarEstudiantePorId } = require('../data/users');

exports.listarEstudiantes = async (req, res) => {
    try {
        const estudiantes = await obtenerEstudiantes();
        res.status(200).json({ status: 'success', data: estudiantes });
    } catch (error) {
        res.status(500).json({ status: 'fail', message: 'Error al obtener estudiantes' });
    }
};

exports.eliminarEstudiante = async (req, res) => {
    const { id } = req.params;

    if (!Number.isInteger(Number(id))) {
        return res.status(400).json({ status: 'fail', message: 'El ID debe ser un número entero' });
    }

    try {
        const eliminado = await eliminarEstudiantePorId(id);
        if (!eliminado) {
            return res.status(404).json({ status: 'fail', message: 'Estudiante no encontrado' });
        }
        res.status(200).json({ status: 'success', message: 'Estudiante eliminado correctamente', data: eliminado });
    } catch (error) {
        res.status(500).json({ status: 'fail', message: 'Error al eliminar estudiante' });
    }
};

exports.registrarAdmin = async (req, res) => {
    const { nombre, email, password } = req.body;

    try {
        const passwordHash = await bcrypt.hash(password, 10);
        const nuevoAdmin = await crearAdmin(nombre, email, passwordHash);

        res.status(201).json({ status: 'success', message: 'Administrador creado correctamente', data: nuevoAdmin });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ status: 'fail', message: 'El correo electrónico ya está registrado' });
        }
        res.status(500).json({ status: 'fail', message: 'Error al crear administrador' });
    }
};