const path = require("path");
const db = require("../../db/db");
const { error } = require("console");
const { getValorHora } = require("../utils/valoresHE"); // Adicionado para calcular o valor

//Tela envio de HE
exports.telaEnvio = (req, res) => {
    res.sendFile(path.join(__dirname, "../views/enviar.html"));
};

//Enviar solicitação de HE
exports.enviarSolicitacoesMultiplo = async (req, res) => {
    const conexao = db.mysqlPool;
    const enviadoPor = req.session.usuario?.email || "desconhecido";

    try {
        const solicitacoes = req.body; // array de objetos
        if (!Array.isArray(solicitacoes) || solicitacoes.length === 0) {
            return res.status(400).json({ sucesso: false, mensagem: "Nenhuma solicitação enviada." });
        }

        for (const s of solicitacoes) {
            await conexao.query(
                `INSERT INTO PLANEJAMENTO_HE 
            (GERENTE, COLABORADOR, MATRICULA, CARGO, MES, HORAS, JUSTIFICATIVA, TIPO_HE, STATUS, ENVIADO_POR) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDENTE', ?)`,
                [s.gerente, s.colaborador, s.matricula, s.cargo, s.mes, s.horas, s.justificativa, s.tipoHE, enviadoPor]
            );
        }

        res.json({ sucesso: true, mensagem: "Solicitações enviadas com sucesso!" });
    } catch (error) {
        console.error("Erro ao enviar múltiplas solicitações:", error);
        res.status(500).json({ sucesso: false, mensagem: "Erro interno ao enviar solicitações." });
    }
};

// Função para obter o resumo de HE
exports.obterResumoHE = async (req, res) => {
    const { gerente, mes } = req.query;

    if (!gerente || !mes) {
        return res.status(400).json({ erro: "Parâmetros 'gerente' e 'mes' são obrigatórios." });
    }

    try {
        const conexao = db.mysqlPool;

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
};


exports.listarEnvios = (req, res) => {
    // Lógica para listar envios
    res.json([{ id: 1, colaborador: "Fulano", horas: 5 }]);
};

exports.editarEnvio = (req, res) => {
    // Lógica para editar envio
    res.json({ sucesso: true, mensagem: "Envio editado com sucesso!" });
};

exports.excluirEnvio = (req, res) => {
    // Lógica para excluir envio
    res.json({ sucesso: true, mensagem: "Envio excluído com sucesso!" });
};

exports.gerarDash = (req, res) => {
    // Lógica para gerar dados da dashboard
    res.json({ totalHoras: 120, colaboradores: 8 });
};

exports.telaAprovacao = (req, res) => {
    res.sendFile(path.join(__dirname, "../views/aprovacao.html"));
};

exports.aprovarSolicitacao = (req, res) => {
    // Lógica para aprovar
    res.json({ sucesso: true, mensagem: "Solicitação aprovada!" });
};

exports.recusarSolicitacao = (req, res) => {
    // Lógica para recusar
    res.json({ sucesso: true, mensagem: "Solicitação recusada!" });
};