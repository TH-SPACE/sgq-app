// 🏢 Middleware para verificar acesso por DIRETORIA (ENGENHARIA ou IMPLANTACAO)
// ================================================================================
// Este módulo contém middlewares de autenticação baseados em diretoria para o
// sistema de Hora Extra (HE). Permite controlar acesso granular por diretoria
// (Engenharia ou Implantação) através da análise do perfil do usuário.
// ================================================================================

/**
 * 🔍 Extrai a diretoria do perfil do usuário
 *
 * Analisa a string de perfil do usuário para identificar a qual diretoria ele pertence.
 * O perfil pode conter múltiplos valores separados por vírgula (ex: "HE_APROVADOR,HE_ENGENHARIA").
 *
 * @param {string} perfil - Perfil do usuário (ex: "HE_ENGENHARIA" ou "HE_APROVADOR,HE_IMPLANTACAO")
 * @returns {string|null} - 'ENGENHARIA', 'IMPLANTACAO' ou null se não identificado
 *
 * @example
 * extrairDiretoriaDoPerfil("HE_ENGENHARIA") // retorna "ENGENHARIA"
 * extrairDiretoriaDoPerfil("HE_APROVADOR,HE_IMPLANTACAO") // retorna "IMPLANTACAO"
 * extrairDiretoriaDoPerfil("OUTRO_PERFIL") // retorna null
 */
function extrairDiretoriaDoPerfil(perfil) {
  // Verifica se o perfil foi fornecido
  if (!perfil) return null;

  // Verifica se o perfil contém referência à diretoria de Engenharia
  if (perfil.includes("HE_ENGENHARIA")) return "ENGENHARIA";

  // Verifica se o perfil contém referência à diretoria de Implantação
  if (perfil.includes("HE_IMPLANTACAO")) return "IMPLANTACAO";

  // Retorna null se nenhuma diretoria foi identificada
  return null;
}

/**
 * 🔓 Middleware que permite acesso a qualquer usuário HE (ENGENHARIA ou IMPLANTACAO)
 *
 * Valida se o usuário possui perfil HE de qualquer diretoria (não restringe a uma específica).
 * Adiciona a propriedade `req.diretoriaHE` contendo a diretoria do usuário para que
 * os controllers possam filtrar dados e aplicar regras de negócio específicas.
 *
 * @param {Object} req - Request Express
 * @param {Object} res - Response Express
 * @param {Function} next - Next middleware
 *
 * Comportamento:
 * - Se autorizado: Define req.diretoriaHE e chama next()
 * - Se não autorizado (API): Destrói sessão e retorna 403
 * - Se não autorizado (HTML): Redireciona para /logout-acesso-negado
 *
 * Uso nos controllers:
 * - req.diretoriaHE conterá 'ENGENHARIA' ou 'IMPLANTACAO'
 * - Permite filtrar consultas SQL por diretoria
 */
function requireAnyHEDiretoria(req, res, next) {
  // Coleta informações para logging e auditoria
  const ip = req.ip;
  const route = req.originalUrl;
  const user = req.session.usuario;
  const perfil = user?.perfil || "";

  // DEBUG: Log para verificar o perfil exato na sessão
  //   console.log(
  //     `[DEBUG_PERFIL] Perfil na sessão para ${user?.email}: '${perfil}'`
  //   );
  const diretoriaUsuario = extrairDiretoriaDoPerfil(perfil);

  // Verifica se o usuário tem perfil HE_ENGENHARIA ou HE_IMPLANTACAO
  if (user && diretoriaUsuario) {
    // Adiciona a diretoria no objeto request para uso posterior nos controllers
    // Isso permite que os controllers filtrem dados por diretoria automaticamente
    req.diretoriaHE = diretoriaUsuario;

    // Log de acesso bem-sucedido com identificação da diretoria
    //  console.log(`[SUCESSO_HE] Usuário: ${user.nome}, Diretoria: ${diretoriaUsuario}, IP: ${ip}, Rota: ${route}`);
    return next();
  } else {
    // Log de tentativa de acesso sem perfil HE adequado
    console.log(
      `[FALHA_HE] Usuário: ${
        user?.nome || "desconhecido"
      }, IP: ${ip}, Rota: ${route}, Motivo: Sem perfil HE ou diretoria não definida.`
    );

    // Para chamadas de API (AJAX/Fetch), destroi a sessão por segurança e retorna JSON
    if (req.accepts("json") && !req.accepts("html")) {
      req.session.destroy((err) => {
        if (err) console.error("Erro ao destruir a sessão:", err);
        return res
          .status(403)
          .json({ erro: "Acesso negado. Você foi desconectado." });
      });
    } else {
      const redirect = encodeURIComponent(req.originalUrl);
      const errorRedirect = redirect
        ? `/login?erro=3&redirect=${redirect}`
        : "/login?erro=3";
      // Para requisições de páginas HTML, redireciona para logout
      return res.redirect(errorRedirect);
    }
  }
}

/**
 * 👔 Middleware para aprovadores - veem apenas dados de sua diretoria
 *
 * Valida se o usuário possui perfil de aprovador (HE_APROVADOR) E pertence a uma
 * diretoria específica. Aprovadores só podem visualizar e aprovar solicitações
 * da diretoria à qual pertencem.
 *
 * @param {Object} req - Request Express
 * @param {Object} res - Response Express
 * @param {Function} next - Next middleware
 *
 * Requisitos:
 * - Usuário deve ter perfil 'HE_APROVADOR'
 * - Usuário deve ter diretoria definida (ex: "HE_APROVADOR,HE_ENGENHARIA")
 *
 * Comportamento:
 * - Se autorizado: Define req.diretoriaHE e chama next()
 * - Se não autorizado (HTML): Retorna página de erro 403
 * - Se não autorizado (API): Retorna JSON com erro 403
 *
 * Segurança:
 * - Garante isolamento de dados entre diretorias
 * - Aprovadores de Engenharia não veem dados de Implantação e vice-versa
 */
function requireAprovadorComDiretoria(req, res, next) {
  // Coleta informações para logging e auditoria
  const ip = req.ip;
  const route = req.originalUrl;
  const user = req.session.usuario;
  const perfil = user?.perfil || "";
  const diretoriaUsuario = extrairDiretoriaDoPerfil(perfil);

  // Valida se o usuário tem perfil de aprovador E diretoria definida
  // Exemplo de perfil válido: "HE_APROVADOR,HE_ENGENHARIA"
  if (user && perfil.includes("HE_APROVADOR") && diretoriaUsuario) {
    // Adiciona a diretoria do aprovador no request para uso nos controllers
    // Controllers usarão isso para filtrar apenas solicitações da mesma diretoria
    req.diretoriaHE = diretoriaUsuario;

    // Log de acesso bem-sucedido de aprovador
    // console.log(`[SUCESSO_APROVADOR] Usuário: ${user.nome}, Diretoria: ${diretoriaUsuario}, IP: ${ip}, Rota: ${route}`);
    return next();
  } else {
    // Log de tentativa de acesso sem credenciais adequadas de aprovador
    console.log(
      `[FALHA_APROVADOR] Usuário: ${
        user?.nome || "desconhecido"
      }, IP: ${ip}, Rota: ${route}, Motivo: Sem perfil de aprovador ou diretoria não definida. Perfil atual: '${perfil}'`
    );

    // Para páginas HTML, retorna mensagem de erro formatada
    if (req.accepts("html")) {
      return res
        .status(403)
        .send(
          "<h1>Acesso Negado</h1><p>Você não tem permissão para acessar esta página.</p>"
        );
    }

    // Para API, retorna JSON com erro 403
    return res.status(403).json({
      erro: "Acesso negado. Você não tem permissão para executar esta ação.",
    });
  }
}

// ================================================================================
// 📤 EXPORTS - Middlewares disponíveis para uso nas rotas
// ================================================================================

module.exports = {
  // Função auxiliar para extrair diretoria do perfil
  extrairDiretoriaDoPerfil,

  // Middleware que aceita qualquer diretoria HE (mais permissivo)
  requireAnyHEDiretoria,

  // Middleware específico para aprovadores com controle de diretoria
  requireAprovadorComDiretoria,
};
