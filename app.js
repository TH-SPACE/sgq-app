// 🌐 Módulos Principais
const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const path = require("path");
const dotenv = require("dotenv");
const db = require("./db/db");

const morgan = require("morgan");
const chalk = require("chalk");
const { version } = require("./package.json");

const batimentoB2B = require('./controllers/batimento_b2b');

// ⚙️ Inicializações
dotenv.config(); // Carrega variáveis de ambiente
const app = express();
const PORT = process.env.PORT || 3000;
app.set("trust proxy", true); // Confiança em proxies reversos (ex: nginx)

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
    cookie: { secure: false }, // Usar true com HTTPS
  })
);

// 📊 Morgan com log colorido + IP + usuário
app.use(
  morgan((tokens, req, res) => {
    const user = req.session?.usuario?.email || "visitante";
    const status = tokens.status(req, res);
    const method = tokens.method(req, res);
    const url = tokens.url(req, res);
    const responseTime = tokens["response-time"](req, res);
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
      req.socket.remoteAddress;

    const colorStatus =
      status >= 500
        ? chalk.red
        : status >= 400
          ? chalk.yellow
          : status >= 300
            ? chalk.cyan
            : status >= 200
              ? chalk.green
              : chalk.white;

    return `${chalk.blue(`[${user}]`)} ${chalk.magenta(
      `[${ip}]`
    )} ${chalk.yellow(`[${method}]`)} ${url} ${colorStatus(
      status
    )} - ${responseTime} ms`;
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

//PAGINA DO LOGIN
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "login.html"));
});

//PAGINA DO LOGIN
app.get("/bh_he", (req, res) => {
  res.sendFile(path.join(__dirname, "views/BH_HE", "login_bh_he.html"));
});

app.get("/power_apps", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "links_pp.html"));
});

// 🧭 Rotas
app.use("/auth", require("./routes/auth"));

app.use("/home", verificaLogin, require("./routes/protected"));

app.use('/admin', verificaLogin, verificaADM, require('./routes/admin'));

app.use("/auth_bh_he", require("./routes/auth_bh_he"));

app.use('/home_bh_he', verificaLogin, require('./routes/protected_bh_he'));

// Rota para buscar a tabela
app.get('/buscar-tabela', batimentoB2B.buscarTabela);


// 🚀 Inicialização do servidor
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🔥 SGQ rodando em http://10.59.112.107:3000`);
  console.log(`📦 ${chalk.blue(`Versão SGQ:`)} v${version}`);
});
