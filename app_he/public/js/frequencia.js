// ================================================================================
// 📊 PAINEL DE FREQUÊNCIA VS PLANEJAMENTO DE HE
// ================================================================================
// Este arquivo controla o novo painel de comparação entre horas extras
// executadas (na tabela FREQUENCIA) e as previamente solicitadas/aprovadas
// no sistema de planejamento, permitindo identificar horas executadas sem autorização.
// ================================================================================

// ================================================================================
// 🔧 Funções Auxiliares
// ================================================================================

/**
 * Retorna o nome do mês atual em português
 * @returns {string} Nome do mês (ex: "Janeiro", "Fevereiro", etc)
 */
function getMesAtualPortugues() {
  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  return meses[new Date().getMonth()];
}

// ================================================================================
// 📈 Carregamento e Exibição de Dados
// ================================================================================

/**
 * Carrega e exibe o comparativo de horas executadas vs autorizadas por gerente
 * 
 * @param {string} mes - Mês para filtrar (obrigatório)
 * @param {string} gerente - Nome do gerente para filtrar (opcional)
 */
function carregarComparativoFrequencia(mes, gerente = "") {
  const container = document.getElementById("tabelaComparativoFrequencia");
  container.innerHTML = '<p class="text-center text-muted">Carregando comparativo...</p>';

  const params = new URLSearchParams();
  params.append("mes", mes);
  if (gerente) params.append("gerente", gerente);

  const url = `/planejamento-he/api/comparativo-frequencia?${params.toString()}`;

  fetch(url)
    .then(response => {
      if (!response.ok) throw new Error(`Erro na API: ${response.statusText}`);
      return response.json();
    })
    .then(dados => {
      if (dados.erro) {
        container.innerHTML = `<div class="alert alert-danger">${dados.erro}</div>`;
        return;
      }

      if (!Array.isArray(dados) || dados.length === 0) {
        container.innerHTML = '<p class="text-center text-muted">Nenhum dado encontrado para o filtro selecionado.</p>';
        return;
      }

      container.innerHTML = criarTabelaComparativo(dados);
    })
    .catch(erro => {
      console.error('Erro ao carregar comparativo de frequência:', erro);
      container.innerHTML = `<div class="alert alert-danger">Erro ao carregar dados. Tente novamente.</div>`;
    });
}

/**
 * Carrega e exibe o comparativo detalhado por colaborador
 * 
 * @param {string} mes - Mês para filtrar (obrigatório)
 * @param {string} gerente - Nome do gerente para filtrar (opcional)
 * @param {string} colaborador - Nome do colaborador para filtrar (opcional)
 */
function carregarComparativoPorColaborador(mes, gerente = "", colaborador = "") {
  const container = document.getElementById("tabelaComparativoColaborador");
  container.innerHTML = '<p class="text-center text-muted">Carregando comparativo detalhado...</p>';

  const params = new URLSearchParams();
  params.append("mes", mes);
  if (gerente) params.append("gerente", gerente);
  if (colaborador) params.append("colaborador", colaborador);

  const url = `/planejamento-he/api/comparativo-colaborador?${params.toString()}`;

  fetch(url)
    .then(response => {
      if (!response.ok) throw new Error(`Erro na API: ${response.statusText}`);
      return response.json();
    })
    .then(dados => {
      if (dados.erro) {
        container.innerHTML = `<div class="alert alert-danger">${dados.erro}</div>`;
        return;
      }

      if (!Array.isArray(dados) || dados.length === 0) {
        container.innerHTML = '<p class="text-center text-muted">Nenhum dado encontrado para o filtro selecionado.</p>';
        return;
      }

      container.innerHTML = criarTabelaComparativoColaborador(dados);
    })
    .catch(erro => {
      console.error('Erro ao carregar comparativo por colaborador:', erro);
      container.innerHTML = `<div class="alert alert-danger">Erro ao carregar dados. Tente novamente.</div>`;
    });
}

// ================================================================================
// 📋 Criação de Tabelas
// ================================================================================

/**
 * Cria a tabela HTML do comparativo por gerente
 * 
 * @param {Array} dados - Array de objetos com os dados comparativos
 * @returns {string} HTML da tabela
 */
function criarTabelaComparativo(dados) {
  let totalExecutado50 = 0;
  let totalExecutado100 = 0;
  let totalAutorizado50 = 0;
  let totalAutorizado100 = 0;
  let totalNaoAutorizado50 = 0;
  let totalNaoAutorizado100 = 0;

  let html = `
    <div class="d-flex justify-content-between align-items-center mb-2">
      <button id="btnAlternarExecucao" class="btn btn-sm btn-outline-primary" onclick="alternarColunasExecucao()">
        <i class="fas fa-chevron-down" id="iconeExecucao"></i> 
        <span id="textoBtnExecucao">Expandir Detalhes</span>
      </button>
    </div>
    <div class="table-responsive-sm table-responsive-md table-responsive-lg">
      <table class="table table-bordered table-hover table-sm w-100">
        <thead class="thead-light">
          <tr>
            <th class="text-left">Gerente</th>
            <th class="text-center executado-col" style="display: none;">Executado 50%</th>
            <th class="text-center executado-col" style="display: none;">Executado 100%</th>
            <th class="text-center autorizado-col" style="display: none;">Autorizado 50%</th>
            <th class="text-center autorizado-col" style="display: none;">Autorizado 100%</th>
            <th class="text-center nao-autorizado-col" style="display: none;">Não Autorizado 50%</th>
            <th class="text-center nao-autorizado-col" style="display: none;">Não Autorizado 100%</th>
            <th class="text-center">Total Executado</th>
            <th class="text-center">Total Autorizado</th>
            <th class="text-center">Total Não Autorizado</th>
          </tr>
        </thead>
        <tbody>
  `;

  dados.forEach(item => {
    const naoAut50 = Math.max(0, (item.executado_50 || 0) - (item.autorizado_50 || 0));
    const naoAut100 = Math.max(0, (item.executado_100 || 0) - (item.autorizado_100 || 0));
    
    // Extrai o primeiro nome e nome completo do gerente
    const primeiroNome = item.gerente ? item.gerente.split(' ')[0] : '-';
    const nomeCompleto = item.gerente || '-';

    html += `
      <tr>
        <td class="text-left"><strong class="nome-completo">${nomeCompleto}</strong><strong class="primeiro-nome" style="display: none;">${primeiroNome}</strong></td>
        <td class="text-center executado-col" style="display: none;">${(item.executado_50 || 0).toFixed(2)}</td>
        <td class="text-center executado-col" style="display: none;">${(item.executado_100 || 0).toFixed(2)}</td>
        <td class="text-center autorizado-col" style="display: none;">${(item.autorizado_50 || 0).toFixed(2)}</td>
        <td class="text-center autorizado-col" style="display: none;">${(item.autorizado_100 || 0).toFixed(2)}</td>
        <td class="text-center nao-autorizado-col" style="display: none;">${naoAut50.toFixed(2)}</td>
        <td class="text-center nao-autorizado-col" style="display: none;">${naoAut100.toFixed(2)}</td>
        <td class="text-center">${(item.total_executado || 0).toFixed(2)}</td>
        <td class="text-center">${(item.total_autorizado || 0).toFixed(2)}</td>
        <td class="text-center">${(item.total_nao_autorizado || 0).toFixed(2)}</td>
      </tr>
    `;

    // Acumula totais
    totalExecutado50 += item.executado_50 || 0;
    totalExecutado100 += item.executado_100 || 0;
    totalAutorizado50 += item.autorizado_50 || 0;
    totalAutorizado100 += item.autorizado_100 || 0;
    totalNaoAutorizado50 += naoAut50;
    totalNaoAutorizado100 += naoAut100;
  });

  // Adiciona linha de total
  html += `
        <tfoot class="font-weight-bold" style="background-color: #f8f9fa;">
          <tr>
            <td class="text-left">TOTAL</td>
            <td class="text-center executado-col" style="display: none;">${totalExecutado50.toFixed(2)}</td>
            <td class="text-center executado-col" style="display: none;">${totalExecutado100.toFixed(2)}</td>
            <td class="text-center autorizado-col" style="display: none;">${totalAutorizado50.toFixed(2)}</td>
            <td class="text-center autorizado-col" style="display: none;">${totalAutorizado100.toFixed(2)}</td>
            <td class="text-center nao-autorizado-col" style="display: none;">${totalNaoAutorizado50.toFixed(2)}</td>
            <td class="text-center nao-autorizado-col" style="display: none;">${totalNaoAutorizado100.toFixed(2)}</td>
            <td class="text-center">${(totalExecutado50 + totalExecutado100).toFixed(2)}</td>
            <td class="text-center">${(totalAutorizado50 + totalAutorizado100).toFixed(2)}</td>
            <td class="text-center">${(totalNaoAutorizado50 + totalNaoAutorizado100).toFixed(2)}</td>
          </tr>
        </tfoot>
      </tbody>
    </table>
  </div>
  `;

  return html;
}

/**
 * Cria a tabela HTML do comparativo detalhado por colaborador
 * 
 * @param {Array} dados - Array de objetos com os dados comparativos por colaborador
 * @returns {string} HTML da tabela
 */
function criarTabelaComparativoColaborador(dados) {
  let html = `
    <div class="table-responsive table-responsive-sm table-responsive-md">
      <table class="table table-bordered table-hover table-sm">
        <thead class="thead-light">
          <tr>
            <th class="text-left">Colaborador</th>
            <th class="text-left">Cargo</th>
            <th class="text-left">Gerente</th>
            <th class="text-center">Executado 50%</th>
            <th class="text-center">Executado 100%</th>
            <th class="text-center">Autorizado 50%</th>
            <th class="text-center">Autorizado 100%</th>
            <th class="text-center">Não Autorizado 50%</th>
            <th class="text-center">Não Autorizado 100%</th>
            <th class="text-center">Total Executado</th>
            <th class="text-center">Total Autorizado</th>
            <th class="text-center">Total Não Autorizado</th>
          </tr>
        </thead>
        <tbody>
  `;

  dados.forEach(item => {
    const naoAut50 = Math.max(0, (item.executado_50 || 0) - (item.autorizado_50 || 0));
    const naoAut100 = Math.max(0, (item.executado_100 || 0) - (item.autorizado_100 || 0));

    html += `
      <tr>
        <td class="text-left"><strong>${item.colaborador || '-'}</strong></td>
        <td class="text-left">${item.cargo || '-'}</td>
        <td class="text-left">${item.gerente || '-'}</td>
        <td class="text-center">${(item.executado_50 || 0).toFixed(2)}</td>
        <td class="text-center">${(item.executado_100 || 0).toFixed(2)}</td>
        <td class="text-center">${(item.autorizado_50 || 0).toFixed(2)}</td>
        <td class="text-center">${(item.autorizado_100 || 0).toFixed(2)}</td>
        <td class="text-center">${naoAut50.toFixed(2)}</td>
        <td class="text-center">${naoAut100.toFixed(2)}</td>
        <td class="text-center">${(item.total_executado || 0).toFixed(2)}</td>
        <td class="text-center">${(item.total_autorizado || 0).toFixed(2)}</td>
        <td class="text-center">${(item.total_nao_autorizado || 0).toFixed(2)}</td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

  return html;
}

// ================================================================================
// 📥 Exportação de Dados
// ================================================================================

/**
 * Exporta os dados comparativos para CSV
 */
async function exportarDadosComparativo() {
  const mes = document.getElementById("filtroMesComparativo").value;
  const gerente = document.getElementById("filtroGerenteComparativo").value;

  try {
    const params = new URLSearchParams({ mes });
    if (gerente) params.append("gerente", gerente);

    const response = await fetch(`/planejamento-he/api/exportar-comparativo?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`Erro na requisição: ${response.statusText}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `comparativo_he_${mes.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`;

    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error('Erro ao exportar dados comparativos:', error);
    alert('Falha ao exportar os dados. Verifique o console para mais detalhes.');
  }
}

// ================================================================================
// 🎬 Inicialização do Painel
// ================================================================================

/**
 * Inicializa o painel de frequência vs planejamento
 */
function inicializarPainelFrequencia() {
  // Preenche o seletor de meses
  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  const mesSelect = document.getElementById("filtroMesComparativo");
  mesSelect.innerHTML = meses.map(m => `<option value="${m}">${m}</option>`).join('');
  mesSelect.value = getMesAtualPortugues();

  // Carrega a lista de gerentes
  fetch('/planejamento-he/api/gerentes')
    .then(r => r.json())
    .then(data => {
      const gerenteSelect = document.getElementById("filtroGerenteComparativo");
      gerenteSelect.innerHTML = '<option value="">Todos os Gerentes</option>';
      if (data.gerentes) {
        data.gerentes.forEach(g => {
          const opt = document.createElement('option');
          opt.value = g;
          opt.textContent = g;
          gerenteSelect.appendChild(opt);
        });
      }
    });

  // Carrega os dados iniciais
  carregarComparativoFrequencia(getMesAtualPortugues());
  carregarComparativoPorColaborador(getMesAtualPortugues());

  // Configura event listeners
  document.getElementById("filtroMesComparativo").addEventListener("change", function () {
    const mes = this.value;
    const gerente = document.getElementById("filtroGerenteComparativo").value;
    carregarComparativoFrequencia(mes, gerente);
    carregarComparativoPorColaborador(mes, gerente);
  });

  document.getElementById("filtroGerenteComparativo").addEventListener("change", function () {
    const mes = document.getElementById("filtroMesComparativo").value;
    const gerente = this.value;
    carregarComparativoFrequencia(mes, gerente);
    carregarComparativoPorColaborador(mes, gerente);
  });

  document.getElementById("btnExportarComparativo").addEventListener("click", exportarDadosComparativo);

  // Botão para limpar filtros
  document.getElementById("btnLimparFiltrosComparativo").addEventListener("click", function () {
    document.getElementById("filtroGerenteComparativo").value = "";
    document.getElementById("filtroMesComparativo").value = getMesAtualPortugues();
    carregarComparativoFrequencia(getMesAtualPortugues());
    carregarComparativoPorColaborador(getMesAtualPortugues());
  });
}

// ================================================================================
// 🔘 Função para alternar visibilidade das colunas de execução
// ================================================================================

let colunasExecucaoExpandidas = false;

/**
 * Alterna a visibilidade das colunas de execução (50% e 100%)
 */
function alternarColunasExecucao() {
  const iconesExecucao = document.querySelectorAll('#iconeExecucao, .execucao-resumo i');
  const textoBtn = document.getElementById('textoBtnExecucao');
  const colunasExecutado = document.querySelectorAll('.executado-col');
  const colunasAutorizado = document.querySelectorAll('.autorizado-col');
  const colunasNaoAutorizado = document.querySelectorAll('.nao-autorizado-col');
  const nomesCompletos = document.querySelectorAll('.nome-completo');
  const primeiroNomes = document.querySelectorAll('.primeiro-nome');

  colunasExecucaoExpandidas = !colunasExecucaoExpandidas;

  // Atualiza o ícone e o texto do botão
  iconesExecucao.forEach(icone => {
    icone.className = colunasExecucaoExpandidas ? 'fas fa-chevron-up' : 'fas fa-chevron-down';
  });

  textoBtn.textContent = colunasExecucaoExpandidas ? 'Recolher Detalhes' : 'Expandir Detalhes';

  // Alterna a visibilidade das colunas
  colunasExecutado.forEach(coluna => {
    coluna.style.display = colunasExecucaoExpandidas ? 'table-cell' : 'none';
  });

  colunasAutorizado.forEach(coluna => {
    coluna.style.display = colunasExecucaoExpandidas ? 'table-cell' : 'none';
  });

  colunasNaoAutorizado.forEach(coluna => {
    coluna.style.display = colunasExecucaoExpandidas ? 'table-cell' : 'none';
  });
  
  // Alterna entre nome completo e primeiro nome
  // Quando recolhido (estado inicial), mostra nome completo
  // Quando expandido, mostra primeiro nome
  nomesCompletos.forEach(nome => {
    nome.style.display = colunasExecucaoExpandidas ? 'none' : 'inline';
  });
  
  primeiroNomes.forEach(nome => {
    nome.style.display = colunasExecucaoExpandidas ? 'inline' : 'none';
  });
}

// ================================================================================
// 📊 Evento de Carregamento da Página
// ================================================================================

document.addEventListener('DOMContentLoaded', () => {
  // Adiciona ouvinte de evento para quando a página for carregada
  document.addEventListener('page-load:painelFrequencia', function () {
    inicializarPainelFrequencia();
  });
});