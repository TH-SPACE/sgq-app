document.addEventListener("DOMContentLoaded", () => {
    const filtroMes = document.getElementById('dashboardFiltroMes');

    function getMesAtualPortugues() {
        const meses = [
            "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
            "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
        ];
        return meses[new Date().getMonth()];
    }

    const mesAtual = getMesAtualPortugues();
    if (filtroMes) {
        filtroMes.value = mesAtual;
        carregarDashboardPorGerente(mesAtual);

        filtroMes.addEventListener('change', () => {
            carregarDashboardPorGerente(filtroMes.value);
        });
    }
});

function carregarDashboardPorGerente(mes) {
    const accordionContainer = document.getElementById('dashboardAccordion');
    if (!accordionContainer) return;

    accordionContainer.innerHTML = '<p class="text-center">Carregando dados dos gerentes...</p>';

    fetch(`/planejamento-he/api/dashboard-summary?mes=${mes}`)
        .then(response => response.json())
        .then(data => {
            if (data.erro) {
                accordionContainer.innerHTML = `<div class="alert alert-danger">${data.erro}</div>`;
                return;
            }

            if (data.length === 0) {
                accordionContainer.innerHTML = '<p class="text-center text-muted">Nenhum dado encontrado para este mês.</p>';
                return;
            }

            let accordionHtml = '';
            data.forEach((gerenteData, index) => {
                const gerenteId = `gerente-${index}`;
                accordionHtml += `
                    <div class="card mb-2">
                        <div class="card-header" id="heading-${gerenteId}">
                            <h2 class="mb-0">
                                <button class="btn btn-link btn-block text-left" type="button" data-toggle="collapse" data-target="#collapse-${gerenteId}" aria-expanded="false" aria-controls="collapse-${gerenteId}" data-gerente="${gerenteData.GERENTE}">
                                    ${gerenteData.GERENTE || 'Gerente não especificado'}
                                </button>
                            </h2>
                            <div class="row text-center mt-2">
                                <div class="col"><strong>Horas:</strong> ${gerenteData.totalHoras || 0}</div>
                                <div class="col"><strong>Pendentes:</strong> ${gerenteData.pendentes || 0}</div>
                                <div class="col"><strong>Aprovadas:</strong> ${gerenteData.aprovadas || 0}</div>
                                <div class="col"><strong>Recusadas:</strong> ${gerenteData.recusadas || 0}</div>
                            </div>
                        </div>

                        <div id="collapse-${gerenteId}" class="collapse" aria-labelledby="heading-${gerenteId}" data-parent="#dashboardAccordion">
                            <div class="card-body" id="body-${gerenteId}">
                                Carregando solicitações...
                            </div>
                        </div>
                    </div>
                `;
            });

            accordionContainer.innerHTML = accordionHtml;

            // Adicionar event listeners para carregar detalhes ao expandir
            $('#dashboardAccordion .collapse').on('show.bs.collapse', function () {
                const cardBody = this.querySelector('.card-body');
                const gerente = this.previousElementSibling.querySelector('button').getAttribute('data-gerente');
                carregarDetalhesGerente(gerente, mes, cardBody.id);
            });
        })
        .catch(error => {
            console.error('Erro ao carregar dashboard por gerente:', error);
            accordionContainer.innerHTML = '<div class="alert alert-danger">Erro ao carregar dados.</div>';
        });
}

function carregarDetalhesGerente(gerente, mes, bodyId) {
    const bodyElement = document.getElementById(bodyId);
    if (!bodyElement || bodyElement.getAttribute('data-loaded') === 'true') {
        return; // Não recarregar se já estiver carregado
    }

    fetch(`/planejamento-he/api/todas-solicitacoes?gerente=${encodeURIComponent(gerente)}&mes=${mes}`)
        .then(response => response.json())
        .then(solicitacoes => {
            if (solicitacoes.erro) {
                bodyElement.innerHTML = `<p class="text-danger">${solicitacoes.erro}</p>`;
                return;
            }

            if (solicitacoes.length === 0) {
                bodyElement.innerHTML = '<p class="text-muted">Nenhuma solicitação para este gerente no mês.</p>';
                bodyElement.setAttribute('data-loaded', 'true');
                return;
            }

            let tableHtml = `
                <div class="table-responsive">
                    <table class="table table-sm table-bordered">
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

            solicitacoes.forEach(s => {
                const statusBadge =
                    s.STATUS === "APROVADO" ? '<span class="badge badge-success">Aprovado</span>' :
                    s.STATUS === "RECUSADO" ? '<span class="badge badge-danger">Recusado</span>' :
                    '<span class="badge badge-warning">Pendente</span>';

                tableHtml += `
                    <tr>
                        <td>${s.COLABORADOR || '-'}</td>
                        <td>${s.HORAS || '0'}</td>
                        <td>${s.TIPO_HE || '-'}</td>
                        <td>${statusBadge}</td>
                        <td>${s.DATA_ENVIO_FORMATADA || '-'}</td>
                    </tr>
                `;
            });

            tableHtml += '</tbody></table></div>';
            bodyElement.innerHTML = tableHtml;
            bodyElement.setAttribute('data-loaded', 'true');
        })
        .catch(error => {
            console.error('Erro ao carregar detalhes do gerente:', error);
            bodyElement.innerHTML = '<p class="text-danger">Erro ao carregar detalhes.</p>';
        });
}
