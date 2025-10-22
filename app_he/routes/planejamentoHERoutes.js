// ================================================================================
// 🛣️ ROTAS DO SISTEMA DE PLANEJAMENTO DE HORAS EXTRAS (HE)
// ================================================================================
// Este arquivo centraliza todas as rotas do módulo de Hora Extra, organizadas
// por categoria e nível de acesso. As rotas são protegidas por middlewares de
// autenticação que validam perfis e diretorias.
// ================================================================================

const express = require("express");
const router = express.Router();
const path = require("path");
const db = require("../../db/db");
const planejamentoHE = require("../controllers/planejamentoHEController");
const frequenciaRoutes = require("./frequenciaHERoutes");

// ================================================================================
// 🔐 Middlewares de Autenticação
// ================================================================================
// Importação dos middlewares que controlam acesso às rotas

const heAuth = require("../middleware/heAuth");                    // Valida perfil HE básico
const heAprovadorAuth = require("../middleware/heAprovadorAuth");  // Valida perfil de aprovador
const heDiretoriaAuth = require("../middleware/heDiretoriaAuth");  // Valida acesso por diretoria

// ================================================================================
// 🏠 ROTA PRINCIPAL - Página HTML do Sistema HE
// ================================================================================

/**
 * GET /
 * Renderiza a página principal do sistema de planejamento de HE
 *
 * Middlewares aplicados:
 * - requireHEAuth: Valida se o usuário tem perfil HE
 * - requireAnyHEDiretoria: Aceita qualquer diretoria (ENGENHARIA ou IMPLANTACAO)
 */
router.get("/", heAuth.requireHEAuth, heDiretoriaAuth.requireAnyHEDiretoria, (req, res) => {
  res.sendFile(path.join(__dirname, "../views/planejamento_he.html"));
});

// ================================================================================
// 👥 API PARA USUÁRIOS LOGADOS - Gestão de Solicitações Próprias
// ================================================================================
// Rotas para usuários com perfil HE (qualquer diretoria) gerenciarem suas
// próprias solicitações de hora extra.
// ================================================================================

/**
 * GET /api/perfil-usuario
 * Retorna o perfil do usuário logado
 *
 * Uso: Frontend utiliza para decidir quais funcionalidades mostrar
 * Middlewares: requireHEAuth
 */
router.get("/api/perfil-usuario", heAuth.requireHEAuth, planejamentoHE.getPerfilUsuario);

// --------------------------------------------------------------------------------
// 📝 Gestão de Solicitações Próprias
// --------------------------------------------------------------------------------

/**
 * POST /enviar-multiplo
 * Permite ao usuário enviar múltiplas solicitações de HE de uma vez
 *
 * Middlewares: requireHEAuth, requireAnyHEDiretoria
 */
router.post("/enviar-multiplo", heAuth.requireHEAuth, heDiretoriaAuth.requireAnyHEDiretoria, planejamentoHE.enviarSolicitacoesMultiplo);

/**
 * GET /api/minhas-solicitacoes
 * Lista todas as solicitações criadas pelo usuário logado
 *
 * Middlewares: requireHEAuth, requireAnyHEDiretoria
 * Query params: colaborador (opcional), mes (opcional)
 */
router.get("/api/minhas-solicitacoes", heAuth.requireHEAuth, heDiretoriaAuth.requireAnyHEDiretoria, planejamentoHE.listarEnvios);

/**
 * POST /editar
 * Edita uma solicitação existente (apenas se STATUS = PENDENTE)
 *
 * Middlewares: requireHEAuth, requireAnyHEDiretoria
 * Body: { id, mes, horas, tipoHE, justificativa }
 */
router.post("/editar", heAuth.requireHEAuth, heDiretoriaAuth.requireAnyHEDiretoria, planejamentoHE.editarEnvio);

/**
 * POST /excluir
 * Exclui uma solicitação (apenas se STATUS = PENDENTE)
 *
 * Middlewares: requireHEAuth, requireAnyHEDiretoria
 * Body: { id }
 */
router.post("/excluir", heAuth.requireHEAuth, heDiretoriaAuth.requireAnyHEDiretoria, planejamentoHE.excluirEnvio);

/**
 * GET /api/solicitacao/:id
 * Busca uma solicitação específica por ID
 *
 * Validações:
 * - Usuário deve estar autenticado
 * - Solicitação deve pertencer ao usuário logado (ENVIADO_POR = email do usuário)
 *
 * Middlewares: requireHEAuth
 * Retorna: Objeto com todos os campos da solicitação ou erro 404
 */
router.get("/api/solicitacao/:id", heAuth.requireHEAuth, async (req, res) => {
  const { id } = req.params;
  const emailUsuario = req.session.usuario?.email;

  // Valida autenticação
  if (!emailUsuario) {
    return res.status(401).json({ erro: "Não autenticado." });
  }

  try {
    // Busca a solicitação validando que pertence ao usuário logado
    const [rows] = await db.mysqlPool.query(
      `SELECT id, GERENTE, COLABORADOR, MATRICULA, CARGO, MES, HORAS, JUSTIFICATIVA, TIPO_HE, STATUS, ENVIADO_POR, DATE_FORMAT(DATA_ENVIO, '%d/%m/%Y %H:%i') AS DATA_ENVIO_FORMATADA FROM PLANEJAMENTO_HE WHERE id = ? AND ENVIADO_POR = ?`,
      [id, emailUsuario]
    );

    // Valida se encontrou a solicitação
    if (rows.length === 0) {
      return res.status(404).json({ erro: "Solicitação não encontrada ou acesso negado." });
    }

    // Retorna os dados da solicitação
    res.json(rows[0]);
  } catch (error) {
    console.error("Erro ao buscar solicitação:", error);
    res.status(500).json({ erro: "Erro ao carregar solicitação." });
  }
});

// --------------------------------------------------------------------------------
// 📊 APIs de Dados Auxiliares (Gerentes, Colaboradores, Cargos)
// --------------------------------------------------------------------------------
// Rotas para popular dropdowns e buscar informações de colaboradores
// Todas filtram automaticamente por diretoria do usuário (req.diretoriaHE)

/**
 * GET /api/gerentes
 * Lista todos os gerentes da diretoria do usuário
 *
 * Middlewares: requireHEAuth, requireAnyHEDiretoria
 * Filtro: Utiliza req.diretoriaHE (injetado pelo middleware)
 * Retorna: { gerentes: ["GERENTE 1", "GERENTE 2", ...] }
 */
router.get("/api/gerentes", heAuth.requireHEAuth, heDiretoriaAuth.requireAnyHEDiretoria, async (req, res) => {
  // Obtém a diretoria do usuário (injetada pelo middleware requireAnyHEDiretoria)
  const diretoria = req.diretoriaHE;

  try {
    // Busca gerentes únicos da diretoria, ordenados alfabeticamente
    const [rows] = await db.mysqlPool.query(
      "SELECT DISTINCT GERENTE FROM COLABORADORES_CW WHERE GERENTE IS NOT NULL AND GERENTE != '' AND (DIRETORIA = ? OR DIRETORIA IS NULL) ORDER BY GERENTE",
      [diretoria]
    );

    // Mapeia os resultados e remove valores vazios/null
    const gerentes = rows.map((row) => row.GERENTE).filter((g) => g);

    res.json({ gerentes });
  } catch (error) {
    console.error("Erro ao buscar gerentes:", error);
    res.status(500).json({ erro: "Erro ao buscar gerentes" });
  }
});

/**
 * GET /api/colaboradores
 * Lista todos os colaboradores de um gerente específico
 *
 * Middlewares: requireHEAuth, requireAnyHEDiretoria
 * Query params: gerente (obrigatório)
 * Filtro: Utiliza req.diretoriaHE
 * Retorna: { colaboradores: ["COLABORADOR 1", "COLABORADOR 2", ...] }
 */
router.get("/api/colaboradores", heAuth.requireHEAuth, heDiretoriaAuth.requireAnyHEDiretoria, async (req, res) => {
  const gerente = req.query.gerente;
  const diretoria = req.diretoriaHE;

  // Valida parâmetro obrigatório
  if (!gerente) {
    return res.status(400).json({ erro: "Parâmetro 'gerente' é obrigatório." });
  }

  try {
    // Busca colaboradores do gerente usando UPPER e TRIM para maior flexibilidade
    const [rows] = await db.mysqlPool.query(
      "SELECT NOME FROM COLABORADORES_CW WHERE UPPER(TRIM(GERENTE)) = UPPER(TRIM(?)) AND NOME IS NOT NULL AND (DIRETORIA = ? OR DIRETORIA IS NULL) ORDER BY NOME",
      [gerente, diretoria]
    );

    // Mapeia apenas os nomes dos colaboradores
    const colaboradores = rows.map((row) => row.NOME);

    res.json({ colaboradores });
  } catch (error) {
    console.error("Erro ao buscar colaboradores:", error);
    res.status(500).json({ erro: "Erro ao buscar colaboradores" });
  }
});

/**
 * GET /api/cargo
 * Busca o cargo e matrícula de um colaborador específico
 *
 * Middlewares: requireHEAuth, requireAnyHEDiretoria
 * Query params: nome (obrigatório)
 * Filtro: Utiliza req.diretoriaHE
 * Retorna: { cargo: "CARGO", matricula: "MATRICULA" }
 */
router.get("/api/cargo", heAuth.requireHEAuth, heDiretoriaAuth.requireAnyHEDiretoria, async (req, res) => {
  const nome = req.query.nome;
  const diretoria = req.diretoriaHE;

  // Valida parâmetro obrigatório
  if (!nome) {
    return res.status(400).json({ erro: "Parâmetro 'nome' é obrigatório." });
  }

  try {
    // Busca cargo e matrícula do colaborador (LIMIT 1 pois esperamos resultado único)
    const [rows] = await db.mysqlPool.query(
      "SELECT CARGO, MATRICULA FROM COLABORADORES_CW WHERE NOME = ? AND (DIRETORIA = ? OR DIRETORIA IS NULL) LIMIT 1",
      [nome, diretoria]
    );

    // Valida se encontrou o colaborador
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

// --------------------------------------------------------------------------------
// 📈 APIs para Dashboards e Relatórios
// --------------------------------------------------------------------------------
// Rotas para visualização de dados agregados e exportação

/**
 * GET /api/resumo-he
 * Retorna resumo consolidado de HE por status
 *
 * Middlewares: requireHEAuth, requireAnyHEDiretoria
 * Filtro: Por diretoria do usuário
 */
router.get("/api/resumo-he", heAuth.requireHEAuth, heDiretoriaAuth.requireAnyHEDiretoria, planejamentoHE.obterResumoHE);

/**
 * GET /api/dashboard-summary
 * Retorna dados sumarizados para o dashboard principal
 *
 * Middlewares: requireHEAuth, requireAnyHEDiretoria
 * Query params: mes (opcional), gerente (opcional)
 * Filtro: Por diretoria do usuário
 */
router.get("/api/dashboard-summary", heAuth.requireHEAuth, heDiretoriaAuth.requireAnyHEDiretoria, planejamentoHE.getDashboardData);

/**
 * GET /api/exportar
 * Exporta dados de HE em formato CSV
 *
 * Middlewares: requireHEAuth, requireAnyHEDiretoria
 * Query params: mes (opcional), gerente (opcional)
 * Retorna: Arquivo CSV para download
 */
router.get("/api/exportar", heAuth.requireHEAuth, heDiretoriaAuth.requireAnyHEDiretoria, planejamentoHE.exportarDados);

// ================================================================================
// 👔 API PARA APROVADORES DE HE
// ================================================================================
// Rotas exclusivas para usuários com perfil HE_APROVADOR
// Aprovadores visualizam e gerenciam apenas solicitações de sua diretoria
// ================================================================================

/**
 * GET /api/solicitacoes-pendentes
 * Lista todas as solicitações com STATUS = PENDENTE da diretoria do aprovador
 *
 * Middlewares: requireHEAuth, requireAprovadorComDiretoria
 * Filtro: Apenas diretoria do aprovador
 */
router.get("/api/solicitacoes-pendentes", heAuth.requireHEAuth, heDiretoriaAuth.requireAprovadorComDiretoria, planejamentoHE.listarSolicitacoesPendentes);

/**
 * POST /api/aprovar-solicitacao
 * Aprova uma solicitação específica (altera STATUS para APROVADO)
 *
 * Middlewares: requireHEAuth, requireAprovadorComDiretoria
 * Body: { id }
 */
router.post("/api/aprovar-solicitacao", heAuth.requireHEAuth, heDiretoriaAuth.requireAprovadorComDiretoria, planejamentoHE.aprovarSolicitacao);

/**
 * POST /api/recusar-solicitacao
 * Recusa uma solicitação específica (altera STATUS para RECUSADO)
 *
 * Middlewares: requireHEAuth, requireAprovadorComDiretoria
 * Body: { id, motivo (opcional) }
 */
router.post("/api/recusar-solicitacao", heAuth.requireHEAuth, heDiretoriaAuth.requireAprovadorComDiretoria, planejamentoHE.recusarSolicitacao);

/**
 * POST /api/tratar-em-massa
 * Aprova ou recusa múltiplas solicitações de uma vez
 *
 * Middlewares: requireHEAuth, requireAprovadorComDiretoria
 * Body: { ids: [1, 2, 3], acao: "aprovar" | "recusar" }
 */
router.post("/api/tratar-em-massa", heAuth.requireHEAuth, heDiretoriaAuth.requireAprovadorComDiretoria, planejamentoHE.tratarSolicitacoesEmMassa);

/**
 * GET /api/approval-summary
 * Retorna resumo de aprovações para o aprovador
 *
 * Middlewares: requireHEAuth, requireAprovadorComDiretoria
 * Retorna: Contadores de pendentes, aprovadas e recusadas
 */
router.get("/api/approval-summary", heAuth.requireHEAuth, heDiretoriaAuth.requireAprovadorComDiretoria, planejamentoHE.getApprovalSummary);

// ================================================================================
// 👥 API PARA GERENCIAR COLABORADORES (CRUD)
// ================================================================================
// Rotas para aprovadores gerenciarem a base de colaboradores da diretoria
// Permite criar, editar, excluir e exportar lista de colaboradores
// ================================================================================

/**
 * GET /api/colaboradores/listar
 * Lista todos os colaboradores da diretoria do aprovador
 *
 * Middlewares: requireHEAuth, requireAprovadorComDiretoria
 * Query params: gerente (opcional), ativo (opcional)
 */
router.get("/api/colaboradores/listar", heAuth.requireHEAuth, heDiretoriaAuth.requireAprovadorComDiretoria, planejamentoHE.listarColaboradores);

/**
 * GET /api/colaboradores/exportar
 * Exporta lista de colaboradores em CSV
 *
 * Middlewares: requireHEAuth, requireAprovadorComDiretoria
 * Retorna: Arquivo CSV
 */
router.get("/api/colaboradores/exportar", heAuth.requireHEAuth, heDiretoriaAuth.requireAprovadorComDiretoria, planejamentoHE.exportarColaboradores);

/**
 * GET /api/colaboradores/:id
 * Busca dados de um colaborador específico por ID
 *
 * Middlewares: requireHEAuth, requireAprovadorComDiretoria
 * Params: id (obrigatório)
 */
router.get("/api/colaboradores/:id", heAuth.requireHEAuth, heDiretoriaAuth.requireAprovadorComDiretoria, planejamentoHE.obterColaborador);

/**
 * POST /api/colaboradores/criar
 * Cria um novo colaborador na base
 *
 * Middlewares: requireHEAuth, requireAprovadorComDiretoria
 * Body: { nome, matricula, cargo, gerente, diretoria }
 */
router.post("/api/colaboradores/criar", heAuth.requireHEAuth, heDiretoriaAuth.requireAprovadorComDiretoria, planejamentoHE.criarColaborador);

/**
 * POST /api/colaboradores/editar
 * Edita dados de um colaborador existente
 *
 * Middlewares: requireHEAuth, requireAprovadorComDiretoria
 * Body: { id, nome, matricula, cargo, gerente, diretoria }
 */
router.post("/api/colaboradores/editar", heAuth.requireHEAuth, heDiretoriaAuth.requireAprovadorComDiretoria, planejamentoHE.editarColaborador);

/**
 * POST /api/colaboradores/excluir
 * Exclui (ou inativa) um colaborador
 *
 * Middlewares: requireHEAuth, requireAprovadorComDiretoria
 * Body: { id }
 */
router.post("/api/colaboradores/excluir", heAuth.requireHEAuth, heDiretoriaAuth.requireAprovadorComDiretoria, planejamentoHE.excluirColaborador);

// ================================================================================
// 📤 EXPORT - Exporta o router para uso no app principal
// ================================================================================

// Inclui as rotas de frequência no router principal
router.use('/', frequenciaRoutes);

module.exports = router;
