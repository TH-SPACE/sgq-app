function inicializarDashboard() {
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
    // Apenas define o valor e carrega se não tiver sido carregado antes para este mês
    const ultimoMesCarregado = filtroMes.getAttribute('data-carregado');
    if (ultimoMesCarregado !== mesAtual) {
      filtroMes.value = mesAtual;
      carregarDashboardPorGerente(mesAtual);
      filtroMes.setAttribute('data-carregado', mesAtual);
    }

    // Garante que o evento de change só seja adicionado uma vez
    if (!filtroMes.dataset.changeEventAdded) {
      filtroMes.addEventListener("change", () => {
        const novoMes = filtroMes.value;
        carregarDashboardPorGerente(novoMes);
        filtroMes.setAttribute('data-carregado', novoMes);
      });
      filtroMes.dataset.changeEventAdded = 'true';
    }
  }
}

function carregarDashboardPorGerente(mes) {
  const accordionContainer = document.getElementById('dashboardAccordion');
  const resumoContainer = document.getElementById('dashboardResumo');
  if (!accordionContainer || !resumoContainer) return;

  accordionContainer.innerHTML = '<p class="text-center">Carregando dados dos gerentes...</p>';
  resumoContainer.innerHTML = '';

  fetch(`/planejamento-he/api/dashboard-summary?mes=${mes}`)
    .then(response => response.json())
    .then(data => {
      if (data.erro) {
        accordionContainer.innerHTML = `<div class="alert alert-danger">${data.erro}</div>`;
        return;
      }

      if (data.length === 0) {
        accordionContainer.innerHTML = '<p class="text-center text-muted">Nenhum dado encontrado para este mês.</p>';
        resumoContainer.innerHTML = ''; // Limpa o resumo também
        return;
      }

      // 🔹 Calcular totais de horas
      let totalHoras = 0, horasPend = 0, horasAprov = 0;
      
      data.forEach(d => {
        totalHoras += Number(d.totalHoras) || 0;
        horasPend += Number(d.horasPendentes) || 0;
        horasAprov += Number(d.horasAprovadas) || 0;
      });

      // 🔹 Renderizar cards resumo
      resumoContainer.innerHTML = `
    <div class="col-md-4 mb-3">
        <div class="summary-card purple h-100">
            <div class="icon"><i class="fas fa-clock"></i></div>
            <div class="title">Horas Totais Planejadas</div>
            <div class="value">${totalHoras.toLocaleString('pt-BR')}</div>
        </div>
    </div>
    <div class="col-md-4 mb-3">
        <div class="summary-card orange h-100">
            <div class="icon"><i class="fas fa-hourglass-half"></i></div>
            <div class="title">Horas Pendentes</div>
            <div class="value">${horasPend.toLocaleString('pt-BR')}</div>
        </div>
    </div>
    <div class="col-md-4 mb-3">
        <div class="summary-card green h-100">
            <div class="icon"><i class="fas fa-check-circle"></i></div>
            <div class="title">Horas Aprovadas</div>
            <div class="value">${horasAprov.toLocaleString('pt-BR')}</div>
        </div>
    </div>
`;

      let accordionHtml = "";
      data.forEach((gerenteData, index) => {
        const gerenteId = `gerente-${index}`;
        accordionHtml += `
                    <div class="card card-dashboard mb-3">
                        <div class="card-header d-flex justify-content-between align-items-center" id="heading-${gerenteId}">
                            <h5 class="mb-0">
                                <button class="btn btn-link text-white" type="button" data-toggle="collapse"
                                    data-target="#collapse-${gerenteId}" aria-expanded="false"
                                    aria-controls="collapse-${gerenteId}" data-gerente="${gerenteData.GERENTE
          }">
                                    ${gerenteData.GERENTE ||
          "Gerente não especificado"
          }
                                </button>
                            </h5>
                            <div class="stats">
                                <span class="badge badge-info">Horas: ${gerenteData.totalHoras || 0
          }</span>
                                <span class="badge badge-warning">Pendentes: ${gerenteData.pendentes || 0
          }</span>
                                <span class="badge badge-success">Aprovadas: ${gerenteData.aprovadas || 0
          }</span>
                                <span class="badge badge-danger">Recusadas: ${gerenteData.recusadas || 0
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

      // Adicionar event listeners para o collapse
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
        // Não desenha o gráfico se não houver dados
        new Chart(chartCanvas, {
            type: 'doughnut',
            data: {
                labels: ['Nenhum dado'],
                datasets: [{
                    data: [1],
                    backgroundColor: ['#f0f0f0']
                }]
            },
            options: { responsive: true, legend: { display: false } }
        });
        tableContainer.setAttribute("data-loaded", "true");
        return;
      }

      // Montar tabela
      let tableHtml = `
                <div class="table-responsive" style="max-height: 250px; overflow-y: auto;">
                    <table class="table table-sm table-hover table-bordered">
                        <thead class="thead-light" style="position: sticky; top: 0;">
                            <tr>
                                <th>Colaborador</th>
                                <th>Horas</th>
                                <th>Tipo HE</th>
                                <th>Status</th>
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