// ================================================================================
// 🧪 TESTE SIMPLES - Leitura Direta da Tabela Frequencia
// ================================================================================
// Este script faz uma consulta direta à tabela de frequencia para verificar
// se há registros de horas executadas para o gerente especificado
// ================================================================================

const db = require("../../db/db");
const configFrequencia = require("../json/config_frequencia.json");

async function testarLeituraFrequencia() {
    const conexao = db.mysqlPool;
    const colunas = configFrequencia.tabela_frequencia.colunas_obrigatorias;
    const nomeTabela = configFrequencia.tabela_frequencia.nome;

    try {
        console.log("🔍 Testando leitura direta da tabela frequência...\n");
        
        // Verificar se a tabela existe e tem estrutura correta
        const [tabelas] = await conexao.query(`SHOW TABLES LIKE '${nomeTabela}'`);
        if (tabelas.length === 0) {
            console.log(`❌ Tabela ${nomeTabela} não encontrada no banco de dados.`);
            return;
        }

        console.log(`✅ Tabela ${nomeTabela} encontrada.`);
        
        // Consulta para verificar as horas executadas para o gerente específico
        const gerenteBuscado = "FRANCISCO ARMANDO BURKO LIMA";
        const mesBuscado = 10; // Outubro
        
        console.log(`🔍 Buscando registros para o gerente: ${gerenteBuscado}`);
        console.log(`📅 Mês: ${mesBuscado} (Outubro)\n`);
        
        // Primeiro, vamos ver a estrutura da tabela
        const [estrutura] = await conexao.query(`DESCRIBE ${nomeTabela}`);
        console.log("📋 Estrutura da tabela:", estrutura.map(c => c.Field).join(", "));
        
        // Consulta para verificar todos os registros para o gerente
        const query = `
            SELECT 
                ${colunas[0]} as NOME,
                ${colunas[1]} as CARGO,
                ${colunas[2]} as EVENTO,
                ${colunas[3]} as GERENTE,
                ${colunas[4]} as QTD_HORAS,
                ${colunas[5]} as DATA
            FROM ${nomeTabela}
            WHERE ${colunas[3]} = ? 
                AND MONTH(${colunas[5]}) = ?
        `;
        
        const [registros] = await conexao.query(query, [gerenteBuscado, mesBuscado]);
        
        console.log(`\n📊 Encontrados ${registros.length} registros para o gerente no mês ${mesBuscado}:`);
        if (registros.length > 0) {
            registros.forEach((reg, index) => {
                console.log(`${index + 1}. ${reg.NOME} - ${reg.EVENTO} - ${reg.QTD_HORAS} horas - ${reg.DATA}`);
            });
            
            // Calcular totais por tipo de hora
            const total50 = registros
                .filter(r => r.EVENTO === 'Hora Extra 50%')
                .reduce((sum, r) => sum + parseFloat(r.QTD_HORAS || 0), 0);
                
            const total100 = registros
                .filter(r => r.EVENTO === 'Horas extra 100%')
                .reduce((sum, r) => sum + parseFloat(r.QTD_HORAS || 0), 0);
                
            console.log(`\n📈 Totais para ${gerenteBuscado}:`);
            console.log(`   Hora Extra 50%: ${total50} horas`);
            console.log(`   Horas extra 100%: ${total100} horas`);
            console.log(`   Total executado: ${total50 + total100} horas`);
        } else {
            console.log("   ❌ Nenhum registro encontrado para este gerente no mês especificado.");
        }
        
        // Vamos também verificar se há registros para outros gerentes no mesmo mês
        console.log(`\n🔍 Verificando registros para outros gerentes no mês ${mesBuscado}:`);
        const queryOutros = `
            SELECT 
                ${colunas[3]} as GERENTE,
                ${colunas[2]} as EVENTO,
                ${colunas[4]} as QTD_HORAS,
                COUNT(*) as TOTAL_REGISTROS
            FROM ${nomeTabela}
            WHERE MONTH(${colunas[5]}) = ?
            GROUP BY ${colunas[3]}, ${colunas[2]}
            ORDER BY ${colunas[3]}, ${colunas[2]}
        `;
        
        const [outrosRegistros] = await conexao.query(queryOutros, [mesBuscado]);
        if (outrosRegistros.length > 0) {
            console.log("   Gerentes com registros no mês:");
            outrosRegistros.forEach((reg, index) => {
                console.log(`   ${index + 1}. ${reg.GERENTE} - ${reg.EVENTO}: ${reg.QTD_HORAS} horas (${reg.TOTAL_REGISTROS} registros)`);
            });
        } else {
            console.log("   ❌ Nenhum registro encontrado para nenhum gerente no mês.");
        }
        
    } catch (error) {
        console.error("❌ Erro ao testar leitura da tabela frequência:", error);
    } finally {
        console.log("\n🏁 Teste de leitura direta concluído.");
        process.exit();
    }
}

// Executa o teste
testarLeituraFrequencia();