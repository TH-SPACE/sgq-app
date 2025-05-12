const express = require("express");
const router = express.Router();
const path = require("path");

const uploadPosbd = require("../controllers/uploadPosbd");

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

// Rota protegida que renderiza a tela BA B2B
router.get("/ba_b2b", (req, res) => {
  res.sendFile(path.join(__dirname, "../views/home/ba_b2b.html"));
});

router.get("/pos_bd_b2b", (req, res) => {
  res.sendFile(path.join(__dirname, "../views/home/pos_bd_b2b.html"));
});

// ⬇️ Aqui está sua rota de listagem agora conectada corretamente:
router.get("/listar_ordens_pos", uploadPosbd.listarOrdensPos);

router.get("/download_csv_pos", uploadPosbd.downloadOrdensPos);

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
