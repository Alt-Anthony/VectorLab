exports.verificarSesion = (req, res, next) => {
    if (req.session && req.session.usuario) {
        return next();
    }
    if (req.originalUrl.startsWith('/api')) {
        return res.status(401).json({ status: 'fail', message: 'Unauthorized, faltan credenciales validas' });
    }
    return res.redirect('/login.html')
};

exports.esAdmin = (req, res, next) => {
    if (req.session && req.session.usuario && req.session.usuario.rol === 'admin') {
        return next();
    }
    return res.status(403).json({ status: 'fail', message: 'Acceso denegado. Se requieren permisos de administrador.' });
};