// minhas.js

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

function carregarMinhasSolicitacoes(colaborador = "", mes = "") {
  const container = document.getElementById("tabelaMinhasSolicitacoes");
  container.innerHTML = "<p>Carregando...</p>";

  const params = new URLSearchParams();
  if (colaborador) params.append("colaborador", colaborador);
  if (mes) params.append("mes", mes);

  const url = `/planejamento-he/api/minhas-solicitacoes${
    params.toString() ? "?" + params.toString() : ""
  }`;

  fetch(url)
    .then((response) => {
      if (!response.ok) throw new Error("Erro na resposta da API");
      return response.json();
    })
    .then((dados) => {
      if (dados.erro) {
        container.innerHTML = `<div class="alert alert-danger">${dados.erro}</div>`;
        return;
      }

      if (dados.length === 0) {
        container.innerHTML = `<p class="text-muted">Nenhuma solicitação encontrada.</p>`;
        return;
      }

      let tabelaHtml = `
        <div class="table-responsive">
          <table class="table table-bordered table-hover">
            <thead class="thead-light">
              <tr>
                <th>Gerente</th>
                <th>Colaborador</th>
                <th>Matrícula</th>
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

      dados.forEach((s) => {
        const statusBadge =
          s.STATUS === "APROVADO"
            ? '<span class="badge badge-success">Aprovado</span>'
            : s.STATUS === "RECUSADO"
            ? '<span class="badge badge-danger">Recusado</span>'
            : '<span class="badge badge-warning">Pendente</span>';

        const acoes = `
  <button class="btn btn-sm btn-outline-primary" onclick="editarSolicitacao(${
    s.id
  })">
    <i class="fas fa-edit"></i>
  </button>
  ${
    s.STATUS === "PENDENTE"
      ? `<button class="btn btn-sm btn-outline-danger" onclick="excluirSolicitacaoDireto(${s.id})">
      <i class="fas fa-trash"></i>
    </button>`
      : ""
  }
`;

        tabelaHtml += `
  <tr>
    <td>${s.GERENTE || "-"}</td>
    <td>${s.COLABORADOR || "-"}</td>
    <td>${s.MATRICULA || "-"}</td>
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

      tabelaHtml += `
            </tbody>
          </table>
        </div>
      `;

      container.innerHTML = tabelaHtml;
    })
    .catch((erro) => {
      console.error("Erro ao carregar minhas solicitações:", erro);
      container.innerHTML = `<div class="alert alert-danger">Erro ao carregar dados. Tente novamente.</div>`;
    });
}

// Inicialização
document.addEventListener("DOMContentLoaded", () => {
  const mesAtual = getMesAtualPortugues();
  document.getElementById("filtroMes").value = mesAtual;



  let debounceTimer;

  function aplicarFiltros() {
    const colaborador = document.getElementById("filtroColaborador").value;
    const mes = document.getElementById("filtroMes").value;
    carregarMinhasSolicitacoes(colaborador, mes);
  }

  document.getElementById("filtroColaborador").addEventListener("input", () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(aplicarFiltros, 500); // 500ms de atraso
  });

  document.getElementById("filtroMes").addEventListener("change", aplicarFiltros);

  document
    .getElementById("btnLimparFiltros")
    .addEventListener("click", limparFiltros);
});

function limparFiltros() {
  document.getElementById("filtroColaborador").value = "";
  document.getElementById("filtroMes").value = getMesAtualPortugues();
  carregarMinhasSolicitacoes("", getMesAtualPortugues());
}

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

function abrirModalEdicao(dados) {
  const modalAntigo = document.getElementById("modalEdicao");
  if (modalAntigo) modalAntigo.remove();

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

  document.body.insertAdjacentHTML("beforeend", modalHTML);

  // Preenche os campos existentes
  document.getElementById("editColaborador").value = dados.COLABORADOR || "";
  document.getElementById("editMes").value = dados.MES || "";
  document.getElementById("editHoras").value = dados.HORAS || "";
  document.getElementById("editTipoHE").value = dados.TIPO_HE || "50%";
  document.getElementById("editJustificativa").value =
    dados.JUSTIFICATIVA || "";

  $("#modalEdicao").modal("show");

  // Evento de salvar
  document
    .getElementById("btnSalvarEdicao")
    .addEventListener("click", salvarEdicao);
}

function salvarEdicao(event) {
  const botao = event.currentTarget;
  const id = botao.getAttribute("data-id");

  const dados = {
    id: id,
    mes: document.getElementById("editMes").value,
    horas: parseFloat(document.getElementById("editHoras").value),
    tipoHE: document.getElementById("editTipoHE").value,
    justificativa: document.getElementById("editJustificativa").value.trim(),
  };

  console.log("Dados enviados:", dados);

  if (!id || !dados.mes || !dados.horas || !dados.justificativa) {
    alert("Preencha todos os campos obrigatórios.");
    return;
  }

  fetch("/planejamento-he/editar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.sucesso) {
        $("#modalEdicao").modal("hide");
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

function excluirSolicitacaoDireto(id) {
  if (
    !confirm(
      "Tem certeza que deseja excluir esta solicitação? Esta ação não pode ser desfeita."
    )
  ) {
    return;
  }

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
