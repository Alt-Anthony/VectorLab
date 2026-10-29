const { obtenerUsuarioPorId, actualizarEstudiantePorId } = require('../data/users');

// Ver únicamente el perfil propio
exports.obtenerMiPerfil = async (req, res) => {
  try {
    const usuario = await obtenerUsuarioPorId(req.session.usuario.id);
    if (!usuario) {
      return res.status(404).json({ status: 'fail', message: 'Usuario no encontrado' });
    }
    res.status(200).json({ status: 'success', data: usuario });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'fail', message: 'Error al obtener el perfil' });
  }
};

// Editar únicamente el perfil propio
exports.actualizarMiPerfil = async (req, res) => {
  try {
    const { nombre, carrera } = req.body;
    const userId = req.session.usuario.id;

    if (!carrera?.trim()) {
      return res.status(400).json({ status: 'fail', message: 'La carrera es obligatoria' });
    }

    const usuarioActualizado = await actualizarEstudiantePorId(userId, nombre, carrera);

    // Actualizamos la sesión
    req.session.usuario.nombre = usuarioActualizado.nombre;
    req.session.usuario.carrera = usuarioActualizado.carrera;

    res.status(200).json({
      status: 'success',
      message: 'Perfil actualizado correctamente',
      data: usuarioActualizado
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'fail', message: 'Error al actualizar el perfil' });
  }
};