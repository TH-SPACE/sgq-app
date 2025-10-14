// ================================================================================
// 📊 DASHBOARD DE HORAS EXTRAS (HE)
// ================================================================================
// Este arquivo controla o dashboard principal do sistema de HE, exibindo:
// - KPIs (Total de horas, aprovadas, pendentes, recusadas)
// - Tabela resumida por gerente
// - Filtros por mês e gerência
// - Função de exportação para CSV
// ================================================================================

// Executa quando o DOM estiver completamente carregado
document.addEventListener("DOMContentLoaded", () => {
  // ================================================================================
  // 🔧 Referências aos Elementos do DOM
  // ================================================================================

  const filtroMes = document.getElementById("dashboardFiltroMes");
  const filtroGerente = document.getElementById("dashboardFiltroGerente");
  const tabelaBody = document.getElementById("tabelaGerentesBody");

  // ================================================================================
  // 🎬 Inicialização do Dashboard
  // ================================================================================

  inicializarFiltros();

  // Event listener para recarregar quando a página é aberta via navegação SPA
  document.addEventListener('page-load:dashboard', function() {
    carregarDashboard(filtroMes.value, filtroGerente.value);
  });

  // ================================================================================
  // 🔄 Inicialização dos Filtros e Event Listeners
  // ================================================================================

  /**
   * Inicializa os filtros do dashboard
   *
   * - Preenche o dropdown de meses
   * - Carrega a lista de gerentes da API
   * - Define o mês atual como padrão
   * - Carrega os dados iniciais
   * - Configura os event listeners dos filtros
   */
  async function inicializarFiltros() {
    // Preenche o select de meses com todos os 12 meses
    preencherMeses();

    // Carrega os gerentes disponíveis da API
    await carregarGerentes();

    // Define o mês atual como filtro padrão
    const mesAtual = getMesAtual();
    filtroMes.value = mesAtual;

    // Carrega os dados do dashboard com o mês atual
    carregarDashboard(mesAtual, filtroGerente.value);

    // Event listener: Recarrega ao mudar o mês
    filtroMes.addEventListener("change", () => carregarDashboard(filtroMes.value, filtroGerente.value));

    // Event listener: Recarrega ao mudar o gerente
    filtroGerente.addEventListener("change", () => carregarDashboard(filtroMes.value, filtroGerente.value));

    // Event listener: Botão de exportar dados
    document.getElementById("btnExportarDashboard").addEventListener("click", () => {
        exportarDadosDashboard();
    });

    // Event listener: Botão de limpar filtros
    document.getElementById("btnLimparFiltrosDashboard").addEventListener("click", () => {
      const mesAtual = getMesAtual();
      filtroMes.value = mesAtual;
      filtroGerente.value = "";
      carregarDashboard(mesAtual, "");
    });
  }

  // ================================================================================
  // 🗓️ Funções Auxiliares de Datas
  // ================================================================================

  /**
   * Preenche o select de meses com todos os 12 meses do ano
   */
  function preencherMeses() {
    const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    filtroMes.innerHTML = meses.map(m => `<option>${m}</option>`).join("");
  }

  /**
   * Retorna o nome do mês atual em português
   * @returns {string} Nome do mês atual
   */
  function getMesAtual() {
    const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    return meses[new Date().getMonth()];
  }

  // ================================================================================
  // 📥 Carregamento de Dados da API
  // ================================================================================

  /**
   * Carrega a lista de gerentes disponíveis da API
   *
   * Popula o select de gerentes com os dados retornados, incluindo
   * a opção "Todas as Gerências" como padrão.
   */
  async function carregarGerentes() {
    const resp = await fetch("/planejamento-he/api/gerentes");
    const data = await resp.json();

    // Adiciona a opção padrão "Todas as Gerências"
    filtroGerente.innerHTML = `<option value="">Todas as Gerências</option>`;

    // Adiciona cada gerente como uma option
    (data.gerentes || []).forEach(g => {
      const opt = document.createElement("option");
      opt.value = g;
      opt.textContent = g;
      filtroGerente.appendChild(opt);
    });
  }

  /**
   * Carrega os dados do dashboard da API e atualiza a interface
   *
   * Busca o resumo de horas por gerente, filtrando por mês e gerente se fornecido.
   * Atualiza tanto a tabela quanto os KPIs na interface.
   *
   * @param {string} mes - Mês para filtrar (ex: "Janeiro")
   * @param {string} gerente - Nome do gerente para filtrar (opcional, vazio = todos)
   */
  function carregarDashboard(mes, gerente) {
    // Exibe mensagem de carregamento
    tabelaBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Carregando...</td></tr>`;

    // Faz a requisição para a API com os filtros aplicados
    fetch(`/planejamento-he/api/dashboard-summary?mes=${encodeURIComponent(mes)}&gerente=${encodeURIComponent(gerente)}`)
      .then(r => r.json())
      .then(data => {
        // Valida se há dados retornados
        if (!Array.isArray(data) || data.length === 0) {
          tabelaBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Nenhum dado encontrado para este filtro.</td></tr>`;
          atualizarKPIs(0, 0, 0, 0);
          return;
        }

        // Variáveis para acumular os totais
        let totalHoras = 0, horasAprov = 0, horasPend = 0, horasRec = 0;
        let html = "";

        // Itera sobre cada gerente retornado
        data.forEach(d => {
          // Converte os valores para número (evita problemas com null/undefined)
          const aprov = Number(d.horasAprovadas) || 0;
          const pend = Number(d.horasPendentes) || 0;
          const rec = Number(d.horasRecusadas) || 0;
          const total = aprov + pend + rec;

          // Acumula os totais para os KPIs
          totalHoras += total;
          horasAprov += aprov;
          horasPend += pend;
          horasRec += rec;

          // Constrói a linha da tabela para este gerente
          html += `
            <tr>
              <td>${d.GERENTE || "Sem nome"}</td>
              <td class="text-success font-weight-bold">${aprov}</td>
              <td class="text-warning font-weight-bold">${pend}</td>
              <td class="text-danger font-weight-bold">${rec}</td>
              <td class="font-weight-bold">${total}</td>
            </tr>
          `;
        });

        // Atualiza a tabela com os dados
        tabelaBody.innerHTML = html;

        // Atualiza os cards de KPI com os totais calculados
        atualizarKPIs(totalHoras, horasAprov, horasPend, horasRec);
      })
      .catch(e => {
        console.error(e);
        tabelaBody.innerHTML = `<tr><td colspan="5" class="text-danger text-center">Erro ao carregar dados.</td></tr>`;
      });
  }

  // ================================================================================
  // 📈 Atualização de KPIs (Indicadores)
  // ================================================================================

  /**
   * Atualiza os cards de KPI com animação de contador
   *
   * Exibe os totais de horas com efeito visual de contagem progressiva.
   *
   * @param {number} total - Total de horas (aprovadas + pendentes + recusadas)
   * @param {number} aprov - Total de horas aprovadas
   * @param {number} pend - Total de horas pendentes
   * @param {number} rec - Total de horas recusadas
   */
  function atualizarKPIs(total, aprov, pend, rec) {
    // Anima cada KPI com efeito de contador
    animarContador("kpiTotalHoras", total);
    animarContador("kpiAprovadas", aprov);
    animarContador("kpiPendentes", pend);
    animarContador("kpiRecusadas", rec);
  }

  /**
   * Anima um contador de números com efeito de transição suave
   *
   * Cria um efeito visual de contagem progressiva do valor atual até o valor final,
   * tornando a atualização dos KPIs mais atrativa visualmente.
   *
   * @param {string} elementId - ID do elemento HTML a ser animado
   * @param {number} valorFinal - Valor final a ser exibido
   */
  function animarContador(elementId, valorFinal) {
    const elemento = document.getElementById(elementId);

    // Obtém o valor atual exibido (remove formatação antes de converter)
    const valorAtual = parseInt(elemento.textContent.replace(/\./g, '').replace(',', '.')) || 0;

    // Configurações da animação
    const duracao = 1000; // 1 segundo
    const passos = 30;     // Número de frames da animação
    const incremento = (valorFinal - valorAtual) / passos;
    let contador = 0;

    // Cria um intervalo para atualizar o valor gradualmente
    const intervalo = setInterval(() => {
      contador++;
      const valorAtualizado = Math.round(valorAtual + (incremento * contador));

      // Verifica se chegou ao final da animação
      if (contador >= passos) {
        clearInterval(intervalo);
        // Garante que o valor final seja exato (sem arredondamentos acumulados)
        elemento.textContent = Number(valorFinal || 0).toLocaleString("pt-BR");
      } else {
        // Atualiza com o valor intermediário formatado
        elemento.textContent = Number(valorAtualizado || 0).toLocaleString("pt-BR");
      }
    }, duracao / passos);
  }

  // ================================================================================
  // 📤 Exportação de Dados para CSV
  // ================================================================================

  /**
   * Exporta os dados do dashboard para um arquivo CSV
   *
   * Faz download de um arquivo CSV contendo todos os dados filtrados,
   * incluindo detalhes de cada solicitação de HE.
   */
  async function exportarDadosDashboard() {
    const mes = filtroMes.value;
    const gerente = filtroGerente.value;

    try {
        // Faz requisição para a API de exportação com os filtros aplicados
        const response = await fetch(`/planejamento-he/api/exportar?mes=${encodeURIComponent(mes)}&gerente=${encodeURIComponent(gerente)}`);

        // Valida se a resposta foi bem-sucedida
        if (!response.ok) {
            throw new Error(`Erro na requisição: ${response.statusText}`);
        }

        // Converte a resposta para Blob (arquivo binário)
        const blob = await response.blob();

        // Cria uma URL temporária para o arquivo
        const url = window.URL.createObjectURL(blob);

        // Cria um elemento <a> invisível para forçar o download
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;

        // Define o nome do arquivo com mês e data atual
        a.download = `planejamento_he_${mes.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`;

        // Adiciona ao DOM, clica e remove (truque para forçar download)
        document.body.appendChild(a);
        a.click();

        // Limpa a URL temporária e remove o elemento
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

    } catch (error) {
        console.error("Erro ao exportar dados:", error);
        alert("Falha ao exportar os dados. Verifique o console para mais detalhes.");
    }
  }
});
