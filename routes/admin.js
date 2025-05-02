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
        const [rows] = await db.query('SELECT id, nome, email, perfil, status FROM users_sgq');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao buscar usuários' });
    }
});

/// ✏️ Edita um usuário
router.post('/editar/:id', async (req, res) => {
    const { nome, perfil, status } = req.body;
    const { id } = req.params;

    try {
        let query = '';
        let params = [];

        // 🔐 Se não foi preenchida, mantém a senha antiga
        query = 'UPDATE users_sgq SET nome=?, perfil=?, status=? WHERE id=?';
        params = [nome, perfil, status, id];


        await db.query(query, params);
        res.redirect('/admin/painel');

    } catch (err) {
        console.error(err);
        res.status(500).send('Erro ao editar usuário');
    }
});

// ❌ Exclui usuário
router.post('/excluir/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM users_sgq WHERE id = ?', [id]);
        res.redirect('/admin/painel');
    } catch (err) {
        console.error(err);
        res.status(500).send('Erro ao excluir usuário');
    }
});

// ✅ Aprova usuário (ativa conta)
router.post('/aprovar/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('UPDATE users_sgq SET status = "ATIVO" WHERE id = ?', [id]);

        // Busca nome e e-mail do usuário aprovado
        const [rows] = await db.query('SELECT nome, email FROM users_sgq WHERE id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).send('Usuário não encontrado.');
        }

        res.sendStatus(200);
    } catch (err) {
        console.error(err);
        res.status(500).send('Erro ao aprovar usuário!');
    }
});

// DESATIVAR USUÁRIO
router.post('/desativar/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('UPDATE users_sgq SET status = "INATIVO" WHERE id = ?', [id]);
        res.sendStatus(200);
    } catch (err) {
        console.error(err);
        res.status(500).send('Erro ao desativar o usuário!')
    }

})

module.exports = router;
