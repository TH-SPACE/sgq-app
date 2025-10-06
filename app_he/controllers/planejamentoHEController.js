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
      return res
        .status(400)
        .json({ sucesso: false, mensagem: "Nenhuma solicitação enviada." });
    }

    for (const s of solicitacoes) {
      await conexao.query(
        `INSERT INTO PLANEJAMENTO_HE 
            (GERENTE, COLABORADOR, MATRICULA, CARGO, MES, HORAS, JUSTIFICATIVA, TIPO_HE, STATUS, ENVIADO_POR) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDENTE', ?)`,
        [
          s.gerente,
          s.colaborador,
          s.matricula,
          s.cargo,
          s.mes,
          s.horas,
          s.justificativa,
          s.tipoHE,
          enviadoPor,
        ]
      );
    }

    res.json({ sucesso: true, mensagem: "Solicitações enviadas com sucesso!" });
  } catch (error) {
    console.error("Erro ao enviar múltiplas solicitações:", error);
    res.status(500).json({
      sucesso: false,
      mensagem: "Erro interno ao enviar solicitações.",
    });
  }
};

// Função para obter o resumo de HE
exports.obterResumoHE = async (req, res) => {
  const { gerente, mes } = req.query;

  if (!gerente || !mes) {
    return res
      .status(400)
      .json({ erro: "Parâmetros 'gerente' e 'mes' são obrigatórios." });
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

exports.listarEnvios = async (req, res) => {
  const conexao = db.mysqlPool;
  const emailUsuario = req.session.usuario?.email;
  const { colaborador, mes } = req.query; // ←←← novos parâmetros

  if (!emailUsuario) {
    return res.status(401).json({ erro: "Usuário não autenticado." });
  }

  try {
    let query = `
      SELECT 
        id,
        GERENTE,
        COLABORADOR,
        MATRICULA,
        CARGO,
        MES,
        HORAS,
        JUSTIFICATIVA,
        TIPO_HE,
        STATUS,
        ENVIADO_POR,
        DATE_FORMAT(DATA_ENVIO, '%d/%m/%Y %H:%i') AS DATA_ENVIO_FORMATADA
      FROM PLANEJAMENTO_HE 
      WHERE ENVIADO_POR = ?
    `;
    const params = [emailUsuario];

    // Filtro por colaborador (busca parcial, case-insensitive)
    if (colaborador) {
      query += ` AND COLABORADOR LIKE ?`;
      params.push(`%${colaborador.trim()}%`);
    }

    // Filtro por mês
    if (mes) {
      query += ` AND MES = ?`;
      params.push(mes);
    }

    query += ` ORDER BY DATA_ENVIO DESC`;

    const [rows] = await conexao.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error("Erro ao listar envios:", error);
    res.status(500).json({ erro: "Erro ao carregar suas solicitações." });
  }
};

exports.editarEnvio = async (req, res) => {
  const conexao = db.mysqlPool;
  const emailUsuario = req.session.usuario?.email;
  const { id, mes, horas, tipoHE, justificativa } = req.body;

  if (!emailUsuario) {
    return res
      .status(401)
      .json({ sucesso: false, mensagem: "Não autenticado." });
  }

  if (!id || !mes || !horas || !tipoHE || !justificativa) {
    return res
      .status(400)
      .json({ sucesso: false, mensagem: "Dados incompletos." });
  }

  try {
    // Verifica se a solicitação pertence ao usuário
    const [verificacao] = await conexao.query(
      "SELECT STATUS FROM PLANEJAMENTO_HE WHERE id = ? AND ENVIADO_POR = ?",
      [id, emailUsuario]
    );

    if (verificacao.length === 0) {
      return res
        .status(403)
        .json({
          sucesso: false,
          mensagem: "Solicitação não encontrada ou acesso negado.",
        });
    }

    const statusAtual = verificacao[0].STATUS;
    let novoStatus = "PENDENTE";

    // Regra: se já foi aprovada ou recusada, ao editar volta para PENDENTE
    // (isso já está garantido com novoStatus = 'PENDENTE')

    await conexao.query(
      `UPDATE PLANEJAMENTO_HE 
       SET MES = ?, HORAS = ?, TIPO_HE = ?, JUSTIFICATIVA = ?, STATUS = ?
       WHERE id = ? AND ENVIADO_POR = ?`,
      [mes, horas, tipoHE, justificativa, novoStatus, id, emailUsuario]
    );

    res.json({
      sucesso: true,
      mensagem: "Solicitação atualizada com sucesso!",
    });
  } catch (error) {
    console.error("Erro ao editar envio:", error);
    res
      .status(500)
      .json({ sucesso: false, mensagem: "Erro ao atualizar solicitação." });
  }
};

exports.excluirEnvio = async (req, res) => {
  const conexao = db.mysqlPool;
  const emailUsuario = req.session.usuario?.email;
  const { id } = req.body; // ←←← req.body.id, não req.query ou req.params

  // Validação crítica
  if (!emailUsuario) {
    return res
      .status(401)
      .json({ sucesso: false, mensagem: "Não autenticado." });
  }
  if (!id || (typeof id !== "number" && isNaN(id))) {
    return res.status(400).json({ sucesso: false, mensagem: "ID inválido." });
  }

  try {
    // Verifica se pertence ao usuário e está PENDENTE
    const [rows] = await conexao.query(
      "SELECT STATUS FROM PLANEJAMENTO_HE WHERE id = ? AND ENVIADO_POR = ?",
      [Number(id), emailUsuario]
    );

    if (rows.length === 0) {
      return res
        .status(403)
        .json({
          sucesso: false,
          mensagem: "Solicitação não encontrada ou acesso negado.",
        });
    }

    if (rows[0].STATUS !== "PENDENTE") {
      return res
        .status(400)
        .json({
          sucesso: false,
          mensagem: "Só é possível excluir solicitações pendentes.",
        });
    }

    await conexao.query(
      "DELETE FROM PLANEJAMENTO_HE WHERE id = ? AND ENVIADO_POR = ?",
      [Number(id), emailUsuario]
    );

    res.json({ sucesso: true, mensagem: "Solicitação excluída com sucesso!" });
  } catch (error) {
    console.error("Erro ao excluir envio:", error);
    res
      .status(500)
      .json({ sucesso: false, mensagem: "Erro interno ao excluir." });
  }
};

exports.getDashboardData = async (req, res) => {
  const conexao = db.mysqlPool;
  const { mes } = req.query;

  if (!mes) {
    return res.status(400).json({ erro: "O parâmetro 'mes' é obrigatório." });
  }

  try {
    const [rows] = await conexao.query(
      `SELECT 
        GERENTE,
        SUM(HORAS) as totalHoras,
        SUM(CASE WHEN STATUS = 'PENDENTE' THEN 1 ELSE 0 END) as pendentes,
        SUM(CASE WHEN STATUS = 'APROVADO' THEN 1 ELSE 0 END) as aprovadas,
        SUM(CASE WHEN STATUS = 'RECUSADO' THEN 1 ELSE 0 END) as recusadas,
        SUM(CASE WHEN STATUS = 'PENDENTE' THEN HORAS ELSE 0 END) as horasPendentes,
        SUM(CASE WHEN STATUS = 'APROVADO' THEN HORAS ELSE 0 END) as horasAprovadas
       FROM PLANEJAMENTO_HE 
       WHERE MES = ?
       GROUP BY GERENTE`,
      [mes]
    );

    res.json(rows);
  } catch (error) {
    console.error("Erro ao buscar dados do dashboard:", error);
    res.status(500).json({ erro: "Erro ao buscar dados para o dashboard." });
  }
};

exports.listarTodasSolicitacoes = async (req, res) => {
  const conexao = db.mysqlPool;
  const { gerente, mes } = req.query;

  if (!gerente || !mes) {
    return res.status(400).json({ erro: "Os parâmetros 'gerente' e 'mes' são obrigatórios." });
  }

  try {
    const [rows] = await conexao.query(
      `SELECT 
        id,
        COLABORADOR,
        HORAS,
        TIPO_HE,
        STATUS,
        DATE_FORMAT(DATA_ENVIO, '%d/%m/%Y %H:%i') AS DATA_ENVIO_FORMATADA
      FROM PLANEJAMENTO_HE 
      WHERE GERENTE = ? AND MES = ?
      ORDER BY DATA_ENVIO DESC`,
      [gerente, mes]
    );
    res.json(rows);
  } catch (error) {
    console.error("Erro ao listar todas as solicitações:", error);
    res.status(500).json({ erro: "Erro ao carregar as solicitações." });
  }
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
  res.json({ sucesso: true, mensagem: "Solicitação recusada!!" });
};
