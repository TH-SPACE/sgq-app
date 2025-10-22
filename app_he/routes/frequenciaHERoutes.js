// ================================================================================
// 🛣️ ROTAS PARA COMPARATIVO DE FREQUÊNCIA VS PLANEJAMENTO DE HE
// ================================================================================
// Este arquivo define as rotas para o novo painel de comparação entre
// horas extras executadas (na tabela FREQUENCIA) e as previamente
// solicitadas/aprovadas no sistema de planejamento.
// ================================================================================

const express = require("express");
const router = express.Router();

// ================================================================================
// 🔐 Middlewares de Autenticação
// ================================================================================

const heAuth = require("../middleware/heAuth");
const heDiretoriaAuth = require("../middleware/heDiretoriaAuth");
const heAprovadorAuth = require("../middleware/heAprovadorAuth");

// ================================================================================
// 📊 Controller
// ================================================================================

const frequenciaController = require("../controllers/frequenciaHEController");

// ================================================================================
// 📈 APIs para o Dashboard de Frequência vs Planejamento
// ================================================================================

/**
 * GET /api/comparativo-frequencia
 * Retorna dados comparativos entre horas executadas e autorizadas por gerente
 * 
 * Middlewares: requireHEAuth, requireAnyHEDiretoria
 * Query params: mes (obrigatório), gerente (opcional)
 * Filtro: Por diretoria do usuário
 */
router.get("/api/comparativo-frequencia", 
    heAuth.requireHEAuth, 
    heDiretoriaAuth.requireAnyHEDiretoria, 
    frequenciaController.getComparativoFrequencia
);

/**
 * GET /api/comparativo-colaborador
 * Retorna dados comparativos detalhados por colaborador
 * 
 * Middlewares: requireHEAuth, requireAnyHEDiretoria
 * Query params: mes (obrigatório), gerente (opcional), colaborador (opcional)
 * Filtro: Por diretoria do usuário
 */
router.get("/api/comparativo-colaborador", 
    heAuth.requireHEAuth, 
    heDiretoriaAuth.requireAnyHEDiretoria, 
    frequenciaController.getComparativoPorColaborador
);

/**
 * GET /api/exportar-comparativo
 * Exporta dados comparativos em formato CSV
 * 
 * Middlewares: requireHEAuth, requireAnyHEDiretoria
 * Query params: mes (obrigatório), gerente (opcional)
 * Retorna: Arquivo CSV para download
 */
router.get("/api/exportar-comparativo", 
    heAuth.requireHEAuth, 
    heDiretoriaAuth.requireAnyHEDiretoria, 
    frequenciaController.exportarComparativo
);

module.exports = router;