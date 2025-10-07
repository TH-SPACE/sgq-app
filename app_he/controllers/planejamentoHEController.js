const path = require("path");
const db = require("../../db/db");
const { getValorHora } = require("../utils/valoresHE");
const limitesData = require("../json/limite_he.json"); // Carregamento mais robusto

// Retorna o perfil do usuário logado
exports.getPerfilUsuario = (req, res) => {
  const perfil = req.session.usuario?.perfil || "USER";
  res.json({ perfil });
};

exports.getApprovalSummary = async (req, res) => {
    const { gerente, mes } = req.query;
    const user = req.session.usuario;
    const ip = req.ip;

    if (!mes) { // Apenas mês é obrigatório agora
        return res.status(400).json({ erro: "Parâmetro 'mes' é obrigatório para gerar o resumo." });
    }

    try {
        const conexao = db.mysqlPool;

        let query = `SELECT STATUS, CARGO, HORAS, TIPO_HE FROM PLANEJamento_HE WHERE MES = ?`;
        const params = [mes];

        if (gerente) {
            query += ` AND GERENTE = ?`;
            params.push(gerente);
        }

        const [solicitacoes] = await conexao.query(query, params);

        let limiteTotal = 0;
        if (gerente) {
            const limiteInfo = limitesData.find(l => l.Responsavel === gerente);
            limiteTotal = limiteInfo ? parseFloat(limiteInfo.Valores.replace('.', '').replace(',', '.')) : 0;
        } else {
            // Soma todos os limites para obter o total geral
            limiteTotal = limitesData.reduce((acc, l) => {
                const valor = parseFloat(l.Valores.replace('.', '').replace(',', '.')) || 0;
                return acc + valor;
            }, 0);
        }

        let resumo = {
            APROVADO: { horas: 0, valor: 0 },
            PENDENTE: { horas: 0, valor: 0 },
            RECUSADO: { horas: 0, valor: 0 }
        };

        solicitacoes.forEach(s => {
            if (resumo[s.STATUS]) {
                const horas = Number(s.HORAS) || 0;
                const valor = getValorHora(s.CARGO, s.TIPO_HE) * horas;
                resumo[s.STATUS].horas += horas;
                resumo[s.STATUS].valor += valor;
            }
        });

        const limiteAtual = limiteTotal - resumo.APROVADO.valor;
        const limitePosAprovacao = limiteAtual - resumo.PENDENTE.valor;

        const finalSummary = {
            limiteTotal,
            limiteAtual,
            limitePosAprovacao,
            resumoPorStatus: resumo
        };

        res.json(finalSummary);

    } catch (error) {
        console.error(`[ERRO] Usuário: ${user?.nome}, IP: ${ip}, Ação: Erro ao gerar resumo de aprovação.`, error);
        res.status(500).json({ erro: "Erro interno ao gerar o resumo financeiro." });
    }
};


//Tela envio de HE
exports.telaEnvio = (req, res) => {
  res.sendFile(path.join(__dirname, "../views/enviar.html"));
};

//Enviar solicitação de HE
exports.enviarSolicitacoesMultiplo = async (req, res) => {
  const conexao = db.mysqlPool;
  const enviadoPor = req.session.usuario?.email || "desconhecido";
  const user = req.session.usuario;
  const ip = req.ip;

  try {
    const solicitacoes = req.body; // array de objetos
    if (!Array.isArray(solicitacoes) || solicitacoes.length === 0) {
      return res
        .status(400)
        .json({ sucesso: false, mensagem: "Nenhuma solicitação enviada." });
    }

    console.log(
      `[INFO] Usuário: ${
        user?.nome || "desconhecido"
      }, IP: ${ip}, Ação: Envio de ${solicitacoes.length} solicitações de HE.`
    );

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
    console.error(
      `[ERRO] Usuário: ${
        user?.nome || "desconhecido"
      }, IP: ${ip}, Ação: Erro ao enviar múltiplas solicitações de HE.`,
      error
    );
    res.status(500).json({
      sucesso: false,
      mensagem: "Erro interno ao enviar solicitações.",
    });
  }
};

// Função para obter o resumo de HE
exports.obterResumoHE = async (req, res) => {
  const { gerente, mes } = req.query;
  const user = req.session.usuario;
  const ip = req.ip;

  console.log(
    `[INFO] Usuário: ${
      user?.nome || "desconhecido"
    }, IP: ${ip}, Ação: Obter resumo de HE para gerente: ${gerente}, mês: ${mes}.`
  );

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
    console.error(
      `[ERRO] Usuário: ${
        user?.nome || "desconhecido"
      }, IP: ${ip}, Ação: Erro ao obter resumo de HE para gerente: ${gerente}, mês: ${mes}.`,
      error
    );
    res.status(500).json({ erro: "Erro ao buscar dados." });
  }
};

exports.listarEnvios = async (req, res) => {
  const conexao = db.mysqlPool;
  const emailUsuario = req.session.usuario?.email;
  const user = req.session.usuario;
  const ip = req.ip;
  const { colaborador, mes } = req.query; // ←←← novos parâmetros

  console.log(
    `[INFO] Usuário: ${
      user?.nome || emailUsuario
    }, IP: ${ip}, Ação: Listar envios com filtros: colaborador=${colaborador}, mes=${mes}.`
  );

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
    console.error(
      `[ERRO] Usuário: ${
        user?.nome || emailUsuario
      }, IP: ${ip}, Ação: Erro ao listar envios.`,
      error
    );
    res.status(500).json({ erro: "Erro ao carregar suas solicitações." });
  }
};

exports.editarEnvio = async (req, res) => {
  const conexao = db.mysqlPool;
  const emailUsuario = req.session.usuario?.email;
  const user = req.session.usuario;
  const ip = req.ip;
  const { id, mes, horas, tipoHE, justificativa } = req.body;

  console.log(
    `[INFO] Usuário: ${
      user?.nome || emailUsuario
    }, IP: ${ip}, Ação: Tentativa de edição da solicitação ID: ${id}.`
  );

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
      console.log(
        `[FALHA] Usuário: ${
          user?.nome || emailUsuario
        }, IP: ${ip}, Ação: Edição da solicitação ID: ${id}. Motivo: Solicitação não encontrada ou acesso negado.`
      );
      return res.status(403).json({
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

    console.log(
      `[SUCESSO] Usuário: ${
        user?.nome || emailUsuario
      }, IP: ${ip}, Ação: Edição da solicitação ID: ${id}.`
    );
    res.json({
      sucesso: true,
      mensagem: "Solicitação atualizada com sucesso!",
    });
  } catch (error) {
    console.error(
      `[ERRO] Usuário: ${
        user?.nome || emailUsuario
      }, IP: ${ip}, Ação: Erro ao editar a solicitação ID: ${id}.`,
      error
    );
    res
      .status(500)
      .json({ sucesso: false, mensagem: "Erro ao atualizar solicitação." });
  }
};

exports.excluirEnvio = async (req, res) => {
  const conexao = db.mysqlPool;
  const emailUsuario = req.session.usuario?.email;
  const user = req.session.usuario;
  const ip = req.ip;
  const { id } = req.body; // ←←← req.body.id, não req.query ou req.params

  console.log(
    `[INFO] Usuário: ${
      user?.nome || emailUsuario
    }, IP: ${ip}, Ação: Tentativa de exclusão da solicitação ID: ${id}.`
  );

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
      console.log(
        `[FALHA] Usuário: ${
          user?.nome || emailUsuario
        }, IP: ${ip}, Ação: Exclusão da solicitação ID: ${id}. Motivo: Solicitação não encontrada ou acesso negado.`
      );
      return res.status(403).json({
        sucesso: false,
        mensagem: "Solicitação não encontrada ou acesso negado.",
      });
    }

    if (rows[0].STATUS !== "PENDENTE") {
      console.log(
        `[FALHA] Usuário: ${
          user?.nome || emailUsuario
        }, IP: ${ip}, Ação: Exclusão da solicitação ID: ${id}. Motivo: Status da solicitação não é 'PENDENTE'.`
      );
      return res.status(400).json({
        sucesso: false,
        mensagem: "Só é possível excluir solicitações pendentes.",
      });
    }

    await conexao.query(
      "DELETE FROM PLANEJAMENTO_HE WHERE id = ? AND ENVIADO_POR = ?",
      [Number(id), emailUsuario]
    );

    console.log(
      `[SUCESSO] Usuário: ${
        user?.nome || emailUsuario
      }, IP: ${ip}, Ação: Exclusão da solicitação ID: ${id}.`
    );
    res.json({ sucesso: true, mensagem: "Solicitação excluída com sucesso!" });
  } catch (error) {
    console.error(
      `[ERRO] Usuário: ${
        user?.nome || emailUsuario
      }, IP: ${ip}, Ação: Erro ao excluir a solicitação ID: ${id}.`,
      error
    );
    res
      .status(500)
      .json({ sucesso: false, mensagem: "Erro interno ao excluir." });
  }
};

// --- Substitua o método atual getDashboardData por este ---
exports.getDashboardData = async (req, res) => {
  const conexao = db.mysqlPool;
  const { mes, gerente } = req.query;
  const user = req.session.usuario;
  const ip = req.ip;

  console.log(
    `[INFO] Usuário: ${
      user?.nome || "desconhecido"
    }, IP: ${ip}, Ação: Obter dados do dashboard com filtros: mes=${mes}, gerente=${gerente}.`
  );

  if (!mes) {
    return res.status(400).json({ erro: "O parâmetro 'mes' é obrigatório." });
  }

  try {
    let query = `
      SELECT 
        GERENTE,
        SUM(HORAS) as totalHoras,
        SUM(CASE WHEN STATUS = 'PENDENTE' THEN 1 ELSE 0 END) as pendentes,
        SUM(CASE WHEN STATUS = 'APROVADO' THEN 1 ELSE 0 END) as aprovadas,
        SUM(CASE WHEN STATUS = 'RECUSADO' THEN 1 ELSE 0 END) as recusadas,
        SUM(CASE WHEN STATUS = 'PENDENTE' THEN HORAS ELSE 0 END) as horasPendentes,
        SUM(CASE WHEN STATUS = 'APROVADO' THEN HORAS ELSE 0 END) as horasAprovadas,
        SUM(CASE WHEN STATUS = 'RECUSADO' THEN HORAS ELSE 0 END) as horasRecusadas
      FROM PLANEJAMENTO_HE
      WHERE MES = ?
    `;
    const params = [mes];

    if (gerente) {
      query += ` AND GERENTE LIKE ?`;
      params.push(`%${gerente}%`);
    }

    query += ` GROUP BY GERENTE ORDER BY GERENTE`;

    const [rows] = await conexao.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error(
      `[ERRO] Usuário: ${
        user?.nome || "desconhecido"
      }, IP: ${ip}, Ação: Erro ao buscar dados do dashboard.`,
      error
    );
    res.status(500).json({ erro: "Erro ao buscar dados para o dashboard." });
  }
};

// Retorna lista de gerentes únicos para preencher o dropdown da dashboard
exports.getGerentes = async (req, res) => {
  const conexao = db.mysqlPool;
  const user = req.session.usuario;
  const ip = req.ip;

  console.log(
    `[INFO] Usuário: ${
      user?.nome || "desconhecido"
    }, IP: ${ip}, Ação: Listar gerentes.`
  );

  try {
    const [rows] = await conexao.query(`
      SELECT DISTINCT GERENTE AS nome
      FROM PLANEJAMENTO_HE
      WHERE GERENTE IS NOT NULL AND GERENTE <> ''
      ORDER BY GERENTE
    `);
    res.json(rows);
  } catch (error) {
    console.error(
      `[ERRO] Usuário: ${
        user?.nome || "desconhecido"
      }, IP: ${ip}, Ação: Erro ao listar gerentes.`,
      error
    );
    res.status(500).json({ erro: "Erro ao listar gerentes." });
  }
};

exports.listarSolicitacoesPendentes = async (req, res) => {
    const conexao = db.mysqlPool;
    const user = req.session.usuario;
    const ip = req.ip;
    const { gerente, status, mes } = req.query;

    console.log(`[INFO] Usuário: ${user?.nome || 'desconhecido'}, IP: ${ip}, Ação: Listar solicitações para tratamento com filtros:`, req.query);

    try {
        let query = `
            SELECT 
                id, GERENTE, COLABORADOR, MATRICULA, CARGO, MES, HORAS, JUSTIFICATIVA, TIPO_HE, STATUS, ENVIADO_POR, 
                DATE_FORMAT(DATA_ENVIO, '%d/%m/%Y %H:%i') AS DATA_ENVIO_FORMATADA
            FROM PLANEJAMENTO_HE 
            WHERE 1=1`; // Inicia com uma condição sempre verdadeira para facilitar a adição de filtros
        
        const params = [];

        if (gerente) {
            query += ` AND GERENTE = ?`;
            params.push(gerente);
        }
        if (status) {
            query += ` AND STATUS = ?`;
            params.push(status);
        }
        if (mes) {
            query += ` AND MES = ?`;
            params.push(mes);
        }

        query += ` ORDER BY DATA_ENVIO ASC`;

        const [rows] = await conexao.query(query, params);
        res.json(rows);
    } catch (error) {
        console.error(`[ERRO] Usuário: ${user?.nome || 'desconhecido'}, IP: ${ip}, Ação: Erro ao listar solicitações para tratamento.`, error);
        res.status(500).json({ erro: "Erro ao carregar as solicitações para tratamento." });
    }
};

exports.aprovarSolicitacao = async (req, res) => {
  const conexao = db.mysqlPool;
  const { id } = req.body;
  const user = req.session.usuario;
  const ip = req.ip;

  console.log(
    `[INFO] Usuário: ${user?.nome}, IP: ${ip}, Ação: Aprovar solicitação ID: ${id}.`
  );

  if (!id) {
    return res
      .status(400)
      .json({ sucesso: false, mensagem: "ID da solicitação é obrigatório." });
  }

  try {
    await conexao.query(
      "UPDATE PLANEJAMENTO_HE SET STATUS = 'APROVADO' WHERE id = ?",
      [id]
    );
    res.json({ sucesso: true, mensagem: "Solicitação aprovada com sucesso!" });
  } catch (error) {
    console.error(
      `[ERRO] Usuário: ${user?.nome}, IP: ${ip}, Ação: Erro ao aprovar solicitação ID: ${id}.`,
      error
    );
    res
      .status(500)
      .json({
        sucesso: false,
        mensagem: "Erro interno ao aprovar a solicitação.",
      });
  }
};

exports.recusarSolicitacao = async (req, res) => {
  const conexao = db.mysqlPool;
  const { id } = req.body;
  const user = req.session.usuario;
  const ip = req.ip;

  console.log(
    `[INFO] Usuário: ${user?.nome}, IP: ${ip}, Ação: Recusar solicitação ID: ${id}.`
  );

  if (!id) {
    return res
      .status(400)
      .json({ sucesso: false, mensagem: "ID da solicitação é obrigatório." });
  }

  try {
    await conexao.query(
      "UPDATE PLANEJAMENTO_HE SET STATUS = 'RECUSADO' WHERE id = ?",
      [id]
    );
    res.json({ sucesso: true, mensagem: "Solicitação recusada com sucesso!" });
  } catch (error) {
    console.error(
      `[ERRO] Usuário: ${user?.nome}, IP: ${ip}, Ação: Erro ao recusar solicitação ID: ${id}.`,
      error
    );
    res
      .status(500)
      .json({
        sucesso: false,
        mensagem: "Erro interno ao recusar a solicitação.",
      });
  }
};

exports.tratarSolicitacoesEmMassa = async (req, res) => {
    const conexao = db.mysqlPool;
    const { ids, status } = req.body; // ids: array de IDs; status: 'APROVADO' ou 'RECUSADO'
    const user = req.session.usuario;
    const ip = req.ip;

    console.log(`[INFO] Usuário: ${user?.nome}, IP: ${ip}, Ação: Tratar ${ids.length} solicitações em massa para o status '${status}'.`);

    if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ sucesso: false, mensagem: "Nenhum ID de solicitação fornecido." });
    }
    if (!['APROVADO', 'RECUSADO'].includes(status)) {
        return res.status(400).json({ sucesso: false, mensagem: "Status inválido." });
    }

    try {
        // O placeholder `?` do mysql não funciona diretamente com `IN (...)`, então precisamos criar os placeholders dinamicamente
        const placeholders = ids.map(() => '?').join(',');
        const query = `UPDATE PLANEJAMENTO_HE SET STATUS = ? WHERE id IN (${placeholders})`;
        
        const params = [status, ...ids];

        const [result] = await conexao.query(query, params);

        res.json({ sucesso: true, mensagem: `${result.affectedRows} solicitações foram atualizadas para ${status}.` });
    } catch (error) {
        console.error(`[ERRO] Usuário: ${user?.nome}, IP: ${ip}, Ação: Erro ao tratar solicitações em massa.`, error);
        res.status(500).json({ sucesso: false, mensagem: "Erro interno ao processar a solicitação em massa." });
    }
};

exports.tratarSolicitacoesEmMassa = async (req, res) => {
    const conexao = db.mysqlPool;
    const { ids, status } = req.body; // ids: array de IDs; status: 'APROVADO' ou 'RECUSADO'
    const user = req.session.usuario;
    const ip = req.ip;

    console.log(`[INFO] Usuário: ${user?.nome}, IP: ${ip}, Ação: Tratar ${ids.length} solicitações em massa para o status '${status}'.`);

    if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ sucesso: false, mensagem: "Nenhum ID de solicitação fornecido." });
    }
    if (!['APROVADO', 'RECUSADO'].includes(status)) {
        return res.status(400).json({ sucesso: false, mensagem: "Status inválido." });
    }

    try {
        // O placeholder `?` do mysql não funciona diretamente com `IN (...)`, então precisamos criar os placeholders dinamicamente
        const placeholders = ids.map(() => '?').join(',');
        const query = `UPDATE PLANEJAMENTO_HE SET STATUS = ? WHERE id IN (${placeholders})`;
        
        const params = [status, ...ids];

        const [result] = await conexao.query(query, params);

        res.json({ sucesso: true, mensagem: `${result.affectedRows} solicitações foram atualizadas para ${status}.` });
    } catch (error) {
        console.error(`[ERRO] Usuário: ${user?.nome}, IP: ${ip}, Ação: Erro ao tratar solicitações em massa.`, error);
        res.status(500).json({ sucesso: false, mensagem: "Erro interno ao processar a solicitação em massa." });
    }
};


//Tela envio de HE
exports.telaEnvio = (req, res) => {
  res.sendFile(path.join(__dirname, "../views/enviar.html"));
};

//Enviar solicitação de HE
exports.enviarSolicitacoesMultiplo = async (req, res) => {
  const conexao = db.mysqlPool;
  const enviadoPor = req.session.usuario?.email || "desconhecido";
  const user = req.session.usuario;
  const ip = req.ip;

  try {
    const solicitacoes = req.body; // array de objetos
    if (!Array.isArray(solicitacoes) || solicitacoes.length === 0) {
      return res
        .status(400)
        .json({ sucesso: false, mensagem: "Nenhuma solicitação enviada." });
    }

    console.log(
      `[INFO] Usuário: ${
        user?.nome || "desconhecido"
      }, IP: ${ip}, Ação: Envio de ${solicitacoes.length} solicitações de HE.`
    );

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
    console.error(
      `[ERRO] Usuário: ${
        user?.nome || "desconhecido"
      }, IP: ${ip}, Ação: Erro ao enviar múltiplas solicitações de HE.`,
      error
    );
    res.status(500).json({
      sucesso: false,
      mensagem: "Erro interno ao enviar solicitações.",
    });
  }
};

// Função para obter o resumo de HE
exports.obterResumoHE = async (req, res) => {
  const { gerente, mes } = req.query;
  const user = req.session.usuario;
  const ip = req.ip;

  console.log(
    `[INFO] Usuário: ${
      user?.nome || "desconhecido"
    }, IP: ${ip}, Ação: Obter resumo de HE para gerente: ${gerente}, mês: ${mes}.`
  );

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
    console.error(
      `[ERRO] Usuário: ${
        user?.nome || "desconhecido"
      }, IP: ${ip}, Ação: Erro ao obter resumo de HE para gerente: ${gerente}, mês: ${mes}.`,
      error
    );
    res.status(500).json({ erro: "Erro ao buscar dados." });
  }
};

exports.listarEnvios = async (req, res) => {
  const conexao = db.mysqlPool;
  const emailUsuario = req.session.usuario?.email;
  const user = req.session.usuario;
  const ip = req.ip;
  const { colaborador, mes } = req.query; // ←←← novos parâmetros

  console.log(
    `[INFO] Usuário: ${
      user?.nome || emailUsuario
    }, IP: ${ip}, Ação: Listar envios com filtros: colaborador=${colaborador}, mes=${mes}.`
  );

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
    console.error(
      `[ERRO] Usuário: ${
        user?.nome || emailUsuario
      }, IP: ${ip}, Ação: Erro ao listar envios.`,
      error
    );
    res.status(500).json({ erro: "Erro ao carregar suas solicitações." });
  }
};

exports.editarEnvio = async (req, res) => {
  const conexao = db.mysqlPool;
  const emailUsuario = req.session.usuario?.email;
  const user = req.session.usuario;
  const ip = req.ip;
  const { id, mes, horas, tipoHE, justificativa } = req.body;

  console.log(
    `[INFO] Usuário: ${
      user?.nome || emailUsuario
    }, IP: ${ip}, Ação: Tentativa de edição da solicitação ID: ${id}.`
  );

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
      console.log(
        `[FALHA] Usuário: ${
          user?.nome || emailUsuario
        }, IP: ${ip}, Ação: Edição da solicitação ID: ${id}. Motivo: Solicitação não encontrada ou acesso negado.`
      );
      return res.status(403).json({
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

    console.log(
      `[SUCESSO] Usuário: ${
        user?.nome || emailUsuario
      }, IP: ${ip}, Ação: Edição da solicitação ID: ${id}.`
    );
    res.json({
      sucesso: true,
      mensagem: "Solicitação atualizada com sucesso!",
    });
  } catch (error) {
    console.error(
      `[ERRO] Usuário: ${
        user?.nome || emailUsuario
      }, IP: ${ip}, Ação: Erro ao editar a solicitação ID: ${id}.`,
      error
    );
    res
      .status(500)
      .json({ sucesso: false, mensagem: "Erro ao atualizar solicitação." });
  }
};

exports.excluirEnvio = async (req, res) => {
  const conexao = db.mysqlPool;
  const emailUsuario = req.session.usuario?.email;
  const user = req.session.usuario;
  const ip = req.ip;
  const { id } = req.body; // ←←← req.body.id, não req.query ou req.params

  console.log(
    `[INFO] Usuário: ${
      user?.nome || emailUsuario
    }, IP: ${ip}, Ação: Tentativa de exclusão da solicitação ID: ${id}.`
  );

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
      console.log(
        `[FALHA] Usuário: ${
          user?.nome || emailUsuario
        }, IP: ${ip}, Ação: Exclusão da solicitação ID: ${id}. Motivo: Solicitação não encontrada ou acesso negado.`
      );
      return res.status(403).json({
        sucesso: false,
        mensagem: "Solicitação não encontrada ou acesso negado.",
      });
    }

    if (rows[0].STATUS !== "PENDENTE") {
      console.log(
        `[FALHA] Usuário: ${
          user?.nome || emailUsuario
        }, IP: ${ip}, Ação: Exclusão da solicitação ID: ${id}. Motivo: Status da solicitação não é 'PENDENTE'.`
      );
      return res.status(400).json({
        sucesso: false,
        mensagem: "Só é possível excluir solicitações pendentes.",
      });
    }

    await conexao.query(
      "DELETE FROM PLANEJAMENTO_HE WHERE id = ? AND ENVIADO_POR = ?",
      [Number(id), emailUsuario]
    );

    console.log(
      `[SUCESSO] Usuário: ${
        user?.nome || emailUsuario
      }, IP: ${ip}, Ação: Exclusão da solicitação ID: ${id}.`
    );
    res.json({ sucesso: true, mensagem: "Solicitação excluída com sucesso!" });
  } catch (error) {
    console.error(
      `[ERRO] Usuário: ${
        user?.nome || emailUsuario
      }, IP: ${ip}, Ação: Erro ao excluir a solicitação ID: ${id}.`,
      error
    );
    res
      .status(500)
      .json({ sucesso: false, mensagem: "Erro interno ao excluir." });
  }
};

// --- Substitua o método atual getDashboardData por este ---
exports.getDashboardData = async (req, res) => {
  const conexao = db.mysqlPool;
  const { mes, gerente } = req.query;
  const user = req.session.usuario;
  const ip = req.ip;

  console.log(
    `[INFO] Usuário: ${
      user?.nome || "desconhecido"
    }, IP: ${ip}, Ação: Obter dados do dashboard com filtros: mes=${mes}, gerente=${gerente}.`
  );

  if (!mes) {
    return res.status(400).json({ erro: "O parâmetro 'mes' é obrigatório." });
  }

  try {
    let query = `
      SELECT 
        GERENTE,
        SUM(HORAS) as totalHoras,
        SUM(CASE WHEN STATUS = 'PENDENTE' THEN 1 ELSE 0 END) as pendentes,
        SUM(CASE WHEN STATUS = 'APROVADO' THEN 1 ELSE 0 END) as aprovadas,
        SUM(CASE WHEN STATUS = 'RECUSADO' THEN 1 ELSE 0 END) as recusadas,
        SUM(CASE WHEN STATUS = 'PENDENTE' THEN HORAS ELSE 0 END) as horasPendentes,
        SUM(CASE WHEN STATUS = 'APROVADO' THEN HORAS ELSE 0 END) as horasAprovadas,
        SUM(CASE WHEN STATUS = 'RECUSADO' THEN HORAS ELSE 0 END) as horasRecusadas
      FROM PLANEJAMENTO_HE
      WHERE MES = ?
    `;
    const params = [mes];

    if (gerente) {
      query += ` AND GERENTE LIKE ?`;
      params.push(`%${gerente}%`);
    }

    query += ` GROUP BY GERENTE ORDER BY GERENTE`;

    const [rows] = await conexao.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error(
      `[ERRO] Usuário: ${
        user?.nome || "desconhecido"
      }, IP: ${ip}, Ação: Erro ao buscar dados do dashboard.`,
      error
    );
    res.status(500).json({ erro: "Erro ao buscar dados para o dashboard." });
  }
};

// Retorna lista de gerentes únicos para preencher o dropdown da dashboard
exports.getGerentes = async (req, res) => {
  const conexao = db.mysqlPool;
  const user = req.session.usuario;
  const ip = req.ip;

  console.log(
    `[INFO] Usuário: ${
      user?.nome || "desconhecido"
    }, IP: ${ip}, Ação: Listar gerentes.`
  );

  try {
    const [rows] = await conexao.query(`
      SELECT DISTINCT GERENTE AS nome
      FROM PLANEJAMENTO_HE
      WHERE GERENTE IS NOT NULL AND GERENTE <> ''
      ORDER BY GERENTE
    `);
    res.json(rows);
  } catch (error) {
    console.error(
      `[ERRO] Usuário: ${
        user?.nome || "desconhecido"
      }, IP: ${ip}, Ação: Erro ao listar gerentes.`,
      error
    );
    res.status(500).json({ erro: "Erro ao listar gerentes." });
  }
};

exports.listarSolicitacoesPendentes = async (req, res) => {
    const conexao = db.mysqlPool;
    const user = req.session.usuario;
    const ip = req.ip;
    const { gerente, status, mes } = req.query;

    console.log(`[INFO] Usuário: ${user?.nome || 'desconhecido'}, IP: ${ip}, Ação: Listar solicitações para tratamento com filtros:`, req.query);

    try {
        let query = `
            SELECT 
                id, GERENTE, COLABORADOR, MATRICULA, CARGO, MES, HORAS, JUSTIFICATIVA, TIPO_HE, STATUS, ENVIADO_POR, 
                DATE_FORMAT(DATA_ENVIO, '%d/%m/%Y %H:%i') AS DATA_ENVIO_FORMATADA
            FROM PLANEJAMENTO_HE 
            WHERE 1=1`; // Inicia com uma condição sempre verdadeira para facilitar a adição de filtros
        
        const params = [];

        if (gerente) {
            query += ` AND GERENTE = ?`;
            params.push(gerente);
        }
        if (status) {
            query += ` AND STATUS = ?`;
            params.push(status);
        }
        if (mes) {
            query += ` AND MES = ?`;
            params.push(mes);
        }

        query += ` ORDER BY DATA_ENVIO ASC`;

        const [rows] = await conexao.query(query, params);
        res.json(rows);
    } catch (error) {
        console.error(`[ERRO] Usuário: ${user?.nome || 'desconhecido'}, IP: ${ip}, Ação: Erro ao listar solicitações para tratamento.`, error);
        res.status(500).json({ erro: "Erro ao carregar as solicitações para tratamento." });
    }
};

exports.aprovarSolicitacao = async (req, res) => {
  const conexao = db.mysqlPool;
  const { id } = req.body;
  const user = req.session.usuario;
  const ip = req.ip;

  console.log(
    `[INFO] Usuário: ${user?.nome}, IP: ${ip}, Ação: Aprovar solicitação ID: ${id}.`
  );

  if (!id) {
    return res
      .status(400)
      .json({ sucesso: false, mensagem: "ID da solicitação é obrigatório." });
  }

  try {
    await conexao.query(
      "UPDATE PLANEJAMENTO_HE SET STATUS = 'APROVADO' WHERE id = ?",
      [id]
    );
    res.json({ sucesso: true, mensagem: "Solicitação aprovada com sucesso!" });
  } catch (error) {
    console.error(
      `[ERRO] Usuário: ${user?.nome}, IP: ${ip}, Ação: Erro ao aprovar solicitação ID: ${id}.`,
      error
    );
    res
      .status(500)
      .json({
        sucesso: false,
        mensagem: "Erro interno ao aprovar a solicitação.",
      });
  }
};

exports.recusarSolicitacao = async (req, res) => {
  const conexao = db.mysqlPool;
  const { id } = req.body;
  const user = req.session.usuario;
  const ip = req.ip;

  console.log(
    `[INFO] Usuário: ${user?.nome}, IP: ${ip}, Ação: Recusar solicitação ID: ${id}.`
  );

  if (!id) {
    return res
      .status(400)
      .json({ sucesso: false, mensagem: "ID da solicitação é obrigatório." });
  }

  try {
    await conexao.query(
      "UPDATE PLANEJAMENTO_HE SET STATUS = 'RECUSADO' WHERE id = ?",
      [id]
    );
    res.json({ sucesso: true, mensagem: "Solicitação recusada com sucesso!" });
  } catch (error) {
    console.error(
      `[ERRO] Usuário: ${user?.nome}, IP: ${ip}, Ação: Erro ao recusar solicitação ID: ${id}.`,
      error
    );
    res
      .status(500)
      .json({
        sucesso: false,
        mensagem: "Erro interno ao recusar a solicitação.",
      });
  }
};

exports.tratarSolicitacoesEmMassa = async (req, res) => {
    const conexao = db.mysqlPool;
    const { ids, status } = req.body; // ids: array de IDs; status: 'APROVADO' ou 'RECUSADO'
    const user = req.session.usuario;
    const ip = req.ip;

    console.log(`[INFO] Usuário: ${user?.nome}, IP: ${ip}, Ação: Tratar ${ids.length} solicitações em massa para o status '${status}'.`);

    if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ sucesso: false, mensagem: "Nenhum ID de solicitação fornecido." });
    }
    if (!['APROVADO', 'RECUSADO'].includes(status)) {
        return res.status(400).json({ sucesso: false, mensagem: "Status inválido." });
    }

    try {
        // O placeholder `?` do mysql não funciona diretamente com `IN (...)`, então precisamos criar os placeholders dinamicamente
        const placeholders = ids.map(() => '?').join(',');
        const query = `UPDATE PLANEJAMENTO_HE SET STATUS = ? WHERE id IN (${placeholders})`;
        
        const params = [status, ...ids];

        const [result] = await conexao.query(query, params);

        res.json({ sucesso: true, mensagem: `${result.affectedRows} solicitações foram atualizadas para ${status}.` });
    } catch (error) {
        console.error(`[ERRO] Usuário: ${user?.nome}, IP: ${ip}, Ação: Erro ao tratar solicitações em massa.`, error);
        res.status(500).json({ sucesso: false, mensagem: "Erro interno ao processar a solicitação em massa." });
    }
};

exports.tratarSolicitacoesEmMassa = async (req, res) => {
    const conexao = db.mysqlPool;
    const { ids, status } = req.body; // ids: array de IDs; status: 'APROVADO' ou 'RECUSADO'
    const user = req.session.usuario;
    const ip = req.ip;

    console.log(`[INFO] Usuário: ${user?.nome}, IP: ${ip}, Ação: Tratar ${ids.length} solicitações em massa para o status '${status}'.`);

    if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ sucesso: false, mensagem: "Nenhum ID de solicitação fornecido." });
    }
    if (!['APROVADO', 'RECUSADO'].includes(status)) {
        return res.status(400).json({ sucesso: false, mensagem: "Status inválido." });
    }

    try {
        // O placeholder `?` do mysql não funciona diretamente com `IN (...)`, então precisamos criar os placeholders dinamicamente
        const placeholders = ids.map(() => '?').join(',');
        const query = `UPDATE PLANEJAMENTO_HE SET STATUS = ? WHERE id IN (${placeholders})`;
        
        const params = [status, ...ids];

        const [result] = await conexao.query(query, params);

        res.json({ sucesso: true, mensagem: `${result.affectedRows} solicitações foram atualizadas para ${status}.` });
    } catch (error) {
        console.error(`[ERRO] Usuário: ${user?.nome}, IP: ${ip}, Ação: Erro ao tratar solicitações em massa.`, error);
        res.status(500).json({ sucesso: false, mensagem: "Erro interno ao processar a solicitação em massa." });
    }
};
