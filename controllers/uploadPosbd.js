const multer = require('multer');
const path = require('path');
const XLSX = require('xlsx');
const fs = require('fs');
const db = require('../db/db');

// 🎯 Configuração dos filtros
//const statusPermitidos = []; // status aceitos
//const cidadesPermitidas = []; // cidades aceitas

// 📂 Configuração do Multer
const storage = multer.diskStorage({
    destination: 'uploads/',
    filename: (req, file, cb) =>
        cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// 🚀 Função para processar o upload Excel
const processarUpload = async (req, res) => {
    try {
        const workbook = XLSX.readFile(req.file.path);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const dados = XLSX.utils.sheet_to_json(sheet);

        let inseridos = 0, ignorados = 0;

        let ignoradosJaExistem = 0
        //let ignoradosStatus = 0;
        // let ignoradosCidade = 0;
        let ignoradosSemBD = 0;

        for (let linha of dados) {
            const {
                BD,
                BD_RAIZ,
                ID_VANTIVE,
                PROCEDENCIA,
                RECLAMACAO,
                CLIENTE,
                ENDERECO,
                CIDADE,
                UF,
                CLUSTER,
                LP_13,
                DATA_ABERTURA,
                DATA_ENCERRAMENTO
            } = linha;



            if (!BD) {
                //console.log(`[IGNORADO] Linha sem BD.`, linha);
                ignoradosSemBD++;
                continue;
            }

            // 🔍 Filtro de status
            /* const statusFormatado = (STATUS_APP || '').trim().toLowerCase();
             if (statusPermitidos.length > 0 && !statusPermitidos.includes(statusFormatado)) {
                 //console.log(`[IGNORADO] BD ${BD} - STATUS_APP não permitido (${STATUS_APP})`);
                 continue;
             }*/

            // 🔍 Filtro de cidade
            /* const cidadeFormatada = (CIDADE || '').trim().toLowerCase();
            if (cidadesPermitidas.length > 0 && !cidadesPermitidas.includes(cidadeFormatada)) {
                //console.log(`[IGNORADO] BD ${BD} - Cidade não permitida (${CIDADE})`);
                continue;
            }*/

            // 🔁 Verifica se já existe
            const [existe] = await db.query('SELECT 1 FROM pos_bd_b2b WHERE bd = ?', [BD]);
            if (existe.length > 0) {
                //console.log(`[IGNORADO] BD ${BD} - Já existe no banco`);
                ignoradosJaExistem++;

                continue;
            }

            // ✅ Inserção permitida
            await db.query(`
                INSERT INTO pos_bd_b2b (
                  bd, bd_raiz, id_vantive, procedencia, reclamacao,
                  cliente, endereco, cidade, uf, cluster, lp_13,
                  data_abertura, data_encerramento
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `, [
                BD,
                BD_RAIZ,
                ID_VANTIVE,
                PROCEDENCIA,
                RECLAMACAO || 'TESTE',
                CLIENTE,
                ENDERECO,
                CIDADE,
                UF,
                CLUSTER,
                LP_13,
                DATA_ABERTURA,
                DATA_ENCERRAMENTO
            ]);
            inseridos++;

        }

        // Apaga o arquivo temporário após processar
        fs.unlinkSync(req.file.path);

        // 🔽 Log de upload em .txt
        const totalIgnorados = ignoradosJaExistem + ignoradosStatus + ignoradosCidade + ignoradosSemBD;
        const usuario = req.session.usuario?.nome || 'Desconhecido';
        const nomeArquivo = req.file.originalname;
        const dataHora = new Date().toLocaleString('pt-BR');

        const linhaLog = `Pós BD => [${dataHora}] Usuário: ${usuario} | Arquivo: ${nomeArquivo} | Inseridos: ${inseridos} | Ignorados: ${totalIgnorados} (Existentes: ${ignoradosJaExistem}, Sem BD: ${ignoradosSemBD})\n`;

        const logPath = path.join(__dirname, '../logs/upload_logs.txt');
        fs.appendFileSync(logPath, linhaLog);

        //envio de reposta para o a janela do front
        res.setHeader('Content-Type', 'text/html'); // 👈 importante!
        res.send(`✅ Upload completo!<br>✔️ Inseridos: ${inseridos}<br>
                ❌ Ignorados: ${ignoradosJaExistem + ignoradosSemBD}<br>
                &nbsp;&nbsp;🔁 Já existentes na base: ${ignoradosJaExistem}<br>
                 &nbsp;&nbsp;❗ Linha Sem id do BD: ${ignoradosSemBD}`);

        console.log(linhaLog);

    } catch (err) {
        console.error(err);
        res.status(500).send('Erro ao processar o arquivo Excel.');
    }
};


// 🔍 API para listar ordens do banco
const listarOrdensPos = async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM pos_bd_b2b');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: 'Erro ao buscar ordens' });
    }
};

// Exporta também essa função
module.exports = {
    upload,
    processarUpload,
    listarOrdensPos
};
