exports.verificarSesion = (req, res, next) => {
    if (req.session && req.session.usuario) {
        return next();
    }
    return res.status(401).json({ status: 'fail', message: 'Unauthorized, faltan credenciales validas' });
};

exports.esAdmin = (req, res, next) => {
    if (req.session && req.session.usuario && req.session.usuario.rol === 'admin') {
        return next();
    }
    return res.status(403).json({ status: 'fail', message: 'Acceso denegado. Se requieren permisos de administrador.' });
};