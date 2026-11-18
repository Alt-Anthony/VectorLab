const express = require('express');
const router = express.Router();
const { historial, progreso, cambiarPassword } = require('../controllers/panelController');
const { verificarSesion } = require('../middlewares/authMiddleware');

router.use(verificarSesion);

router.get('/historial', historial);
router.get('/progreso', progreso);
router.put('/password', cambiarPassword);

module.exports = router;