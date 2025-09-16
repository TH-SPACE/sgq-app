const xlsx = require("xlsx");

function processUpload(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "Nenhum arquivo enviado." });
        }
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawData = xlsx.utils.sheet_to_json(worksheet);

        const processedData = processDailyData(rawData);
        res.json(processedData);

    } catch (error) {
        console.error("Erro no processamento do arquivo:", error);
        res.status(500).json({ error: "Falha ao processar o arquivo Excel." });
    }
}

function processDailyData(data) {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();

    const currentMonthData = data.filter(row => {
        const date = new Date(row.ABERTURA);
        return date.getFullYear() === currentYear && date.getMonth() === currentMonth;
    });

    let lastDayWithData = 0;
    currentMonthData.forEach(row => {
        const day = new Date(row.ABERTURA).getDate();
        if (day > lastDayWithData) {
            lastDayWithData = day;
        }
    });

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const dayHeaders = [];
    for (let i = 1; i <= daysInMonth; i++) {
        const date = new Date(currentYear, currentMonth, i);
        const day = String(i).padStart(2, '0');
        const month = String(currentMonth + 1).padStart(2, '0');
        const weekday = date.toLocaleDateString('pt-BR', { weekday: 'short' }).substring(0, 3);
        dayHeaders.push(`${day}/${month} ${weekday}`);
    }

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
    for (const [name, locationData] of locationsMap.entries()) {
        let cumulativeReparos = 0;
        let cumulativeIrrReal = 0;
        let fixedFutureRampaTarget = 0;
        let rampaTotal = 0;

        const dailyReparos = [];
        const dailyIrrReal = [];
        const dailyRampaIrr = [];
        const dailyIrrAcumulado = [];

        for (let i = 1; i <= daysInMonth; i++) {
            const dayData = locationData.filter(d => new Date(d.ABERTURA).getDate() === i);
            const reparosDoDia = dayData.filter(d => d['R30 TRATATIVAS'] != null && d['R30 TRATATIVAS'] !== '').length;
            const irrRealDoDia = dayData.filter(d => d['R30 TRATATIVAS'] === 'R30 Tratativas').length;

            if (i <= lastDayWithData) {
                const daysPassed = i;
                const daysRemaining = daysInMonth - i;
                const reparosAteEsteDia = cumulativeReparos + reparosDoDia;
                const avgDailyReparos = daysPassed > 0 ? reparosAteEsteDia / daysPassed : 0;
                const projectedTotalReparos = reparosAteEsteDia + (avgDailyReparos * daysRemaining);
                const maxTotalIrrReal = projectedTotalReparos * 0.32;
                const remainingIrrBudget = maxTotalIrrReal - cumulativeIrrReal;
                const daysToDistribute = daysInMonth - (daysPassed - 1);
                
                let dailyRampaTarget = 0;
                if (remainingIrrBudget > 0 && daysToDistribute > 0) {
                    dailyRampaTarget = Math.floor(remainingIrrBudget / daysToDistribute);
                }
                dailyRampaTarget = dailyRampaTarget < 0 ? 0 : dailyRampaTarget;
                dailyRampaIrr.push(dailyRampaTarget);

                if (i === lastDayWithData) {
                    fixedFutureRampaTarget = dailyRampaTarget;
                    const finalRemainingBudget = maxTotalIrrReal - (cumulativeIrrReal + irrRealDoDia);
                    rampaTotal = Math.floor(finalRemainingBudget < 0 ? 0 : finalRemainingBudget);
                }

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
                dailyRampaIrr.push(fixedFutureRampaTarget);
                dailyReparos.push('-');
                dailyIrrReal.push('-');
                dailyIrrAcumulado.push('-');
            }
        }

        const totalIrrAcumulado = (cumulativeReparos > 0) ? ((cumulativeIrrReal / cumulativeReparos) * 100).toFixed(1) + '%' : '0.0%';

        locations.push({
            name,
            metrics: {
                'REPAROS': dailyReparos,
                'IRR REAL': dailyIrrReal,
                'RAMPA IRR': dailyRampaIrr,
                '% IRR ACUMULADO': dailyIrrAcumulado,
            },
            totals: {
                'REPAROS': cumulativeReparos,
                'IRR REAL': cumulativeIrrReal,
                'RAMPA IRR': rampaTotal,
                '% IRR ACUMULADO': totalIrrAcumulado,
            }
        });
    }
    
    locations.sort((a, b) => a.name.localeCompare(b.name));

    return {
        monthName: today.toLocaleDateString('pt-BR', { month: 'long' }),
        dayHeaders: ['MÉTRICA', ...dayHeaders, 'TOTAL'],
        locations: locations,
    };
}

module.exports = {
    processUpload
};
