const express = require('express');
const db = require('../db/db'); // Ajuste o caminho conforme necessário
const ExcelJS = require('exceljs');

const router = express.Router();

router.get('/oracle-data', async (req, res) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
        return res.status(400).send('Datas de início e fim são obrigatórias.');
    }

    try {
        const connection = await db.getOracleConnection();
        const result = await connection.execute(`
            SELECT 
                CAST(TQI_CODIGO as int) as TQI_CODIGO,
                CAST(TQI_RAIZ as int) as TQI_RAIZ,
                CASE WHEN TQI_ORIGEM = 20 THEN 'VIVO2' ELSE 'VIVO1' END AS ORIGEM,
                sigitm_1_2.tbl_ti.tqi_diagnostico,
                sigitm_1_2.tbl_ti.tqi_estado_codigo AS UF,
                sigitm_1_2.tbl_ti.tqi_estado_NOME AS ESTADO,
                sigitm_1_2.tbl_ti.tqi_municipio_nome AS CIDADE
            FROM SIGITM_1_2.tbl_ti
            WHERE sigitm_1_2.tbl_ti.tqi_estado_codigo IN ('MS', 'GO', 'MA', 'AM', 'MT', 'PA', 'AP', 'DF', 'TO', 'RO', 'AC', 'RR')
                AND TQI_DATA_CRIACAO BETWEEN TO_DATE(:startDate, 'YYYY-MM-DD') AND TO_DATE(:endDate, 'YYYY-MM-DD')
        `, [startDate, endDate]);

        // Cria uma nova planilha
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Dados Oracle');

        // Adiciona cabeçalhos
        worksheet.columns = [
            { header: 'TQI_CODIGO', key: 'TQI_CODIGO', width: 15 },
            { header: 'TQI_RAIZ', key: 'TQI_RAIZ', width: 15 },
            { header: 'ORIGEM', key: 'ORIGEM', width: 15 },
            { header: 'DIAGNOSTICO', key: 'TQI_DIAGNOSTICO', width: 30 },
            { header: 'UF', key: 'UF', width: 10 },
            { header: 'ESTADO', key: 'ESTADO', width: 20 },
            { header: 'CIDADE', key: 'CIDADE', width: 20 }
        ];

        // Adiciona linhas
        result.rows.forEach(row => {
            worksheet.addRow(row);
        });

        // Define o nome do arquivo
        const fileName = 'dados_oracle.xlsx';

        // Define o cabeçalho para download do arquivo
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

        // Grava o arquivo no response
        await workbook.xlsx.write(res);
        res.end();

        await connection.close();
    } catch (err) {
        console.error('Erro ao consultar dados do OracleDB:', err);
        res.status(500).send('Erro ao consultar dados do OracleDB');
    }
});

module.exports = router;