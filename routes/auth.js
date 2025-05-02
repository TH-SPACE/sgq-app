const express = require('express');
const router = express.Router();
const path = require('path');
const db = require('../db/db');
const ad = require("../ad/ad");

// Defina o admin fixo
const LOCAL_ADMIN_EMAIL = 'admin@local';
const LOCAL_ADMIN_SENHA = 'yugioh25569';

// 🔐 LOGIN
router.post('/login', async (req, res) => {
    const { email, senha } = req.body;
    let nome = email.split(".")[0];
    console.log(`O nome é: ${nome}`);

    let user;

    try {
        // 1. Se for admin local, ignora AD
        if (email === LOCAL_ADMIN_EMAIL && senha === LOCAL_ADMIN_SENHA) {
            const [rows] = await db.query('SELECT * FROM users_sgq WHERE email = ?', [email]);

            if (rows.length === 0) {
                const [result] = await db.query(
                    'INSERT INTO users_sgq (email, nome, perfil, ultimo_login) VALUES (?, ?, ?, NOW())',
                    [email, 'ADMIN LOCAL', 'ADM']
                );
                const [newUserRows] = await db.query('SELECT * FROM users_sgq WHERE id = ?', [result.insertId]);
                user = newUserRows[0];
            } else {
                user = rows[0];
                await db.query('UPDATE users_sgq SET ultimo_login = NOW() WHERE id = ?', [user.id]);
            }

        } else {
            // 2. Autenticar no Active Directory
            await new Promise((resolve, reject) => {
                ad.authenticate(email, senha, (err, auth) => {
                    if (err) return reject(err);
                    if (!auth) return reject(new Error("Usuário ou senha inválidos."));
                    resolve(auth);
                });
            });

            // 3. Verificar/atualizar usuário no banco
            const [rows] = await db.query('SELECT * FROM users_sgq WHERE email = ?', [email]);

            if (rows.length === 0) {
                const [result] = await db.query(
                    'INSERT INTO users_sgq (email, nome, perfil, ultimo_login) VALUES (?, ?, ?, NOW())',
                    [email, nome.toUpperCase(), 'USER']
                );

                if (result.insertId) {
                    const [newUserRows] = await db.query('SELECT * FROM users_sgq WHERE id = ?', [result.insertId]);
                    user = newUserRows[0];
                }
            } else {
                user = rows[0];
                await db.query('UPDATE users_sgq SET ultimo_login = NOW() WHERE id = ?', [user.id]);
            }
        }

        // 4. Proteção: checar se user foi realmente preenchido
        if (!user) {
            console.error('Erro: usuário não encontrado nem criado!');
            return res.redirect('/?erro=5');
        }

        // 5. Criar sessão
        req.session.usuario = {
            id: user.id,
            nome: user.nome,
            email: user.email,
            perfil: user.perfil
        };

        res.redirect('/home');

    } catch (err) {
        console.error("Erro de autenticação:", err.message || err);
        return res.redirect('/?erro=1');
    }
});

// 🔓 LOGOUT
router.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) console.error('Erro ao destruir sessão:', err);
        res.redirect('/');
    });
});

module.exports = router;
