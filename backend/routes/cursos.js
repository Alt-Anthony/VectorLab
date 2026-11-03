const express = require('express');
const router = express.Router();
const { obtenerCursos, obtenerTemas, obtenerPreguntas } = require('../controllers/cursoController');
const { verificarSesion } = require('../middlewares/authMiddleware');

router.get('/', verificarSesion, obtenerCursos);
router.get('/:curso/temas', verificarSesion, obtenerTemas);
router.get('/:curso/temas/:tema/preguntas', verificarSesion, obtenerPreguntas);

module.exports = router;
