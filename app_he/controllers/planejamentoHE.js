const path = require("path");

exports.telaEnvio = (req, res) => {
    res.sendFile(path.join(__dirname, "../views/enviar.html"));
};

exports.enviarSolicitacao = (req, res) => {
    // Lógica para salvar a solicitação
    res.json({ sucesso: true, mensagem: "Solicitação enviada com sucesso!" });
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
