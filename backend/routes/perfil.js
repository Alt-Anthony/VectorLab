const express = require('express');
const router = express.Router();
const { obtenerMiPerfil, actualizarMiPerfil } = require('../controllers/estudianteController');
const { verificarSesion } = require('../middlewares/authMiddleware');

router.get('/', verificarSesion, obtenerMiPerfil);
router.put('/', verificarSesion, actualizarMiPerfil);

module.exports = router;