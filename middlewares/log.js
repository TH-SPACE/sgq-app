// ✅ Middleware de log personalizado
function logMiddleware(req, res, next) {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
      req.socket.remoteAddress;
    const user = req.session?.usuario?.email || "visitante";

    console.log(
      `[${user}] [${ip}] [${req.method}] ${req.originalUrl} ${res.statusCode} - ${duration} ms`
    );
  });

  next();
}

module.exports = { logMiddleware };