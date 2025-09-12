const express = require("express");
const router = express.Router();
const path = require("path");
const db = require("../../db/db"); // ajuste conforme seu módulo de conexão
const planejamentoHE = require("../controllers/planejamentoHE");
const { verificaLogin, verificaADM } = require("../../middlewares/autenticacao");

router.get("/", verificaLogin, (req, res) => {
    res.sendFile(path.join(__dirname, "../views/planejamento_he.html"));
});

router.get("/enviar", verificaLogin, planejamentoHE.telaEnvio);
router.post("/enviar", verificaLogin, planejamentoHE.enviarSolicitacao);

router.get("/envios", verificaLogin, planejamentoHE.listarEnvios);
router.post("/editar", verificaLogin, planejamentoHE.editarEnvio);
router.post("/excluir", verificaLogin, planejamentoHE.excluirEnvio);

router.get("/dash", verificaLogin, planejamentoHE.gerarDash);

router.get("/aprovacao", verificaADM, planejamentoHE.telaAprovacao);
router.post("/aprovar", verificaADM, planejamentoHE.aprovarSolicitacao);
router.post("/recusar", verificaADM, planejamentoHE.recusarSolicitacao);


router.get("/api/gerentes", async (req, res) => {
    try {
        const [rows] = await db.mysqlPool.query("SELECT DISTINCT GERENTE FROM COLABORADORES_CW WHERE GERENTE IS NOT NULL");
        const gerentes = rows.map(row => row.GERENTE);
        res.json({ gerentes });
    } catch (error) {
        console.error("Erro ao buscar gerentes:", error);
        res.status(500).json({ erro: "Erro ao buscar gerentes" });
    }
});

router.get("/api/colaboradores", async (req, res) => {
    const gerente = req.query.gerente;

    try {
        const [rows] = await db.mysqlPool.query(
            'SELECT NOME FROM COLABORADORES_CW WHERE UPPER(TRIM(GERENTE)) = UPPER(TRIM(?))',
            [gerente]
        );
        const colaboradores = rows.map(row => row.NOME);
        res.json({ colaboradores });
    } catch (error) {
        console.error('Erro ao buscar colaboradores:', error);
        res.status(500).json({ error: 'Erro ao buscar colaboradores' });
    }
});

router.get("/api/cargo", async (req, res) => {
    const nome = req.query.nome;
    try {
        const [rows] = await db.mysqlPool.query(
            "SELECT CARGO, MATRICULA FROM COLABORADORES_CW WHERE NOME = ? LIMIT 1",
            [nome]
        );

        if (rows.length > 0) {
            res.json({ cargo: rows[0].CARGO, matricula: rows[0].MATRICULA });
        } else {
            res.status(404).json({ error: "Colaborador não encontrado" });
        }
    } catch (error) {
        console.error("Erro ao buscar cargo/matrícula:", error);
        res.status(500).json({ error: "Erro ao buscar dados" });
    }
});



module.exports = router;
