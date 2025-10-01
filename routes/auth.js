// 🌐 Módulos e Configurações
const express = require("express");
const router = express.Router();
const path = require("path");
const db = require("../db/db");
const ad = require("../ad/ad"); // usa activedirectory2
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
      // Busca usuário admin no banco de dados
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
      // 2. Autenticação no Active Directory com a senha do usuário
      await new Promise((resolve, reject) => {
        ad.authenticate(email, senha, (err, auth) => {
          if (err || !auth) return reject(new Error("Usuário ou senha inválidos."));
          resolve(auth);
        });
      });

      // 3. Busca nome completo do usuário no Active Directory
      const userInfo = await new Promise((resolve, reject) => {
        ad.findUser(email, (err, user) => {
          if (err || !user) return reject(new Error("Usuário não encontrado no AD."));

          // Logs de informações do usuário (para debug)
          console.log("✅ Usuário encontrado:");
          console.log("Nome completo:", user.displayName);
          console.log("Email:", user.mail);
          console.log("Login:", user.sAMAccountName);
          console.log("UPN:", user.userPrincipalName);
          console.log("Cargo:", user.title);

          // Busca informações do gerente do usuário usando as credenciais do usuário logado
          if (user.manager) {
            // Cria uma nova instância do AD com as credenciais do usuário logado
            const adUser = new ActiveDirectory({
              url: process.env.LDAP_URL,
              baseDN: process.env.LDAP_BASE_DN,
              username: email, // Usa o email do usuário logado
              password: senha, // Usa a senha do usuário logado
              referral: false,
              attributes: {
                user: [
                  "thumbnailPhoto",
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
            });

            adUser.findUser(user.manager, (err, gerente) => {
              if (err || !gerente) {
                console.log("❌ Não foi possível buscar o gerente com as credenciais do usuário.");
                // Tenta novamente com as credenciais padrão do sistema
                ad.findUser(user.manager, (err2, gerente2) => {
                  if (err2 || !gerente2) {
                    console.log("❌ Não foi possível buscar o gerente com nenhuma credencial.");
                  } else {
                    console.log("👤 Gestor direto (com credenciais padrão):");
                    console.log("Nome completo:", gerente2.displayName);
                    console.log("Email:", gerente2.mail);
                    console.log("Login:", gerente2.sAMAccountName);
                    console.log("Cargo:", gerente2.title);
                  }
                });
              } else {
                console.log("👤 Gestor direto (com credenciais do usuário):");
                console.log("Nome completo:", gerente.displayName);
                console.log("Email:", gerente.mail);
                console.log("Login:", gerente.sAMAccountName);
                console.log("Cargo:", gerente.title);
              }
            });
          }

          resolve(user);
        });
      });

      // Define o nome do usuário (usa displayName do AD ou parte do email)
      const nome = userInfo.displayName || email.split(".")[0].toUpperCase();

      // 4. Verifica/cria usuário no banco de dados
      const [rows] = await db.mysqlPool.query(
        "SELECT * FROM users_thanos WHERE email = ?",
        [email]
      );

      if (rows.length === 0) {
        // Cria novo usuário no banco
        const [result] = await db.mysqlPool.query(
          "INSERT INTO users_thanos (email, nome, perfil, status, ultimo_login) VALUES (?, ?, ?, ?, NOW())",
          [email, nome.toUpperCase(), "USER", "ATIVO"]
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
        // Atualiza usuário existente
        user = rows[0];
        // Atualiza último login
        await db.mysqlPool.query(
          "UPDATE users_thanos SET ultimo_login = NOW() WHERE id = ?",
          [user.id]
        );
      }
    }

    // 5. Proteção - Verifica se o usuário foi encontrado/criado
    if (!user) {
      console.error("Erro: usuário não encontrado nem criado!");
      return res.redirect("/?erro=email_nao_encontrado");
    }

    // Converte acessos em array (separados por vírgula)
    const acessos = user.acessos ? user.acessos.split(",") : [];

    // Cria sessão do usuário com informações essenciais
    req.session.usuario = {
      id: user.id,
      nome: user.nome,
      email: user.email,
      perfil: user.perfil,
      acessos: acessos,
    };

    // Redirecionamento inteligente - usa redirect do body ou padrão
    const redirectUrl = req.body.redirect || "/home";

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
    return res.redirect("/?erro=1");
  }
});

// 🔓 Rota de logout - Destrói a sessão do usuário
router.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error("Erro ao destruir sessão:", err);
    res.redirect("/"); // Redireciona para página inicial após logout
  });
});

module.exports = router;