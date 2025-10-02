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
  <div class="alert alert-info py-2 px-3" style="font-size:0.85rem;">
    <strong>Resumo de HE - ${gerente} (${mes}):</strong><br>
    <span class="text-muted">Limite:</span> <span class="text-success">${limite.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span> | 
    <span class="text-muted">Aprovado:</span> <span class="text-info">${aprovado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span> | 
    <span class="text-muted">Pendente:</span> <span class="text-warning">${pendente.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span> | 
    <span class="text-muted">Saldo:</span> <span class="${saldo > 0 ? "text-success" : "text-danger"}">
      ${saldo.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
    </span> | 
    <span class="text-muted">Estimativa Atual de Custos:</span> <span id="valorTotalHorasResumo" class="font-weight-bold">R$ 0,00</span>
  </div>
`;
        })
        .catch(() => {
            resumoDiv.innerHTML =
                '<div class="alert alert-danger">Erro ao carregar resumo.</div>';
        });
}

function calcularCustoTotal() {
    let custoTotal = 0;

    document.querySelectorAll("#linhasColaboradores tr").forEach((row) => {
        const cargo = row.querySelector(".cargo")?.value || "";
        const tipoHE = row.querySelector(".tipoHE")?.value || "";
        const horas = parseFloat(row.querySelector(".horas")?.value) || 0;

        if (valoresPorCargo[cargo] && valoresPorCargo[cargo][tipoHE] && horas > 0) {
            custoTotal += valoresPorCargo[cargo][tipoHE] * horas;
        }
    });

    // Atualiza os dois locais (resumo e rodapé, se ainda existir)
    const valorTotal = custoTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

    const totalRodape = document.getElementById("valorTotalHoras");
    if (totalRodape) totalRodape.textContent = valorTotal;

    const totalResumo = document.getElementById("valorTotalHorasResumo");
    if (totalResumo) totalResumo.textContent = valorTotal;
}


function addLinhaTabela() {
    const tbody = document.getElementById("linhasColaboradores");
    const row = document.createElement("tr");

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
        <option value="Atendimento fora do horário">Atendimento fora do horário</option>
        <option value="Demanda emergencial">Demanda emergencial</option>
        <option value="Cobertura de ausência">Cobertura de ausência</option>
      </select>
    </td>
    <td class="text-center">
      <button type="button" class="btn btn-danger btn-sm remover">X</button>
    </td>
  `;

    tbody.appendChild(row);

    // Carregar colaboradores via API
    const gerente = document.getElementById("gerente").value;
    if (gerente) {
        fetch(`/planejamento-he/api/colaboradores?gerente=${encodeURIComponent(gerente)}`)
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
                    fetch(`/planejamento-he/api/cargo?nome=${encodeURIComponent(e.params.data.id)}`)
                        .then((r) => r.json())
                        .then((info) => {
                            row.querySelector(".cargo").value = info.cargo || "";
                            row.querySelector(".matricula").value = info.matricula || "";
                        });
                });
            });
    }

    // Evento remover
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

    document.getElementById("addLinha").addEventListener("click", addLinhaTabela);

    document.getElementById("linhasColaboradores").addEventListener("change", (e) => {
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

        document.querySelectorAll("#linhasColaboradores tr").forEach((row) => {
            let linhaValida = true;

            const colaborador = row.querySelector(".colaborador");
            const matricula = row.querySelector(".matricula");
            const cargo = row.querySelector(".cargo");
            const tipoHE = row.querySelector(".tipoHE");
            const horas = row.querySelector(".horas");
            const justificativa = row.querySelector(".justificativa");

            // reset classes
            [colaborador, matricula, cargo, tipoHE, horas, justificativa].forEach((el) => {
                el.classList.remove("is-invalid");
            });

            if (!colaborador.value) { colaborador.classList.add("is-invalid"); linhaValida = false; }
            if (!matricula.value) { matricula.classList.add("is-invalid"); linhaValida = false; }
            if (!cargo.value) { cargo.classList.add("is-invalid"); linhaValida = false; }
            if (!tipoHE.value) { tipoHE.classList.add("is-invalid"); linhaValida = false; }
            if (!horas.value || parseFloat(horas.value) <= 0) { horas.classList.add("is-invalid"); linhaValida = false; }
            if (!justificativa.value) { justificativa.classList.add("is-invalid"); linhaValida = false; }

            if (!linhaValida) {
                valido = false;
                row.classList.add("shake");
                setTimeout(() => row.classList.remove("shake"), 500); // remove a classe pra poder animar de novo depois
            }

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
            //alert("Corrija os erros antes de enviar.");
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

    // Dropdown usuário
    const userMenu = document.querySelector(".user-menu");
    const dropdown = userMenu.querySelector(".dropdown-menu");
    userMenu.addEventListener("click", (e) => {
        if (e.target.id === "perfilLink") return;
        dropdown.style.display =
            dropdown.style.display === "block" ? "none" : "block";
    });

    // Perfil (agora abre um modal)
    document.getElementById("perfilLink").addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        dropdown.style.display = "none";

        fetch("/home/usuario")
            .then((r) => r.json())
            .then((data) => {
                document.getElementById("perfilNome").value = data.nome || "";
                document.getElementById("perfilEmail").value = data.email || "";
                document.getElementById("perfilCargo").value = data.cargo || "";

                $("#perfilModal").modal("show");
            });
    });

    // Fechar menus ao clicar fora
    document.addEventListener("click", (e) => {
        if (!userMenu.contains(e.target)) {
            dropdown.style.display = "none";
        }
    });

    // Logout
    document.getElementById("logoutLink").addEventListener("click", (e) => {
        e.preventDefault();
        window.location.href = "/auth/logout-he";
    });
});
