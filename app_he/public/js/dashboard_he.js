document.addEventListener("DOMContentLoaded", () => {
  const filtroMes = document.getElementById("dashboardFiltroMes");
  const filtroGerente = document.getElementById("dashboardFiltroGerente");
  const tabelaBody = document.getElementById("tabelaGerentesBody");

  inicializarFiltros();

  // Inicializa os filtros com mês atual e dropdown de gerentes
  async function inicializarFiltros() {
    preencherMeses();
    await carregarGerentes();

    const mesAtual = getMesAtual();
    filtroMes.value = mesAtual;
    carregarDashboard(mesAtual, filtroGerente.value);

    filtroMes.addEventListener("change", () => carregarDashboard(filtroMes.value, filtroGerente.value));
    filtroGerente.addEventListener("change", () => carregarDashboard(filtroMes.value, filtroGerente.value));
  }

  function preencherMeses() {
    const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    filtroMes.innerHTML = meses.map(m => `<option>${m}</option>`).join("");
  }

  function getMesAtual() {
    const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    return meses[new Date().getMonth()];
  }

  async function carregarGerentes() {
    const resp = await fetch("/planejamento-he/api/gerentes");
    const data = await resp.json();
    filtroGerente.innerHTML = `<option value="">Todas as Gerências</option>`;
    (data.gerentes || []).forEach(g => {
      const opt = document.createElement("option");
      opt.value = g;
      opt.textContent = g;
      filtroGerente.appendChild(opt);
    });
  }

  function carregarDashboard(mes, gerente) {
    tabelaBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Carregando...</td></tr>`;

    fetch(`/planejamento-he/api/dashboard-summary?mes=${encodeURIComponent(mes)}&gerente=${encodeURIComponent(gerente)}`)
      .then(r => r.json())
      .then(data => {
        if (!Array.isArray(data) || data.length === 0) {
          tabelaBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Nenhum dado encontrado para este filtro.</td></tr>`;
          atualizarKPIs(0, 0, 0, 0);
          return;
        }

        let totalHoras = 0, horasAprov = 0, horasPend = 0, horasRec = 0;
        let html = "";

        data.forEach(d => {
          const aprov = Number(d.horasAprovadas) || 0;
          const pend = Number(d.horasPendentes) || 0;
          const rec = Number(d.horasRecusadas) || 0;
          const total = aprov + pend + rec;

          totalHoras += total;
          horasAprov += aprov;
          horasPend += pend;
          horasRec += rec;

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

        tabelaBody.innerHTML = html;
        atualizarKPIs(totalHoras, horasAprov, horasPend, horasRec);
      })
      .catch(e => {
        console.error(e);
        tabelaBody.innerHTML = `<tr><td colspan="5" class="text-danger text-center">Erro ao carregar dados.</td></tr>`;
      });
  }

  function atualizarKPIs(total, aprov, pend, rec) {
    // Garante que sejam números e formata corretamente
    const fmt = n => Number(n || 0).toLocaleString("pt-BR");
    document.getElementById("kpiTotalHoras").textContent = fmt(total);
    document.getElementById("kpiAprovadas").textContent = fmt(aprov);
    document.getElementById("kpiPendentes").textContent = fmt(pend);
    document.getElementById("kpiRecusadas").textContent = fmt(rec);
  }
});
