const express = require('express');
const router = express.Router();
const path = require('path');
const controller = require('./consulta_controller');

// Rota para servir a página HTML
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'view.html'));
});

// Rota de API para buscar os usuários
router.get('/search', controller.searchUsers);

module.exports = router;
