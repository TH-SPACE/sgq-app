const express = require('express');
const router = express.Router();
const path = require('path');

const { verificaLogin, verificaADM } = require('../../middlewares/autenticacao');

// Rota principal do painel administrativo
router.get('/', verificaLogin, verificaADM, (req, res) => {
  res.sendFile(path.join(__dirname, '../views/admin_panel.html'));
});

// Rota para obter a lista de usuários
router.get('/usuarios', verificaLogin, verificaADM, async (req, res) => {
  const db = require('../../db/db');
  try {
    const [rows] = await db.mysqlPool.query('SELECT id, nome, email, perfil, cargo FROM users_thanos');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao buscar usuários' });
  }
});

// Rota para editar usuário
router.post('/editar/:id', verificaLogin, verificaADM, async (req, res) => {
  const { nome, perfil, status, cargo } = req.body;
  const { id } = req.params;
  const db = require('../../db/db');

  try {
    await db.mysqlPool.query(
      'UPDATE users_thanos SET nome=?, perfil=?, cargo=? WHERE id=?',
      [nome, perfil, cargo, id]
    );
    res.redirect('/admin');
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao editar usuário');
  }
});

// Rota para excluir usuário
router.post('/excluir/:id', verificaLogin, verificaADM, async (req, res) => {
  const { id } = req.params;
  const db = require('../../db/db');

  try {
    await db.mysqlPool.query('DELETE FROM users_thanos WHERE id = ?', [id]);
    res.redirect('/admin');
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao excluir usuário');
  }
});

// Rota para adicionar usuário do AD
router.post('/adicionar_usuario', verificaLogin, verificaADM, async (req, res) => {
  const { email } = req.body;
  const db = require('../../db/db');
  const ActiveDirectory = require("activedirectory2");

  if (!email) {
    return res.status(400).json({ erro: 'O e-mail é obrigatório.' });
  }

  try {
    const [existingUser] = await db.mysqlPool.query('SELECT * FROM users_thanos WHERE email = ?', [email]);
    if (existingUser.length > 0) {
      return res.status(409).json({ erro: 'Este usuário já está cadastrado no sistema.' });
    }

    const adConfig = {
      url: process.env.LDAP_URL,
      baseDN: process.env.LDAP_BASE_DN,
      username: process.env.LDAP_USER,
      password: process.env.LDAP_PASS,
      referral: false,
      attributes: {
        user: [
          "givenName", "initials", "sn", "displayName", "description",
          "physicalDeliveryOfficeName", "telephoneNumber", "mail", "wWWHomePage",
          "streetAddress", "postOfficeBox", "l", "st", "postalCode", "co",
          "userPrincipalName", "sAMAccountName", "profilePath", "scriptPath",
          "homeDirectory", "homeDrive", "homePhone", "pager", "mobile",
          "facsimileTelephoneNumber", "ipPhone", "title", "department",
          "company", "manager", "directReports", "distinguishedName",
          "objectClass", "objectCategory", "memberOf", "userAccountControl", "whenCreated", "extensionAttribute1", "extensionAttribute2", "birthDate"
        ]
      }
    };
    const ad = new ActiveDirectory(adConfig);

    ad.findUser(email, async (err, user) => {
      if (err) {
        console.error('Erro ao buscar no AD:', err);
        return res.status(500).json({ erro: 'Erro ao conectar com o Active Directory.' });
      }

      if (!user) {
        return res.status(404).json({ erro: 'Usuário não encontrado no Active Directory.' });
      }

      const nome = user.displayName || email.split('@')[0].toUpperCase();
      const cargo = user.title || null;

      try {
        await db.mysqlPool.query(
          'INSERT INTO users_thanos (email, nome, perfil, cargo, ultimo_login) VALUES (?, ?, ?, ?, NOW())',
          [email, nome.toUpperCase(), 'USER', cargo]
        );
        res.json({ sucesso: true, mensagem: `Usuário ${nome} adicionado com sucesso!` });
      } catch (dbError) {
        console.error('Erro ao inserir no banco de dados:', dbError);
        res.status(500).json({ erro: 'Erro ao salvar o usuário no banco de dados.' });
      }
    });
  } catch (error) {
    console.error('Erro geral ao adicionar usuário:', error);
    res.status(500).json({ erro: 'Ocorreu um erro inesperado.' });
  }
});

module.exports = router;