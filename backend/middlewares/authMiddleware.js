// Validar que exista una sesión activa
const verificarSesion = (req, res, next) => {
    if (req.session && req.session.usuario) {
        return next(); // Si la sesión y el usuario existen, continúa
    }
    return res.status(401).json({ mensaje: "Unauthorized, faltan credenciales validas" });
};

// Validar permisos de Administrador
const esAdmin = (req, res, next) => {
    if (req.session && req.session.usuario && req.session.usuario.rol === 'admin') {
        return next();
    }
    return res.status(403).json({ mensaje: "Acceso denegado. Se requieren permisos de administrador." });
};

module.exports = { verificarSesion, esAdmin };

