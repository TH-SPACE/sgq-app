const express = require("express");
const router = express.Router();
const path = require("path");
const db = require("../../db/db");
const planejamentoHE = require("../controllers/planejamentoHEController");

// Middlewares
const heAuth = require("../middleware/heAuth");
const heAprovadorAuth = require("../middleware/heAprovadorAuth");
const heUserAuth = require("../middleware/heUserAuth");

// Rota principal da aplicação de HE
router.get("/", heAuth.requireHEAuth, heUserAuth.requireHEUser, (req, res) => {
  res.sendFile(path.join(__dirname, "../views/planejamento_he.html"));
});

// ================================================
// API PARA USUÁRIOS LOGADOS
// ================================================

// Retorna o perfil do usuário logado para o frontend decidir o que mostrar
router.get("/api/perfil-usuario", heAuth.requireHEAuth, planejamentoHE.getPerfilUsuario);

// Envio e gestão de solicitações pelo próprio usuário
router.post("/enviar-multiplo", heAuth.requireHEAuth, planejamentoHE.enviarSolicitacoesMultiplo);
router.get("/api/minhas-solicitacoes", heAuth.requireHEAuth, planejamentoHE.listarEnvios);
router.post("/editar", heAuth.requireHEAuth, planejamentoHE.editarEnvio);
router.post("/excluir", heAuth.requireHEAuth, planejamentoHE.excluirEnvio);
router.get("/api/solicitacao/:id", heAuth.requireHEAuth, async (req, res) => {
  const { id } = req.params;
  const emailUsuario = req.session.usuario?.email;

  if (!emailUsuario) {
    return res.status(401).json({ erro: "Não autenticado." });
  }

  try {
    const [rows] = await db.mysqlPool.query(
      `SELECT id, GERENTE, COLABORADOR, MATRICULA, CARGO, MES, HORAS, JUSTIFICATIVA, TIPO_HE, STATUS, ENVIADO_POR, DATE_FORMAT(DATA_ENVIO, '%d/%m/%Y %H:%i') AS DATA_ENVIO_FORMATADA FROM PLANEJAMENTO_HE WHERE id = ? AND ENVIADO_POR = ?`,
      [id, emailUsuario]
    );

    if (rows.length === 0) {
      return res.status(404).json({ erro: "Solicitação não encontrada ou acesso negado." });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error("Erro ao buscar solicitação:", error);
    res.status(500).json({ erro: "Erro ao carregar solicitação." });
  }
});

// APIs de dados gerais (gerentes, colaboradores, etc)
router.get("/api/gerentes", heAuth.requireHEAuth, async (req, res) => {
  try {
    const [rows] = await db.mysqlPool.query(
      "SELECT DISTINCT GERENTE FROM COLABORADORES_CW WHERE GERENTE IS NOT NULL AND GERENTE != '' ORDER BY GERENTE"
    );
    const gerentes = rows.map((row) => row.GERENTE).filter((g) => g);
    res.json({ gerentes });
  } catch (error) {
    console.error("Erro ao buscar gerentes:", error);
    res.status(500).json({ erro: "Erro ao buscar gerentes" });
  }
});

router.get("/api/colaboradores", heAuth.requireHEAuth, async (req, res) => {
  const gerente = req.query.gerente;
  if (!gerente) {
    return res.status(400).json({ erro: "Parâmetro 'gerente' é obrigatório." });
  }
  try {
    const [rows] = await db.mysqlPool.query(
      "SELECT NOME FROM COLABORADORES_CW WHERE UPPER(TRIM(GERENTE)) = UPPER(TRIM(?)) AND NOME IS NOT NULL ORDER BY NOME",
      [gerente]
    );
    const colaboradores = rows.map((row) => row.NOME);
    res.json({ colaboradores });
  } catch (error) {
    console.error("Erro ao buscar colaboradores:", error);
    res.status(500).json({ erro: "Erro ao buscar colaboradores" });
  }
});

router.get("/api/cargo", heAuth.requireHEAuth, async (req, res) => {
  const nome = req.query.nome;
  if (!nome) {
    return res.status(400).json({ erro: "Parâmetro 'nome' é obrigatório." });
  }
  try {
    const [rows] = await db.mysqlPool.query(
      "SELECT CARGO, MATRICULA FROM COLABORADORES_CW WHERE NOME = ? LIMIT 1",
      [nome]
    );
    if (rows.length > 0) {
      res.json({ cargo: rows[0].CARGO, matricula: rows[0].MATRICULA });
    } else {
      res.status(404).json({ erro: "Colaborador não encontrado" });
    }
  } catch (error) {
    console.error("Erro ao buscar cargo/matrícula:", error);
    res.status(500).json({ erro: "Erro ao buscar dados" });
  }
});

// APIs para Dashboards e resumos
router.get("/api/resumo-he", heAuth.requireHEAuth, planejamentoHE.obterResumoHE);
router.get("/api/dashboard-summary", heAuth.requireHEAuth, planejamentoHE.getDashboardData);
router.get("/api/exportar", heAuth.requireHEAuth, planejamentoHE.exportarDados);


// ================================================
// API PARA APROVADORES DE HE
// ================================================

router.get("/api/solicitacoes-pendentes", heAuth.requireHEAuth, heAprovadorAuth.requireAprovadorHE, planejamentoHE.listarSolicitacoesPendentes);
router.post("/api/aprovar-solicitacao", heAuth.requireHEAuth, heAprovadorAuth.requireAprovadorHE, planejamentoHE.aprovarSolicitacao);
router.post("/api/recusar-solicitacao", heAuth.requireHEAuth, heAprovadorAuth.requireAprovadorHE, planejamentoHE.recusarSolicitacao);
router.post("/api/tratar-em-massa", heAuth.requireHEAuth, heAprovadorAuth.requireAprovadorHE, planejamentoHE.tratarSolicitacoesEmMassa);
router.get("/api/approval-summary", heAuth.requireHEAuth, heAprovadorAuth.requireAprovadorHE, planejamentoHE.getApprovalSummary);


module.exports = router;
