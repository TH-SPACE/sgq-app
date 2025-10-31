const express = require('express');
const router = express.Router();
const path = require('path');

const { verificaThanosUser } = require('../middleware/thanosAuth');

const uploadPosbd = require('../controllers/uploadPosbd');
const vidaSigitm = require('../controllers/sigitm');

// Rota principal do ThanOS
router.get('/', verificaThanosUser, (req, res) => {
  res.sendFile(path.join(__dirname, '../views/index.html'));
});

// Rota protegida para vida_b2b.html
router.get('/sigitm', verificaThanosUser, (req, res) => {
  res.sendFile(path.join(__dirname, '../views/vida_b2b.html'));
});

// Usando o controlador sigitm
router.use(verificaThanosUser, vidaSigitm);

// Protegendo a rota /pos_bd_b2b
router.get('/pos_bd_b2b', verificaThanosUser, (req, res) => {
  res.sendFile(path.join(__dirname, '../views/pos_bd_b2b.html'));
});

// Rota de listagem de ordens POS
router.get('/listar_ordens_pos', verificaThanosUser, uploadPosbd.listarOrdensPos);

// Rota para download de CSV POS
router.get('/download_csv_pos', verificaThanosUser, uploadPosbd.downloadOrdensPos);

// Rota para tratar ordem POS
router.post('/tratar_ordem_pos', verificaThanosUser, uploadPosbd.tratarOrdemPos);

// Rota para upload de bases
router.get('/upload_bases', verificaThanosUser, (req, res) => {
  res.sendFile(path.join(__dirname, '../views/upload_bases.html'));
});

// Rota POST de upload Excel
router.post(
  '/upload_Posbd',
  verificaThanosUser,
  uploadPosbd.upload.single('arquivo'),
  uploadPosbd.processarUpload
);

module.exports = router;