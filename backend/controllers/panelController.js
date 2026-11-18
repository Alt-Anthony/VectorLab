const bcrypt = require('bcrypt');
const { buscarPorEmail } = require('../data/users');
const { listarIntentos, obtenerProgreso, actualizarPasswordHash } = require('../data/panelEstudiante');

exports.historial = async (req, res) => {
    try {
        const datos = await listarIntentos(req.session.usuario.id);
        res.status(200).json({ status: 'success', message: 'Historial obtenido', data: datos });
    } catch (error) {
        console.error('Error en historial:', error);
        res.status(500).json({ status: 'fail', message: 'Error al obtener el historial' });
    }
};

exports.progreso = async (req, res) => {
    try {
        const datos = await obtenerProgreso(req.session.usuario.id);
        res.status(200).json({ status: 'success', message: 'Progreso obtenido', data: datos });
    } catch (error) {
        console.error('Error en progreso:', error);
        res.status(500).json({ status: 'fail', message: 'Error al obtener el progreso' });
    }
};

exports.cambiarPassword = async (req, res) => {
    const { passwordActual, passwordNueva, passwordConfirmar } = req.body;

    if (!passwordActual || !passwordNueva || !passwordConfirmar) {
        return res.status(400).json({ status: 'fail', message: 'Completa todos los campos' });
    }
    if (passwordNueva.length < 8) {
        return res.status(400).json({ status: 'fail', message: 'La nueva contraseña debe tener al menos 8 caracteres' });
    }
    if (passwordNueva !== passwordConfirmar) {
        return res.status(400).json({ status: 'fail', message: 'La confirmación no coincide' });
    }
    if (passwordNueva === passwordActual) {
        return res.status(400).json({ status: 'fail', message: 'La nueva contraseña debe ser distinta a la actual' });
    }

    try {
        const usuario = await buscarPorEmail(req.session.usuario.email);
        if (!usuario || !(await bcrypt.compare(passwordActual, usuario.password_hash))) {
            return res.status(401).json({ status: 'fail', message: 'La contraseña actual es incorrecta' });
        }
        const nuevoHash = await bcrypt.hash(passwordNueva, 10);
        await actualizarPasswordHash(usuario.id, nuevoHash);
        res.status(200).json({ status: 'success', message: 'Contraseña actualizada correctamente' });
    } catch (error) {
        console.error('Error al cambiar contraseña:', error);
        res.status(500).json({ status: 'fail', message: 'Error al cambiar la contraseña' });
    }
};