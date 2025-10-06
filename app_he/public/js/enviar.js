// ========== DADOS DO USUÁRIO ==========
// Função responsável por carregar os dados do usuário logado (nome, cargo, etc.)
// e atualizar elementos da interface com essas informações.
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
// Variáveis globais para armazenar dados carregados de arquivos JSON:
// - limitesPorGerente: mapeia gerentes aos seus limites financeiros de HE (Horas Extras)
// - valoresPorCargo: mapeia cargos aos valores/hora por tipo de HE (50%, 100%)
let limitesPorGerente = {};
let valoresPorCargo = {};

// Carrega os limites de HE por gerente a partir de um arquivo JSON estático
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

// Carrega os valores por cargo e tipo de HE (50% ou 100%) a partir de um arquivo JSON estático
function carregarValoresHE() {
  fetch("/json/valores_he.json")
    .then((r) => r.json())
    .then((data) => {
      valoresPorCargo = data;
    });
}

// Exibe um resumo financeiro de HE para um gerente e mês específicos
// Mostra limite, valor aprovado, pendente, saldo e estimativa de custo
function mostrarResumoHE(gerente, mes) {
  const resumoDiv = document.getElementById("resumoHE");
  const limite = limitesPorGerente[gerente] || 0;

  // Se não houver gerente, mês ou limite definido, exibe mensagem apropriada ou limpa o resumo
  if (!gerente || !mes || limite === 0) {
    resumoDiv.innerHTML =
      limite === 0
        ? '<div class="alert alert-warning">Esta gerência não tem limite definido para HE.</div>'
        : "";
    return;
  }

  // Busca dados de HE aprovadas e pendentes via API
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

      // Renderiza o resumo com formatação em BRL (Real brasileiro)
      resumoDiv.innerHTML = `
  <div class="mb-2">
    <strong style="font-size:1rem; color:#000;">Resumo de HE - ${gerente} (${mes})</strong>
  </div>
  <div class="row">
    <div class="col-md-2 col-6 mb-2">
      <div class="alert alert-primary p-2 mb-0 text-center">
        <div class="font-weight-bold">Limite</div>
        <div>${limite.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        })}</div>
      </div>
    </div>
    <div class="col-md-2 col-6 mb-2">
      <div class="alert alert-info p-2 mb-0 text-center">
        <div class="font-weight-bold">Aprovado</div>
        <div>${aprovado.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        })}</div>
      </div>
    </div>
    <div class="col-md-2 col-6 mb-2">
      <div class="alert alert-warning p-2 mb-0 text-center">
        <div class="font-weight-bold">Pendente</div>
        <div>${pendente.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        })}</div>
      </div>
    </div>
    <div class="col-md-2 col-6 mb-2">
      <div class="alert ${
        saldo > 0 ? "alert-success" : "alert-danger"
      } p-2 mb-0 text-center">
        <div class="font-weight-bold">Saldo</div>
        <div>${saldo.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        })}</div>
      </div>
    </div>
    <div class="col-md-4 col-12 mb-2">
      <div class="alert alert-dark p-2 mb-0 text-center">
        <div class="font-weight-bold">Estimativa Atual de Custos</div>
        <div id="valorTotalHorasResumo">R$ 0,00</div>
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

// Calcula o custo total das horas extras com base nas linhas preenchidas na tabela
// e atualiza os elementos que exibem esse valor (no rodapé e no resumo)
function calcularCustoTotal() {
  let custoTotal = 0;

  // Itera sobre todas as linhas da tabela de colaboradores
  document.querySelectorAll("#linhasColaboradores tr").forEach((row) => {
    const cargo = row.querySelector(".cargo")?.value || "";
    const tipoHE = row.querySelector(".tipoHE")?.value || "";
    const horas = parseFloat(row.querySelector(".horas")?.value) || 0;

    // Se houver valor definido para o cargo e tipo de HE, calcula o custo
    if (valoresPorCargo[cargo] && valoresPorCargo[cargo][tipoHE] && horas > 0) {
      custoTotal += valoresPorCargo[cargo][tipoHE] * horas;
    }
  });

  // Formata o valor total em BRL
  const valorTotal = custoTotal.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  // Atualiza os elementos na página que mostram o valor total
  const totalRodape = document.getElementById("valorTotalHoras");
  if (totalRodape) totalRodape.textContent = valorTotal;

  const totalResumo = document.getElementById("valorTotalHorasResumo");
  if (totalResumo) totalResumo.textContent = valorTotal;
}

// Adiciona uma nova linha à tabela de planejamento de HE
// com campos para colaborador, matrícula, cargo, tipo de HE, horas e justificativa
function addLinhaTabela() {
  const tbody = document.getElementById("linhasColaboradores");
  const row = document.createElement("tr");

  // Cria o HTML da nova linha com campos de formulário
  row.innerHTML = `
    <td>
      <select class="form-control form-control-sm colaborador">
        <option value="">Selecione</option>
      </select>
    </td>
    <td><input type="text" class="form-control form-control-sm matricula" readonly></td>
    <td><input type="text" class="form-control form-control-sm cargo" readonly></td>
    <td>
      <select class="form-control form-control-sm tipoHE">
        <option value="">Selecione</option>
        <option value="50%">50%</option>
        <option value="100%">100%</option>
      </select>
    </td>
    <td><input type="number" class="form-control form-control-sm horas" min="0.5" step="0.5"></td>
    <td>
      <select class="form-control form-control-sm justificativa">
        <option value="">Selecione</option>
        <option value="B2B Avançado">B2B Avançado</option>
        <option value="BackOffice">BackOffice</option>
        <option value="Célula Agendamento Regional">Célula Agendamento Regional</option>
        <option value="Implantação">Implantação</option>
        <option value="Manutenção de Redes">Manutenção de Redes</option>
        <option value="Móvel">Móvel</option>
        <option value="O&M">O&M</option>
        <option value="Produção">Produção</option>
        <option value="Projetos Especiais">Projetos Especiais</option>
        <option value="Reparo">Reparo</option>
      </select>
    </td>
    <td class="text-center">
      <button type="button" class="btn btn-danger btn-sm remover">X</button>
    </td>
  `;

  tbody.appendChild(row);

  // Carrega a lista de colaboradores do gerente selecionado via API
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
        // Inicializa o Select2 para busca amigável
        $(select).select2({ width: "100%", placeholder: "Buscar colaborador" });
        // Ao selecionar um colaborador, busca seu cargo e matrícula
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

  // Configura o botão de remover linha
  row.querySelector(".remover").addEventListener("click", () => {
    row.remove();
    calcularCustoTotal(); // Atualiza o custo após remoção
  });

  calcularCustoTotal(); // Atualiza o custo mesmo que a linha esteja vazia (por segurança)
}

// ========== EVENTOS ==========
// Executado quando o DOM está totalmente carregado
document.addEventListener("DOMContentLoaded", () => {
  // Carrega dados iniciais
  carregarDadosUsuario();
  carregarLimitesHE();
  carregarValoresHE();

  // Define o mês atual como valor padrão no seletor de mês
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

  // Carrega a lista de gerentes via API e popula o seletor
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

  // Eventos de mudança no seletor de gerente e mês: atualizam o resumo de HE
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

  // Adiciona uma nova linha à tabela ao clicar no botão "+"
  document.getElementById("addLinha").addEventListener("click", () => {
    const gerente = document.getElementById("gerente").value;
    if (!gerente) {
      // Mostra alerta se não tiver gerente selecionado
      const resumoDiv = document.getElementById("resumoHE");
      resumoDiv.innerHTML = `
      <div class="alert alert-danger py-2 px-3">
        <i class="fas fa-exclamation-triangle"></i> 
        Selecione um <strong>Gerente</strong> antes de adicionar colaboradores.
      </div>
    `;
      return;
    }
    addLinhaTabela(); // só adiciona se gerente estiver escolhido
  });

  // Recalcula o custo total sempre que o valor de horas ou tipo de HE for alterado
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

  // Lógica de envio do formulário de planejamento de HE
  document.getElementById("btnEnviar").addEventListener("click", () => {
    const gerente = document.getElementById("gerente").value;
    const mes = document.getElementById("mes").value;
    let valido = true;
    const dados = [];

    // Valida cada linha da tabela
    document.querySelectorAll("#linhasColaboradores tr").forEach((row) => {
      let linhaValida = true;

      const colaborador = row.querySelector(".colaborador");
      const matricula = row.querySelector(".matricula");
      const cargo = row.querySelector(".cargo");
      const tipoHE = row.querySelector(".tipoHE");
      const horas = row.querySelector(".horas");
      const justificativa = row.querySelector(".justificativa");

      // Remove classes de erro antes da validação
      [colaborador, matricula, cargo, tipoHE, horas, justificativa].forEach(
        (el) => {
          el.classList.remove("is-invalid");
        }
      );

      // Valida campos obrigatórios
      if (!colaborador.value) {
        colaborador.classList.add("is-invalid");
        linhaValida = false;
      }
      if (!matricula.value) {
        matricula.classList.add("is-invalid");
        linhaValida = false;
      }
      if (!cargo.value) {
        cargo.classList.add("is-invalid");
        linhaValida = false;
      }
      if (!tipoHE.value) {
        tipoHE.classList.add("is-invalid");
        linhaValida = false;
      }
      if (!horas.value || parseFloat(horas.value) <= 0) {
        horas.classList.add("is-invalid");
        linhaValida = false;
      }
      if (!justificativa.value) {
        justificativa.classList.add("is-invalid");
        linhaValida = false;
      }

      // Se a linha for inválida, aplica animação de erro
      if (!linhaValida) {
        valido = false;
        row.classList.add("shake");
        setTimeout(() => row.classList.remove("shake"), 500); // remove animação após 500ms
      }

      // Coleta os dados da linha para envio
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

    // Verifica se gerente e mês foram selecionados
    if (!gerente || !mes) {
      alert("Selecione Gerente e Mês.");
      return;
    }
    // Se houver erros de validação, não envia
    if (!valido) {
      // alert("Corrija os erros antes de enviar."); // Alert comentado propositalmente
      return;
    }

    // Envia os dados para o backend
    fetch("/planejamento-he/enviar-multiplo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    })
      .then((r) => r.json())
      .then((resp) => {
        alert(resp.mensagem);
        if (resp.sucesso) {
          // Limpa a tabela de novas solicitações
          document.getElementById("linhasColaboradores").innerHTML = "";
          calcularCustoTotal(); // Recalcula o custo para zerar a estimativa

          // Navega para a aba de "Minhas Solicitações" e a atualiza
          showPage("minhasSolicitacoes");
          if (typeof carregarMinhasSolicitacoes === "function") {
            carregarMinhasSolicitacoes(); // Atualiza a lista
          }
        }
      });
  });

  // ========== NAVEGAÇÃO ENTRE PÁGINAS (abas) ==========
  // Função para exibir uma aba específica e esconder as demais
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

  // Configura os cliques nos itens do menu para alternar abas
  document.querySelectorAll(".menu-item").forEach((i) => {
    i.addEventListener("click", (e) => {
      e.preventDefault();
      showPage(i.getAttribute("data-page"));
    });
  });

  // Exibe a aba inicial por padrão
  showPage("novaSolicitacao");

  // ========== MENU DO USUÁRIO (dropdown) ==========
  const userMenu = document.querySelector(".user-menu");
  const dropdown = userMenu.querySelector(".dropdown-menu");

  // Alterna a visibilidade do dropdown ao clicar no ícone do usuário
  userMenu.addEventListener("click", (e) => {
    if (e.target.id === "perfilLink") return; // Evita fechar ao clicar no link de perfil
    dropdown.style.display =
      dropdown.style.display === "block" ? "none" : "block";
  });

  // Ao clicar em "Perfil", abre um modal com os dados do usuário
  document.getElementById("perfilLink").addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    dropdown.style.display = "none"; // Fecha o dropdown

    fetch("/home/usuario")
      .then((r) => r.json())
      .then((data) => {
        document.getElementById("perfilNome").value = data.nome || "";
        document.getElementById("perfilEmail").value = data.email || "";
        document.getElementById("perfilCargo").value = data.cargo || "";

        $("#perfilModal").modal("show"); // Usa Bootstrap Modal via jQuery
      });
  });

  // Fecha o dropdown se o clique for fora dele
  document.addEventListener("click", (e) => {
    if (!userMenu.contains(e.target)) {
      dropdown.style.display = "none";
    }
  });

  // Lógica de logout
  document.getElementById("logoutLink").addEventListener("click", (e) => {
    e.preventDefault();
    window.location.href = "/auth/logout-he";
  });
});
