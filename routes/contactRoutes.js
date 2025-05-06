const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');

// Ruta para enviar mensajes de contacto
router.post('/', contactController.sendContactMessage);

module.exports = router; 