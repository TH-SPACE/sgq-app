// 🌐 Módulos Principais
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const dotenv = require('dotenv');
const db = require('./db/db');

const morgan = require('morgan');
const chalk = require('chalk');
const { version } = require('./package.json');

// ⚙️ Inicializações
dotenv.config(); // Carrega variáveis de ambiente
const app = express();
const PORT = process.env.PORT || 3000;
app.set('trust proxy', true); // Confiança em proxies reversos (ex: nginx)

// 📁 Arquivos estáticos públicos
app.use(express.static(path.join(__dirname, 'public')));

// 📦 Middlewares globais
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(session({
    secret: process.env.SESSION_SECRET || 'segredo123',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Usar true com HTTPS
}));

// 📊 Morgan com log colorido + IP + usuário
app.use(morgan((tokens, req, res) => {
    const user = req.session?.usuario?.email || 'visitante';
    const status = tokens.status(req, res);
    const method = tokens.method(req, res);
    const url = tokens.url(req, res);
    const responseTime = tokens['response-time'](req, res);
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;

    const colorStatus =
        status >= 500 ? chalk.red :
            status >= 400 ? chalk.yellow :
                status >= 300 ? chalk.cyan :
                    status >= 200 ? chalk.green :
                        chalk.white;

    return `${chalk.blue(`[${user}]`)} ${chalk.magenta(`[${ip}]`)} ${chalk.yellow(`[${method}]`)} ${url} ${colorStatus(status)} - ${responseTime} ms`;
}));

// 🔐 Middlewares de autenticação
function verificaLogin(req, res, next) {
    if (!req.session.usuario) {
        return res.redirect('/');
    }
    next();
}

function verificaADM(req, res, next) {
    if (!req.session.usuario || req.session.usuario.perfil !== 'ADM') {
        return res.sendFile(path.join(__dirname, 'views', 'acesso_negado.html'));
    }
    next();
}

//PAGINA DO LOGIN
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.get('/power_apps', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'links_pp.html'));
});

// 🧭 Rotas
app.use('/auth', require('./routes/auth'));

app.use('/home', verificaLogin, require('./routes/protected'));

app.use('/admin', verificaLogin, verificaADM, require('./routes/admin'));

app.get('/sigitm', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'base.html'));
});


// Rota para consultar dados do OracleDB
app.get('/oracle-data', async (req, res) => {
    try {
        const connection = await db.getOracleConnection();
        const result = await connection.execute(`
            SELECT 
                CAST(TQI_CODIGO as int) as TQI_CODIGO,
                   CAST(TQI_RAIZ as int) as TQI_RAIZ,                   
                   CASE WHEN TQI_ORIGEM = 20 THEN 'VIVO2' ELSE 'VIVO1' END AS ORIGEM,
                   sigitm_1_2.tbl_ti.tqi_diagnostico,
                   sigitm_1_2.tbl_ti.tqi_estado_codigo AS UF,
                   sigitm_1_2.tbl_ti.tqi_estado_NOME AS ESTADO,
                   sigitm_1_2.tbl_ti.tqi_municipio_nome AS CIDADE
            FROM   SIGITM_1_2.tbl_ti
            WHERE  sigitm_1_2.tbl_ti.tqi_estado_codigo IN ('MS', 'GO', 'MA', 'AM', 'MT', 'PA', 'AP', 'DF', 'TO', 'RO', 'AC', 'RR')
                   AND EXTRACT(MONTH FROM TQI_DATA_CRIACAO) IN(4)
                   AND EXTRACT(YEAR FROM sigitm_1_2.tbl_ti.tqi_data_criacao) = 2025
        `);
        res.json(result.rows);
        await connection.close();
    } catch (err) {
        console.error('Erro ao consultar dados do OracleDB:', err);
        res.status(500).send('Erro ao consultar dados do OracleDB');
    }
});


// 🚀 Inicialização do servidor
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🔥 SGQ rodando em http://10.59.112.107:3000`);
    console.log(`📦 Versão SGQ: v${version}`);
});
