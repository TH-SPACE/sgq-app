const path = require("path");

function verificaLogin(req, res, next) {
    if (!req.session.usuario) {
        const redirect = encodeURIComponent(req.originalUrl);
        return res.redirect(`/login?redirect=${redirect}`);
    }
    next();
}

function verificaADM(req, res, next) {
    if (!req.session.usuario) {
        const redirect = encodeURIComponent(req.originalUrl);
        return res.redirect(`/login?redirect=${redirect}`);
    }
    if (!req.session.usuario.perfil.includes("ADM")) {
        return res.sendFile(path.join(__dirname, "../views", "acesso_negado.html"));
    }
    next();
}

function verificaUSER(req, res, next) {
    if (!req.session.usuario || !req.session.usuario.perfil.includes("USER")) {
        return res.redirect('/logout-acesso-negado');
    }
    next();
}

module.exports = {
    verificaLogin,
    verificaADM,
    verificaUSER,
};
