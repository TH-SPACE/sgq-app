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

        // --- DEBUGGING STEP ---
        // Enviando as 5 primeiras linhas para análise
        res.json(rawData.slice(0, 5));
        return; // Interrompe a execução normal

    } catch (error) {
        console.error("Erro no processamento do arquivo:", error);
        res.status(500).json({ error: "Falha ao processar o arquivo Excel." });
    }
}

module.exports = {
    processUpload
};
