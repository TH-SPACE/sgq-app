document.getElementById('upload-form').addEventListener('submit', async function(event) {
    event.preventDefault();

    const fileInput = document.getElementById('excel-file');
    if (fileInput.files.length === 0) {
        alert('Por favor, selecione um arquivo.');
        return;
    }

    const formData = new FormData();
    formData.append('excelFile', fileInput.files[0]);

    try {
        const response = await fetch('/rampa-irr/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Erro na requisição: ${response.statusText}`);
        }

        const data = await response.json();
        renderDashboard(data);

    } catch (error) {
        console.error('Erro ao processar o arquivo:', error);
        alert('Ocorreu um erro ao gerar a dashboard. Verifique o console para mais detalhes.');
    }
});

function renderDashboard(data) {
    const wrapper = document.getElementById('table-wrapper');
    const container = document.getElementById('dashboard-container');
    
    if (!data || !data.header || !data.locations) {
        wrapper.innerHTML = '<p class="text-danger">Os dados recebidos são inválidos.</p>';
        container.style.display = 'block';
        return;
    }

    let table = '<table class="table table-bordered table-striped table-hover">';
    
    // Cabeçalho da Tabela
    table += '<thead class="thead-dark"><tr>';
    data.header.forEach(h => {
        table += `<th>${h}</th>`;
    });
    table += '</tr></thead>';

    // Corpo da Tabela
    table += '<tbody>';
    for (const location of data.locations) {
        table += `<tr><td rowspan="5"><strong>${location.name}</strong></td></tr>`;
        table += createRow('REPAROS', location.reparos);
        table += createRow('IRR REAL', location.irr_real);
        table += createRow('RAMPA IRR', location.rampa_irr);
        table += createRow('% IRR ACUMULADO', location.irr_acumulado_percent);
    }
    table += '</tbody>';
    
    table += '</table>';

    wrapper.innerHTML = table;
    container.style.display = 'block';
}

function createRow(label, values) {
    let row = `<tr><td>${label}</td>`;
    values.forEach(val => {
        row += `<td>${val}</td>`;
    });
    row += '</tr>';
    return row;
}
