// ================================================================================
// 🧪 TESTE DE INTEGRAÇÃO - Frequência vs Planejamento HE
// ================================================================================
// Este script realiza testes básicos para verificar se todas as funcionalidades
// do novo módulo de comparação estão funcionando corretamente.
// ================================================================================

const db = require("../../db/db");
const frequenciaController = require("./frequenciaHEController");

// Teste de validação da tabela FREQUENCIA
async function testarValidacaoTabela() {
    try {
        const conexao = db.mysqlPool;
        const resultado = await frequenciaController.validarTabelaFrequencia(conexao);
        console.log("Validação da tabela FREQUENCIA:", resultado ? "SUCESSO" : "FALHA");
        return resultado;
    } catch (error) {
        console.error("Erro ao testar validação da tabela:", error);
        return false;
    }
}

// Teste de requisição HTTP simulada para comparativo por gerente
async function testarRequisicaoComparativo() {
    // Criamos objetos simulados para req e res
    const mesAtual = new Date().toLocaleString('pt-BR', { month: 'long' });
    console.log("Mês atual para teste:", mesAtual);
    
    // Converter nome do mês para número correspondente (tratando maiúsculas/minúsculas)
    const meses = {
      'Janeiro': 1, 'Fevereiro': 2, 'Março': 3, 'Abril': 4, 'Maio': 5, 'Junho': 6,
      'Julho': 7, 'Agosto': 8, 'Setembro': 9, 'Outubro': 10, 'Novembro': 11, 'Dezembro': 12
    };
    
    // Converter para capitalizado para garantir correspondência
    const mesCapitalizado = mesAtual.charAt(0).toUpperCase() + mesAtual.slice(1).toLowerCase();
    const mesNumero = meses[mesCapitalizado];
    console.log("Número do mês para teste:", mesNumero);
    
    const req = {
        query: { mes: mesCapitalizado, gerente: "FRANCISCO ARMANDO BURKO LIMA" },
        diretoriaHE: "ENGENHARIA",  // Diretoria de teste
        session: {
            usuario: {
                nome: "ADMIN LOCAL",
                email: "admin@local"
            }
        },
        ip: "127.0.0.1"
    };

    // Objeto res simulado para capturar o resultado
    let resultadoJson = null;
    let statusCode = 200;

    const res = {
        json: (data) => { resultadoJson = data; },
        status: (code) => {
            statusCode = code;
            return res;
        },
        send: (data) => { resultadoJson = data; }
    };

    try {
        await frequenciaController.getComparativoFrequencia(req, res);
        console.log("Requisição comparativo:", statusCode === 200 ? "SUCESSO" : "FALHA", "- Status:", statusCode);
        if (resultadoJson) {
            console.log("Dados retornados:", Array.isArray(resultadoJson) ? `Array com ${resultadoJson.length} itens` : "Objeto");
            if (Array.isArray(resultadoJson) && resultadoJson.length > 0) {
                console.log("Primeiro resultado:", JSON.stringify(resultadoJson[0], null, 2));
            }
        } else {
            console.log("Nenhum dado retornado - pode indicar que não há dados correspondentes no banco de dados.");
        }
        return { sucesso: statusCode === 200, dados: resultadoJson };
    } catch (error) {
        console.error("Erro ao testar requisição:", error);
        return { sucesso: false, erro: error.message };
    }
}

// Teste de requisição HTTP simulada para comparativo por colaborador
async function testarRequisicaoComparativoPorColaborador() {
    // Criamos objetos simulados para req e res
    const mesAtual = new Date().toLocaleString('pt-BR', { month: 'long' });
    console.log("Mês atual para teste (detalhado):", mesAtual);
    
    // Converter nome do mês para número correspondente (tratando maiúsculas/minúsculas)
    const meses = {
      'Janeiro': 1, 'Fevereiro': 2, 'Março': 3, 'Abril': 4, 'Maio': 5, 'Junho': 6,
      'Julho': 7, 'Agosto': 8, 'Setembro': 9, 'Outubro': 10, 'Novembro': 11, 'Dezembro': 12
    };
    
    // Converter para capitalizado para garantir correspondência
    const mesCapitalizado = mesAtual.charAt(0).toUpperCase() + mesAtual.slice(1).toLowerCase();
    const mesNumero = meses[mesCapitalizado];
    console.log("Número do mês para teste (detalhado):", mesNumero);
    
    const req = {
        query: { mes: mesCapitalizado, gerente: "FRANCISCO ARMANDO BURKO LIMA" },
        diretoriaHE: "ENGENHARIA",  // Diretoria de teste
        session: {
            usuario: {
                nome: "ADMIN LOCAL",
                email: "admin@local"
            }
        },
        ip: "127.0.0.1"
    };

    // Objeto res simulado para capturar o resultado
    let resultadoJson = null;
    let statusCode = 200;

    const res = {
        json: (data) => { resultadoJson = data; },
        status: (code) => {
            statusCode = code;
            return res;
        },
        send: (data) => { resultadoJson = data; }
    };

    try {
        await frequenciaController.getComparativoPorColaborador(req, res);
        console.log("Requisição comparativo por colaborador:", statusCode === 200 ? "SUCESSO" : "FALHA", "- Status:", statusCode);
        if (resultadoJson) {
            console.log("Dados detalhados retornados:", Array.isArray(resultadoJson) ? `Array com ${resultadoJson.length} itens` : "Objeto");
            if (Array.isArray(resultadoJson) && resultadoJson.length > 0) {
                console.log("Primeiros 3 resultados detalhados:");
                resultadoJson.slice(0, 3).forEach((item, index) => {
                    console.log(`  ${index + 1}. ${item.colaborador} - Executado: ${item.executado_50 + item.executado_100}h, Autorizado: ${item.autorizado_50 + item.autorizado_100}h, Não Autorizado: ${item.nao_autorizado_50 + item.nao_autorizado_100}h`);
                });
            } else {
                console.log("Nenhum dado detalhado encontrado para o gerente.");
            }
        } else {
            console.log("Nenhum dado detalhado retornado - pode indicar que não há dados correspondentes no banco de dados.");
        }
        return { sucesso: statusCode === 200, dados: resultadoJson };
    } catch (error) {
        console.error("Erro ao testar requisição detalhada:", error);
        return { sucesso: false, erro: error.message };
    }
}

// Função principal de teste
async function executarTestes() {
    console.log("🧪 Iniciando testes de integração para Frequência vs Planejamento HE...\n");

    console.log("1. Testando validação da tabela FREQUENCIA...");
    const validacaoOk = await testarValidacaoTabela();

    if (validacaoOk) {
        console.log("\n2. Testando requisição de comparativo (por gerente)...");
        const resultadoReq = await testarRequisicaoComparativo();

        console.log("\n3. Testando requisição de comparativo detalhado (por colaborador)...");
        const resultadoDetalhado = await testarRequisicaoComparativoPorColaborador();

        if (resultadoReq.sucesso && resultadoDetalhado.sucesso) {
            console.log("\n✅ Todos os testes básicos passaram!");
            console.log("✅ O novo módulo de comparação está funcionando corretamente.");
            
            // Comparar resultados agregados vs detalhados
            if (Array.isArray(resultadoReq.dados) && resultadoReq.dados.length > 0 && 
                Array.isArray(resultadoDetalhado.dados) && resultadoDetalhado.dados.length > 0) {
                
                const dadosGerente = resultadoReq.dados[0];
                const totalExecutadoDetalhado = resultadoDetalhado.dados.reduce((sum, item) => 
                    sum + (item.executado_50 + item.executado_100), 0);
                const totalAutorizadoDetalhado = resultadoDetalhado.dados.reduce((sum, item) => 
                    sum + (item.autorizado_50 + item.autorizado_100), 0);
                
                console.log("\n📊 Comparação de resultados:");
                console.log(`   Agregado (por gerente): Executado=${dadosGerente.total_executado}h, Autorizado=${dadosGerente.total_autorizado}h`);
                console.log(`   Detalhado (por colaborador): Executado=${totalExecutadoDetalhado.toFixed(2)}h, Autorizado=${totalAutorizadoDetalhado.toFixed(2)}h`);
                
                if (Math.abs(dadosGerente.total_executado - totalExecutadoDetalhado) > 0.01 ||
                    Math.abs(dadosGerente.total_autorizado - totalAutorizadoDetalhado) > 0.01) {
                    console.log("⚠️  Diferença detectada entre valores agregados e detalhados!");
                    console.log("💡 Isso pode indicar inconsistência entre as tabelas FREQUENCIA e PLANEJAMENTO_HE.");
                }
            }
        } else {
            console.log("\n⚠️  Alguma requisição falhou, mas a validação da tabela está ok.");
            console.log("💡 Possivelmente não há dados para o mês/gerente selecionado.");
        }
    } else {
        console.log("\n❌ A validação da tabela FREQUENCIA falhou.");
        console.log("💡 Verifique se a tabela FREQUENCIA existe com as colunas corretas no banco de dados.");
    }

    console.log("\n🏁 Testes finalizados.");
    process.exit();
}

// Executa os testes automaticamente se este script for chamado diretamente
if (require.main === module) {
    executarTestes();
}

module.exports = {
    testarValidacaoTabela,
    testarRequisicaoComparativo,
    testarRequisicaoComparativoPorColaborador,
    executarTestes
};