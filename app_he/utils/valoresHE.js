// ================================================================================
// 💰 Módulo de Valores de Hora Extra (HE)
// ================================================================================
// Este módulo é responsável por carregar e fornecer os valores de hora extra
// baseados no cargo do colaborador e tipo de HE (50% ou 100%).
//
// Arquivo de dados: app_he/json/valores_he.json
// ================================================================================

const fs = require("fs");
const path = require("path");

// ================================================================================
// 📁 Configuração de Caminhos e Variáveis Globais
// ================================================================================

// Caminho absoluto para o arquivo JSON que contém os valores de HE por cargo
const valoresHEPath = path.join(__dirname, "..", "json", "valores_he.json");

// Objeto que armazena os valores carregados do JSON
// Estrutura esperada: { "CARGO": { "50%": 123.45, "100%": 246.90 } }
let valoresPorCargo = {};

// ================================================================================
// 🔄 Carregamento Inicial dos Valores
// ================================================================================
// Os valores são carregados uma única vez durante a inicialização do módulo.
// Isso garante melhor performance, pois não é necessário ler o arquivo toda vez.

try {
  // Lê o arquivo JSON de forma síncrona (OK na inicialização)
  const data = fs.readFileSync(valoresHEPath, "utf8");

  // Faz o parse do JSON e armazena na variável global
  valoresPorCargo = JSON.parse(data);

  console.log("✅ Valores de HE carregados com sucesso!");
} catch (err) {
  // Log de erro caso o arquivo não exista ou tenha formato inválido
  console.error("❌ Erro ao carregar valores_he.json:", err);

  // Em caso de erro, valoresPorCargo permanece como objeto vazio {}
  // A função getValorHora retornará 0 para qualquer consulta
}

// ================================================================================
// 🔍 Funções Auxiliares
// ================================================================================

/**
 * 💵 Obtém o valor da hora extra para um cargo e tipo específico
 *
 * Consulta o objeto valoresPorCargo para retornar o valor correto baseado
 * no cargo do colaborador e no tipo de hora extra solicitado.
 *
 * @param {string} cargo - Cargo do colaborador (ex: "ENGENHEIRO", "TECNICO")
 * @param {string} tipoHE - Tipo de hora extra: "50%" ou "100%"
 * @returns {number} Valor da hora extra em reais (formato decimal)
 *
 * @example
 * getValorHora("ENGENHEIRO", "50%")  // retorna 123.45
 * getValorHora("TECNICO", "100%")    // retorna 246.90
 * getValorHora("CARGO_INVALIDO", "50%") // retorna 0
 *
 * Formato esperado do JSON:
 * {
 *   "ENGENHEIRO": {
 *     "50%": 123.45,
 *     "100%": 246.90
 *   },
 *   "TECNICO": {
 *     "50%": 85.50,
 *     "100%": 171.00
 *   }
 * }
 */
function getValorHora(cargo, tipoHE) {
  // Verifica se o cargo existe no objeto e se o tipo de HE está definido
  if (valoresPorCargo[cargo] && valoresPorCargo[cargo][tipoHE]) {
    // Retorna o valor convertido para número decimal
    return parseFloat(valoresPorCargo[cargo][tipoHE]);
  }

  // Retorna 0 como valor padrão caso o cargo ou tipo não seja encontrado
  // Isso evita erros de referência undefined e permite tratamento no controller
  return 0;
}

// ================================================================================
// 📤 EXPORTS - Funções e dados disponíveis para outros módulos
// ================================================================================

module.exports = {
  // Função para obter valor específico de HE
  getValorHora,

  // Objeto completo com todos os valores (útil para listagens e validações)
  valoresPorCargo
};
