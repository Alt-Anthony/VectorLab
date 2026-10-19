module.exports = function authMiddleware(req, res, next) {
    if (req.session && req.session.userId) {
        return next(); // Si la sesión y el usuario existen, continúa
    }
    return res.status(401).json({ mensaje: "Unauthorized" });
}