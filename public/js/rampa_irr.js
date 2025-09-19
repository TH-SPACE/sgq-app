document.getElementById('upload-form').addEventListener('submit', async function (event) {
    event.preventDefault();

    const fileInput = document.getElementById('excel-file');
    if (fileInput.files.length === 0) {
        alert('Por favor, selecione um arquivo.');
        return;
    }

    const formData = new FormData();
    formData.append('excelFile', fileInput.files[0]);

    // Adiciona um feedback visual de carregamento
    const submitButton = this.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.innerHTML;
    submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Gerando...';
    submitButton.disabled = true;

    try {
        const response = await fetch('/rampa-irr/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Erro na requisição: ${response.statusText}`);
        }

        const data = await response.json();
        renderDashboard(data);

    } catch (error) {
        console.error('Erro ao processar o arquivo:', error);
        alert(`Ocorreu um erro: ${error.message}`);
    } finally {
        // Restaura o botão
        submitButton.innerHTML = originalButtonText;
        submitButton.disabled = false;
    }
});

function renderDashboard(data) {
    const wrapper = document.getElementById('table-wrapper');
    const container = document.getElementById('dashboard-container');
    const cardHeader = document.querySelector('#dashboard-container .card-header');

    if (!data || !data.dayHeaders || !data.locations) {
        wrapper.innerHTML = '<p class="text-danger">Os dados recebidos são inválidos ou não há dados para o mês atual.</p>';
        container.style.display = 'block';
        return;
    }

    cardHeader.textContent = `RAMPA REINCIDENTES - ${data.monthName.toUpperCase()}`;

    let table = '<table class="table table-bordered table-striped table-hover text-center" style="font-size: 9px">';

    // Cabeçalho da Tabela
    table += '<thead class="thead-dark" style="background-color: #4B0082; color: white;"><tr>';
    data.dayHeaders.forEach((h, index) => {
        const isWeekend = h.includes('sáb') || h.includes('dom');
        const style = isWeekend ? 'background-color: #DAA520;' : '';
        // A primeira coluna ("MÉTRICA") tem um fundo diferente
        const thStyle = index === 0 ? 'background-color: #6A5ACD;' : style;
        table += `<th style="${thStyle}">${h}</th>`;
    });
    table += '</tr></thead>';

    // Corpo da Tabela
    table += '<tbody>';
    data.locations.forEach(location => {
        const metrics = Object.keys(location.metrics);
        metrics.forEach((metricName, index) => {
            table += '<tr>';
            // Coluna com nome da Localidade e da Métrica
            if (index === 0) {
                table += `<td rowspan="${metrics.length}" style="background-color: #6A5ACD; color: white; vertical-align: middle; font-weight: bold;">${location.name}</td>`;
            }
            const isPercentageRow = metricName.includes('%');
            const rowStyle = isPercentageRow ? 'background-color: #FFFACD; font-weight: bold;' : '';
            table += `<td style="text-align: left; ${rowStyle}">${metricName}</td>`;

            // Valores diários
            location.metrics[metricName].forEach(val => {
                table += `<td style="${rowStyle}">${val}</td>`;
            });

            // Total da linha
            table += `<td style="background-color: #E6E6FA; font-weight: bold;">${location.totals[metricName]}</td>`;
            table += '</tr>';
        });
    });
    table += '</tbody>';

    table += '</table>';

    wrapper.innerHTML = table;
    container.style.display = 'block';
}