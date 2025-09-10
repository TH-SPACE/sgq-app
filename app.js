// 🌐 Módulos Principais
const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const path = require("path");
const dotenv = require("dotenv");
const { version } = require("./package.json");

const batimentoB2B = require('./controllers/batimento_b2b');

// ⚙️ Inicializações
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;
app.set("trust proxy", true);

// 📁 Arquivos estáticos públicos
app.use(express.static(path.join(__dirname, "public")));

// 📦 Middlewares globais
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET || "segredo123",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
  })
);

// 🔐 Middlewares de autenticação
function verificaLogin(req, res, next) {
  if (!req.session.usuario) {
    return res.redirect("/");
  }
  next();
}

function verificaADM(req, res, next) {
  if (!req.session.usuario || req.session.usuario.perfil !== "ADM") {
    return res.sendFile(path.join(__dirname, "views", "acesso_negado.html"));
  }
  next();
}

// 🧭 Rotas públicas
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "login.html"));
});

app.get("/painel_reparos", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "painel_reparos.html"));
});

// 🧭 Rotas protegidas
app.use("/auth", require("./routes/auth"));
app.use("/home", verificaLogin, require("./routes/protected"));
app.use('/admin', verificaLogin, verificaADM, require('./routes/admin'));

// Rota para buscar a tabela
app.get('/buscar-tabela', batimentoB2B.buscarTabela);

// 🚀 Inicialização do servidor
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🔥 THANOS rodando em http://10.59.112.107:${PORT}`);
  console.log(`📦 Versão THANOS: v${version}`);
});
