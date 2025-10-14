/**
 * 👔 Middleware de Autorização para Aprovadores de HE
 *
 * Este middleware verifica se o usuário possui perfil de aprovador de
 * Horas Extras (HE_APROVADOR) antes de permitir acesso às rotas restritas.
 *
 * @module middleware/heAprovadorAuth
 */

/**
 * Middleware que requer perfil de Aprovador de HE
 *
 * Verifica se o usuário autenticado possui o perfil 'HE_APROVADOR' em sua
 * string de perfis. Este perfil é necessário para aprovar/recusar solicitações
 * de horas extras.
 *
 * @param {Object} req - Objeto de requisição do Express
 * @param {Object} res - Objeto de resposta do Express
 * @param {Function} next - Função para passar para o próximo middleware
 *
 * @returns {Object} 403 - Acesso negado se o usuário não tiver o perfil adequado
 *
 * @example
 * router.post('/api/aprovar', requireAprovadorHE, aprovarSolicitacao);
 */
function requireAprovadorHE(req, res, next) {
    const ip = req.ip; // IP do cliente
    const route = req.originalUrl; // URL completa da rota acessada
    const user = req.session.usuario; // Dados do usuário na sessão
    const perfil = user?.perfil || ''; // Perfil do usuário (pode conter múltiplos separados por vírgula)

    // Verifica se o usuário está autenticado e possui perfil HE_APROVADOR
    if (user && perfil.includes('HE_APROVADOR')) {
        console.log(`[SUCESSO_APROVADOR] Usuário: ${user.nome}, IP: ${ip}, Rota: ${route}`);
        return next(); // Permite o acesso à rota
    } else {
        console.log(`[FALHA_APROVADOR] Usuário: ${user?.nome || 'desconhecido'}, IP: ${ip}, Rota: ${route}, Motivo: Acesso negado. Perfil '${perfil}' não contém 'HE_APROVADOR'.`);

        // Para chamadas de API, retorna JSON. Para páginas HTML, retorna HTML
        if (req.accepts('html')) {
            return res.status(403).send("<h1>Acesso Negado</h1><p>Você não tem permissão para acessar esta página.</p>");
        }

        return res.status(403).json({ erro: "Acesso negado. Você não tem permissão para executar esta ação." });
    }
}

module.exports = { requireAprovadorHE };
