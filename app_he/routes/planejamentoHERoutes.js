const express = require("express");
const router = express.Router();
const path = require("path");
const db = require("../../db/db");
const planejamentoHE = require("../controllers/planejamentoHEController");

// Middlewares
const heAuth = require("../middleware/heAuth");
const heAprovadorAuth = require("../middleware/heAprovadorAuth");
const heDiretoriaAuth = require("../middleware/heDiretoriaAuth");

// Rota principal da aplicação de HE
router.get("/", heAuth.requireHEAuth, heDiretoriaAuth.requireAnyHEDiretoria, (req, res) => {
  res.sendFile(path.join(__dirname, "../views/planejamento_he.html"));
});

// ================================================
// API PARA USUÁRIOS LOGADOS
// ================================================

// Retorna o perfil do usuário logado para o frontend decidir o que mostrar
router.get("/api/perfil-usuario", heAuth.requireHEAuth, planejamentoHE.getPerfilUsuario);

// Envio e gestão de solicitações pelo próprio usuário
router.post("/enviar-multiplo", heAuth.requireHEAuth, heDiretoriaAuth.requireAnyHEDiretoria, planejamentoHE.enviarSolicitacoesMultiplo);
router.get("/api/minhas-solicitacoes", heAuth.requireHEAuth, heDiretoriaAuth.requireAnyHEDiretoria, planejamentoHE.listarEnvios);
router.post("/editar", heAuth.requireHEAuth, heDiretoriaAuth.requireAnyHEDiretoria, planejamentoHE.editarEnvio);
router.post("/excluir", heAuth.requireHEAuth, heDiretoriaAuth.requireAnyHEDiretoria, planejamentoHE.excluirEnvio);
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
router.get("/api/gerentes", heAuth.requireHEAuth, heDiretoriaAuth.requireAnyHEDiretoria, async (req, res) => {
  const diretoria = req.diretoriaHE;
  try {
    const [rows] = await db.mysqlPool.query(
      "SELECT DISTINCT GERENTE FROM COLABORADORES_CW WHERE GERENTE IS NOT NULL AND GERENTE != '' AND (DIRETORIA = ? OR DIRETORIA IS NULL) ORDER BY GERENTE",
      [diretoria]
    );
    const gerentes = rows.map((row) => row.GERENTE).filter((g) => g);
    res.json({ gerentes });
  } catch (error) {
    console.error("Erro ao buscar gerentes:", error);
    res.status(500).json({ erro: "Erro ao buscar gerentes" });
  }
});

router.get("/api/colaboradores", heAuth.requireHEAuth, heDiretoriaAuth.requireAnyHEDiretoria, async (req, res) => {
  const gerente = req.query.gerente;
  const diretoria = req.diretoriaHE;
  if (!gerente) {
    return res.status(400).json({ erro: "Parâmetro 'gerente' é obrigatório." });
  }
  try {
    const [rows] = await db.mysqlPool.query(
      "SELECT NOME FROM COLABORADORES_CW WHERE UPPER(TRIM(GERENTE)) = UPPER(TRIM(?)) AND NOME IS NOT NULL AND (DIRETORIA = ? OR DIRETORIA IS NULL) ORDER BY NOME",
      [gerente, diretoria]
    );
    const colaboradores = rows.map((row) => row.NOME);
    res.json({ colaboradores });
  } catch (error) {
    console.error("Erro ao buscar colaboradores:", error);
    res.status(500).json({ erro: "Erro ao buscar colaboradores" });
  }
});

router.get("/api/cargo", heAuth.requireHEAuth, heDiretoriaAuth.requireAnyHEDiretoria, async (req, res) => {
  const nome = req.query.nome;
  const diretoria = req.diretoriaHE;
  if (!nome) {
    return res.status(400).json({ erro: "Parâmetro 'nome' é obrigatório." });
  }
  try {
    const [rows] = await db.mysqlPool.query(
      "SELECT CARGO, MATRICULA FROM COLABORADORES_CW WHERE NOME = ? AND (DIRETORIA = ? OR DIRETORIA IS NULL) LIMIT 1",
      [nome, diretoria]
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
router.get("/api/resumo-he", heAuth.requireHEAuth, heDiretoriaAuth.requireAnyHEDiretoria, planejamentoHE.obterResumoHE);
router.get("/api/dashboard-summary", heAuth.requireHEAuth, heDiretoriaAuth.requireAnyHEDiretoria, planejamentoHE.getDashboardData);
router.get("/api/exportar", heAuth.requireHEAuth, heDiretoriaAuth.requireAnyHEDiretoria, planejamentoHE.exportarDados);


// ================================================
// API PARA APROVADORES DE HE
// ================================================

router.get("/api/solicitacoes-pendentes", heAuth.requireHEAuth, heDiretoriaAuth.requireAprovadorComDiretoria, planejamentoHE.listarSolicitacoesPendentes);
router.post("/api/aprovar-solicitacao", heAuth.requireHEAuth, heDiretoriaAuth.requireAprovadorComDiretoria, planejamentoHE.aprovarSolicitacao);
router.post("/api/recusar-solicitacao", heAuth.requireHEAuth, heDiretoriaAuth.requireAprovadorComDiretoria, planejamentoHE.recusarSolicitacao);
router.post("/api/tratar-em-massa", heAuth.requireHEAuth, heDiretoriaAuth.requireAprovadorComDiretoria, planejamentoHE.tratarSolicitacoesEmMassa);
router.get("/api/approval-summary", heAuth.requireHEAuth, heDiretoriaAuth.requireAprovadorComDiretoria, planejamentoHE.getApprovalSummary);

// ================================================
// API PARA GERENCIAR COLABORADORES (CRUD)
// ================================================

router.get("/api/colaboradores/listar", heAuth.requireHEAuth, heDiretoriaAuth.requireAprovadorComDiretoria, planejamentoHE.listarColaboradores);
router.get("/api/colaboradores/exportar", heAuth.requireHEAuth, heDiretoriaAuth.requireAprovadorComDiretoria, planejamentoHE.exportarColaboradores);
router.get("/api/colaboradores/:id", heAuth.requireHEAuth, heDiretoriaAuth.requireAprovadorComDiretoria, planejamentoHE.obterColaborador);
router.post("/api/colaboradores/criar", heAuth.requireHEAuth, heDiretoriaAuth.requireAprovadorComDiretoria, planejamentoHE.criarColaborador);
router.post("/api/colaboradores/editar", heAuth.requireHEAuth, heDiretoriaAuth.requireAprovadorComDiretoria, planejamentoHE.editarColaborador);
router.post("/api/colaboradores/excluir", heAuth.requireHEAuth, heDiretoriaAuth.requireAprovadorComDiretoria, planejamentoHE.excluirColaborador);


module.exports = router;
