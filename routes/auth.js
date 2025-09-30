const express = require("express");
const router = express.Router();
const path = require("path");
const db = require("../db/db");
const ad = require("../ad/ad"); // usa activedirectory2
const dotenv = require("dotenv");

dotenv.config();

const LOCAL_ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const LOCAL_ADMIN_SENHA = process.env.ADMIN_SENHA;

router.post("/login", async (req, res) => {
  const { email, senha, redirect = "/home" } = req.body; // ← recebe redirect
  let user;

  try {
    // 1. Admin local
    if (email === LOCAL_ADMIN_EMAIL && senha === LOCAL_ADMIN_SENHA) {
      const [rows] = await db.mysqlPool.query(
        "SELECT * FROM users_thanos WHERE email = ?",
        [email]
      );

      if (rows.length === 0) {
        const [result] = await db.mysqlPool.query(
          "INSERT INTO users_thanos (email, nome, perfil, ultimo_login) VALUES (?, ?, ?, NOW())",
          [email, "ADMIN LOCAL", "ADM"]
        );
        const [newUserRows] = await db.mysqlPool.query(
          "SELECT * FROM users_thanos WHERE id = ?",
          [result.insertId]
        );
        user = newUserRows[0];
      } else {
        user = rows[0];
        await db.mysqlPool.query(
          "UPDATE users_thanos SET ultimo_login = NOW() WHERE id = ?",
          [user.id]
        );
      }
    } else {
      // 2. Autenticar no AD com a senha do usuário
      await new Promise((resolve, reject) => {
        ad.authenticate(email, senha, (err, auth) => {
          if (err || !auth) return reject(new Error("Usuário ou senha inválidos."));
          resolve(auth);
        });
      });
      // 3. Buscar nome completo do usuário no AD

      const userInfo = await new Promise((resolve, reject) => {
        ad.findUser(email, (err, user) => {
          if (err || !user) return reject(new Error("Usuário não encontrado no AD."));
          console.log("✅ Usuário encontrado:");
          console.log("Nome completo:", user.displayName);
          console.log("Email:", user.mail);
          console.log("Login:", user.sAMAccountName);
          console.log("UPN:", user.userPrincipalName);
          console.log("Cargo:", user.title);
          // console.log("Gerente (DN):", user.manager);
          // console.log("Departamento:", user.department);
          // console.log("Empresa:", user.company);
          // console.log("Telefone fixo:", user.telephoneNumber);
          // console.log("Celular:", user.mobile);
          // console.log("Localização física:", user.physicalDeliveryOfficeName);          
          // console.log("Subordinados:", user.directReports);
          // console.log("DN completo:", user.distinguishedName);
          // console.log("Classe do objeto:", user.objectClass);
          // console.log("Categoria do objeto:", user.objectCategory);
          // console.log("Controle de conta:", user.userAccountControl);
          // console.log("Data de criação da conta:", user.whenCreated);
          if (user.manager) {
            ad.findUser(user.manager, (err, gerente) => {
              if (err || !gerente) {
                console.log("❌ Não foi possível buscar o gerente.");
              } else {
                console.log("👤 Gestor direto:");
                console.log("Nome completo:", gerente.displayName);
                console.log("Email:", gerente.mail);
                console.log("Login:", gerente.sAMAccountName);
                console.log("Cargo:", gerente.title);
                // console.log("Departamento:", gerente.department);
                // console.log("Data de criação da conta:", gerente.whenCreated);
              }
            });
          }

          resolve(user);
        });
      });

      const nome = userInfo.displayName || email.split(".")[0].toUpperCase();

      // 4. Verificar/criar usuário no banco
      const [rows] = await db.mysqlPool.query(
        "SELECT * FROM users_thanos WHERE email = ?",
        [email]
      );

      if (rows.length === 0) {
        const [result] = await db.mysqlPool.query(
          "INSERT INTO users_thanos (email, nome, perfil, status, ultimo_login) VALUES (?, ?, ?, ?, NOW())",
          [email, nome.toUpperCase(), "USER", "ATIVO"]
        );

        if (result.insertId) {
          const [newUserRows] = await db.mysqlPool.query(
            "SELECT * FROM users_thanos WHERE id = ?",
            [result.insertId]
          );
          user = newUserRows[0];
          return res.redirect("/?erro=2");
        }
      } else {
        user = rows[0];

        if (user.status === "ATIVO") {
          await db.mysqlPool.query(
            "UPDATE users_thanos SET ultimo_login = NOW() WHERE id = ?",
            [user.id]
          );
        } else {
          console.log("Usuário Inativo!");
          return res.redirect("/?erro=2");
        }
      }
    }

    // 5. Proteção
    if (!user) {
      console.error("Erro: usuário não encontrado nem criado!");
      return res.redirect("/?erro=email_nao_encontrado");
    }

    const acessos = user.acessos ? user.acessos.split(",") : [];

    req.session.usuario = {
      id: user.id,
      nome: user.nome,
      email: user.email,
      perfil: user.perfil,
      acessos: acessos,
    };

    // Redirecionamento inteligente
    const redirectUrl = req.body.redirect || "/home";

    function isValidRedirect(url) {
      return typeof url === 'string' &&
        url.startsWith('/') &&
        !url.startsWith('//') &&
        !url.includes('://');
    }

    const safeRedirect = isValidRedirect(redirectUrl) ? redirectUrl : "/home";
    res.redirect(safeRedirect);

  } catch (err) {
    console.error("Erro de autenticação:", err.message || err);
    return res.redirect("/?erro=1");
  }
});

router.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error("Erro ao destruir sessão:", err);
    res.redirect("/");
  });
});

module.exports = router;