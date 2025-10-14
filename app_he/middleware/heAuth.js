/**
 * 🔐 Middleware de Autenticação para App HE
 *
 * Este middleware verifica se o usuário está autenticado antes de permitir
 * acesso às rotas do sistema de planejamento de Horas Extras.
 *
 * @module middleware/heAuth
 */

/**
 * Middleware que requer autenticação básica do usuário
 *
 * Verifica se existe uma sessão ativa do usuário. Se autenticado, permite
 * o acesso à rota. Caso contrário, redireciona para a página de login
 * preservando a URL de destino para redirecionamento após login.
 *
 * @param {Object} req - Objeto de requisição do Express
 * @param {Object} res - Objeto de resposta do Express
 * @param {Function} next - Função para passar para o próximo middleware
 *
 * @example
 * router.get('/planejamento-he', requireHEAuth, (req, res) => { ... });
 */
function requireHEAuth(req, res, next) {
    const ip = req.ip; // IP do cliente
    const route = req.originalUrl; // URL completa da rota acessada
    const user = req.session.usuario; // Dados do usuário na sessão

    // Verifica se o usuário está autenticado (possui sessão ativa)
    if (user) {
        console.log(`[SUCESSO] Usuário: ${user.nome || 'Nome não disponível'}, IP: ${ip}, Rota: ${route}`);
        return next(); // Permite o acesso à rota
    } else {
        // Armazena a URL original para redirecionar após login
        const redirect = encodeURIComponent(req.originalUrl);
        console.log(`[FALHA] IP: ${ip}, Rota: ${route}, Motivo: Usuário não autenticado. Redirecionando para login.`);

        // Redireciona para login com parâmetro redirect
        res.redirect(`/login?redirect=${redirect}`);
    }
}

module.exports = { requireHEAuth };