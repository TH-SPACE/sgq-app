const path = require("path");

/**
 * Middleware que verifica se o usuário está logado e tem o perfil 'USER'
 * 
 * Este middleware combina a verificação de login e o perfil de usuário em uma única função
 */
function verificaThanosUser(req, res, next) {
    // Verifica se o usuário está logado
    if (!req.session.usuario) {
        const redirect = encodeURIComponent(req.originalUrl);
        return res.redirect(`/login?redirect=${redirect}`);
    }

    // Verifica se o usuário tem o perfil 'USER' ou qualquer perfil que contenha 'USER'
    const perfilUsuario = req.session.usuario.perfil;
    if (!perfilUsuario || !perfilUsuario.includes("USER")) {
        // Se não tiver o perfil adequado, redireciona para página de acesso negado
        return res.sendFile(path.join(__dirname, "../views", "acesso_negado.html"));
    }

    // Se passar por todas as verificações, permite a continuação
    next();
}

module.exports = {
    verificaThanosUser
};