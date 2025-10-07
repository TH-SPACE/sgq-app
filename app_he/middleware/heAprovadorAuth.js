
// Middleware para verificar se o usuário tem perfil de Aprovador de HE

function requireAprovadorHE(req, res, next) {
    const ip = req.ip;
    const route = req.originalUrl;
    const user = req.session.usuario;
    const perfil = user?.perfil || '';

    if (user && perfil.includes('HE_APROVADOR')) {
        console.log(`[SUCESSO_APROVADOR] Usuário: ${user.nome}, IP: ${ip}, Rota: ${route}`);
        return next();
    } else {
        console.log(`[FALHA_APROVADOR] Usuário: ${user?.nome || 'desconhecido'}, IP: ${ip}, Rota: ${route}, Motivo: Acesso negado. Perfil '${perfil}' não contém 'HE_APROVADOR'.`);
        // Para chamadas de API, retorna JSON. Para páginas, redireciona.
        if (req.accepts('html')) {
            return res.status(403).send("<h1>Acesso Negado</h1><p>Você não tem permissão para acessar esta página.</p>");
        }
        return res.status(403).json({ erro: "Acesso negado. Você não tem permissão para executar esta ação." });
    }
}

module.exports = { requireAprovadorHE };
