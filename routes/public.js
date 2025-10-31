const express = require("express");
const router = express.Router();
const path = require("path");
const multer = require("multer");

// Configuração do Multer
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// 🚪 Rotas públicas
// Rota raiz desabilitada - exibe página de erro
router.get("/", (req, res) => {
  res
    .status(403)
    .sendFile(path.join(__dirname, "..", "views", "erro_rota.html"));
});

router.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "views", "login.html"));
});

router.get("/rampa-irr", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "views", "rampa_irr.html"));
});

// --- Rotas Rampa IRR ---
const rampaIrrController = require("../controllers/rampa_irr_controller");

router.post(
  "/rampa-irr/upload",
  upload.single("excelFile"),
  rampaIrrController.processUpload
);
// --- Fim das Rotas Rampa IRR ---

// Rota para logout por acesso negado
router.get("/logout-acesso-negado", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Erro ao destruir a sessão:", err);
      // Mesmo com erro, tenta enviar a página de acesso negado
      return res
        .status(500)
        .sendFile(path.join(__dirname, "..", "views", "acesso_negado.html"));
    }
    res.sendFile(path.join(__dirname, "..", "views", "acesso_negado.html"));
  });
});

module.exports = router;
