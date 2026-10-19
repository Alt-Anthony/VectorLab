const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const users = require('../data/users');
router.get('/', authMiddleware, (req, res) => {
    res.json({
       mensaje: `Perfil del usuario con id: ${req.session.userId}`
    });
});


module.exports = router;