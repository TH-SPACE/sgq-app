document.addEventListener("DOMContentLoaded", () => {
    carregarResumo();
    carregarTabela();
});

function carregarResumo() {
    fetch('/planejamento-he/api/dashboard-summary')
        .then(response => response.json())
        .then(data => {
            if (data.erro) {
                console.error('Erro ao carregar resumo:', data.erro);
                return;
            }
            document.getElementById('totalHoras').textContent = data.totalHoras || 0;
            document.getElementById('pendentes').textContent = data.pendentes || 0;
            document.getElementById('aprovadas').textContent = data.aprovadas || 0;
            document.getElementById('recusadas').textContent = data.recusadas || 0;
        })
        .catch(error => console.error('Erro na requisição do resumo:', error));
}

function carregarTabela() {
    const container = document.getElementById("tabelaDashboardSolicitacoes");
    container.innerHTML = '<tr><td colspan="6" class="text-center">Carregando...</td></tr>';

    fetch('/planejamento-he/api/minhas-solicitacoes') // Reutilizando a API existente
        .then(response => {
            if (!response.ok) throw new Error("Erro na resposta da API");
            return response.json();
        })
        .then(dados => {
            if (dados.erro) {
                container.innerHTML = `<tr><td colspan="6" class="text-center text-danger">${dados.erro}</td></tr>`;
                return;
            }

            if (dados.length === 0) {
                container.innerHTML = `<tr><td colspan="6" class="text-center text-muted">Nenhuma solicitação encontrada.</td></tr>`;
                return;
            }

            let tabelaHtml = '';
            dados.forEach(s => {
                const statusBadge =
                    s.STATUS === "APROVADO"
                        ? '<span class="badge badge-success">Aprovado</span>'
                        : s.STATUS === "RECUSADO"
                        ? '<span class="badge badge-danger">Recusado</span>'
                        : '<span class="badge badge-warning">Pendente</span>';

                tabelaHtml += `
                    <tr>
                        <td>${s.COLABORADOR || "-"}</td>
                        <td>${s.MES || "-"}</td>
                        <td>${s.HORAS || "0"}</td>
                        <td>${s.TIPO_HE || "-"}</td>
                        <td>${statusBadge}</td>
                        <td>${s.DATA_ENVIO_FORMATADA || "-"}</td>
                    </tr>
                `;
            });

            container.innerHTML = tabelaHtml;
        })
        .catch(erro => {
            console.error("Erro ao carregar solicitações:", erro);
            container.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Erro ao carregar dados. Tente novamente.</td></tr>`;
        });
}
