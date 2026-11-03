const express = require('express');
const router = express.Router();
const { obtenerPregunta } = require('../controllers/cursoController');
const { verificarSesion } = require('../middlewares/authMiddleware');

router.get('/:id', verificarSesion, obtenerPregunta);

module.exports = router;
