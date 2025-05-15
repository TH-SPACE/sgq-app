const express = require('express');
const router = express.Router();
const db = require('../db/db');
const XLSX = require('xlsx');

router.get('/oracle-data', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
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

        const data = result.rows;

        // Definindo os cabeçalhos manualmente
        const headers = [
            "TQI_CODIGO",
            "TQI_RAIZ",
            "ORIGEM",
            "TQI_DIAGNOSTICO",
            "UF",
            "ESTADO",
            "CIDADE"
        ];

        // Adicionando os cabeçalhos aos dados
        const dataWithHeaders = [headers, ...data];

        const worksheet = XLSX.utils.aoa_to_sheet(dataWithHeaders);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados');
        const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

        res.setHeader('Content-Disposition', 'attachment; filename="dados.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);

        await connection.close();
    } catch (err) {
        console.error('Erro ao consultar dados do OracleDB:', err);
        res.status(500).send('Erro ao consultar dados do OracleDB');
    }
});

module.exports = router;