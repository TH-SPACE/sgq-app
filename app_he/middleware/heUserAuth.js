/**
 * 👤 Middleware de Autorização para Usuários de HE
 *
 * Este middleware verifica se o usuário possui perfil de usuário de
 * Horas Extras (HE_USER) antes de permitir acesso às rotas restritas.
 * Este perfil permite enviar e gerenciar solicitações próprias de HE.
 *
 * @module middleware/heUserAuth
 */

const path = require('path');

/**
 * Middleware que requer perfil de Usuário de HE
 *
 * Verifica se o usuário autenticado possui o perfil 'HE_USER' em sua
 * string de perfis. Este perfil permite que o usuário envie solicitações
 * de horas extras para sua equipe.
 *
 * Diferentemente de outros middlewares, quando o acesso é negado:
 * - Para HTML: redireciona para rota de logout com mensagem de acesso negado
 * - Para API: destrói a sessão e retorna erro 403
 *
 * @param {Object} req - Objeto de requisição do Express
 * @param {Object} res - Objeto de resposta do Express
 * @param {Function} next - Função para passar para o próximo middleware
 *
 * @returns {Object} 403 - Acesso negado e sessão destruída
 *
 * @example
 * router.post('/enviar-multiplo', requireHEUser, enviarSolicitacoes);
 */
function requireHEUser(req, res, next) {
    const ip = req.ip; // IP do cliente
    const route = req.originalUrl; // URL completa da rota acessada
    const user = req.session.usuario; // Dados do usuário na sessão
    const perfil = user?.perfil || ''; // Perfil do usuário

    // Verifica se o usuário está autenticado e possui perfil HE_USER
    if (user && perfil.includes('HE_USER')) {
        // Opcional: log de sucesso (comentado para reduzir verbosidade)
        // console.log(`[SUCESSO_HE_USER] Usuário: ${user.nome}, IP: ${ip}, Rota: ${route}`);
        return next(); // Permite o acesso à rota
    } else {
        // Opcional: log de falha (comentado para reduzir verbosidade)
        // console.log(`[FALHA_HE_USER] Usuário: ${user?.nome || 'desconhecido'}, IP: ${ip}, Rota: ${route}, Motivo: Acesso negado. Perfil '${perfil}' não contém 'HE_USER'.`);

        // Para páginas HTML, redireciona para rota de logout especial
        if (req.accepts('html')) {
            return res.redirect('/logout-acesso-negado');
        }

        // Para chamadas de API, destroi a sessão e retorna JSON
        req.session.destroy((err) => {
            if (err) {
                console.error("Erro ao destruir a sessão para API:", err);
            }
            res.status(403).json({ erro: "Acesso negado. Você foi desconectado." });
        });
    }
}

module.exports = { requireHEUser };
