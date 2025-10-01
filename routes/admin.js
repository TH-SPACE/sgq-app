// 🌐 Módulos e Configurações
const express = require('express');
const router = express.Router();
const path = require('path');
const db = require('../db/db');

// 📄 Página principal do painel administrativo
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/admin_panel.html'));
});

// 🔍 Lista todos os usuários (API)
router.get('/usuarios', async (req, res) => {
    try {
        const [rows] = await db.mysqlPool.query('SELECT id, nome, email, perfil, cargo FROM users_thanos');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao buscar usuários' });
    }
});

// ✏️ Edita um usuário
router.post('/editar/:id', async (req, res) => {
    const { nome, perfil, status, cargo } = req.body;
    const { id } = req.params;

    try {
        // Atualiza informações do usuário
        await db.mysqlPool.query(
            'UPDATE users_thanos SET nome=?, perfil=?, cargo=? WHERE id=?',
            [nome, perfil, status, cargo, id]
        );
        res.redirect('/admin'); // Redireciona para a página principal do admin

    } catch (err) {
        console.error(err);
        res.status(500).send('Erro ao editar usuário');
    }
});

// ❌ Exclui usuário
router.post('/excluir/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.mysqlPool.query('DELETE FROM users_thanos WHERE id = ?', [id]);
        res.redirect('/admin'); // Redireciona para a página principal do admin
    } catch (err) {
        console.error(err);
        res.status(500).send('Erro ao excluir usuário');
    }
});

module.exports = router;