// 📦 Importação de dependências
const multer = require('multer');                    // Para lidar com upload de arquivos
const path = require('path');                        // Para manipulação de caminhos
const fs = require('fs');                            // Para manipular arquivos no sistema
const db = require('../db/db');                      // Conexão com banco de dados MariaDB
const csv = require('csv-parse/sync');               // Biblioteca para parsear arquivos CSV

// 📂 Configuração do Multer (gerenciador de uploads)
const storage = multer.diskStorage({
    destination: 'uploads/',                         // Pasta onde os arquivos serão salvos
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)) // Nome do arquivo com timestamp
});

// 🔒 Filtro para aceitar apenas arquivos .csv
const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'text/csv') {
        cb(null, true);
    } else {
        cb(new Error('Apenas arquivos CSV são permitidos!'), false);
    }
};

const upload = multer({ storage, fileFilter });      // Middleware configurado

// 🎯 Filtros utilizados para seleção das linhas que serão inseridas
const statusPermitidos = ['FECHADO'];                // Apenas ordens com status 'FECHADO'
const procedenciasPermitidas = ['TRIAGEM'];          // Apenas ordens com procedência 'TRIAGEM'

// 🚀 Função principal para processar o CSV e inserir dados no banco
const processarUpload = async (req, res) => {
    try {
        // Validação: verifica se o arquivo foi enviado
        if (!req.file || !req.file.path) {
            return res.status(400).send('Arquivo CSV não enviado.');
        }

        // Lê o conteúdo do CSV
        let conteudo = fs.readFileSync(req.file.path, 'utf8');

        // Corrige aspas mal formatadas no conteúdo
        conteudo = conteudo.replace(/"([^\n"]*?)"([^\s;,])/g, '"$1"$2');

        const linhas = conteudo.split('\n');         // Divide em linhas
        let dados = [];                              // Armazena os registros válidos
        let ignoradas = 0;                           // Contador de linhas ignoradas por erro de parse

        // 🔄 Processa linha por linha (ignora cabeçalho)
        for (let i = 1; i < linhas.length; i++) {
            try {
                const linha = linhas[i];
                const registro = csv.parse(`${linhas[0]}\n${linha}`, {
                    columns: true,
                    skip_empty_lines: true,
                    delimiter: ';',
                    relax_quotes: true
                });
                dados.push(...registro);
            } catch (err) {
                ignoradas++;                         // Se der erro ao parsear, ignora e conta
                console.warn(`⚠️ Linha ignorada [${i + 1}]: erro de formatação`);
            }
        }

        // Contadores de controle
        let inseridos = 0;
        let ignoradosJaExistem = 0;
        let ignoradosSemBD = 0;

        // 🧠 Loop pelos dados válidos
        for (let linha of dados) {
            const {
                BD, BD_RAIZ, ID_VANTIVE, PROCEDENCIA, RECLAMCACAO,
                CLIENTE, ENDERECO, CIDADE, UF, CLUSTER, LP_13,
                DATA_ABERTURA, DATA_ENCERRAMENTO, STATUS
            } = linha;

            // Ignora linhas sem BD
            if (!BD) {
                ignoradosSemBD++;
                continue;
            }

            // Aplica filtros de status e procedência
            const statusFormatado = (STATUS || '').trim().toUpperCase();
            const procedenciaFormatada = (PROCEDENCIA || '').trim().toUpperCase();

            if (!statusPermitidos.includes(statusFormatado)) continue;
            if (!procedenciasPermitidas.includes(procedenciaFormatada)) continue;

            // Verifica se já existe no banco
            const [existe] = await db.query('SELECT 1 FROM pos_bd_b2b WHERE bd = ?', [BD]);
            if (existe.length > 0) {
                ignoradosJaExistem++;
                continue;
            }

            // ✅ Insere no banco de dados
            await db.query(`
                INSERT INTO pos_bd_b2b (
                    bd, bd_raiz, id_vantive, procedencia, reclamacao,
                    cliente, endereco, cidade, uf, cluster, lp_13,
                    data_abertura, data_encerramento
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                BD, BD_RAIZ, ID_VANTIVE, PROCEDENCIA, RECLAMCACAO,
                CLIENTE, ENDERECO, CIDADE, UF, CLUSTER, LP_13,
                DATA_ABERTURA, DATA_ENCERRAMENTO
            ]);

            inseridos++; // Conta inserção
        }

        // Apaga arquivo temporário do disco após uso
        fs.unlinkSync(req.file.path);

        // 📑 Geração de log no arquivo .txt
        const totalIgnorados = ignoradosJaExistem + ignoradosSemBD + ignoradas;
        const usuario = req.session.usuario?.nome || 'Desconhecido';
        const nomeArquivo = req.file.originalname;
        const dataHora = new Date().toLocaleString('pt-BR');

        const linhaLog = `Pós BD => [${dataHora}] Usuário: ${usuario} | Arquivo: ${nomeArquivo} | Inseridos: ${inseridos} | Ignorados: ${totalIgnorados} (Existentes: ${ignoradosJaExistem}, Sem BD: ${ignoradosSemBD}, Quebradas com erro na linha: ${ignoradas})\n`;
        const logPath = path.join(__dirname, '../logs/upload_logs.txt');
        fs.appendFileSync(logPath, linhaLog);

        // Retorna HTML de feedback ao usuário
        res.setHeader('Content-Type', 'text/html');
        res.send(`✅ Upload completo!<br>✔️ Inseridos: ${inseridos}<br>
                  &nbsp;&nbsp;🔁 Existentes: ${ignoradosJaExistem}<br>`);

        console.log(linhaLog);
    } catch (err) {
        console.error(err);
        res.status(500).send('Erro ao processar o arquivo CSV.');
    }
};

// 🔍 Função para listar todas as ordens do banco
const listarOrdensPos = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM pos_bd_b2b ORDER BY id DESC');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao buscar ordens' });
    }
};

// Exportação das funções e configuração para uso em rotas
module.exports = {
    upload,
    processarUpload,
    listarOrdensPos
};
