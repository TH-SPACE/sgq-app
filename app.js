// 🌐 Módulos Principais
const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const path = require("path");
const dotenv = require("dotenv");
const { version } = require("./package.json");
const multer = require("multer");

// 🔐 Middlewares
const { verificaLogin, verificaADM, verificaUSER } = require("./middlewares/autenticacao");
const { logMiddleware } = require("./middlewares/log");

// ⚙️ Inicializações
dotenv.config();
const app = express();
console.log("Aplicação criada por Thiago Alves Nunes");
const PORT = process.env.PORT || 3000;

// Configurações do app
app.set("trust proxy", true);

app.use(express.json());
// 📁 Arquivos estáticos públicos
app.use(express.static(path.join(__dirname, "public")));
app.use("/json", express.static(path.join(__dirname, "app_he", "json")));
app.use("/public", express.static(path.join(__dirname, "app_he", "public")));
// Serve a pasta consulta_ad como estática para o script.js
app.use("/consulta_ad", express.static(path.join(__dirname, "consulta_ad")));

// 📦 Middlewares globais
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET || "segredo123",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 3600000 },
  })
);

// ✅ Middleware de log personalizado
app.use(logMiddleware);

// 🧭 Rotas públicas
app.use("/", require("./routes/public"));

// 🧭 Rotas protegidas
app.use("/auth", require("./routes/auth"));
app.use("/home", verificaLogin, verificaUSER, require("./routes/protected"));
app.use("/admin", verificaLogin, verificaADM, require("./routes/admin"));
app.use("/consulta-ad", require("./consulta_ad/consulta_route"));

// 🎯 Rotas específicas
app.use("/planejamento-he", require("./app_he/routes/planejamentoHERoutes"));

// 🚀 Inicialização do servidor
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🔥 THANOS rodando em http://10.59.112.107:${PORT}`);
  console.log(`📦 Versão THANOS: v${version}`);
});
