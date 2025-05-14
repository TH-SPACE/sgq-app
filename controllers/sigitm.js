const express = require('express');
const db = require('../db/db'); // Ajuste o caminho conforme necessário
const XLSX = require('xlsx');

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
        const data = result.rows.map(row => ({
            TQI_CODIGO: row.TQI_CODIGO,
            TQI_RAIZ: row.TQI_RAIZ,
            ORIGEM: row.ORIGEM,
            DIAGNOSTICO: row.TQI_DIAGNOSTICO,
            UF: row.UF,
            ESTADO: row.ESTADO,
            CIDADE: row.CIDADE
        }));

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados Oracle');

        // Define o nome do arquivo
        const fileName = 'dados_oracle.xlsx';

        // Define o cabeçalho para download do arquivo
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

        // Grava o arquivo no response
        const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
        res.send(buffer);

        await connection.close();
    } catch (err) {
        console.error('Erro ao consultar dados do OracleDB:', err);
        res.status(500).send('Erro ao consultar dados do OracleDB');
    }
});

module.exports = router;