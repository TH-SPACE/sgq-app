// 🌐 Módulos Principais
const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const path = require("path");
const dotenv = require("dotenv");
const { version } = require("./package.json");
const multer = require("multer"); // Adicionado

const batimentoB2B = require('./controllers/batimento_b2b');
const rampaIrrController = require('./controllers/rampa_irr_controller'); // Adicionado

// ⚙️ Inicializações
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;
app.set("trust proxy", true);

// Configuração do Multer
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// 📁 Arquivos estáticos públicos
app.use(express.static(path.join(__dirname, "public")));
// Serve a pasta json como um diretório estático
app.use('/json', express.static(path.join(__dirname, 'app_he', 'json')));
//serve a pasta public dentro de app_he
app.use('/public', express.static(path.join(__dirname, 'app_he', 'public')));


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

// ✅ Middleware de log personalizado
app.use((req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
      req.socket.remoteAddress;

    const user = req.session?.usuario?.email || "visitante";

    console.log(`[${user}] [${ip}] [${req.method}] ${req.originalUrl} ${res.statusCode} - ${duration} ms`);
  });

  next();
});


const { verificaLogin, verificaADM } = require("./middlewares/autenticacao");

// Serve a tela de login tanto em / quanto em /login
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "login.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "login.html"));
});


app.get("/painel_reparos", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "painel_reparos.html"));
});

// --- Novas Rotas Rampa IRR ---
app.get("/rampa-irr", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "rampa_irr.html"));
});

app.post("/rampa-irr/upload", upload.single('excelFile'), rampaIrrController.processUpload);
// --- Fim das Novas Rotas ---

// 🧭 Rotas protegidas
app.use("/auth", require("./routes/auth"));
app.use("/home", verificaLogin, require("./routes/protected"));
app.use('/admin', verificaLogin, verificaADM, require('./routes/admin'));

//rota com novo login
app.use("/planejamento-he", require("./app_he/routes/planejamentoHE"));

// Rota para buscar a tabela
app.get('/buscar-tabela', batimentoB2B.buscarTabela);

// 🚀 Inicialização do servidor
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🔥 THANOS rodando em http://10.59.112.107:${PORT}`);
  console.log(`📦 Versão THANOS: v${version}`);
});