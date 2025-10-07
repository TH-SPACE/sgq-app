// app_he/utils/valoresHE.js
const fs = require("fs");
const path = require("path");

const valoresHEPath = path.join(__dirname, "..", "json", "valores_he.json");
let valoresPorCargo = {};

// Carrega uma vez na inicialização
try {
  const data = fs.readFileSync(valoresHEPath, "utf8");
  valoresPorCargo = JSON.parse(data);
} catch (err) {
  console.error("❌ Erro ao carregar valores_he.json:", err);
}

function getValorHora(cargo, tipoHE) {
  if (valoresPorCargo[cargo] && valoresPorCargo[cargo][tipoHE]) {
    return parseFloat(valoresPorCargo[cargo][tipoHE]);
  }
  return 0; // ou um valor padrão
}

module.exports = { getValorHora, valoresPorCargo };
