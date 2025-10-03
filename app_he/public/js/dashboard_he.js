document.addEventListener("DOMContentLoaded", () => {
  const filtroMes = document.getElementById("dashboardFiltroMes");

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

  const mesAtual = getMesAtualPortugues();
  if (filtroMes) {
    filtroMes.value = mesAtual;
    carregarDashboardPorGerente(mesAtual);

    filtroMes.addEventListener("change", () => {
      carregarDashboardPorGerente(filtroMes.value);
    });
  }
});

function carregarDashboardPorGerente(mes) {
  const accordionContainer = document.getElementById("dashboardAccordion");
  if (!accordionContainer) return;

  accordionContainer.innerHTML =
    '<p class="text-center">Carregando dados dos gerentes...</p>';

  fetch(`/planejamento-he/api/dashboard-summary?mes=${mes}`)
    .then((response) => response.json())
    .then((data) => {
      if (data.erro) {
        accordionContainer.innerHTML = `<div class="alert alert-danger">${data.erro}</div>`;
        return;
      }

      if (data.length === 0) {
        accordionContainer.innerHTML =
          '<p class="text-center text-muted">Nenhum dado encontrado para este mês.</p>';
        return;
      }

      let accordionHtml = "";
      data.forEach((gerenteData, index) => {
        const gerenteId = `gerente-${index}`;
        accordionHtml += `
                    <div class="card card-dashboard mb-3">
                        <div class="card-header d-flex justify-content-between align-items-center" id="heading-${gerenteId}">
                            <h5 class="mb-0">
                                <button class="btn btn-link text-white" type="button" data-toggle="collapse"
                                    data-target="#collapse-${gerenteId}" aria-expanded="false"
                                    aria-controls="collapse-${gerenteId}" data-gerente="${
          gerenteData.GERENTE
        }">
                                    ${
                                      gerenteData.GERENTE ||
                                      "Gerente não especificado"
                                    }
                                </button>
                            </h5>
                            <div class="stats">
                                <span class="badge badge-info">Horas: ${
                                  gerenteData.totalHoras || 0
                                }</span>
                                <span class="badge badge-warning">Pendentes: ${
                                  gerenteData.pendentes || 0
                                }</span>
                                <span class="badge badge-success">Aprovadas: ${
                                  gerenteData.aprovadas || 0
                                }</span>
                                <span class="badge badge-danger">Recusadas: ${
                                  gerenteData.recusadas || 0
                                }</span>
                            </div>
                        </div>

                        <div id="collapse-${gerenteId}" class="collapse"
                            aria-labelledby="heading-${gerenteId}" data-parent="#dashboardAccordion">
                            <div class="card-body" id="body-${gerenteId}">
                                <div class="row">
                                    <div class="col-md-4 text-center">
                                        <canvas id="chart-${gerenteId}" height="150"></canvas>
                                    </div>
                                    <div class="col-md-8" id="table-${gerenteId}">
                                        Carregando solicitações...
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
      });

      accordionContainer.innerHTML = accordionHtml;

      // Adicionar event listeners
      $("#dashboardAccordion .collapse").on("show.bs.collapse", function () {
        const gerente = this.previousElementSibling
          .querySelector("button")
          .getAttribute("data-gerente");
        const gerenteId = this.id.replace("collapse-", "");
        carregarDetalhesGerente(gerente, mes, gerenteId);
      });
    })
    .catch((error) => {
      console.error("Erro ao carregar dashboard por gerente:", error);
      accordionContainer.innerHTML =
        '<div class="alert alert-danger">Erro ao carregar dados.</div>';
    });
}

function carregarDetalhesGerente(gerente, mes, gerenteId) {
  const tableContainer = document.getElementById(`table-${gerenteId}`);
  const chartCanvas = document.getElementById(`chart-${gerenteId}`);
  if (!tableContainer || tableContainer.getAttribute("data-loaded") === "true")
    return;

  fetch(
    `/planejamento-he/api/todas-solicitacoes?gerente=${encodeURIComponent(
      gerente
    )}&mes=${mes}`
  )
    .then((response) => response.json())
    .then((solicitacoes) => {
      if (solicitacoes.erro) {
        tableContainer.innerHTML = `<p class="text-danger">${solicitacoes.erro}</p>`;
        return;
      }

      if (solicitacoes.length === 0) {
        tableContainer.innerHTML =
          '<p class="text-muted">Nenhuma solicitação para este gerente no mês.</p>';
        tableContainer.setAttribute("data-loaded", "true");
        return;
      }

      // Montar tabela
      let tableHtml = `
                <div class="table-responsive">
                    <table class="table table-sm table-hover table-bordered">
                        <thead class="thead-light">
                            <tr>
                                <th>Colaborador</th>
                                <th>Horas</th>
                                <th>Tipo HE</th>
                                <th>Status</th>
                                <th>Enviado em</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

      let countPend = 0,
        countAprov = 0,
        countRec = 0;

      solicitacoes.forEach((s) => {
        const statusBadge =
          s.STATUS === "APROVADO"
            ? '<span class="badge badge-success">✔ Aprovado</span>'
            : s.STATUS === "RECUSADO"
            ? '<span class="badge badge-danger">❌ Recusado</span>'
            : '<span class="badge badge-warning">⏳ Pendente</span>';

        if (s.STATUS === "APROVADO") countAprov++;
        else if (s.STATUS === "RECUSADO") countRec++;
        else countPend++;

        tableHtml += `
                    <tr>
                        <td>${s.COLABORADOR || "-"}</td>
                        <td>${s.HORAS || "0"}</td>
                        <td>${s.TIPO_HE || "-"}</td>
                        <td>${statusBadge}</td>
                        <td>${s.DATA_ENVIO_FORMATADA || "-"}</td>
                    </tr>
                `;
      });

      tableHtml += "</tbody></table></div>";
      tableContainer.innerHTML = tableHtml;

      // Criar gráfico de pizza
      new Chart(chartCanvas, {
        type: "doughnut",
        data: {
          labels: ["Aprovadas", "Pendentes", "Recusadas"],
          datasets: [
            {
              data: [countAprov, countPend, countRec],
              backgroundColor: ["#43a047", "#fb8c00", "#e53935"],
            },
          ],
        },
        options: {
          responsive: true,
          legend: { position: "bottom" },
        },
      });

      tableContainer.setAttribute("data-loaded", "true");
    })
    .catch((error) => {
      console.error("Erro ao carregar detalhes do gerente:", error);
      tableContainer.innerHTML =
        '<p class="text-danger">Erro ao carregar detalhes.</p>';
    });
}
