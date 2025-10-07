
document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('page-load:aprovacoes', setupAprovacoesPage);
});

function setupAprovacoesPage() {
    initializeFilters();

    const gerenteFilter = document.getElementById('aprovacaoFiltroGerente');
    const statusFilter = document.getElementById('aprovacaoFiltroStatus');
    const mesFilter = document.getElementById('aprovacaoFiltroMes');
    const limparBtn = document.getElementById('btnLimparFiltrosAprovacao');
    const aprovarBtn = document.getElementById('btnAprovarSelecionados');
    const recusarBtn = document.getElementById('btnRecusarSelecionados');

    gerenteFilter.addEventListener('change', carregarDadosAprovacao);
    statusFilter.addEventListener('change', carregarDadosAprovacao);
    mesFilter.addEventListener('change', carregarDadosAprovacao);
    limparBtn.addEventListener('click', limparFiltrosAprovacao);
    aprovarBtn.addEventListener('click', () => processarEmMassa(true));
    recusarBtn.addEventListener('click', () => processarEmMassa(false));

    carregarDadosAprovacao();
}

function initializeFilters() {
    const mesSelect = document.getElementById('aprovacaoFiltroMes');
    const gerenteSelect = document.getElementById('aprovacaoFiltroGerente');
    const statusSelect = document.getElementById('aprovacaoFiltroStatus');

    const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    mesSelect.innerHTML = meses.map(m => `<option value="${m}">${m}</option>`).join('');
    mesSelect.value = meses[new Date().getMonth()];

    statusSelect.value = 'PENDENTE';

    fetch("/planejamento-he/api/gerentes")
        .then(r => r.json())
        .then(data => {
            gerenteSelect.innerHTML = '<option value="">Todos</option>';
            if (data.gerentes) {
                data.gerentes.forEach(g => {
                    const opt = document.createElement('option');
                    opt.value = g;
                    opt.textContent = g;
                    gerenteSelect.appendChild(opt);
                });
            }
        });
}

function limparFiltrosAprovacao() {
    document.getElementById('aprovacaoFiltroGerente').value = '';
    document.getElementById('aprovacaoFiltroStatus').value = 'PENDENTE';
    const mesAtual = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"][new Date().getMonth()];
    document.getElementById('aprovacaoFiltroMes').value = mesAtual;
    carregarDadosAprovacao();
}

function carregarDadosAprovacao() {
    carregarAprovacoes();
    updateApprovalSummary();
}

function carregarAprovacoes() {
    const container = document.getElementById('tabelaAprovacoesContainer');
    container.innerHTML = '<p class="text-center text-muted">Carregando solicitações...</p>';

    const gerente = document.getElementById('aprovacaoFiltroGerente').value;
    const status = document.getElementById('aprovacaoFiltroStatus').value;
    const mes = document.getElementById('aprovacaoFiltroMes').value;

    const params = new URLSearchParams();
    if (gerente) params.append('gerente', gerente);
    if (status) params.append('status', status);
    if (mes) params.append('mes', mes);

    const url = `/planejamento-he/api/solicitacoes-pendentes?${params.toString()}`;

    fetch(url)
        .then(response => {
            if (!response.ok) throw new Error(`Erro na API: ${response.statusText}`);
            return response.json();
        })
        .then(dados => {
            if (dados.erro) {
                container.innerHTML = `<div class="alert alert-danger">${dados.erro}</div>`;
                return;
            }
            container.innerHTML = criarTabelaAprovacoes(dados);
            
            // Adiciona lógica para o checkbox "selecionar todos"
            const selectAll = document.getElementById('selectAllCheckbox');
            if (selectAll) {
                selectAll.addEventListener('change', function() {
                    document.querySelectorAll('.solicitacao-checkbox').forEach(checkbox => {
                        checkbox.checked = this.checked;
                    });
                });
            }
        })
        .catch(erro => {
            console.error('Erro ao carregar solicitações para aprovação:', erro);
            container.innerHTML = `<div class="alert alert-danger">Erro ao carregar dados. Tente novamente.</div>`;
        });
}

function criarTabelaAprovacoes(solicitacoes) {
    if (solicitacoes.length === 0) {
        return '<p class="text-center text-muted">Nenhuma solicitação encontrada para os filtros selecionados.</p>';
    }

    let tabelaHtml = `
        <div class="table-responsive">
            <table class="table table-bordered table-hover table-sm">
                <thead class="thead-light">
                    <tr>
                        <th class="text-center"><input type="checkbox" id="selectAllCheckbox"></th>
                        <th>Data Envio</th>
                        <th>Gerente</th>
                        <th>Colaborador</th>
                        <th>Horas</th>
                        <th>Tipo</th>
                        <th>Status</th>
                        <th>Enviado Por</th>
                        <th class="text-center">Ações</th>
                    </tr>
                </thead>
                <tbody>
    `;

    solicitacoes.forEach(s => {
        const statusBadge = s.STATUS === 'APROVADO' ? '<span class="badge badge-success">Aprovado</span>' :
                          s.STATUS === 'RECUSADO' ? '<span class="badge badge-danger">Recusado</span>' :
                          '<span class="badge badge-warning">Pendente</span>';

        tabelaHtml += `
            <tr id="solicitacao-row-${s.id}">
                <td class="text-center"><input type="checkbox" class="solicitacao-checkbox" data-id="${s.id}"></td>
                <td>${s.DATA_ENVIO_FORMATADA || '-'}</td>
                <td>${s.GERENTE || '-'}</td>
                <td>${s.COLABORADOR || '-'}</td>
                <td>${s.HORAS || '0'}</td>
                <td>${s.TIPO_HE || '-'}</td>
                <td>${statusBadge}</td>
                <td>${s.ENVIADO_POR || '-'}</td>
                <td class="text-center">
                    ${s.STATUS === 'PENDENTE' ? `
                    <button class="btn btn-success btn-sm mr-1" onclick="processarAprovacao(${s.id}, true)" title="Aprovar">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="processarAprovacao(${s.id}, false)" title="Recusar">
                        <i class="fas fa-times"></i>
                    </button>` : ''}
                </td>
            </tr>
        `;
    });

    tabelaHtml += `
                </tbody>
            </table>
        </div>
    `;

    return tabelaHtml;
}

function processarAprovacao(id, isAprovado) {
    // Reutiliza a função de processamento em massa para consistência
    processarEmMassa(isAprovado, [id]);
}

function processarEmMassa(isAprovado, ids = null) {
    const acao = isAprovado ? 'Aprovar' : 'Recusar';
    const status = isAprovado ? 'APROVADO' : 'RECUSADO';
    const url = '/planejamento-he/api/tratar-em-massa';

    // Se os IDs não forem passados, pega dos checkboxes
    if (!ids) {
        ids = Array.from(document.querySelectorAll('.solicitacao-checkbox:checked')).map(cb => cb.dataset.id);
    }

    if (ids.length === 0) {
        Swal.fire('Nenhum item selecionado', 'Por favor, selecione uma ou mais solicitações para tratar.', 'info');
        return;
    }

    Swal.fire({
        title: `Confirmar ${acao} em Massa`,
        text: `Você tem certeza que deseja ${acao.toLowerCase()} ${ids.length} solicitação(ões)?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: isAprovado ? '#28a745' : '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: `Sim, ${acao.toLowerCase()}!`,
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: ids, status: status })
            })
            .then(response => response.json())
            .then(data => {
                if (data.sucesso) {
                    Swal.fire(`${acao}!`, data.mensagem, 'success').then(() => {
                        carregarDadosAprovacao();
                    });
                } else {
                    Swal.fire('Erro!', data.mensagem || 'Não foi possível completar a ação.', 'error');
                }
            })
            .catch(err => {
                console.error(`Erro ao ${acao.toLowerCase()} em massa:`, err);
                Swal.fire('Erro de Conexão!', 'Ocorreu um problema ao se comunicar com o servidor.', 'error');
            });
        }
    });
}

function updateApprovalSummary() {
    const container = document.getElementById('resumoFinanceiroContainer');
    const gerente = document.getElementById('aprovacaoFiltroGerente').value;
    const mes = document.getElementById('aprovacaoFiltroMes').value;

    // Não retorna mais se o gerente não estiver selecionado, em vez disso, busca o resumo geral.
    container.innerHTML = '<p class="text-center text-muted">Calculando resumo...</p>';

    const params = new URLSearchParams({ mes }); // Inicia com o mês que é sempre obrigatório
    if (gerente) {
        params.append('gerente', gerente); // Adiciona o gerente apenas se estiver selecionado
    }
    
    const url = `/planejamento-he/api/approval-summary?${params.toString()}`;

    fetch(url)
        .then(res => res.json())
        .then(summary => {
            if (summary.erro) {
                container.innerHTML = `<div class="alert alert-warning">${summary.erro}</div>`;
                return;
            }

            const formatCurrency = (value) => (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

            const { resumoPorStatus, limiteTotal, limiteAtual, limitePosAprovacao } = summary;

            // Títulos e labels dinâmicos
            const tituloResumo = gerente ? 'Resumo Financeiro da Gerência' : 'Resumo Financeiro Geral';
            const labelLimite = gerente ? 'Limite Total da Gerência' : 'Limite Total Geral';

            container.innerHTML = `
                <h5 class="mb-3">${tituloResumo}</h5>
                <div class="table-responsive">
                    <table class="table table-bordered table-sm">
                        <thead class="thead-dark">
                            <tr>
                                <th>Status</th>
                                <th>Qtd. Horas</th>
                                <th>Valor Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><span class="badge badge-success">Aprovado</span></td>
                                <td>${(resumoPorStatus.APROVADO?.horas || 0).toFixed(2)}</td>
                                <td>${formatCurrency(resumoPorStatus.APROVADO?.valor || 0)}</td>
                            </tr>
                            <tr>
                                <td><span class="badge badge-warning">Pendente</span></td>
                                <td>${(resumoPorStatus.PENDENTE?.horas || 0).toFixed(2)}</td>
                                <td>${formatCurrency(resumoPorStatus.PENDENTE?.valor || 0)}</td>
                            </tr>
                             <tr>
                                <td><span class="badge badge-danger">Recusado</span></td>
                                <td>${(resumoPorStatus.RECUSADO?.horas || 0).toFixed(2)}</td>
                                <td>${formatCurrency(resumoPorStatus.RECUSADO?.valor || 0)}</td>
                            </tr>
                        </tbody>
                        <tfoot class="bg-light font-weight-bold">
                            <tr>
                                <td colspan="2">${labelLimite}</td>
                                <td>${formatCurrency(limiteTotal)}</td>
                            </tr>
                            <tr>
                                <td colspan="2">Saldo Atual (Limite - Aprovado)</td>
                                <td class="${limiteAtual < 0 ? 'text-danger' : ''}">${formatCurrency(limiteAtual)}</td>
                            </tr>
                            <tr>
                                <td colspan="2">Saldo Pós-Aprovação (Saldo Atual - Pendente)</td>
                                <td class="${limitePosAprovacao < 0 ? 'text-danger' : ''}">${formatCurrency(limitePosAprovacao)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            `;
        })
        .catch(err => {
            console.error("Erro ao buscar resumo financeiro:", err);
            container.innerHTML = '<div class="alert alert-danger">Não foi possível carregar o resumo financeiro.</div>';
        });
}
