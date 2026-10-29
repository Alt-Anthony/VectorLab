const express = require('express');
const router = express.Router();
const { registrarEstudiante, login, logout } = require('../controllers/authController');
const { verificarSesion } = require('../middlewares/authMiddleware');

router.post('/registro', registrarEstudiante);
router.post('/login', login);
router.post('/logout', verificarSesion, logout);

module.exports = router;