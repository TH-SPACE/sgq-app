const express = require("express");
const router = express.Router();
const path = require("path");
const db = require("../../db/db");
const planejamentoHE = require("../controllers/planejamentoHE");

// Middleware de autenticação para o módulo HE (reutiliza sessão do THANOS)
const heAuth = require("../middleware/heAuth");

// Middleware para verificar se é ADM (baseado na sessão do THANOS)
function verificaHEADM(req, res, next) {
  if (req.session.usuario && req.session.usuario.perfil === "ADM") {
    return next();
  }
  // Se não for ADM, redireciona ou nega acesso
  return res
    .status(403)
    .json({ erro: "Acesso negado. Apenas diretores podem aprovar." });
}

// Rotas públicas do HE (só login)
router.get("/", heAuth.requireHEAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "../views/planejamento_he.html"));
});

// Rotas protegidas: qualquer usuário logado no THANOS pode usar
router.get("/enviar", heAuth.requireHEAuth, planejamentoHE.telaEnvio);
router.post(
  "/enviar-multiplo",
  heAuth.requireHEAuth,
  planejamentoHE.enviarSolicitacoesMultiplo
);

router.get("/envios", heAuth.requireHEAuth, planejamentoHE.listarEnvios);
router.post("/editar", heAuth.requireHEAuth, planejamentoHE.editarEnvio);
router.post("/excluir", heAuth.requireHEAuth, planejamentoHE.excluirEnvio);

router.get("/dash", heAuth.requireHEAuth, planejamentoHE.gerarDash);

// Rotas de aprovação: só ADM (diretor)
router.get(
  "/aprovacao",
  heAuth.requireHEAuth,
  verificaHEADM,
  planejamentoHE.telaAprovacao
);
router.post(
  "/aprovar",
  heAuth.requireHEAuth,
  verificaHEADM,
  planejamentoHE.aprovarSolicitacao
);
router.post(
  "/recusar",
  heAuth.requireHEAuth,
  verificaHEADM,
  planejamentoHE.recusarSolicitacao
);

// APIs públicas (mas protegidas por login, pois usam dados sensíveis)
router.get("/api/gerentes", heAuth.requireHEAuth, async (req, res) => {
  try {
    const [rows] = await db.mysqlPool.query(
      "SELECT DISTINCT GERENTE FROM COLABORADORES_CW WHERE GERENTE IS NOT NULL AND GERENTE != ''"
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
      "SELECT NOME FROM COLABORADORES_CW WHERE UPPER(TRIM(GERENTE)) = UPPER(TRIM(?)) AND NOME IS NOT NULL",
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

// Em app_he/routes/planejamentoHE.js
const { getValorHora } = require("../utils/valoresHE");

router.get("/api/resumo-he", async (req, res) => {
  const { gerente, mes } = req.query;

  if (!gerente || !mes) {
    return res
      .status(400)
      .json({ erro: "Parâmetros 'gerente' e 'mes' são obrigatórios." });
  }

  try {
    const conexao = db.mysqlPool;

    // Busca TODAS as HEs da gerência e mês (aprovadas + pendentes)
    const [rows] = await conexao.query(
      `SELECT CARGO, HORAS, TIPO_HE, STATUS 
       FROM PLANEJAMENTO_HE 
       WHERE GERENTE = ? AND MES = ? AND STATUS IN ('APROVADO', 'PENDENTE')`,
      [gerente, mes]
    );

    let totalAprovado = 0;
    let totalPendente = 0;

    rows.forEach((he) => {
      const valorHora = getValorHora(he.CARGO, he.TIPO_HE);
      const valorTotal = he.HORAS * valorHora;

      if (he.STATUS === "APROVADO") {
        totalAprovado += valorTotal;
      } else if (he.STATUS === "PENDENTE") {
        totalPendente += valorTotal;
      }
    });

    res.json({
      aprovado: parseFloat(totalAprovado.toFixed(2)),
      pendente: parseFloat(totalPendente.toFixed(2)),
    });
  } catch (error) {
    console.error("Erro ao buscar resumo HE:", error);
    res.status(500).json({ erro: "Erro ao buscar dados." });
  }
});

module.exports = router;
