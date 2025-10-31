document.addEventListener('DOMContentLoaded', () => {
    // Carrega quando a página de colaboradores é mostrada
    document.addEventListener('page-load:gerenciarColaboradores', setupColaboradoresPage);
});

function setupColaboradoresPage() {
    carregarColaboradores();
    carregarGerentesParaFiltro();

    // Event listeners
    document.getElementById('btnNovoColaborador').addEventListener('click', abrirModalNovoColaborador);
    document.getElementById('btnSalvarColaborador').addEventListener('click', salvarColaborador);
    document.getElementById('btnExportarColaboradores').addEventListener('click', exportarColaboradores);

    // Filtros
    document.getElementById('filtroNomeColaborador').addEventListener('input', filtrarColaboradores);
    document.getElementById('filtroMatriculaColaborador').addEventListener('input', filtrarColaboradores);
    document.getElementById('filtroCargoColaborador').addEventListener('input', filtrarColaboradores);
    document.getElementById('filtroRegionalColaborador').addEventListener('input', filtrarColaboradores);
    document.getElementById('filtroCidadeColaborador').addEventListener('input', filtrarColaboradores);
    document.getElementById('filtroGerenteColaborador').addEventListener('change', filtrarColaboradores);
    document.getElementById('btnLimparFiltrosColaboradores').addEventListener('click', limparFiltrosColaboradores);
}

function carregarColaboradores() {
    const tbody = document.getElementById('tabelaColaboradoresBody');
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Carregando...</td></tr>';

    fetch('/planejamento-he/api/colaboradores/listar')
        .then(res => res.json())
        .then(data => {
            if (!Array.isArray(data) || data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Nenhum colaborador encontrado.</td></tr>';
                return;
            }

            // Armazena dados globalmente para filtrar
            window.colaboradoresData = data;
            renderizarTabelaColaboradores(data);
        })
        .catch(err => {
            console.error('Erro ao carregar colaboradores:', err);
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Erro ao carregar colaboradores.</td></tr>';
        });
}

function renderizarTabelaColaboradores(colaboradores) {
    const tbody = document.getElementById('tabelaColaboradoresBody');

    if (colaboradores.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted">Nenhum colaborador encontrado com os filtros aplicados.</td></tr>';
        return;
    }

    let html = '';
    colaboradores.forEach(colab => {
        html += `
            <tr>
                <td>${colab.MATRICULA || '-'}</td>
                <td>${colab.NOME || '-'}</td>
                <td>${colab.CARGO || '-'}</td>
                <td>${colab.REGIONAL || '-'}</td>
                <td>${colab.ESTADO || '-'}</td>
                <td>${colab.CIDADE || '-'}</td>
                <td>${colab.GERENTE || '-'}</td>
                <td>${colab.GESTOR_DIRETO || '-'}</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-warning" onclick="editarColaborador(${colab.ID})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="excluirColaborador(${colab.ID}, '${colab.NOME}')" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

function carregarGerentesParaFiltro() {
    fetch('/planejamento-he/api/gerentes')
        .then(res => res.json())
        .then(data => {
            const select = document.getElementById('filtroGerenteColaborador');
            select.innerHTML = '<option value="">Todos os Gerentes</option>';

            if (data.gerentes && Array.isArray(data.gerentes)) {
                data.gerentes.forEach(gerente => {
                    const option = document.createElement('option');
                    option.value = gerente;
                    option.textContent = gerente;
                    select.appendChild(option);
                });
            }
        })
        .catch(err => console.error('Erro ao carregar gerentes:', err));
}

function filtrarColaboradores() {
    const filtroNome = document.getElementById('filtroNomeColaborador').value.toLowerCase().trim();
    const filtroMatricula = document.getElementById('filtroMatriculaColaborador').value.toLowerCase().trim();
    const filtroCargo = document.getElementById('filtroCargoColaborador').value.toLowerCase().trim();
    const filtroRegional = document.getElementById('filtroRegionalColaborador').value.toLowerCase().trim();
    const filtroCidade = document.getElementById('filtroCidadeColaborador').value.toLowerCase().trim();
    const filtroGerente = document.getElementById('filtroGerenteColaborador').value;

    if (!window.colaboradoresData) return;

    let colaboradoresFiltrados = window.colaboradoresData.filter(colab => {
        const matchNome = !filtroNome || (colab.NOME && colab.NOME.toLowerCase().includes(filtroNome));
        const matchMatricula = !filtroMatricula || (colab.MATRICULA && colab.MATRICULA.toLowerCase().includes(filtroMatricula));
        const matchCargo = !filtroCargo || (colab.CARGO && colab.CARGO.toLowerCase().includes(filtroCargo));
        const matchRegional = !filtroRegional || (colab.REGIONAL && colab.REGIONAL.toLowerCase().includes(filtroRegional));
        const matchCidade = !filtroCidade || (colab.CIDADE && colab.CIDADE.toLowerCase().includes(filtroCidade));
        const matchGerente = !filtroGerente || colab.GERENTE === filtroGerente;

        return matchNome && matchMatricula && matchCargo && matchRegional && matchCidade && matchGerente;
    });

    renderizarTabelaColaboradores(colaboradoresFiltrados);
}

function limparFiltrosColaboradores() {
    document.getElementById('filtroNomeColaborador').value = '';
    document.getElementById('filtroMatriculaColaborador').value = '';
    document.getElementById('filtroCargoColaborador').value = '';
    document.getElementById('filtroRegionalColaborador').value = '';
    document.getElementById('filtroCidadeColaborador').value = '';
    document.getElementById('filtroGerenteColaborador').value = '';
    renderizarTabelaColaboradores(window.colaboradoresData || []);
}

function abrirModalNovoColaborador() {
    document.getElementById('modalColaboradorTitle').textContent = 'Novo Colaborador';
    document.getElementById('formColaborador').reset();
    document.getElementById('colaboradorId').value = '';
    $('#modalColaborador').modal('show');
}

window.editarColaborador = function(id) {
    // Busca os dados do colaborador
    fetch(`/planejamento-he/api/colaboradores/${id}`)
        .then(res => res.json())
        .then(colab => {
            document.getElementById('modalColaboradorTitle').textContent = 'Editar Colaborador';
            document.getElementById('colaboradorId').value = colab.ID;
            document.getElementById('colaboradorMatricula').value = colab.MATRICULA || '';
            document.getElementById('colaboradorNome').value = colab.NOME || '';
            document.getElementById('colaboradorCargo').value = colab.CARGO || '';
            document.getElementById('colaboradorRegional').value = colab.REGIONAL || '';
            document.getElementById('colaboradorEstado').value = colab.ESTADO || '';
            document.getElementById('colaboradorCidade').value = colab.CIDADE || '';
            document.getElementById('colaboradorGerente').value = colab.GERENTE || '';
            document.getElementById('colaboradorGerenteDivisao').value = colab.GERENTE_DIVISAO || '';
            document.getElementById('colaboradorGestorDireto').value = colab.GESTOR_DIRETO || '';
            document.getElementById('colaboradorEmailGestor').value = colab.EMAIL_GESTOR || '';
            $('#modalColaborador').modal('show');
        })
        .catch(err => {
            console.error('Erro ao buscar colaborador:', err);
            Swal.fire('Erro!', 'Não foi possível carregar os dados do colaborador.', 'error');
        });
}

function salvarColaborador() {
    const id = document.getElementById('colaboradorId').value;

    // Coleta todos os campos e converte para MAIÚSCULO
    const matricula = document.getElementById('colaboradorMatricula').value.trim().toUpperCase();
    const nome = document.getElementById('colaboradorNome').value.trim().toUpperCase();
    const cargo = document.getElementById('colaboradorCargo').value.trim().toUpperCase();
    const regional = document.getElementById('colaboradorRegional').value.trim().toUpperCase();
    const estado = document.getElementById('colaboradorEstado').value.trim().toUpperCase();
    const cidade = document.getElementById('colaboradorCidade').value.trim().toUpperCase();
    const gerente = document.getElementById('colaboradorGerente').value.trim().toUpperCase();
    const gestorDireto = document.getElementById('colaboradorGestorDireto').value.trim().toUpperCase();
    const emailGestor = document.getElementById('colaboradorEmailGestor').value.trim().toUpperCase();
    const gerenteDivisao = document.getElementById('colaboradorGerenteDivisao').value.trim().toUpperCase();

    // Validação dos campos obrigatórios
    if (!matricula || !nome || !cargo || !regional || !estado || !cidade || !gerente || !gestorDireto || !emailGestor) {
        Swal.fire('Atenção!', 'Todos os campos são obrigatórios.', 'warning');
        return;
    }

    const url = id ? '/planejamento-he/api/colaboradores/editar' : '/planejamento-he/api/colaboradores/criar';
    const dados = {
        matricula,
        nome,
        cargo,
        regional,
        estado,
        cidade,
        gerente,
        gestorDireto,
        emailGestor,
        gerenteDivisao
    };
    if (id) dados.id = id;

    fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados)
    })
    .then(res => res.json())
    .then(data => {
        if (data.sucesso) {
            Swal.fire('Sucesso!', data.mensagem, 'success');
            $('#modalColaborador').modal('hide');
            carregarColaboradores();
        } else {
            Swal.fire('Erro!', data.mensagem || 'Não foi possível salvar o colaborador.', 'error');
        }
    })
    .catch(err => {
        console.error('Erro ao salvar colaborador:', err);
        Swal.fire('Erro!', 'Erro ao salvar colaborador.', 'error');
    });
}

window.excluirColaborador = function(id, nome) {
    Swal.fire({
        title: 'Confirmar Exclusão',
        text: `Tem certeza que deseja excluir o colaborador "${nome}"?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sim, excluir!',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            fetch('/planejamento-he/api/colaboradores/excluir', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            })
            .then(res => res.json())
            .then(data => {
                if (data.sucesso) {
                    Swal.fire('Excluído!', data.mensagem, 'success');
                    carregarColaboradores();
                } else {
                    Swal.fire('Erro!', data.mensagem || 'Não foi possível excluir o colaborador.', 'error');
                }
            })
            .catch(err => {
                console.error('Erro ao excluir colaborador:', err);
                Swal.fire('Erro!', 'Erro ao excluir colaborador.', 'error');
            });
        }
    });
}

async function exportarColaboradores() {
    try {
        const response = await fetch('/planejamento-he/api/colaboradores/exportar');

        if (!response.ok) {
            throw new Error(`Erro na requisição: ${response.statusText}`);
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `colaboradores_${new Date().toISOString().slice(0, 10)}.csv`;

        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

    } catch (error) {
        console.error('Erro ao exportar colaboradores:', error);
        Swal.fire('Erro!', 'Falha ao exportar os dados. Verifique o console para mais detalhes.', 'error');
    }
}
