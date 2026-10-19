const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const users = require('../data/users');

//Verificacion de la sesion de usuario
router.get('/', authMiddleware, (req, res) => {
    const user = users.find(u => u.id === req.session.userId);
    if (!user) {
        return res.status(404).json({ error: "Usuario no encontrado" })
    }
    res.json({
        mensaje: `Perfil del usuario, id: ${user.id}, email: ${user.email}`
    });
});


module.exports = router;