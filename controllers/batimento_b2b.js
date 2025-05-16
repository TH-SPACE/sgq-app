const axios = require('axios');
const cheerio = require('cheerio');
const { mysqlPool } = require("../db/db");

const url = 'http://10.59.112.107/percepcaob2b/table';

const mapearUf = {
    PA: "BELEM",
    AP: "MANAUS",
    DF: "BRASILIA",
    AC: "CAMPO GRANDE",
    MS: "CAMPO GRANDE",
    RO: "CAMPO GRANDE",
    MT: "CUIABA",
    GO: "GOIANIA",
    TO: "PALMAS",
    AM: "MANAUS",
    RR: "MANAUS",
    MA: "SAO LUIS",
};

const mapearAliada = {
    'Bucle Centro Oeste ABILITY': "ABILITY",
    'Bucle Centro Oeste ONDACOM': "ONDACOM",
    'OSP CENTRO- OESTE B2B': "OSP CENTRO-OESTE B2B",
    'Rede Externa Ondacom CO-NO': "ONDACOM",
    'Rede Externa Ability CO - NO': "ABILITY",

}

async function buscarTabela(req, res) {
    try {
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);

        const tabela = [];

        $("table tbody tr").each((index, element) => {
            
            const colunas = $(element).find("td");

            const cidade = $(colunas[15]).text().trim();

            const uf = $(colunas[16]).text().trim();

            const clusterOriginal = $(colunas[17]).text().trim();

            // Se houver mapeamento para o UF, substitui cluster — senão mantém o cluster original
            let clusterTratado = mapearUf[uf] || clusterOriginal;

            if (cidade === "ANAPOLIS") {
                clusterTratado = "ANAPOLIS"
            } else if (cidade === "JARAGUA") {
                clusterTratado = "ANAPOLIS"
            } else if (cidade === "LUZIANIA") {
                clusterTratado = "BRASILIA"
            } else if (cidade === "CIDADE OCIDENTAL") {
                clusterTratado = "BRASILIA"
            } else if (cidade === "FORMOSA") {
                clusterTratado = "BRASILIA"
            }

            const grupoResponsavel = $(colunas[33]).text().trim();

            let aliada = mapearAliada[grupoResponsavel] || grupoResponsavel;

            if (aliada === "LP_FSP" && (clusterTratado === "BELEM" || clusterTratado === "SAO LUIS" || clusterTratado === "MANAUS")) {
                aliada = "TEL"
            } else if (grupoResponsavel === "LP_FSP" && (clusterTratado === "CAMPO GRANDE" || clusterTratado === "GOIANIA" || clusterTratado === "CUIABA" || clusterTratado === "BRASILIA")) {
                aliada = "TELEMONT"
            }

            const registro = {
                bd: $(colunas[0]).text().trim(),
                bd_raiz: $(colunas[1]).text().trim(),
                status_nome: $(colunas[5]).text().trim(),
                procedencia: $(colunas[6]).text().trim(),
                reclamacao: $(colunas[7]).text().trim(),
                cliente_nome: $(colunas[11]).text().trim(),
                cidade: cidade,
                uf: uf,
                cluster: clusterTratado,
                regional: $(colunas[18]).text().trim(),
                lp_15: $(colunas[20]).text().trim(),
                designador_lp_13: $(colunas[21]).text().trim(),
                data_abertura: $(colunas[27]).text().trim(),
                grupo_responsavel: grupoResponsavel,
                armario: $(colunas[47]).text().trim(),
                ALIADA: aliada,
            };

            tabela.push(registro);
        });

        // Iterar e salvar no banco
        tabela.forEach(registro => {
            const query = `
        INSERT INTO backlog_b2b_av 
        (bd, bd_raiz, status_nome, procedencia, reclamacao, cliente_nome, cidade, uf, cluster, regional, lp_15, designador_lp_13, data_abertura, grupo_responsavel, armario, ALIADA)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ON DUPLICATE KEY UPDATE 
        status_nome = VALUES(status_nome),
        procedencia = VALUES(procedencia),
        reclamacao = VALUES(reclamacao),
        cliente_nome = VALUES(cliente_nome),
        cidade = VALUES(cidade),
        uf = VALUES(uf),
        cluster = VALUES(cluster),
        regional = VALUES(regional),
        lp_15 = VALUES(lp_15),
        designador_lp_13 = VALUES(designador_lp_13),
        data_abertura = VALUES(data_abertura),
        grupo_responsavel = VALUES(grupo_responsavel),
        armario = VALUES(armario),
        ALIADA = VALUES(ALIADA),
        status_ordem = 'ativo',
        data_atualizacao = CURRENT_TIMESTAMP;
      `;

            const valores = [
                registro.bd, registro.bd_raiz, registro.status_nome, registro.procedencia, registro.reclamacao,
                registro.cliente_nome, registro.cidade, registro.uf, registro.cluster, registro.regional,
                registro.lp_15, registro.designador_lp_13, registro.data_abertura, registro.grupo_responsavel,
                registro.armario, registro.ALIADA
            ];

            mysqlPool.query(query, valores)
                .catch((error) => {
                    console.error("Erro ao inserir registro:", error);
                });
        });

        res.status(200).json({
            mensagem: 'Tabela capturada e processada com sucesso!',
            total: tabela.length
        });

    } catch (error) {
        console.error('Erro ao buscar tabela:', error);
        res.status(500).json({ erro: 'Erro ao buscar tabela' });
    }
}


module.exports = {
    buscarTabela
};
