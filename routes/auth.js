// 🌐 Módulos e Configurações
const express = require("express");
const router = express.Router();
const path = require("path");
const db = require("../db/db");
const ad = require("../ad/ad"); // usa activedirectory2 (para admin local)
const ActiveDirectory = require("activedirectory2"); // Importa o ActiveDirectory para criar instância temporária
const dotenv = require("dotenv");

dotenv.config();

// 🔑 Credenciais do admin local
const LOCAL_ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const LOCAL_ADMIN_SENHA = process.env.ADMIN_SENHA;

// 🔐 Rota de login - Processa autenticação de usuário
router.post("/login", async (req, res) => {
  // Extrai email, senha e redirect do body da requisição
  const { email, senha, redirect = "/home" } = req.body;
  let user; // Variável para armazenar o usuário autenticado

  try {
    // 1. Verifica se é admin local
    if (email === LOCAL_ADMIN_EMAIL && senha === LOCAL_ADMIN_SENHA) {
      // Busca usuário admin no banco de dados usando o AD padrão
      const [rows] = await db.mysqlPool.query(
        "SELECT * FROM users_thanos WHERE email = ?",
        [email]
      );

      if (rows.length === 0) {
        // Cria novo usuário admin se não existir
        const [result] = await db.mysqlPool.query(
          "INSERT INTO users_thanos (email, nome, perfil, ultimo_login) VALUES (?, ?, ?, NOW())",
          [email, "ADMIN LOCAL", "ADM"]
        );
        // Busca o usuário recém-criado
        const [newUserRows] = await db.mysqlPool.query(
          "SELECT * FROM users_thanos WHERE id = ?",
          [result.insertId]
        );
        user = newUserRows[0];
      } else {
        // Atualiza o usuário existente e armazena
        user = rows[0];
        await db.mysqlPool.query(
          "UPDATE users_thanos SET ultimo_login = NOW() WHERE id = ?",
          [user.id]
        );
      }
    } else {
      // Cria instância do AD com as credenciais do usuário
      const adUser = new ActiveDirectory({
        url: process.env.LDAP_URL,
        baseDN: process.env.LDAP_BASE_DN,
        username: email, // Usa o email do usuário logado
        password: senha, // Usa a senha do usuário logado
        referral: false,
        attributes: {
          user: [
            "displayName", "mail", "title"
          ]
        }
      });

      // 2. Autenticação no Active Directory com a senha do usuário
      await new Promise((resolve, reject) => {
        adUser.authenticate(email, senha, (err, auth) => {
          if (err || !auth) return reject(new Error("Usuário ou senha inválidos."));
          resolve(auth);
        });
      });

      // 3. Busca nome completo do usuário no Active Directory
      const userInfo = await new Promise((resolve, reject) => {
        adUser.findUser(email, (err, user) => {
          if (err || !user) return reject(new Error("Usuário não encontrado no AD."));

          resolve(user);
        });
      });

      // Extrai informações do usuário do AD
      const nome = userInfo.displayName || email.split(".")[0].toUpperCase();
      const cargo = userInfo.title || null; // Pega o cargo do usuário

      // 4. Verifica/cria usuário no banco de dados
      const [rows] = await db.mysqlPool.query(
        "SELECT * FROM users_thanos WHERE email = ?",
        [email]
      );

      if (rows.length === 0) {
        // Cria novo usuário no banco com todas as informações
        const [result] = await db.mysqlPool.query(
          "INSERT INTO users_thanos (email, nome, perfil, ultimo_login, cargo) VALUES (?, ?, ?, NOW(), ?)",
          [email, nome.toUpperCase(), "USER", cargo]
        );

        if (result.insertId) {
          // Busca o usuário recém-criado
          const [newUserRows] = await db.mysqlPool.query(
            "SELECT * FROM users_thanos WHERE id = ?",
            [result.insertId]
          );
          user = newUserRows[0];
        }
      } else {
        // Atualiza usuário existente com informações do AD
        user = rows[0];
        await db.mysqlPool.query(
          "UPDATE users_thanos SET ultimo_login = NOW(), cargo = ? WHERE id = ?",
          [cargo, user.id]
        );
      }
    }

    // 5. Proteção - Verifica se o usuário foi encontrado/criado
    if (!user) {
      console.error("Erro: usuário não encontrado nem criado!");
      return res.redirect("/login?erro=email_nao_encontrado");
    }

    // Cria sessão do usuário com informações essenciais
    req.session.usuario = {
      id: user.id,
      nome: user.nome,
      email: user.email,
      perfil: user.perfil,
      cargo: user.cargo,
    };

    // Lógica de redirecionamento pós-login
    const perfilUsuario = user.perfil || '';
    const redirectParam = req.body.redirect || req.query.redirect;

    // Se não houver um redirect explícito, decide com base no perfil
    if (!redirectParam) {
      if (perfilUsuario.includes('HE_ENGENHARIA') || perfilUsuario.includes('HE_IMPLANTACAO')) {
        return res.redirect('/planejamento-he');
      }
    }

    // Redirecionamento inteligente - usa redirect do body, query string ou padrão
    const redirectUrl = req.body.redirect || req.query.redirect || "/home";

    // Função para validar URL de redirecionamento (evita open redirect)
    function isValidRedirect(url) {
      return typeof url === 'string' &&
        url.startsWith('/') &&
        !url.startsWith('//') &&
        !url.includes('://');
    }

    // Usa URL segura para redirecionamento
    const safeRedirect = isValidRedirect(redirectUrl) ? redirectUrl : "/home";
    res.redirect(safeRedirect);

  } catch (err) {
    // Em caso de erro, redireciona com código de erro
    console.error("Erro de autenticação:", err.message || err);
    return res.redirect("/login?erro=1");
  }
});

// 🔓 Rota de logout - Destrói a sessão do usuário
router.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error("Erro ao destruir sessão:", err);
    res.redirect("/login"); // Redireciona para página de login após logout
  });
});

// 🔓 Rota de logout específica para planejamento-he
router.get("/logout-he", (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error("Erro ao destruir sessão:", err);
    res.redirect("/planejamento-he");
  });
});

// 🔐 Rota para obter dados do usuário (acessível após login, para qualquer perfil)
router.get("/usuario", (req, res) => {
  if (!req.session.usuario) {
    return res.status(401).json({ error: "Não autenticado" });
  }
  
  res.json({
    id: req.session.usuario.id,
    nome: req.session.usuario.nome,
    email: req.session.usuario.email,
    perfil: req.session.usuario.perfil,
    cargo: req.session.usuario.cargo, // Adicionado para exibir no popover de perfil
    acessos: req.session.usuario.acessos,
  });
});

module.exports = router;