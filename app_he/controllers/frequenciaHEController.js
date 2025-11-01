// ================================================================================
// 📊 CONTROLLER DE FREQUÊNCIA DE HORAS EXTRAS (HE)
// ================================================================================
// Este controller gerencia a comparação entre horas extras executadas
// (na tabela de frequência) e as que foram previamente solicitadas/aprovadas
// no sistema de planejamento, permitindo identificar horas executadas sem autorização.
// ================================================================================

const ExcelJS = require("exceljs");
const path = require("path");
const fs = require("fs");
const db = require("../../db/db");
const configFrequencia = require("../json/config_frequencia.json");

// ================================================================================
// 🔍 Funções auxiliares de validação
// ================================================================================

/**
 * Verifica se a tabela FREQUENCIA existe e tem as colunas necessárias
 * 
 * @param {Object} conexao - Conexão do banco de dados
 * @returns {Promise<boolean>} - True se a tabela e colunas necessárias existirem
 */
// Exportar a função de validação para uso externo
exports.validarTabelaFrequencia = async function validarTabelaFrequencia(conexao) {
  try {
    const tabelaNome = configFrequencia.tabela_frequencia.nome;

    // Verifica se a tabela FREQUENCIA existe
    const [tabelas] = await conexao.query(`SHOW TABLES LIKE '${tabelaNome}'`);

    if (tabelas.length === 0) {
      console.log(`[AVISO] Tabela ${tabelaNome} não encontrada no banco de dados.`);
      return false;
    }

    // Verifica se as colunas necessárias existem
    const [colunas] = await conexao.query(`SHOW COLUMNS FROM ${tabelaNome}`);
    const nomesColunas = colunas.map(c => c.Field.toUpperCase());

    const colunasNecessarias = configFrequencia.tabela_frequencia.colunas_obrigatorias;
    const colunasFaltando = colunasNecessarias.filter(col => !nomesColunas.includes(col));

    if (colunasFaltando.length > 0) {
      console.log(`[AVISO] Colunas faltando na tabela ${tabelaNome}: ${colunasFaltando.join(', ')}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[ERRO] Erro ao validar tabela FREQUENCIA:", error);
    return false;
  }
}

// ================================================================================
// 📋 APIs para Dashboard de Frequência vs Planejamento
// ================================================================================

/**
 * Gera resumo comparativo entre horas executadas e autorizadas por gerente
 * 
 * Compara as horas extras marcadas na tabela FREQUENCIA com as que foram 
 * previamente solicitadas e aprovadas no PLANEJAMENTO_HE para o mesmo período.
 * 
 * @param {Object} req - Request Express
 * @param {string} req.query.mes - Mês para filtrar (obrigatório)
 * @param {string} req.query.gerente - Gerente para filtrar (opcional)
 * @param {string} req.diretoriaHE - Diretoria do usuário (injetada pelo middleware)
 * @param {Object} res - Response Express
 * 
 * @returns {Array} JSON array com dados comparativos por gerente:
 * [{
 *   gerente: "NOME DO GERENTE",
 *   executado_50: 20,      // Horas executadas 50%
 *   executado_100: 10,     // Horas executadas 100%
 *   autorizado_50: 15,     // Horas autorizadas 50%
 *   autorizado_100: 10,    // Horas autorizadas 100%
 *   nao_autorizado_50: 5,  // Executado sem autorização 50%
 *   nao_autorizado_100: 0, // Executado sem autorização 100%
 *   total_executado: 30,
 *   total_autorizado: 25,
 *   total_nao_autorizado: 5
 * }]
 */
exports.getComparativoFrequencia = async (req, res) => {
  const { mes, gerente } = req.query;
  const diretoria = req.diretoriaHE;
  const user = req.session.usuario;
  const ip = req.ip;

  if (!mes) {
    return res
      .status(400)
      .json({ erro: "Parâmetro 'mes' é obrigatório para gerar o comparativo." });
  }

  try {
    const conexao = db.mysqlPool;

    // Valida se a tabela FREQUENCIA existe e tem as colunas necessárias
    const tabelaValida = await exports.validarTabelaFrequencia(conexao);
    if (!tabelaValida) {
      return res.status(400).json({
        erro: "Tabela FREQUENCIA não encontrada ou com estrutura incorreta. Verifique se as colunas NOME, CARGO, EVENTO, GERENTE_IMEDIATO, QTD_HORAS e DATA existem."
      });
    }

    const colunas = configFrequencia.tabela_frequencia.colunas_obrigatorias;
    const nomeTabela = configFrequencia.tabela_frequencia.nome;

    // Converter nome do mês para número correspondente
    const meses = {
      'Janeiro': 1, 'Fevereiro': 2, 'Março': 3, 'Abril': 4, 'Maio': 5, 'Junho': 6,
      'Julho': 7, 'Agosto': 8, 'Setembro': 9, 'Outubro': 10, 'Novembro': 11, 'Dezembro': 12
    };
    const mesNumero = meses[mes];
    if (mesNumero === undefined) {
      return res.status(400).json({ erro: `Mês inválido: ${mes}. Use um nome de mês válido em português.` });
    }

    // Obtemos todas as horas executadas (da tabela FREQUENCIA) agrupadas por colaborador e gerente
    // Agora adicionando também a coluna GERENTE_DIVISAO para agrupamento hierárquico
    
    let queryExecutado = `
      SELECT 
        ${colunas[3]} as gerente,
        ${colunas[0]} as colaborador,
        COALESCE(GERENTE_DIVISAO, '') as gerente_divisao,
        SUM(CASE WHEN ${colunas[2]} = 'Hora Extra 50%' THEN ${colunas[4]} ELSE 0 END) as executado_50,
        SUM(CASE WHEN ${colunas[2]} = 'Horas extras 100%' THEN ${colunas[4]} ELSE 0 END) as executado_100
      FROM ${nomeTabela}
      WHERE MONTH(${colunas[5]}) = ?
    `;
    let paramsExecutado = [mesNumero];

    if (gerente) {
      queryExecutado += ` AND ${colunas[3]} = ?`;  // GERENTE_IMEDIATO
      paramsExecutado.push(gerente);
    }

    queryExecutado += ` GROUP BY ${colunas[3]}, ${colunas[0]}, GERENTE_DIVISAO
        ORDER BY ${colunas[3]}, ${colunas[0]}`;

    const [executado] = await conexao.query(queryExecutado, paramsExecutado);

    // Obtemos todas as horas autorizadas (da tabela PLANEJAMENTO_HE) - agrupadas por colaborador e gerente
    let queryAutorizado = `
      SELECT 
        GERENTE as gerente,
        COLABORADOR as colaborador,
        SUM(CASE WHEN TIPO_HE = '50%' THEN HORAS ELSE 0 END) as autorizado_50,
        SUM(CASE WHEN TIPO_HE = '100%' THEN HORAS ELSE 0 END) as autorizado_100
      FROM PLANEJAMENTO_HE 
      WHERE MES = ?
        AND STATUS = 'APROVADO'
        AND (DIRETORIA = ? OR DIRETORIA IS NULL)
    `;
    const paramsAutorizado = [mes, diretoria];

    if (gerente) {
      queryAutorizado += ` AND GERENTE = ?`;
      paramsAutorizado.push(gerente);
    }

    queryAutorizado += ` GROUP BY GERENTE, COLABORADOR`;

    const [autorizado] = await conexao.query(queryAutorizado, paramsAutorizado);

    // Montamos mapas para cada conjunto de dados, associando por gerente e colaborador
    const mapaExecutado = {};
    executado.forEach(item => {
      const key = `${item.gerente}_${item.colaborador}`;
      if (!mapaExecutado[key]) {
        mapaExecutado[key] = {
          executado_50: 0,
          executado_100: 0,
          gerente_divisao: item.gerente_divisao
        };
      }
      mapaExecutado[key].executado_50 += parseFloat(item.executado_50 || 0);
      mapaExecutado[key].executado_100 += parseFloat(item.executado_100 || 0);
      mapaExecutado[key].gerente_divisao = item.gerente_divisao;
    });

    const mapaAutorizado = {};
    autorizado.forEach(item => {
      const key = `${item.gerente}_${item.colaborador}`;
      if (!mapaAutorizado[key]) {
        mapaAutorizado[key] = {
          autorizado_50: 0,
          autorizado_100: 0
        };
      }
      mapaAutorizado[key].autorizado_50 += parseFloat(item.autorizado_50 || 0);
      mapaAutorizado[key].autorizado_100 += parseFloat(item.autorizado_100 || 0);
    });

    // Agora, pegamos todos os gerentes possíveis (tanto de executado quanto de autorizado)
    const todosGerentes = [...new Set([
      ...Object.keys(mapaExecutado),
      ...Object.keys(mapaAutorizado)
    ])];

    // Para a visão agregada por gerente, precisamos:
    // 1. Calcular individualmente por colaborador: executado vs autorizado
    // 2. Somar os resultados por gerente
    const mapaTotalPorGerente = {};
    
    // Processamos cada colaborador individualmente para calcular horas não autorizadas
    // Primeiro, obtemos todas as chaves únicas (gerente_colaborador)
    const todasChaves = [...new Set([
      ...Object.keys(mapaExecutado),
      ...Object.keys(mapaAutorizado)
    ])];

    for (const key of todasChaves) {
      const [nomeGerente, colaborador] = key.split('_');
      
      if (!mapaTotalPorGerente[nomeGerente]) {
        const exec = mapaExecutado[key];
        mapaTotalPorGerente[nomeGerente] = {
          executado_50: 0,
          executado_100: 0,
          autorizado_50: 0,
          autorizado_100: 0,
          nao_autorizado_50: 0,
          nao_autorizado_100: 0,
          gerente_divisao: exec ? exec.gerente_divisao : ''
        };
      }
      
      const exec = mapaExecutado[key] || { executado_50: 0, executado_100: 0 };
      const aut = mapaAutorizado[key] || { autorizado_50: 0, autorizado_100: 0 };
      
      // Calculamos as horas não autorizadas para este colaborador individualmente
      // Apenas autorizações do mesmo colaborador podem cobrir horas executadas dele
      const nao_aut_50 = Math.max(0, exec.executado_50 - aut.autorizado_50);
      const nao_aut_100 = Math.max(0, exec.executado_100 - aut.autorizado_100);
      
      // Somamos ao total do gerente
      mapaTotalPorGerente[nomeGerente].executado_50 += exec.executado_50;
      mapaTotalPorGerente[nomeGerente].executado_100 += exec.executado_100;
      // Para os totais autorizados e não autorizados, usamos os valores calculados individualmente
      mapaTotalPorGerente[nomeGerente].nao_autorizado_50 += nao_aut_50;
      mapaTotalPorGerente[nomeGerente].nao_autorizado_100 += nao_aut_100;
    }

    // Obter informações de divisão para agrupamento hierárquico
    const gerentesComDivisao = {};
    for (const nomeGerente of Object.keys(mapaTotalPorGerente)) {
      const dados = mapaTotalPorGerente[nomeGerente];
      gerentesComDivisao[nomeGerente] = {
        ...dados,
        gerente_divisao: dados.gerente_divisao
      };
    }

    // Montamos o resultado combinando todos os dados por gerente
    const resultado = Object.keys(gerentesComDivisao).map(nomeGerente => {
      const dados = gerentesComDivisao[nomeGerente];
      
      // Calculamos o total autorizado como executado - não autorizado (apenas o que foi coberto)
      const autorizado_50 = dados.executado_50 - dados.nao_autorizado_50;
      const autorizado_100 = dados.executado_100 - dados.nao_autorizado_100;
      
      return {
        gerente: nomeGerente,
        executado_50: dados.executado_50,
        executado_100: dados.executado_100,
        autorizado_50: Math.max(0, autorizado_50),  // Não pode ser negativo
        autorizado_100: Math.max(0, autorizado_100), // Não pode ser negativo
        nao_autorizado_50: dados.nao_autorizado_50,
        nao_autorizado_100: dados.nao_autorizado_100,
        total_executado: dados.executado_50 + dados.executado_100,
        total_autorizado: Math.max(0, autorizado_50) + Math.max(0, autorizado_100),
        total_nao_autorizado: dados.nao_autorizado_50 + dados.nao_autorizado_100,
        gerente_divisao: dados.gerente_divisao
      };
    });

    res.json(resultado);
  } catch (error) {
    console.error(
      `[ERRO] Usuário: ${user?.nome}, IP: ${ip}, Ação: Erro ao gerar comparativo de frequência.`,
      error
    );
    res
      .status(500)
      .json({ erro: "Erro interno ao gerar o comparativo de frequência." });
  }
};

/**
 * Gera resumo detalhado por colaborador comparando executado vs autorizado
 * 
 * Mostra a comparação nível colaborador, permitindo identificar quem executou
 * horas extras sem autorização prévia.
 * 
 * @param {Object} req - Request Express
 * @param {string} req.query.mes - Mês para filtrar (obrigatório)
 * @param {string} req.query.gerente - Gerente para filtrar (opcional)
 * @param {string} req.query.colaborador - Colaborador específico (opcional)
 * @param {string} req.diretoriaHE - Diretoria do usuário
 * @param {Object} res - Response Express
 * 
 * @returns {Array} JSON array com dados por colaborador:
 * [{
 *   colaborador: "Nome do Colaborador",
 *   cargo: "Cargo do Colaborador",
 *   gerente: "Nome do Gerente",
 *   executado_50: 10,
 *   executado_100: 5,
 *   autorizado_50: 8,
 *   autorizado_100: 5,
 *   nao_autorizado_50: 2,
 *   nao_autorizado_100: 0
 * }]
 */
exports.getComparativoPorColaborador = async (req, res) => {
  const { mes, gerente, colaborador } = req.query;
  const diretoria = req.diretoriaHE;
  const user = req.session.usuario;
  const ip = req.ip;

  if (!mes) {
    return res
      .status(400)
      .json({ erro: "Parâmetro 'mes' é obrigatório." });
  }

  try {
    const conexao = db.mysqlPool;

    // Valida se a tabela FREQUENCIA existe e tem as colunas necessárias
    const tabelaValida = await exports.validarTabelaFrequencia(conexao);
    if (!tabelaValida) {
      return res.status(400).json({
        erro: "Tabela FREQUENCIA não encontrada ou com estrutura incorreta. Verifique se as colunas NOME, CARGO, EVENTO, GERENTE_IMEDIATO, QTD_HORAS e DATA existem."
      });
    }

    const colunas = configFrequencia.tabela_frequencia.colunas_obrigatorias;
    const nomeTabela = configFrequencia.tabela_frequencia.nome;

    // Converter nome do mês para número correspondente
    const meses = {
      'Janeiro': 1, 'Fevereiro': 2, 'Março': 3, 'Abril': 4, 'Maio': 5, 'Junho': 6,
      'Julho': 7, 'Agosto': 8, 'Setembro': 9, 'Outubro': 10, 'Novembro': 11, 'Dezembro': 12
    };
    const mesNumero = meses[mes];
    if (mesNumero === undefined) {
      return res.status(400).json({ erro: `Mês inválido: ${mes}. Use um nome de mês válido em português.` });
    }

    // Obtemos as horas executadas da tabela FREQUENCIA
    // Verificar se a coluna DIRETORIA existe na tabela
    const [colunasTabela] = await conexao.query(`SHOW COLUMNS FROM ${nomeTabela}`);
    const nomesColunasTabela = colunasTabela.map(c => c.Field.toUpperCase());
    const temDiretoria = nomesColunasTabela.includes('DIRETORIA');
    
    let queryExecutado = `
      SELECT 
        ${colunas[0]} as colaborador,
        ${colunas[1]},
        ${colunas[3]} as gerente,
        SUM(CASE WHEN ${colunas[2]} = ? THEN ${colunas[4]} ELSE 0 END) as executado_50,
        SUM(CASE WHEN ${colunas[2]} = ? THEN ${colunas[4]} ELSE 0 END) as executado_100
      FROM ${nomeTabela}
      WHERE MONTH(${colunas[5]}) = ?
    `;
    let paramsExecutado = ['Hora Extra 50%', 'Horas extras 100%', mesNumero];
    
    // Adicionar condição de diretoria apenas se a coluna existir
    if (temDiretoria) {
      queryExecutado += ` AND (DIRETORIA = ? OR DIRETORIA IS NULL)`;
      paramsExecutado.push(diretoria);
    }

    if (gerente) {
      queryExecutado += ` AND ${colunas[3]} = ?`;  // GERENTE_IMEDIATO
      paramsExecutado.push(gerente);
    }
    if (colaborador) {
      queryExecutado += ` AND ${colunas[0]} = ?`;  // NOME
      paramsExecutado.push(colaborador);
    }

    queryExecutado += ` GROUP BY ${colunas[0]}, ${colunas[1]}, ${colunas[3]}
        ORDER BY ${colunas[0]}`;

    const [executado] = await conexao.query(queryExecutado, paramsExecutado);

    // Obtemos as horas autorizadas da tabela PLANEJAMENTO_HE
    let queryAutorizado = `
      SELECT 
        COLABORADOR as colaborador,
        CARGO,
        GERENTE,
        SUM(CASE WHEN TIPO_HE = '50%' THEN HORAS ELSE 0 END) as autorizado_50,
        SUM(CASE WHEN TIPO_HE = '100%' THEN HORAS ELSE 0 END) as autorizado_100
      FROM PLANEJAMENTO_HE 
      WHERE MES = ?
        AND STATUS = 'APROVADO'
        AND (DIRETORIA = ? OR DIRETORIA IS NULL)
    `;
    const paramsAutorizado = [mes, diretoria];

    if (gerente) {
      queryAutorizado += ` AND GERENTE = ?`;
      paramsAutorizado.push(gerente);
    }
    if (colaborador) {
      queryAutorizado += ` AND COLABORADOR = ?`;
      paramsAutorizado.push(colaborador);
    }

    queryAutorizado += ` GROUP BY COLABORADOR, CARGO, GERENTE`;

    const [autorizado] = await conexao.query(queryAutorizado, paramsAutorizado);

    // Criamos mapas para combinar os dados
    const mapaExecutado = {};
    executado.forEach(item => {
      const key = `${item.colaborador}_${item.gerente}`;
      mapaExecutado[key] = {
        cargo: item.CARGO,
        executado_50: parseFloat(item.executado_50 || 0),
        executado_100: parseFloat(item.executado_100 || 0)
      };
    });

    const mapaAutorizado = {};
    autorizado.forEach(item => {
      const key = `${item.colaborador}_${item.gerente}`;
      mapaAutorizado[key] = {
        cargo: item.CARGO,
        autorizado_50: parseFloat(item.autorizado_50 || 0),
        autorizado_100: parseFloat(item.autorizado_100 || 0)
      };
    });

    // Combinamos os dados
    const todosColaboradores = [...new Set([
      ...Object.keys(mapaExecutado),
      ...Object.keys(mapaAutorizado)
    ])];

    const resultado = todosColaboradores.map(key => {
      const [nomeColab, nomeGerente] = key.split('_');

      const exec = mapaExecutado[key] || { cargo: '', executado_50: 0, executado_100: 0 };
      const aut = mapaAutorizado[key] || { cargo: '', autorizado_50: 0, autorizado_100: 0 };

      // Usamos o cargo do executado se não estiver no autorizado (ou vice-versa)
      const cargoFinal = exec.cargo || aut.cargo || '';

      const nao_aut_50 = Math.max(0, exec.executado_50 - aut.autorizado_50);
      const nao_aut_100 = Math.max(0, exec.executado_100 - aut.autorizado_100);

      return {
        colaborador: nomeColab,
        cargo: cargoFinal,
        gerente: nomeGerente,
        executado_50: exec.executado_50,
        executado_100: exec.executado_100,
        autorizado_50: aut.autorizado_50,
        autorizado_100: aut.autorizado_100,
        nao_autorizado_50: nao_aut_50,
        nao_autorizado_100: nao_aut_100,
        total_executado: exec.executado_50 + exec.executado_100,
        total_autorizado: aut.autorizado_50 + aut.autorizado_100,
        total_nao_autorizado: nao_aut_50 + nao_aut_100
      };
    });

    res.json(resultado);
  } catch (error) {
    console.error(
      `[ERRO] Usuário: ${user?.nome}, IP: ${ip}, Ação: Erro ao gerar comparativo por colaborador.`,
      error
    );
    res
      .status(500)
      .json({ erro: "Erro interno ao gerar o comparativo por colaborador." });
  }
};

/**
 * Exporta dados comparativos em formato CSV
 * 
 * Gera arquivo CSV com os dados comparativos de executado vs autorizado
 * 
 * @param {Object} req - Request Express
 * @param {string} req.query.mes - Mês para filtrar (obrigatório)
 * @param {string} req.query.gerente - Gerente para filtrar (opcional)
 * @param {string} req.diretoriaHE - Diretoria do usuário
 * @param {Object} res - Response Express
 * 
 * @returns {File} Arquivo CSV para download
 */
/**
 * Exporta dados comparativos em formato CSV
 * 
 * Gera arquivo CSV com os dados comparativos de executado vs autorizado
 * 
 * @param {Object} req - Request Express
 * @param {string} req.query.mes - Mês para filtrar (obrigatório)
 * @param {string} req.query.gerente - Gerente para filtrar (opcional)
 * @param {string} req.diretoriaHE - Diretoria do usuário
 * @param {Object} res - Response Express
 * 
 * @returns {File} Arquivo CSV para download
 */
exports.exportarComparativo = async (req, res) => {
  const { mes, gerente } = req.query;
  const diretoria = req.diretoriaHE;
  const user = req.session.usuario;
  const ip = req.ip;

  try {
    // Primeiro validamos a tabela
    const conexao = db.mysqlPool;
    const tabelaValida = await exports.validarTabelaFrequencia(conexao);
    if (!tabelaValida) {
      return res.status(400).send("Tabela FREQUENCIA não encontrada ou com estrutura incorreta.");
    }

    // Obtemos os dados comparativos
    const dados = await new Promise((resolve, reject) => {
      const mockRes = {
        json: (data) => resolve(data),
        status: (code) => {
          if (code >= 400) {
            reject(new Error(`Erro ${code} na requisição`));
          }
          return mockRes;
        }
      };

      // Chamamos a função original de forma controlada
      exports.getComparativoFrequencia(req, mockRes).catch(reject);
    });

    if (!Array.isArray(dados) || dados.length === 0) {
      return res.status(404).send("Nenhum dado encontrado para exportar.");
    }

    // Cria o CSV
    const headers = [
      "Gerente",
      "Executado 50%",
      "Executado 100%",
      "Autorizado 50%",
      "Autorizado 100%",
      "Não Autorizado 50%",
      "Não Autorizado 100%",
      "Total Executado",
      "Total Autorizado",
      "Total Não Autorizado"
    ];

    const csvContent = [
      headers.join(","),
      ...dados.map(row => [
        `"${row.gerente || ''}"`,
        row.executado_50 || 0,
        row.executado_100 || 0,
        row.autorizado_50 || 0,
        row.autorizado_100 || 0,
        row.nao_autorizado_50 || 0,
        row.nao_autorizado_100 || 0,
        row.total_executado || 0,
        row.total_autorizado || 0,
        row.total_nao_autorizado || 0
      ].join(","))
    ].join("\r\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename=comparativo_he_${mes.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`);
    res.status(200).send("\uFEFF" + csvContent);
  } catch (error) {
    console.error(
      `[ERRO] Usuário: ${user?.nome}, IP: ${ip}, Ação: Erro ao exportar comparativo.`,
      error
    );
    res.status(500).send("Erro interno ao exportar os dados.");
  }
};

// As funções já foram definidas como exports.functionName, 
// então não precisamos fazer uma nova exportação com module.exports.
// A função validarTabelaFrequencia também já foi adicionada ao exports.