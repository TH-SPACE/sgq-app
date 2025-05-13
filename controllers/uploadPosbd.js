// 📦 Importação de dependências
const multer = require("multer"); // Para lidar com upload de arquivos
const path = require("path"); // Para manipulação de caminhos
const fs = require("fs"); // Para manipular arquivos no sistema
const db = require("../db/db"); // Conexão com banco de dados MariaDB
const csv = require("csv-parse/sync"); // Biblioteca para parsear arquivos CSV
const { Parser } = require("json2csv");
const XLSX = require("xlsx");

// 📂 Configuração do Multer (gerenciador de uploads)
const storage = multer.diskStorage({
  destination: "uploads/", // Pasta onde os arquivos serão salvos
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname)), // Nome do arquivo com timestamp
});

// 🔒 Filtro para aceitar apenas arquivos .csv
const fileFilter = (req, file, cb) => {
  if (file.mimetype === "text/csv") {
    cb(null, true);
  } else {
    cb(new Error("Apenas arquivos CSV são permitidos!"), false);
  }
};

const upload = multer({ storage, fileFilter }); // Middleware configurado

// 🎯 Filtros utilizados para seleção das linhas que serão inseridas
const statusPermitidos = ["FECHADO"]; // Apenas ordens com status 'FECHADO'
const procedenciasPermitidas = ["TRIAGEM"]; // Apenas ordens com procedência 'TRIAGEM'

const mapearUf = {
  PA: "BELEM",
  AP: "MANAUS",
  DF: "BRASILIA",
  AC: "CAMPO GRANDE",
  MS: "CAMPO GRANDE",
  RO: "CAMPO GRANDE",
  MT: "CUIABA",
  GO: "GOIANIA",
  TO: "PALMAS",
  AM: "MANAUS",
  RR: "MANAUS",
  MA: "SAO LUIS",
};

// 🚀 Função principal para processar o CSV e inserir dados no banco
const processarUpload = async (req, res) => {
  try {
    // Validação: verifica se o arquivo foi enviado
    if (!req.file || !req.file.path) {
      return res.status(400).send("Arquivo CSV não enviado.");
    }

    // Lê o conteúdo do CSV
    let conteudo = fs.readFileSync(req.file.path, "latin1");

    // Corrige aspas mal formatadas no conteúdo
    conteudo = conteudo.replace(/"([^\n"]*?)"([^\s;,])/g, '"$1"$2');

    const linhas = conteudo.split("\n"); // Divide em linhas
    let dados = []; // Armazena os registros válidos
    let ignoradas = 0; // Contador de linhas ignoradas por erro de parse

    // 🔄 Processa linha por linha (ignora cabeçalho)
    for (let i = 1; i < linhas.length; i++) {
      try {
        const linha = linhas[i];
        const registro = csv.parse(`${linhas[0]}\n${linha}`, {
          columns: true,
          skip_empty_lines: true,
          delimiter: ";",
          relax_quotes: true,
        });
        dados.push(...registro);
      } catch (err) {
        ignoradas++; // Se der erro ao parsear, ignora e conta
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
        BD,
        BD_RAIZ,
        ID_VANTIVE,
        PROCEDENCIA,
        RECLAMCACAO,
        CLIENTE,
        ENDERECO,
        CIDADE,
        UF,
        CLUSTER,
        LP_13,
        DATA_ABERTURA,
        DATA_ENCERRAMENTO,
        STATUS,
      } = linha;

      // Ignora linhas sem BD
      if (!BD) {
        ignoradosSemBD++;
        continue;
      }

      // Aplica filtros de status e procedência
      const statusFormatado = (STATUS || "").trim().toUpperCase();
      const procedenciaFormatada = (PROCEDENCIA || "").trim().toUpperCase();

      if (!statusPermitidos.includes(statusFormatado)) continue;
      if (!procedenciasPermitidas.includes(procedenciaFormatada)) continue;

      // Verifica se já existe no banco
      const [existe] = await db.mysqlPool.query(
        "SELECT 1 FROM pos_bd_b2b WHERE bd = ?",
        [BD]
      );
      if (existe.length > 0) {
        ignoradosJaExistem++;
        continue;
      }

      const uf = (linha.UF || "").trim().toUpperCase();

      // 🧭 Primeiro tenta usar o UF para definir o cluster
      if (mapearUf[uf]) {
        linha.CLUSTER = mapearUf[uf];
      }

      if ((CIDADE || "").trim().toUpperCase() === "ANAPOLIS") {
        linha.CLUSTER = "ANAPOLIS";
      } else if ((CIDADE || "").trim().toUpperCase() === "JARAGUA") {
        linha.CLUSTER = "ANAPOLIS";
      } else if ((CIDADE || "").trim().toUpperCase() === "LUZIANIA") {
        linha.CLUSTER = "BRASILIA";
      } else if ((CIDADE || "").trim().toUpperCase() === "CIDADE OCIDENTAL") {
        linha.CLUSTER = "BRASILIA";
      } else if ((CIDADE || "").trim().toUpperCase() === "FORMOSA") {
        linha.CLUSTER = "BRASILIA";
      }

      // ✅ Insere no banco de dados
      await db.mysqlPool.query(
        `
                INSERT INTO pos_bd_b2b (
                    bd, bd_raiz, id_vantive, procedencia, reclamacao,
                    cliente, endereco, cidade, uf, cluster, lp_13,
                    data_abertura, data_encerramento
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
        [
          BD,
          BD_RAIZ,
          ID_VANTIVE,
          PROCEDENCIA,
          RECLAMCACAO,
          CLIENTE,
          ENDERECO,
          CIDADE,
          UF,
          linha.CLUSTER,
          LP_13,
          DATA_ABERTURA,
          DATA_ENCERRAMENTO,
        ]
      );

      inseridos++; // Conta inserção
    }

    // Apaga arquivo temporário do disco após uso
    fs.unlinkSync(req.file.path);

    // 📑 Geração de log no arquivo .txt
    const totalIgnorados = ignoradosJaExistem + ignoradosSemBD + ignoradas;
    const usuario = req.session.usuario?.nome || "Desconhecido";
    const nomeArquivo = req.file.originalname;
    const dataHora = new Date().toLocaleString("pt-BR");

    const linhaLog = `Pós BD => [${dataHora}] Usuário: ${usuario} | Arquivo: ${nomeArquivo} | Inseridos: ${inseridos} | Ignorados: ${totalIgnorados} (Existentes: ${ignoradosJaExistem}, Sem BD: ${ignoradosSemBD}, Quebradas com erro na linha: ${ignoradas})\n`;
    const logPath = path.join(__dirname, "../logs/upload_logs.txt");
    fs.appendFileSync(logPath, linhaLog);

    // Retorna HTML de feedback ao usuário
    res.setHeader("Content-Type", "text/html");
    res.send(`✅ Upload completo!<br>✔️ Inseridos: ${inseridos}<br>
                  &nbsp;&nbsp;🔁 Existentes: ${ignoradosJaExistem}<br>`);

    console.log(linhaLog);
  } catch (err) {
    console.error(err);
    res.status(500).send("Erro ao processar o arquivo CSV.");
  }
};

// 🔍 Função para listar todas as ordens do banco
const listarOrdensPos = async (req, res) => {
  try {
    const [rows] = await db.mysqlPool.query(
      "SELECT * FROM pos_bd_b2b ORDER BY id DESC"
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao buscar ordens" });
  }
};

const downloadOrdensPos = async (req, res) => {
  try {
    const { inicio, fim } = req.query;

    let sql = "SELECT * FROM pos_bd_b2b WHERE 1=1";
    const params = [];

    if (inicio) {
      sql += ' AND STR_TO_DATE(data_abertura, "%Y-%m-%d") >= ?';
      params.push(inicio);
    }

    if (fim) {
      sql += ' AND STR_TO_DATE(data_abertura, "%Y-%m-%d") <= ?';
      params.push(fim);
    }

    const [rows] = await db.mysqlPool.query(sql, params);

    // Cria planilha a partir do JSON
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ordens");

    // Escreve em buffer
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Disposition", "attachment; filename=ordens.xlsx");
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).send("Erro ao gerar XLSX");
  }
};

const tratarOrdemPos = async (req, res) => {
  const { id, status_app, preventiva, observacao, tratado_por } = req.body;

  try {
    await db.mysqlPool.query(
      `UPDATE pos_bd_b2b 
             SET status_app = ?, 
                 preventiva = ?, 
                 observacao = ?, 
                 tratado_por = ?, 
                 modificado = NOW()
             WHERE id = ?`,
      [status_app, preventiva, observacao, tratado_por, id]
    );

    res.json({ sucesso: true, mensagem: "Ordem tratada com sucesso." });
  } catch (err) {
    console.error("Erro ao tratar ordem:", err);
    res.status(500).json({ sucesso: false, mensagem: "Erro ao tratar ordem." });
  }
};

// Exportação das funções e configuração para uso em rotas
module.exports = {
  upload,
  processarUpload,
  listarOrdensPos,
  downloadOrdensPos,
  tratarOrdemPos,
};
