// Import the xlsx library to read Excel files
const xlsx = require("xlsx");

// Main function to handle file upload and process the Excel data
function processUpload(req, res) {
    try {
        // Check if a file was uploaded
        if (!req.file) {
            return res.status(400).json({ error: "Nenhum arquivo enviado." });
        }

        // Read the uploaded Excel file from buffer
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer', cellDates: true });

        // Get the first sheet name and its content
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Convert sheet data to JSON format
        const rawData = xlsx.utils.sheet_to_json(worksheet);

        // Process the data and return the result
        const processedData = processDailyData(rawData);
        res.json(processedData);

    } catch (error) {
        // Handle any errors during processing
        console.error("Erro no processamento do arquivo:", error);
        res.status(500).json({ error: "Falha ao processar o arquivo Excel." });
    }
}

// Function to process daily data from the Excel sheet
function processDailyData(data) {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    // Filter data for the current month
    const currentMonthData = data.filter(row => {
        const date = new Date(row.ABERTURA);
        return date.getFullYear() === currentYear && date.getMonth() === currentMonth;
    });

    // Determine the last day with data
    let lastDayWithData = 0;
    currentMonthData.forEach(row => {
        const day = new Date(row.ABERTURA).getDate();
        if (day > lastDayWithData) {
            lastDayWithData = day;
        }
    });

    // Get number of days in the current month
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    // Create headers for each day with weekday labels
    const dayHeaders = [];
    for (let i = 1; i <= daysInMonth; i++) {
        const date = new Date(currentYear, currentMonth, i);
        const day = String(i).padStart(2, '0');
        const month = String(currentMonth + 1).padStart(2, '0');
        const weekday = date.toLocaleDateString('pt-BR', { weekday: 'short' }).substring(0, 3);
        dayHeaders.push(`${day}/${month} ${weekday}`);
    }

    // Group data by location (CLUSTER2)
    const locationsMap = new Map();
    currentMonthData.forEach(row => {
        const locationName = row.CLUSTER2;
        if (!locationName) return;
        if (!locationsMap.has(locationName)) {
            locationsMap.set(locationName, []);
        }
        locationsMap.get(locationName).push(row);
    });

    const locations = [];

    // Process each location's data
    for (const [name, locationData] of locationsMap.entries()) {
        let cumulativeReparos = 0;
        let cumulativeIrrReal = 0;

        const dailyReparos = [];
        const dailyIrrReal = [];
        const dailyIrrAcumulado = [];

        // Calculate daily metrics
        for (let i = 1; i <= daysInMonth; i++) {
            if (i <= lastDayWithData) {
                const dayData = locationData.filter(d => new Date(d.ABERTURA).getDate() === i);
                const reparosDoDia = dayData.filter(d => d['R30 TRATATIVAS'] != null && d['R30 TRATATIVAS'] !== '').length;
                const irrRealDoDia = dayData.filter(d => d['R30 TRATATIVAS'] === 'R30 Tratativas').length;

                dailyReparos.push(reparosDoDia);
                dailyIrrReal.push(irrRealDoDia);

                cumulativeReparos += reparosDoDia;
                cumulativeIrrReal += irrRealDoDia;

                let irrAcumuladoPercent = 0;
                if (cumulativeReparos > 0) {
                    irrAcumuladoPercent = (cumulativeIrrReal / cumulativeReparos) * 100;
                }
                dailyIrrAcumulado.push(irrAcumuladoPercent.toFixed(1) + '%');
            } else {
                dailyReparos.push('-');
                dailyIrrReal.push('-');
                dailyIrrAcumulado.push('-');
            }
        }

        // Define target percentage and project total repairs
        const metaPercentual = 0.32;
        const totalReparosProjetado = (cumulativeReparos / lastDayWithData) * daysInMonth;
        const reincidentesPermitidos = totalReparosProjetado * metaPercentual;
        const reincidentesRestantes = reincidentesPermitidos - cumulativeIrrReal;
        const diasRestantes = daysInMonth - lastDayWithData;
        const reincidentesPorDiaPermitido = diasRestantes > 0 ? reincidentesRestantes / diasRestantes : 0;

        const dailyRampaIrr = [];

        // Calculate RAMPA IRR for each day
        for (let i = 1; i <= daysInMonth; i++) {
            const valorProjetado = reincidentesPorDiaPermitido.toFixed(2);

            if (i <= lastDayWithData) {
                const irrRealDoDia = dailyIrrReal[i - 1];

                if (irrRealDoDia !== '-') {
                    // Calculate IRR REAL accumulated until current day
                    let irrRealAteHoje = 0;
                    for (let j = 0; j < i; j++) {
                        const valor = dailyIrrReal[j];
                        if (valor !== '-' && typeof valor === 'number') {
                            irrRealAteHoje += valor;
                        }
                    }

                    // Calculate remaining days from current day
                    const diasRestantesDia = daysInMonth - i + 1;

                    // Calculate projected IRR per day
                    const reincidentesDia = diasRestantesDia > 0
                        ? ((reincidentesPermitidos - irrRealAteHoje) / diasRestantesDia).toFixed(2)
                        : '0.00';

                    // Add warning if actual IRR exceeds projection
                    if (irrRealDoDia > parseFloat(reincidentesDia)) {
                        dailyRampaIrr.push(`${reincidentesDia} ⚠️`);
                    } else {
                        dailyRampaIrr.push(reincidentesDia);
                    }
                } else {
                    dailyRampaIrr.push('-');
                }
            } else {
                dailyRampaIrr.push(valorProjetado);
            }
        }

        // Calculate total IRR accumulated percentage
        const totalIrrAcumulado = (cumulativeReparos > 0)
            ? ((cumulativeIrrReal / cumulativeReparos) * 100).toFixed(1) + '%'
            : '0.0%';

        // Calculate total RAMPA IRR as sum of IRR REAL + projected values after last day
        let somaProjetada = 0;
        for (let i = lastDayWithData; i < daysInMonth; i++) {
            const valor = parseFloat(dailyRampaIrr[i]);
            if (!isNaN(valor)) {
                somaProjetada += valor;
            }
        }
        const totalRampaIrr = cumulativeIrrReal + somaProjetada;

        // Store metrics and totals for the location
        locations.push({
            name,
            metrics: {
                'REPAROS': dailyReparos,
                'IRR REAL': dailyIrrReal,
                'RAMPA IRR': dailyRampaIrr,
                '% IRR ACUMULADO': dailyIrrAcumulado
            },
            totals: {
                'REPAROS': cumulativeReparos,
                'IRR REAL': cumulativeIrrReal,
                'RAMPA IRR': totalRampaIrr.toFixed(0),
                '% IRR ACUMULADO': totalIrrAcumulado
            }
        });
    }

    // Sort locations alphabetically
    locations.sort((a, b) => a.name.localeCompare(b.name));

    // Return final structured result
    return {
        monthName: today.toLocaleDateString('pt-BR', { month: 'long' }),
        dayHeaders: ['MÉTRICA', ...dayHeaders, 'TOTAL'],
        locations: locations,
    };
}

// Export the upload processing function
module.exports = {
    processUpload
};
