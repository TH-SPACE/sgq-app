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

        // Assume que as colunas de data no Excel são 'DATA_ABERTURA' e a de localidade é 'LOCALIDADE'
        // e a de tratativas é 'R30 TRATATIVAS'. Ajuste se os nomes forem outros.
        const processedData = {};
        const locations = new Set();
        const dates = new Set();

        rawData.forEach(row => {
            if (!row.CLUSTER2 || !row.ABERTURA) return;

            const location = row.CLUSTER2.trim();
            const date = new Date(row.ABERTURA).toISOString().split('T')[0]; // Formato YYYY-MM-DD

            locations.add(location);
            dates.add(date);

            if (!processedData[location]) {
                processedData[location] = {};
            }
            if (!processedData[location][date]) {
                processedData[location][date] = { reparos: 0, irr_real: 0 };
            }

            // Lógica para REPAROS
            processedData[location][date].reparos += 1;

            // Lógica para IRR REAL
            if (row["R30 TRATATIVAS"] && row["R30 TRATATIVAS"].toString().trim() === "R30 Tratativas") {
                processedData[location][date].irr_real += 1;
            }
        });

        const sortedLocations = [...locations].sort();
        const sortedDates = [...dates].sort();
        const month = sortedDates.length > 0 ? new Date(sortedDates[0]).getMonth() : new Date().getMonth();
        const year = sortedDates.length > 0 ? new Date(sortedDates[0]).getFullYear() : new Date().getFullYear();
        const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

        // 2. Calcular as métricas para a dashboard
        const dashboardData = {
            header: ["LOCALIDADE", "METRICA", ...sortedDates],
            locations: []
        };

        let totalReparosAcumulado = 0;
        let totalIrrRealAcumulado = 0;

        sortedLocations.forEach(location => {
            const locationData = {
                name: location,
                reparos: [],
                irr_real: [],
                rampa_irr: [],
                irr_acumulado_percent: []
            };

            let reparosAcumuladoLocal = 0;
            let irrRealAcumuladoLocal = 0;

            for (let i = 0; i < sortedDates.length; i++) {
                const date = sortedDates[i];
                const dayData = processedData[location]?.[date] || { reparos: 0, irr_real: 0 };

                locationData.reparos.push(dayData.reparos);
                locationData.irr_real.push(dayData.irr_real);

                reparosAcumuladoLocal += dayData.reparos;
                irrRealAcumuladoLocal += dayData.irr_real;
                
                if (i === 0) { // No primeiro dia, o acumulado total é só o do dia
                    totalReparosAcumulado = dayData.reparos;
                    totalIrrRealAcumulado = dayData.irr_real;
                } else {
                    totalReparosAcumulado += dayData.reparos;
                    totalIrrRealAcumulado += dayData.irr_real;
                }


                // Lógica para % IRR ACUMULADO
                const percAcumulado = (reparosAcumuladoLocal > 0) ? (irrRealAcumuladoLocal / reparosAcumuladoLocal) : 0;
                locationData.irr_acumulado_percent.push((percAcumulado * 100).toFixed(1) + '%');

                // Lógica para RAMPA IRR
                const diasPassados = i + 1;
                const diasRestantes = totalDaysInMonth - diasPassados;
                
                const mediaDiariaReparos = totalReparosAcumulado / diasPassados;
                const projecaoReparosMes = mediaDiariaReparos * totalDaysInMonth;
                const totalIrrPermitidoMes = projecaoReparosMes * 0.32;
                const irrRestante = totalIrrPermitidoMes - totalIrrRealAcumulado;
                
                const rampaIrr = (diasRestantes > 0) ? (irrRestante / diasRestantes) : 0;
                locationData.rampa_irr.push(rampaIrr.toFixed(1));
            }
            dashboardData.locations.push(locationData);
        });

        res.json(dashboardData);

    } catch (error) {
        console.error("Erro no processamento do arquivo:", error);
        res.status(500).json({ error: "Falha ao processar o arquivo Excel." });
    }
}

module.exports = {
    processUpload
};
