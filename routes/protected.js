const express = require("express");
const router = express.Router();
const path = require("path");

const uploadPosbd = require("../controllers/uploadPosbd");

const vidaSigitm = require("../controllers/sigitm");



// Middleware para verificar acesso específico
function verificaAcesso(tipoAcessoRequerido) {
  return (req, res, next) => {
    const usuario = req.session.usuario;

    if (!usuario) {
      return res.status(401).json({ erro: 'Usuário não autenticado' });
    }

    if (!usuario.acessos.includes(tipoAcessoRequerido)) {
      //return res.status(403).json({ erro: 'Acesso negado' });
      return res.sendFile(path.join(__dirname, "../views", "acesso_negado.html"));
    }

    next();
  };
}

router.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../views/index.html"));
});

router.get("/usuario", (req, res) => {
  res.json({
    id: req.session.usuario.id,
    nome: req.session.usuario.nome,
    email: req.session.usuario.email,
    perfil: req.session.usuario.perfil,
    acessos: req.session.usuario.acessos,
  });
});

// ✅ Rota protegida para vida_b2b.html
router.get("/sigitm", verificaAcesso('vidaSigitm'), (req, res) => {
  res.sendFile(path.join(__dirname, "../views/vida_b2b.html"));
});
// ✅ Usando o controlador sigitm
router.use(vidaSigitm);



// Protegendo a rota /pos_bd_b2b
router.get("/pos_bd_b2b", verificaAcesso('posbd'), (req, res) => {
  res.sendFile(path.join(__dirname, "../views/home/pos_bd_b2b.html"));
});

// ⬇️ Aqui está sua rota de listagem agora conectada corretamente:
router.get("/listar_ordens_pos", uploadPosbd.listarOrdensPos);

router.get("/download_csv_pos", uploadPosbd.downloadOrdensPos);

router.post("/tratar_ordem_pos", uploadPosbd.tratarOrdemPos);

router.get("/upload_bases", (req, res) => {
  res.sendFile(path.join(__dirname, "../views/home/upload_bases.html"));
});

// ✅ Rota POST de upload Excel
router.post(
  "/upload_Posbd",
  uploadPosbd.upload.single("arquivo"),
  uploadPosbd.processarUpload
);



module.exports = router;
