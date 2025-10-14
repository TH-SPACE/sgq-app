// 🏢 Middleware para verificar acesso por DIRETORIA (ENGENHARIA ou IMPLANTACAO)

/**
 * Extrai a diretoria do perfil do usuário
 * @param {string} perfil - Perfil do usuário (ex: "HE_ENGENHARIA" ou "HE_APROVADOR,HE_IMPLANTACAO")
 * @returns {string|null} - 'ENGENHARIA', 'IMPLANTACAO' ou null
 */
function extrairDiretoriaDoPerfil(perfil) {
    if (!perfil) return null;

    if (perfil.includes('HE_ENGENHARIA')) return 'ENGENHARIA';
    if (perfil.includes('HE_IMPLANTACAO')) return 'IMPLANTACAO';

    return null;
}

/**
 * Middleware genérico que valida se o usuário tem perfil HE de uma diretoria específica
 * @param {string} diretoria - 'ENGENHARIA' ou 'IMPLANTACAO'
 */
function requireDiretoria(diretoria) {
    return (req, res, next) => {
        const ip = req.ip;
        const route = req.originalUrl;
        const user = req.session.usuario;
        const perfil = user?.perfil || '';
        const diretoriaUsuario = extrairDiretoriaDoPerfil(perfil);

        // Verifica se tem perfil HE da diretoria específica
        if (user && diretoriaUsuario === diretoria) {
            console.log(`[SUCESSO_${diretoria}] Usuário: ${user.nome}, IP: ${ip}, Rota: ${route}`);
            return next();
        } else {
            console.log(`[FALHA_${diretoria}] Usuário: ${user?.nome || 'desconhecido'}, IP: ${ip}, Rota: ${route}, Motivo: Acesso negado. Perfil '${perfil}' não autorizado para ${diretoria}.`);

            // Para chamadas de API, retorna JSON
            if (req.accepts('json') && !req.accepts('html')) {
                return res.status(403).json({
                    erro: `Acesso negado. Você não tem permissão para acessar dados da ${diretoria}.`
                });
            }

            // Para páginas HTML, redireciona
            return res.redirect('/logout-acesso-negado');
        }
    };
}

/**
 * Middleware que permite acesso a qualquer usuário HE (ENGENHARIA ou IMPLANTACAO)
 * Adiciona a diretoria do usuário no req para uso posterior
 */
function requireAnyHEDiretoria(req, res, next) {
    const ip = req.ip;
    const route = req.originalUrl;
    const user = req.session.usuario;
    const perfil = user?.perfil || '';
    const diretoriaUsuario = extrairDiretoriaDoPerfil(perfil);

    // Verifica se tem perfil HE_ENGENHARIA ou HE_IMPLANTACAO
    if (user && diretoriaUsuario) {
        // Adiciona a diretoria no request para uso nos controllers
        req.diretoriaHE = diretoriaUsuario;
        console.log(`[SUCESSO_HE] Usuário: ${user.nome}, Diretoria: ${diretoriaUsuario}, IP: ${ip}, Rota: ${route}`);
        return next();
    } else {
        console.log(`[FALHA_HE] Usuário: ${user?.nome || 'desconhecido'}, IP: ${ip}, Rota: ${route}, Motivo: Sem perfil HE ou diretoria não definida.`);

        // Para chamadas de API, destroi a sessão e retorna JSON
        if (req.accepts('json') && !req.accepts('html')) {
            req.session.destroy((err) => {
                if (err) console.error("Erro ao destruir a sessão:", err);
                return res.status(403).json({ erro: "Acesso negado. Você foi desconectado." });
            });
        } else {
            // Para páginas HTML, redireciona
            return res.redirect('/logout-acesso-negado');
        }
    }
}

/**
 * Middleware para aprovadores - veem apenas sua diretoria
 */
function requireAprovadorComDiretoria(req, res, next) {
    const ip = req.ip;
    const route = req.originalUrl;
    const user = req.session.usuario;
    const perfil = user?.perfil || '';
    const diretoriaUsuario = extrairDiretoriaDoPerfil(perfil);

    // Aprovador deve ter perfil HE_APROVADOR e diretoria definida (ex: "HE_APROVADOR,HE_ENGENHARIA")
    if (user && perfil.includes('HE_APROVADOR') && diretoriaUsuario) {
        // Adiciona a diretoria do aprovador no request
        req.diretoriaHE = diretoriaUsuario;
        console.log(`[SUCESSO_APROVADOR] Usuário: ${user.nome}, Diretoria: ${diretoriaUsuario}, IP: ${ip}, Rota: ${route}`);
        return next();
    } else {
        console.log(`[FALHA_APROVADOR] Usuário: ${user?.nome || 'desconhecido'}, IP: ${ip}, Rota: ${route}, Motivo: Sem perfil de aprovador ou diretoria não definida. Perfil atual: '${perfil}'`);

        if (req.accepts('html')) {
            return res.status(403).send("<h1>Acesso Negado</h1><p>Você não tem permissão para acessar esta página.</p>");
        }
        return res.status(403).json({ erro: "Acesso negado. Você não tem permissão para executar esta ação." });
    }
}

module.exports = {
    extrairDiretoriaDoPerfil,
    requireDiretoria,
    requireAnyHEDiretoria,
    requireAprovadorComDiretoria,
    // Atalhos para facilitar uso nas rotas
    requireEngenharia: requireDiretoria('ENGENHARIA'),
    requireImplantacao: requireDiretoria('IMPLANTACAO')
};
