// ✅ CORRETO
function requireHEAuth(req, res, next) {
    const ip = req.ip;
    const route = req.originalUrl;
    const user = req.session.usuario;

    if (user) {
        console.log(`[SUCESSO] Usuário: ${user.nome || 'Nome não disponível'}, IP: ${ip}, Rota: ${route}`);
        return next();
    } else {
        const redirect = encodeURIComponent(req.originalUrl);
        console.log(`[FALHA] IP: ${ip}, Rota: ${route}, Motivo: Usuário não autenticado. Redirecionando para login.`);
        res.redirect(`/login?redirect=${redirect}`);
    }
}

module.exports = { requireHEAuth };