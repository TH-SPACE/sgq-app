// ================================================================================
// 📋 MINHAS SOLICITAÇÕES - Gerenciamento de Solicitações de HE
// ================================================================================
// Este arquivo controla a página "Minhas Solicitações", permitindo ao usuário
// visualizar, filtrar, editar e excluir suas próprias solicitações de hora extra.
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
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];
  return meses[new Date().getMonth()];
}

// ================================================================================
// 📊 Carregamento e Exibição de Dados
// ================================================================================

/**
 * Carrega e exibe as solicitações do usuário logado
 *
 * Busca as solicitações na API e renderiza a tabela com os dados.
 * Permite filtrar por colaborador e mês.
 *
 * @param {string} colaborador - Nome do colaborador para filtrar (opcional)
 * @param {string} mes - Mês para filtrar (opcional)
 */
function carregarMinhasSolicitacoes(colaborador = "", mes = "") {
  const container = document.getElementById("tabelaMinhasSolicitacoes");
  container.innerHTML = "<p>Carregando...</p>";

  // Constrói os parâmetros da URL (query string)
  const params = new URLSearchParams();
  if (colaborador) params.append("colaborador", colaborador);
  if (mes) params.append("mes", mes);

  // Monta a URL completa com os filtros aplicados
  const url = `/planejamento-he/api/minhas-solicitacoes${
    params.toString() ? "?" + params.toString() : ""
  }`;

  // Faz a requisição para a API
  fetch(url)
    .then((response) => {
      if (!response.ok) throw new Error("Erro na resposta da API");
      return response.json();
    })
    .then((dados) => {
      // Tratamento de erro retornado pela API
      if (dados.erro) {
        container.innerHTML = `<div class="alert alert-danger">${dados.erro}</div>`;
        return;
      }

      // Caso não haja solicitações encontradas
      if (dados.length === 0) {
        container.innerHTML = `<p class="text-muted">Nenhuma solicitação encontrada.</p>`;
        return;
      }

      // Inicia a construção da tabela HTML
      let tabelaHtml = `
        <div class="table-responsive">
          <table class="table table-bordered table-hover table-sm">
            <thead class="thead-light">
              <tr>
                <th>Colaborador</th>
                <th>Cargo</th>
                <th>Mês</th>
                <th>Horas</th>
                <th>Tipo HE</th>
                <th>Status</th>
                <th>Enviado em</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
      `;

      // Itera sobre cada solicitação e cria uma linha na tabela
      dados.forEach((s) => {
        // Define a badge de status com cores diferentes
        const statusBadge =
          s.STATUS === "APROVADO"
            ? '<span class="badge badge-success">Aprovado</span>'
            : s.STATUS === "RECUSADO"
            ? '<span class="badge badge-danger">Recusado</span>'
            : '<span class="badge badge-warning">Pendente</span>';

        // Monta os botões de ação (editar e excluir disponíveis para todas as solicitações)
        const acoes = `
  <button class="btn btn-sm btn-outline-primary mr-1" onclick="editarSolicitacao(${
    s.id
  })">
    <i class="fas fa-edit"></i>
  </button>
  <button class="btn btn-sm btn-outline-danger" onclick="excluirSolicitacaoDireto(${s.id})">
    <i class="fas fa-trash"></i>
  </button>
`;

        // Adiciona a linha da tabela
        tabelaHtml += `
  <tr>
    <td>${s.COLABORADOR || "-"}</td>
    <td>${s.CARGO || "-"}</td>
    <td>${s.MES || "-"}</td>
    <td>${s.HORAS || "0"}</td>
    <td>${s.TIPO_HE || "-"}</td>
    <td>${statusBadge}</td>
    <td>${s.DATA_ENVIO_FORMATADA || "-"}</td>
    <td>${acoes}</td>
  </tr>
`;
      });

      // Fecha a tabela
      tabelaHtml += `
            </tbody>
          </table>
        </div>
      `;

      // Atualiza o HTML do container com a tabela completa
      container.innerHTML = tabelaHtml;
    })
    .catch((erro) => {
      console.error("Erro ao carregar minhas solicitações:", erro);
      container.innerHTML = `<div class="alert alert-danger">Erro ao carregar dados. Tente novamente.</div>`;
    });
}

// ================================================================================
// 🎬 Inicialização da Página
// ================================================================================

// Executa quando o DOM estiver completamente carregado
document.addEventListener("DOMContentLoaded", () => {
  // Define o mês atual como filtro padrão
  const mesAtual = getMesAtualPortugues();
  document.getElementById("filtroMes").value = mesAtual;

  // Carrega as solicitações com o filtro de mês atual
  carregarMinhasSolicitacoes("", mesAtual);

  // Event listener para recarregar dados quando a página é aberta via navegação SPA
  document.addEventListener('page-load:minhasSolicitacoes', function() {
    const colaborador = document.getElementById("filtroColaborador").value;
    const mes = document.getElementById("filtroMes").value;
    carregarMinhasSolicitacoes(colaborador, mes);
  });

  // ================================================================================
  // 🔍 Sistema de Filtros
  // ================================================================================

  // Timer para debounce (evita requisições excessivas durante digitação)
  let debounceTimer;

  /**
   * Aplica os filtros selecionados e recarrega os dados
   */
  function aplicarFiltros() {
    const colaborador = document.getElementById("filtroColaborador").value;
    const mes = document.getElementById("filtroMes").value;
    carregarMinhasSolicitacoes(colaborador, mes);
  }

  // Filtro de colaborador com debounce (aguarda 500ms após parar de digitar)
  document.getElementById("filtroColaborador").addEventListener("input", () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(aplicarFiltros, 500);
  });

  // Filtro de mês aplica imediatamente ao selecionar
  document.getElementById("filtroMes").addEventListener("change", aplicarFiltros);

  // Botão para limpar todos os filtros
  document
    .getElementById("btnLimparFiltros")
    .addEventListener("click", limparFiltros);
});

/**
 * Limpa todos os filtros e recarrega com valores padrão
 */
function limparFiltros() {
  document.getElementById("filtroColaborador").value = "";
  document.getElementById("filtroMes").value = getMesAtualPortugues();
  carregarMinhasSolicitacoes("", getMesAtualPortugues());
}

// ================================================================================
// ✏️ Edição de Solicitações
// ================================================================================

/**
 * Inicia o processo de edição de uma solicitação
 *
 * Busca os dados da solicitação na API e abre o modal de edição.
 *
 * @param {number} id - ID da solicitação a ser editada
 */
function editarSolicitacao(id) {
  fetch(`/planejamento-he/api/solicitacao/${id}`)
    .then((res) => res.json())
    .then((dados) => {
      if (dados.erro) throw new Error(dados.erro);
      abrirModalEdicao(dados);
    })
    .catch((err) => {
      alert("Erro ao carregar solicitação para edição: " + err.message);
    });
}

/**
 * Abre o modal de edição e preenche com os dados da solicitação
 *
 * Cria dinamicamente o HTML do modal, preenche os campos com os dados
 * existentes e exibe o modal ao usuário.
 *
 * @param {Object} dados - Objeto com os dados da solicitação
 */
function abrirModalEdicao(dados) {
  // Remove modal anterior caso exista (evita duplicação)
  const modalAntigo = document.getElementById("modalEdicao");
  if (modalAntigo) modalAntigo.remove();

  // Template HTML do modal de edição
  const modalHTML = `
    <div class="modal fade" id="modalEdicao" tabindex="-1">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Editar Solicitação</h5>
            <button type="button" class="close" data-dismiss="modal">
              <span>&times;</span>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Colaborador</label>
              <input type="text" class="form-control" id="editColaborador" readonly>
            </div>
            <div class="form-row">
              <div class="form-group col-md-6">
                <label>Mês</label>
                <input type="text" class="form-control" id="editMes" readonly>
              </div>
              <div class="form-group col-md-6">
                <label>Horas</label>
                <input type="number" class="form-control" id="editHoras" min="0.5" step="0.5">
              </div>
            </div>
            <div class="form-group">
              <label>Tipo HE</label>
              <select class="form-control" id="editTipoHE">
                <option value="50%">50%</option>
                <option value="100%">100%</option>
              </select>
            </div>
            <div class="form-group">
              <label>Justificativa</label>
              <textarea class="form-control" id="editJustificativa" rows="3"></textarea>
            </div>
            <div id="avisoHoras" class="alert alert-warning d-none" role="alert">
              <i class="fas fa-exclamation-triangle"></i> Atenção: Você está aumentando a quantidade de horas. Recomenda-se criar uma nova solicitação para horas adicionais.
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button>
            <button type="button" class="btn btn-primary" id="btnSalvarEdicao" data-id="${dados.id}">
              Salvar Alterações
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Adiciona o modal ao final do body
  document.body.insertAdjacentHTML("beforeend", modalHTML);

  // Preenche os campos com os dados da solicitação
  document.getElementById("editColaborador").value = dados.COLABORADOR || "";
  document.getElementById("editMes").value = dados.MES || "";
  document.getElementById("editHoras").value = dados.HORAS || "";
  document.getElementById("editTipoHE").value = dados.TIPO_HE || "50%";
  document.getElementById("editJustificativa").value =
    dados.JUSTIFICATIVA || "";

  // Armazena o valor original de horas para comparação
  const originalHoras = dados.HORAS || "";
  document.getElementById("editHoras").setAttribute('data-original-value', originalHoras);
  
  // Adiciona evento para detectar mudanças no campo de horas
  document.getElementById("editHoras").addEventListener('input', function() {
    const originalValue = parseFloat(this.getAttribute('data-original-value')) || 0;
    const newValue = parseFloat(this.value) || 0;
    const avisoHoras = document.getElementById("avisoHoras");

    if (newValue > originalValue) {
      // Impede aumento de horas alterando para o valor original
      this.value = originalValue;
      avisoHoras.classList.remove('d-none');
    } else {
      avisoHoras.classList.add('d-none');
    }
  });

  // Exibe o modal (usando jQuery do Bootstrap)
  $("#modalEdicao").modal("show");

  // Adiciona evento de clique no botão salvar
  document
    .getElementById("btnSalvarEdicao")
    .addEventListener("click", salvarEdicao);
}

/**
 * Salva as alterações feitas na solicitação
 *
 * Valida os dados, envia para a API e fecha o modal se bem-sucedido.
 *
 * @param {Event} event - Evento de clique no botão salvar
 */
function salvarEdicao(event) {
  const botao = event.currentTarget;
  const id = botao.getAttribute("data-id");

  // Coleta os dados do formulário
  const dados = {
    id: id,
    mes: document.getElementById("editMes").value,
    horas: parseFloat(document.getElementById("editHoras").value),
    tipoHE: document.getElementById("editTipoHE").value,
    justificativa: document.getElementById("editJustificativa").value.trim(),
  };

  // Validação básica dos campos obrigatórios
  if (!id || !dados.mes || !dados.horas || !dados.justificativa) {
    alert("Preencha todos os campos obrigatórios.");
    return;
  }

  // Obtém o valor original de horas para comparação
  const originalHoras = parseFloat(document.getElementById("editHoras").getAttribute('data-original-value')) || 0;
  
  // Verifica se está tentando aumentar as horas e impede
  if (dados.horas > originalHoras) {
    alert("Não é permitido aumentar a quantidade de horas. Apenas é possível diminuir. Crie uma nova solicitação para horas adicionais.");
    return; // Cancela a operação
  }

  // Envia os dados para a API
  fetch("/planejamento-he/editar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.sucesso) {
        // Fecha o modal
        $("#modalEdicao").modal("hide");

        // Recarrega a tabela com os filtros atuais
        const colaborador = document.getElementById("filtroColaborador").value;
        const mes = document.getElementById("filtroMes").value;
        carregarMinhasSolicitacoes(colaborador, mes);
      } else {
        alert("Erro ao salvar: " + (data.mensagem || "Desconhecido"));
      }
    })
    .catch((err) => {
      alert("Erro de conexão: " + err.message);
    });
}

// ================================================================================
// 🗑️ Exclusão de Solicitações
// ================================================================================

/**
 * Exclui uma solicitação após confirmação do usuário
 *
 * Solicita confirmação, envia requisição de exclusão para a API e
 * recarrega a tabela se bem-sucedido.
 *
 * @param {number} id - ID da solicitação a ser excluída
 */
function excluirSolicitacaoDireto(id) {
  // Confirmação com o usuário
  if (
    !confirm(
      "Tem certeza que deseja excluir esta solicitação? Esta ação não pode ser desfeita."
    )
  ) {
    return;
  }

  // Envia requisição de exclusão para a API
  fetch("/planejamento-he/excluir", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: id }),
  })
    .then((response) => {
      if (!response.ok) throw new Error("Erro na resposta do servidor");
      return response.json();
    })
    .then((data) => {
      if (data.sucesso) {
        // Recarrega a tabela com os filtros atuais
        const colaborador = document.getElementById("filtroColaborador").value;
        const mes = document.getElementById("filtroMes").value;
        carregarMinhasSolicitacoes(colaborador, mes);
      } else {
        alert("Erro: " + (data.mensagem || "Não foi possível excluir."));
      }
    })
    .catch((erro) => {
      console.error("Erro ao excluir:", erro);
      alert("Erro ao excluir solicitação. Verifique oo console para detalhes.");
    });
}
