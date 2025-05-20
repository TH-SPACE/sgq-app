const express = require('express');
const router = express.Router();
const db = require('../db/db');
const XLSX = require('xlsx');

router.get('/oracle-data', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const connection = await db.getOracleConnection();

        // Alterar a sessão para português
        await connection.execute(`ALTER SESSION SET NLS_DATE_LANGUAGE = 'PORTUGUESE'`);

        const result = await connection.execute(`
            SELECT    

    -- Extrai o nome do mês da data de criação e converte para maiúsculas
    UPPER(TRIM(to_char(sigitm_1_2.tbl_ti.tqi_data_encerramento, 'Month'))) AS mes_encerramento,       

    -- Código da vida do reparo
    CAST(sigitm_1_2.tbl_vidas_ti.vdi_codigo AS NUMBER) AS vdi_codigo,

    -- Identificador do circuito (chave de rastreio)
    sigitm_1_2.tbl_ti.tqi_identificador AS id_circuito,

    -- Código do item (reparo)
    CAST(sigitm_1_2.tbl_ti.tqi_codigo AS NUMBER) AS tqi_codigo,

    -- Código raiz do reparo
    CAST(sigitm_1_2.tbl_ti.tqi_raiz AS NUMBER) AS tqi_raiz,
    
    -- Situação do item traduzida por código
    CASE sigitm_1_2.tbl_ti.tqi_status
        WHEN 10 THEN 'Ativo'
        WHEN 20 THEN 'Parado'
        WHEN 30 THEN 'Baixado'
        WHEN 90 THEN 'Fechado'
        WHEN 91 THEN 'Cancelado'
        ELSE 'nao_consta'
    END AS status,
    
    -- Procedência do item
    CASE sigitm_1_2.tbl_ti.tqi_procedencia
        WHEN 10 THEN 'reativo'
        WHEN 20 THEN 'proativo'
        WHEN 30 THEN 'preventivo'
        WHEN 40 THEN 'triagem'
        ELSE 'nao_consta'
    END AS procedencia,
    
    -- Cidade e estado do item
    sigitm_1_2.tbl_ti.tqi_municipio_nome AS cidade,
    sigitm_1_2.tbl_ti.tqi_estado_codigo AS uf,

    -- Cluster (região lógica) atribuído com base na cidade ou estado
    CASE 
        WHEN sigitm_1_2.tbl_ti.tqi_municipio_nome IN ('FORMOSA', 'CIDADE OCIDENTAL', 'VALPARAISO', 'PLANALTINA', 'LUZIANIA', 'LUZIÂNIA') THEN 'BRASILIA'
        WHEN sigitm_1_2.tbl_ti.tqi_municipio_nome IN ('ANAPOLIS', 'Anápolis', 'Jaraguá', 'JARAGUA') THEN 'ANAPOLIS'
        WHEN sigitm_1_2.tbl_ti.tqi_estado_codigo IN ('PA') THEN 'BELEM'
        WHEN sigitm_1_2.tbl_ti.tqi_estado_codigo IN ('AP', 'AM', 'RR') THEN 'MANAUS'
        WHEN sigitm_1_2.tbl_ti.tqi_estado_codigo IN ('AC', 'MS', 'RO') THEN 'CAMPO GRANDE'
        WHEN sigitm_1_2.tbl_ti.tqi_estado_codigo = 'MT' THEN 'CUIABA'
        WHEN sigitm_1_2.tbl_ti.tqi_estado_codigo = 'GO' THEN 'GOIANIA'
        WHEN sigitm_1_2.tbl_ti.tqi_estado_codigo = 'TO' THEN 'PALMAS' 
        WHEN sigitm_1_2.tbl_ti.tqi_estado_codigo = 'DF' THEN 'BRASILIA'
        WHEN sigitm_1_2.tbl_ti.tqi_estado_codigo = 'MA' THEN 'SAO LUIS'
        ELSE 'OUTRO'
    END AS nom_cluster,

    -- Nome do estado (completo)
    sigitm_1_2.tbl_ti.tqi_estado_nome AS estado,  

    -- Origem do item (tipo de sistema)
    CASE 
        WHEN sigitm_1_2.tbl_ti.tqi_origem = 20 THEN 'VIVO2' 
        ELSE 'VIVO1' 
    END AS origem,
    
    -- Tipo do produto envolvido no item
    CASE sigitm_1_2.tbl_ti.tqi_tipo_incidencia
        WHEN 10 THEN 'DADOS'
        WHEN 20 THEN 'DDR'
        WHEN 30 THEN 'CONVERGENTE'
        ELSE 'nao_consta'
    END AS produto,

    -- Grupo responsável pela baixa do item
    (
        SELECT MAX(grp_nome)
        FROM sigitm_1_2.tbl_grupos, sigitm_1_2.tbl_ti_baixas
        WHERE sigitm_1_2.tbl_ti_baixas.tix_ti = sigitm_1_2.tbl_ti.tqi_codigo
          AND sigitm_1_2.tbl_ti_baixas.tix_baixadopor_grupo = sigitm_1_2.tbl_grupos.grp_codigo
    ) AS gruo_baixa,

    -- Grupo atual responsável pelo item
    sigitm_1_2.tbl_grupos.grp_codigo,
    sigitm_1_2.tbl_grupos.grp_nome,

    -- Código e descrição do diagnóstico associado ao item
    sigitm_1_2.tbl_ti.tqi_diagnostico,
    sigitm_1_2.tbl_diagnostico.dgn_descricao,

    -- Datas de abertura e encerramento do item
    TO_CHAR(sigitm_1_2.tbl_ti.tqi_data_reclamacao, 'DD/MM/YYYY HH24:MI:SS') AS tqi_abertura,
    TO_CHAR(sigitm_1_2.tbl_ti.tqi_data_encerramento, 'DD/MM/YYYY HH24:MI:SS') AS tqi_encerramento,

    -- Datas de início e fim da vida do item
    TO_CHAR(sigitm_1_2.tbl_vidas_ti.vdi_data_inicio, 'DD/MM/YYYY HH24:MI:SS') AS vdi_data_inicio,
    TO_CHAR(sigitm_1_2.tbl_vidas_ti.vdi_data_fim, 'DD/MM/YYYY HH24:MI:SS') AS vdi_data_fim,
    
    -- Apenas o horário
    TO_CHAR(sigitm_1_2.tbl_vidas_ti.vdi_data_inicio, 'HH24:MI:SS') AS vdi_hora_inicio,
    TO_CHAR(sigitm_1_2.tbl_vidas_ti.vdi_data_fim, 'HH24:MI:SS') AS vdi_hora_fim,

    -- Horário funcional de início e fim (com valor padrão caso nulo)
    NVL(TO_CHAR(sigitm_1_2.tbl_ti.tqi_horario_inicio, 'YYYY-MM-DD HH24:MI:SS'), TO_CHAR(TRUNC(SYSDATE) + 8/24, 'YYYY-MM-DD HH24:MI:SS')) AS horario_func_inicio,
    NVL(TO_CHAR(sigitm_1_2.tbl_ti.tqi_horario_fim, 'YYYY-MM-DD HH24:MI:SS'), TO_CHAR(TRUNC(SYSDATE) + 18/24, 'YYYY-MM-DD HH24:MI:SS')) AS horario_func_fim,

    /*-- Conversão do horário de início em hora decimal (ex: 8.5 = 8h30)
    CASE 
        WHEN sigitm_1_2.tbl_ti.tqi_horario_inicio IS NULL THEN 8.0 
        ELSE EXTRACT(HOUR FROM sigitm_1_2.tbl_ti.tqi_horario_inicio) + EXTRACT(MINUTE FROM sigitm_1_2.tbl_ti.tqi_horario_inicio)/60.0 
    END AS inicio_exp,
*/
    CASE 
        WHEN 
            (CASE 
                WHEN sigitm_1_2.tbl_ti.tqi_horario_fim IS NULL THEN 18.0 
                ELSE EXTRACT(HOUR FROM sigitm_1_2.tbl_ti.tqi_horario_fim) + EXTRACT(MINUTE FROM sigitm_1_2.tbl_ti.tqi_horario_fim)/60.0 
            END) IN (0, 1, 2)
        THEN 
            (CASE 
                WHEN sigitm_1_2.tbl_ti.tqi_horario_fim IS NULL THEN 18.0 
                ELSE EXTRACT(HOUR FROM sigitm_1_2.tbl_ti.tqi_horario_fim) + EXTRACT(MINUTE FROM sigitm_1_2.tbl_ti.tqi_horario_fim)/60.0 
            END)
        ELSE 
            (CASE 
                WHEN sigitm_1_2.tbl_ti.tqi_horario_inicio IS NULL THEN 8.0 
                ELSE EXTRACT(HOUR FROM sigitm_1_2.tbl_ti.tqi_horario_inicio) + EXTRACT(MINUTE FROM sigitm_1_2.tbl_ti.tqi_horario_inicio)/60.0 
            END)
    END AS inicio_exp,

   /* -- Conversão do horário de fim em hora decimal
    CASE 
        WHEN sigitm_1_2.tbl_ti.tqi_horario_fim IS NULL THEN 18.0 
        ELSE EXTRACT(HOUR FROM sigitm_1_2.tbl_ti.tqi_horario_fim) + EXTRACT(MINUTE FROM sigitm_1_2.tbl_ti.tqi_horario_fim)/60.0 
    END AS fim_exp,*/
    
    ROUND (CASE 
        WHEN 
            (
                CASE 
                    WHEN sigitm_1_2.tbl_ti.tqi_horario_fim IS NULL THEN 18.0 
                    ELSE EXTRACT(HOUR FROM sigitm_1_2.tbl_ti.tqi_horario_fim) + EXTRACT(MINUTE FROM sigitm_1_2.tbl_ti.tqi_horario_fim) / 60.0 
                END
            ) IN (0, 1, 2)
        THEN 
            (
                CASE 
                    WHEN sigitm_1_2.tbl_ti.tqi_horario_inicio IS NULL THEN 8.0 
                    ELSE EXTRACT(HOUR FROM sigitm_1_2.tbl_ti.tqi_horario_inicio) + EXTRACT(MINUTE FROM sigitm_1_2.tbl_ti.tqi_horario_inicio) / 60.0 
                END
            )
        ELSE 
            (
                CASE 
                    WHEN sigitm_1_2.tbl_ti.tqi_horario_fim IS NULL THEN 18.0 
                    ELSE 
                        CASE 
                            WHEN EXTRACT(HOUR FROM sigitm_1_2.tbl_ti.tqi_horario_fim) + EXTRACT(MINUTE FROM sigitm_1_2.tbl_ti.tqi_horario_fim) / 60.0 = 0 
                            THEN 23.9833333333333 
                            ELSE EXTRACT(HOUR FROM sigitm_1_2.tbl_ti.tqi_horario_fim) + EXTRACT(MINUTE FROM sigitm_1_2.tbl_ti.tqi_horario_fim) / 60.0 
                        END
                END
            )
    END, 2) AS fim_exp,   

    -- Tempo total de vida do item (em minutos)
    ROUND(
        (sigitm_1_2.tbl_vidas_ti.vdi_data_fim - sigitm_1_2.tbl_vidas_ti.vdi_data_inicio) * 1440,
        2
        ) AS tmr_total
        

-- Junção de tabelas
FROM 
    sigitm_1_2.tbl_vidas_ti
    LEFT JOIN sigitm_1_2.tbl_grupos ON sigitm_1_2.tbl_grupos.grp_codigo = sigitm_1_2.tbl_vidas_ti.vdi_grupo
    LEFT JOIN sigitm_1_2.tbl_ti ON sigitm_1_2.tbl_ti.tqi_codigo = sigitm_1_2.tbl_vidas_ti.vdi_ti
    LEFT JOIN sigitm_1_2.tbl_diagnostico ON sigitm_1_2.tbl_diagnostico.dgn_id = sigitm_1_2.tbl_ti.tqi_diagnostico

-- Filtro de região e período de análise
            WHERE sigitm_1_2.tbl_ti.tqi_estado_codigo IN ('MS', 'GO', 'MA', 'AM', 'MT', 'PA', 'AP', 'DF', 'TO', 'RO', 'AC', 'RR','')
                AND TQI_DATA_ENCERRAMENTO BETWEEN TO_DATE(:startDate, 'YYYY-MM-DD') AND TO_DATE(:endDate, 'YYYY-MM-DD')
        `, [startDate, endDate]);

        const data = result.rows;

        // Definindo os cabeçalhos manualmente
        const headers = [
            "MES_ENCERRAMENTO",
            "VDI_CODIGO",
            "ID_CIRCUITO",
            "TQI_CODIGO",
            "TQI_RAIZ",
            "STATUS",
            "PROCEDENCIA",
            "CIDADE",
            "UF",
            "NOM_CLUSTER",
            "ESTADO",
            "ORIGEM",
            "PRODUTO",
            "GRUO_BAIXA",
            "GRP_CODIGO",
            "GRP_NOME",
            "TQI_DIAGNOSTICO",
            "DGN_DESCRICAO",
            "TQI_ABERTURA",
            "TQI_ENCERRAMENTO",
            "VDI_DATA_INICIO",
            "VDI_DATA_FIM",
            "VDI_HORA_INICIO",
            "VDI_HORA_FIM",
            "HORARIO_FUNC_INICIO",
            "HORARIO_FUNC_FIM",
            "INICIO_EXP",
            "FIM_EXP",
            "TMR_TOTAL"
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