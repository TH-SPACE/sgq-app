const path = require('path');

// Middleware para verificar se o usuário tem perfil de HE_USER

function requireHEUser(req, res, next) {
    const ip = req.ip;
    const route = req.originalUrl;
    const user = req.session.usuario;
    const perfil = user?.perfil || '';

    if (user && perfil.includes('HE_USER')) {
        // Opcional: log de sucesso
        // console.log(`[SUCESSO_HE_USER] Usuário: ${user.nome}, IP: ${ip}, Rota: ${route}`);
        return next();
    } else {
        // Opcional: log de falha
        // console.log(`[FALHA_HE_USER] Usuário: ${user?.nome || 'desconhecido'}, IP: ${ip}, Rota: ${route}, Motivo: Acesso negado. Perfil '${perfil}' não contém 'HE_USER'.`);
        
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
