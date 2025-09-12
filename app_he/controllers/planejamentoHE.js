const path = require("path");
const db = require("../../db/db");
const { error } = require("console");

//Tela envio de HE
exports.telaEnvio = (req, res) => {
    res.sendFile(path.join(__dirname, "../views/enviar.html"));
};

//Enviar solicitação de HE
exports.enviarSolicitacao = async (req, res) => {
    // Lógica para salvar a solicitação
    try {
        const { gerente, colaborador, cargo, matricula, mes, horas, justificativa, tipoHE } = req.body;
        const enviadoPor = req.session.usuario?.email || 'desconhecido';

        if (!gerente || !colaborador || !cargo || !matricula || !mes || !horas || !justificativa || !tipoHE) {
            return res.status(400).json({ sucesso: false, mensagem: "Preencha todos os campos obrigatórios!" });
        }
        const [result] = await db.mysqlPool.query(
            `INSERT INTO PLANEJAMENTO_HE
            (GERENTE, COLABORADOR, CARGO, MATRICULA, MES, HORAS, JUSTIFICATIVA, TIPO_HE, STATUS, ENVIADO_POR)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?,'PENDENTE',?)`,
            [gerente, colaborador, cargo, matricula, mes, horas, justificativa, tipoHE, enviadoPor]
        );
        res.json({ sucesso: true, mensagem: "Solicitação enviada com sucesso!", id: result.insertId });
    } catch (erro) {
        console.error("Erro ao enviar solicitação: ", error);
        res.status(500).json({ sucesso: false, mensagem: "Erro interno ao enviar solicitação." });
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
