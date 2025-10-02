// ========== DADOS DO USUÁRIO ==========
function carregarDadosUsuario() {
  fetch("/home/usuario")
    .then((res) => res.json())
    .then((data) => {
      const nomeCompleto = data.nome || "Usuário";
      const cargo = data.cargo || "USUÁRIO";
      const primeiroNome = nomeCompleto.split(" ")[0];

      document.getElementById("userName").textContent = primeiroNome;
      document.getElementById("sidebarUserName").textContent = nomeCompleto;
      document.querySelector(".profile-role").textContent = cargo;
    });
}

// ========== RESUMO DE HE ==========
let limitesPorGerente = {};
let valoresPorCargo = {};

function carregarLimitesHE() {
  fetch("/json/limite_he.json")
    .then((r) => r.json())
    .then((data) => {
      limitesPorGerente = {};
      data.forEach((item) => {
        const valor = parseFloat(
          item.Valores.replace(/\./g, "").replace(",", ".")
        );
        limitesPorGerente[item.Responsavel] = valor;
      });
    });
}

function carregarValoresHE() {
  fetch("/json/valores_he.json")
    .then((r) => r.json())
    .then((data) => {
      valoresPorCargo = data;
    });
}

function mostrarResumoHE(gerente, mes) {
  const resumoDiv = document.getElementById("resumoHE");
  const limite = limitesPorGerente[gerente] || 0;

  if (!gerente || !mes || limite === 0) {
    resumoDiv.innerHTML =
      limite === 0
        ? '<div class="alert alert-warning">Esta gerência não tem limite definido para HE.</div>'
        : "";
    return;
  }

  fetch(
    `/planejamento-he/api/resumo-he?gerente=${encodeURIComponent(
      gerente
    )}&mes=${encodeURIComponent(mes)}`
  )
    .then((r) => r.json())
    .then((data) => {
      const aprovado = data.aprovado || 0;
      const pendente = data.pendente || 0;
      const utilizado = aprovado + pendente;
      const saldo = Math.max(0, limite - utilizado);

      resumoDiv.innerHTML = `
            <div class="card">
              <div class="card-header bg-primary text-white">
                <h6 class="mb-0">Resumo de HE - ${gerente} (${mes})</h6>
              </div>
              <div class="card-body p-2">
                <div class="row text-center small">
                  <div class="col">
                    <div class="text-muted">Limite</div>
                    <div class="font-weight-bold text-success">${limite.toLocaleString(
                      "pt-BR",
                      { style: "currency", currency: "BRL" }
                    )}</div>
                  </div>
                  <div class="col">
                    <div class="text-muted">Aprovado</div>
                    <div class="font-weight-bold text-info">${aprovado.toLocaleString(
                      "pt-BR",
                      { style: "currency", currency: "BRL" }
                    )}</div>
                  </div>
                  <div class="col">
                    <div class="text-muted">Pendente</div>
                    <div class="font-weight-bold text-warning">${pendente.toLocaleString(
                      "pt-BR",
                      { style: "currency", currency: "BRL" }
                    )}</div>
                  </div>
                  <div class="col">
                    <div class="text-muted">Saldo</div>
                    <div class="font-weight-bold ${
                      saldo > 0 ? "text-success" : "text-danger"
                    }">
                      ${saldo.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          `;
    })
    .catch(() => {
      resumoDiv.innerHTML =
        '<div class="alert alert-danger">Erro ao carregar resumo.</div>';
    });
}

// ========== FORMULÁRIO DINÂMICO (seu enviar.js integrado) ==========
function calcularCustoTotal() {
  let custoTotal = 0;
  document.querySelectorAll("#linhasColaboradores .form-row").forEach((row) => {
    const cargo = row.querySelector(".cargo").value;
    const tipoHE = row.querySelector(".tipoHE").value;
    const horas = parseFloat(row.querySelector(".horas").value) || 0;
    if (valoresPorCargo[cargo] && valoresPorCargo[cargo][tipoHE] && horas > 0) {
      custoTotal += valoresPorCargo[cargo][tipoHE] * horas;
    }
  });
  document.getElementById("valorTotalHoras").textContent =
    custoTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function addLinhaBootstrap() {
  const container = document.getElementById("linhasColaboradores");
  const row = document.createElement("div");
  row.className = "form-row align-items-end mb-3 p-2 border rounded bg-white";
  row.innerHTML = `
        <div class="col-md-3">
          <label>Colaborador</label>
          <select class="form-control colaborador"><option value="">Selecione</option></select>
        </div>
        <div class="col-md-2">
          <label>Matrícula</label>
          <input type="text" class="form-control matricula" readonly>
        </div>
        <div class="col-md-2">
          <label>Cargo</label>
          <input type="text" class="form-control cargo" readonly>
        </div>
        <div class="col-md-2">
          <label>Tipo HE</label>
          <select class="form-control tipoHE">
            <option value="">Selecione</option>
            <option value="50%">50%</option>
            <option value="100%">100%</option>
          </select>
        </div>
        <div class="col-md-1">
          <label>Horas</label>
          <input type="number" class="form-control horas" min="0.5" step="0.5">
        </div>
        <div class="col-md-2">
          <label>Justificativa</label>
          <select class="form-control justificativa">
            <option value="">Selecione</option>
            <option value="Atendimento fora do horário">Atendimento fora do horário</option>
            <option value="Demanda emergencial">Demanda emergencial</option>
            <option value="Cobertura de ausência">Cobertura de ausência</option>
          </select>
        </div>
        <div class="col-md-12 mt-2 text-right">
          <button type="button" class="btn btn-danger btn-sm remover">Remover</button>
        </div>
      `;
  container.appendChild(row);

  // Carregar colaboradores
  const gerente = document.getElementById("gerente").value;
  if (gerente) {
    fetch(
      `/planejamento-he/api/colaboradores?gerente=${encodeURIComponent(
        gerente
      )}`
    )
      .then((res) => res.json())
      .then((data) => {
        const select = row.querySelector(".colaborador");
        select.innerHTML = '<option value="">Selecione</option>';
        data.colaboradores.forEach((c) => {
          const opt = document.createElement("option");
          opt.value = c;
          opt.textContent = c;
          select.appendChild(opt);
        });
        $(select).select2({ width: "100%", placeholder: "Buscar colaborador" });
        $(select).on("select2:select", function (e) {
          fetch(
            `/planejamento-he/api/cargo?nome=${encodeURIComponent(
              e.params.data.id
            )}`
          )
            .then((r) => r.json())
            .then((info) => {
              row.querySelector(".cargo").value = info.cargo || "";
              row.querySelector(".matricula").value = info.matricula || "";
            });
        });
      });
  }

  row.querySelector(".remover").addEventListener("click", () => {
    row.remove();
    calcularCustoTotal();
  });
  calcularCustoTotal();
}

// ========== EVENTOS ==========
document.addEventListener("DOMContentLoaded", () => {
  carregarDadosUsuario();
  carregarLimitesHE();
  carregarValoresHE();

  // Preencher mês atual
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
  document.getElementById("mes").value = meses[new Date().getMonth()];

  // Carregar gerentes
  fetch("/planejamento-he/api/gerentes")
    .then((r) => r.json())
    .then((data) => {
      const select = document.getElementById("gerente");
      data.gerentes.forEach((g) => {
        const opt = document.createElement("option");
        opt.value = g;
        opt.textContent = g;
        select.appendChild(opt);
      });
    });

  // Eventos
  document.getElementById("gerente").addEventListener("change", () => {
    const g = document.getElementById("gerente").value;
    const m = document.getElementById("mes").value;
    if (g && m) mostrarResumoHE(g, m);
    else document.getElementById("resumoHE").innerHTML = "";
  });

  document.getElementById("mes").addEventListener("change", () => {
    const g = document.getElementById("gerente").value;
    const m = document.getElementById("mes").value;
    if (g && m) mostrarResumoHE(g, m);
    else document.getElementById("resumoHE").innerHTML = "";
  });

  document
    .getElementById("addLinha")
    .addEventListener("click", addLinhaBootstrap);
  document
    .getElementById("linhasColaboradores")
    .addEventListener("change", (e) => {
      if (
        e.target.classList.contains("horas") ||
        e.target.classList.contains("tipoHE")
      ) {
        calcularCustoTotal();
      }
    });

  document.getElementById("btnEnviar").addEventListener("click", () => {
    const gerente = document.getElementById("gerente").value;
    const mes = document.getElementById("mes").value;
    let valido = true;
    const dados = [];

    document
      .querySelectorAll("#linhasColaboradores .form-row")
      .forEach((row) => {
        const els = [
          "colaborador",
          "matricula",
          "cargo",
          "tipoHE",
          "horas",
          "justificativa",
        ];
        els.forEach((name) => {
          const el = row.querySelector(`.${name}`);
          el.classList.remove("is-invalid");
          const msg = el.parentNode.querySelector(".erro-msg");
          if (msg) msg.remove();
        });

        const addErro = (el, msg) => {
          el.classList.add("is-invalid");
          const div = document.createElement("div");
          div.className = "erro-msg";
          div.textContent = msg;
          el.parentNode.appendChild(div);
          valido = false;
        };

        const colaborador = row.querySelector(".colaborador");
        const matricula = row.querySelector(".matricula");
        const cargo = row.querySelector(".cargo");
        const tipoHE = row.querySelector(".tipoHE");
        const horas = row.querySelector(".horas");
        const justificativa = row.querySelector(".justificativa");

        if (!colaborador.value)
          addErro(colaborador, "Selecione um colaborador");
        if (!matricula.value) addErro(matricula, "Matrícula obrigatória");
        if (!cargo.value) addErro(cargo, "Cargo obrigatório");
        if (!tipoHE.value) addErro(tipoHE, "Tipo de HE obrigatório");
        if (!horas.value || parseFloat(horas.value) <= 0)
          addErro(horas, "Horas > 0");
        if (!justificativa.value)
          addErro(justificativa, "Justificativa obrigatória");

        dados.push({
          gerente,
          mes,
          colaborador: colaborador.value,
          matricula: matricula.value,
          cargo: cargo.value,
          tipoHE: tipoHE.value,
          horas: horas.value,
          justificativa: justificativa.value,
        });
      });

    if (!gerente || !mes) {
      alert("Selecione Gerente e Mês.");
      return;
    }
    if (!valido) {
      alert("Corrija os erros antes de enviar.");
      return;
    }

    fetch("/planejamento-he/enviar-multiplo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    })
      .then((r) => r.json())
      .then((resp) => {
        alert(resp.mensagem);
        if (resp.sucesso) window.location.href = "/planejamento-he/envios";
      });
  });

  // Navegação
  function showPage(id) {
    document
      .querySelectorAll(".card")
      .forEach((c) => (c.style.display = "none"));
    document.getElementById(id).style.display = "block";
    document
      .querySelectorAll(".menu-item")
      .forEach((i) => i.classList.remove("active"));
    document.querySelector(`[data-page="${id}"]`).classList.add("active");
  }
  document.querySelectorAll(".menu-item").forEach((i) => {
    i.addEventListener("click", (e) => {
      e.preventDefault();
      showPage(i.getAttribute("data-page"));
    });
  });
  showPage("novaSolicitacao");

  // ================= NOVA LÓGICA PARA DROPDOWN E POPOVER =================

  // Elementos
  const userMenu = document.querySelector('.user-menu');
  const dropdown = userMenu.querySelector('.dropdown-menu');
  const perfilPopover = document.getElementById('perfilPopover');
  const perfilLink = document.getElementById('perfilLink');
  const fecharPopoverBtn = document.getElementById('fecharPopover');

  // Abrir/Fechar Dropdown
  userMenu.addEventListener('click', (e) => {
    if (e.target.closest('#perfilLink')) return; // Se clicar no link do perfil, não faz nada aqui
    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
  });

  // Abrir Popover de Perfil
  perfilLink.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation(); // Impede que o clique se propague para outros elementos

    dropdown.style.display = 'none'; // Garante que o dropdown feche

    const userMenuRect = userMenu.getBoundingClientRect();
    perfilPopover.style.top = `${userMenuRect.bottom + 5}px`;
    perfilPopover.style.left = 'auto';
    perfilPopover.style.right = '1.5rem';

    if (perfilPopover.style.display === 'block') {
        perfilPopover.style.display = 'none';
    } else {
        fetch('/home/usuario')
            .then(r => r.json())
            .then(data => {
                document.getElementById('popoverNome').textContent = data.nome || '';
                document.getElementById('popoverEmail').textContent = data.email || '';
                document.getElementById('popoverCargo').textContent = data.cargo || '';
                perfilPopover.style.display = 'block';
            });
    }
  });

  // Fechar Popover
  fecharPopoverBtn.addEventListener('click', () => {
    perfilPopover.style.display = 'none';
  });

  // Fechar menus ao clicar fora
  document.addEventListener('click', (e) => {
    // Fecha dropdown se clicar fora
    if (!userMenu.contains(e.target)) {
      dropdown.style.display = 'none';
    }
    // Fecha popover se clicar fora
    if (perfilPopover.style.display === 'block' && !perfilPopover.contains(e.target) && e.target !== perfilLink) {
      perfilPopover.style.display = 'none';
    }
  });

  // Logout
  document.getElementById("logoutLink").addEventListener("click", (e) => {
    e.preventDefault();
    if (confirm("Tem certeza que deseja sair?")) {
      window.location.href = "/auth/logout"; // Corrigido para a rota de logout geral
    }
  });
});