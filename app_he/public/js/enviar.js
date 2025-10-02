let valoresPorCargo = {};

// Função para calcular e exibir o custo total estimado
function calcularCustoTotal() {
    let custoTotal = 0;
    const linhas = document.querySelectorAll("#linhasColaboradores .form-row");

    linhas.forEach(row => {
        const cargo = row.querySelector(".cargo").value;
        const tipoHE = row.querySelector(".tipoHE").value;
        const horas = parseFloat(row.querySelector(".horas").value) || 0;

        if (valoresPorCargo[cargo] && valoresPorCargo[cargo][tipoHE] && horas > 0) {
            const valorHora = valoresPorCargo[cargo][tipoHE];
            custoTotal += valorHora * horas;
        }
    });

    const spanValorTotal = document.getElementById("valorTotalHoras");
    spanValorTotal.textContent = custoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// --- Código executado ao carregar a página ---
document.addEventListener('DOMContentLoaded', function () {
    // Carrega os valores dos cargos do arquivo JSON assim que a página estiver pronta
    fetch('/json/valores_he.json')
        .then(response => response.json())
        .then(data => {
            valoresPorCargo = data;
            console.log("Valores de HE por cargo carregados!", valoresPorCargo);
        })
        .catch(error => console.error('Erro ao carregar o arquivo de valores de HE:', error));

    // Preencher mês atual
    const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    document.getElementById('mes').value = meses[new Date().getMonth()];

    // Buscar gerentes
    fetch('/planejamento-he/api/gerentes')
        .then(res => res.json())
        .then(data => {
            const select = document.getElementById('gerente');
            data.gerentes.forEach(g => {
                const opt = document.createElement('option');
                opt.value = g;
                opt.textContent = g;
                select.appendChild(opt);
            });
        });
});

// Adicionar linha (Bootstrap grid)
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
        <input type="number" class="form-control horas" min="1" step="0.5">
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

    // Buscar colaboradores do gerente
    const gerente = document.getElementById("gerente").value;
    if (gerente) {
        fetch(`/planejamento-he/api/colaboradores?gerente=${encodeURIComponent(gerente)}`)
            .then(res => res.json())
            .then(data => {
                const selectColab = row.querySelector(".colaborador");
                selectColab.innerHTML = '<option value="">Selecione</option>';
                data.colaboradores.forEach(c => {
                    const opt = document.createElement("option");
                    opt.value = c;
                    opt.textContent = c;
                    opt.title = c;
                    selectColab.appendChild(opt);
                });
                $(selectColab).select2({ width: '100%', placeholder: "Buscar colaborador" });
                $(selectColab).on("select2:select", function (e) {
                    fetch(`/planejamento-he/api/cargo?nome=${encodeURIComponent(e.params.data.id)}`)
                        .then(res => res.json())
                        .then(info => {
                            row.querySelector(".cargo").value = info.cargo || "";
                            row.querySelector(".matricula").value = info.matricula || "";
                        });
                });
            });
    }

    // Botão remover
    row.querySelector(".remover").addEventListener("click", () => {
        row.remove();
        calcularCustoTotal(); // Recalcula ao remover
    });

    calcularCustoTotal();
}

// Eventos
document.getElementById("addLinha").addEventListener("click", addLinhaBootstrap);

// Recalcular ao mudar horas ou tipo de HE
document.getElementById("linhasColaboradores").addEventListener('change', function (event) {
    if (event.target.classList.contains('horas') || event.target.classList.contains('tipoHE')) {
        calcularCustoTotal();
    }
});

// Enviar dados com validação
document.getElementById("btnEnviar").addEventListener("click", () => {
    const gerente = document.getElementById("gerente").value;
    const mes = document.getElementById("mes").value;
    let valido = true;
    const dados = [];

    document.querySelectorAll("#linhasColaboradores .form-row").forEach(row => {
        const colaborador = row.querySelector(".colaborador");
        const matricula = row.querySelector(".matricula");
        const cargo = row.querySelector(".cargo");
        const tipoHE = row.querySelector(".tipoHE");
        const horas = row.querySelector(".horas");
        const justificativa = row.querySelector(".justificativa");

        [colaborador, matricula, cargo, tipoHE, horas, justificativa].forEach(el => {
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

        if (!colaborador.value) addErro(colaborador, "Selecione um colaborador");
        if (!matricula.value) addErro(matricula, "Matrícula obrigatória");
        if (!cargo.value) addErro(cargo, "Cargo obrigatório");
        if (!tipoHE.value) addErro(tipoHE, "Informe o tipo de HE");
        if (!horas.value || horas.value <= 0) addErro(horas, "Informe horas (>0)");
        if (!justificativa.value) addErro(justificativa, "Selecione uma justificativa");

        dados.push({
            gerente, mes,
            colaborador: colaborador.value,
            matricula: matricula.value,
            cargo: cargo.value,
            tipoHE: tipoHE.value,
            horas: horas.value,
            justificativa: justificativa.value
        });
    });

    if (!gerente || !mes) {
        alert("Selecione Gerente e Mês antes de enviar.");
        return;
    }

    if (!valido) {
        alert("Corrija os erros destacados antes de enviar.");
        return;
    }

    fetch("/planejamento-he/enviar-multiplo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados)
    })
        .then(res => res.json())
        .then(resp => {
            alert(resp.mensagem);
            if (resp.sucesso) window.location.href = "/planejamento-he/envios";
        });
});

