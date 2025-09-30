// ✅ CORRETO
function requireHEAuth(req, res, next) {
    console.log("🔍 Acessando rota:", req.originalUrl);
    console.log("👤 Usuário na sessão:", req.session.usuario);

    if (req.session.usuario) {
        return next();
    }
    const redirect = encodeURIComponent(req.originalUrl);
    console.log("➡️ Redirecionando para login com:", redirect);
    res.redirect(`/login?redirect=${redirect}`);
}

module.exports = { requireHEAuth };