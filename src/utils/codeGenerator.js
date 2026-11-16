const crypto = require('crypto');

// Prefijos temáticos navales combinados con números y letras para códigos memorables y seguros
const PREFIXES = ['ALFA', 'BRAVO', 'CORBETA', 'DELTA', 'ECO', 'FRAGATA', 'GOLFO', 'HALCON', 'ISLA', 'JUPITER', 'KILO', 'LIMA', 'MAREA', 'NAVAL', 'OCEANO', 'PROA', 'RADAR', 'SONAR', 'TORPEDO', 'VAPOR'];

/**
 * Genera un código de sala único, legible y difícil de adivinar (ej: 'NAVAL-842')
 */
function generateRoomCode() {
  const prefix = PREFIXES[crypto.randomInt(0, PREFIXES.length)];
  const num = crypto.randomInt(100, 999);
  return `${prefix}-${num}`;
}

/**
 * Genera un token secreto para identificar de forma unívoca a un jugador.
 * Este token se guarda en el localStorage del navegador para reconexiones automáticas.
 */
function generatePlayerToken() {
  return crypto.randomBytes(16).toString('hex');
}

module.exports = {
  generateRoomCode,
  generatePlayerToken
};
