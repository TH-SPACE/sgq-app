const xlsx = require("xlsx");

function processUpload(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "Nenhum arquivo enviado." });
        }

        // 1. Ler e Processar o arquivo Excel
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawData = xlsx.utils.sheet_to_json(worksheet);

        // 2. Transformar os dados brutos para o formato da dashboard
        const processedData = processRawData(rawData);

        // 3. Enviar dados processados para o frontend
        res.json(processedData);

    } catch (error) {
        console.error("Erro no processamento do arquivo:", error);
        res.status(500).json({ error: "Falha ao processar o arquivo Excel." });
    }
}

function processRawData(data) {
    const groupedByLocation = {};
    const months = new Set();

    // Agrupa os dados por CLUSTER2 e extrai os meses/anos unicos
    data.forEach(row => {
        const location = row.CLUSTER2;
        const date = new Date(row.ABERTURA);
        
        if (!location || isNaN(date.getTime())) {
            return; // Ignora linhas sem localidade ou com data inválida
        }

        const month = date.toLocaleDateString('pt-BR', { year: '2-digit', month: 'short' }).replace('. de','');
        months.add(month);

        if (!groupedByLocation[location]) {
            groupedByLocation[location] = [];
        }
        groupedByLocation[location].push({ ...row, _month: month });
    });

    // Ordena os meses cronologicamente
    const sortedMonths = Array.from(months).sort((a, b) => {
        const [m1, y1] = a.split('/');
        const [m2, y2] = b.split('/');
        const monthOrder = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
        const dateA = new Date(`20${y1}`, monthOrder.indexOf(m1), 1);
        const dateB = new Date(`20${y2}`, monthOrder.indexOf(m2), 1);
        return dateA - dateB;
    });

    const locations = Object.keys(groupedByLocation).map(locationName => {
        const locationData = groupedByLocation[locationName];
        
        const reparos = [];
        const irr_real = [];
        const rampa_irr = [];
        const irr_acumulado_percent = [];

        const today = new Date();
        const currentMonthStr = today.toLocaleDateString('pt-BR', { year: '2-digit', month: 'short' }).replace('. de','');

        sortedMonths.forEach(month => {
            const monthData = locationData.filter(d => d._month === month);
            const rampaIrrValue = 32; // Meta de 32%

            // Verifica se o mês do loop é o mês atual para aplicar a lógica de projeção
            if (month === currentMonthStr) {
                // --- LÓGICA DE PROJEÇÃO PARA O MÊS ATUAL ---
                const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
                const daysPassed = today.getDate();
                const daysRemaining = daysInMonth - daysPassed > 0 ? daysInMonth - daysPassed : 0;

                // Filtra dados do mês atual até o dia de hoje
                const monthDataUntilToday = monthData.filter(d => new Date(d.ABERTURA).getDate() <= daysPassed);

                // Calcula valores acumulados até hoje
                const reparosUntilToday = monthDataUntilToday.filter(d => d['R30 TRATATIVAS'] != null && d['R30 TRATATIVAS'] !== '').length;
                const irrRealUntilToday = monthDataUntilToday.filter(d => d['R30 TRATATIVAS'] === 'R30 Tratativas').length;

                // Calcula médias diárias (evita divisão por zero se daysPassed for 0)
                const avgDailyReparos = daysPassed > 0 ? reparosUntilToday / daysPassed : 0;
                const avgDailyIrr = daysPassed > 0 ? irrRealUntilToday / daysPassed : 0;

                // Projeta os totais para o final do mês
                const projectedReparos = reparosUntilToday + (avgDailyReparos * daysRemaining);
                const projectedIrr = irrRealUntilToday + (avgDailyIrr * daysRemaining);

                // Calcula a porcentagem projetada
                let projectedIrrPercent = 0;
                if (projectedReparos > 0) {
                    projectedIrrPercent = (projectedIrr / projectedReparos) * 100;
                }
                
                // Adiciona os valores projetados aos arrays
                reparos.push(Math.round(projectedReparos));
                irr_real.push(Math.round(projectedIrr));
                rampa_irr.push(rampaIrrValue + '%');
                irr_acumulado_percent.push(projectedIrrPercent.toFixed(2) + '%');

            } else {
                // --- LÓGICA NORMAL PARA MESES PASSADOS ---
                const reparosCount = monthData.filter(d => d['R30 TRATATIVAS'] != null && d['R30 TRATATIVAS'] !== '').length;
                const irrRealValue = monthData.filter(d => d['R30 TRATATIVAS'] === 'R30 Tratativas').length;

                let irrAcumuladoValue = 0;
                if (reparosCount > 0) {
                    irrAcumuladoValue = (irrRealValue / reparosCount) * 100;
                }

                reparos.push(reparosCount);
                irr_real.push(irrRealValue);
                rampa_irr.push(rampaIrrValue + '%');
                irr_acumulado_percent.push(irrAcumuladoValue.toFixed(2) + '%');
            }
        });

        return {
            name: locationName,
            reparos,
            irr_real,
            rampa_irr,
            irr_acumulado_percent
        };
    });

    return {
        header: ["Localidade", "Métrica", ...sortedMonths],
        locations: locations
    };
}

module.exports = {
    processUpload
};