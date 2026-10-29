const express = require('express');
const router = express.Router();
const { listarEstudiantes, eliminarEstudiante, registrarAdmin } = require('../controllers/adminController');
const { verificarSesion, esAdmin } = require('../middlewares/authMiddleware');

router.get('/', verificarSesion, esAdmin, listarEstudiantes);
router.delete('/:id', verificarSesion, esAdmin, eliminarEstudiante);
router.post('/nuevo-admin', verificarSesion, esAdmin, registrarAdmin);
module.exports = router;