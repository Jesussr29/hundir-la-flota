const assert = require('assert');
const Board = require('../src/game/Board');
const GameRoom = require('../src/game/GameRoom');
const roomManager = require('../src/game/RoomManager');

console.log('🧪 INICIANDO BATERÍA DE PRUEBAS AUTOMÁTICAS DE HUNDIR LA FLOTA...');

// 1. Test de Flota y Tablero
console.log('  -> Prueba 1: Reglas de colocación de barcos');
const board1 = new Board();
assert.strictEqual(board1.isFleetReady(), false, 'La flota no debe estar lista al inicio');

// Colocar Portaaviones (tamaño 5) horizontal en (0, 0)
const placedCarrier = board1.placeShip('carrier', 0, 0, 'horizontal');
assert.strictEqual(placedCarrier, true);

// No permitir solapamiento
assert.strictEqual(board1.canPlaceShip('battleship', 4, 0, 2, 'vertical'), false, 'No debe permitir solapar casillas');

// No permitir salirse del tablero (col 8 + size 4 > 10)
assert.strictEqual(board1.canPlaceShip('battleship', 4, 2, 8, 'horizontal'), false, 'No debe permitir desbordar el tablero');

// 2. Colocación aleatoria válida
console.log('  -> Prueba 2: Algoritmo de colocación aleatoria');
const randomBoard = new Board();
randomBoard.placeShipsRandomly();
assert.strictEqual(randomBoard.isFleetReady(), true, 'Toda la flota debe estar colocada');
assert.strictEqual(randomBoard.ships.size, 5, 'Deben haber exactamente 5 barcos');

// 3. Mecánica de Disparos: Agua, Tocado y Hundido
console.log('  -> Prueba 3: Disparos, Tocado y Hundido');
const testBoard = new Board();
testBoard.placeShip('destroyer', 3, 3, 'horizontal'); // tamaño 2: (3,3) y (3,4)

// Disparo al agua en (0, 0)
const waterShot = testBoard.receiveShot(0, 0);
assert.strictEqual(waterShot.result, 'water');

// No permitir disparar dos veces al mismo sitio
assert.throws(() => {
  testBoard.receiveShot(0, 0);
}, /ya disparada/);

// Disparo tocado en (3, 3)
const hitShot = testBoard.receiveShot(3, 3);
assert.strictEqual(hitShot.result, 'hit');
assert.strictEqual(testBoard.areAllShipsSunk(), false);

// Disparo hundido en (3, 4)
const sunkShot = testBoard.receiveShot(3, 4);
assert.strictEqual(sunkShot.result, 'sunk');
assert.strictEqual(sunkShot.ship.name, 'Destructor');
assert.strictEqual(sunkShot.allSunk, true);

// 4. Seguridad Anti-trampas (getPublicView vs getPrivateView)
console.log('  -> Prueba 4: Seguridad y Anti-trampas (Ocultación de coordenadas)');
const secBoard = new Board();
secBoard.placeShip('carrier', 1, 1, 'horizontal');
const publicView = secBoard.getPublicView();

// El adversario no debe tener acceso a las coordenadas de barcos no hundidos
assert.strictEqual(publicView.ships, undefined, 'La vista pública NUNCA debe incluir los barcos ocultos');
assert.strictEqual(publicView.sunkShips.length, 0, 'No hay barcos hundidos aún');

// 5. Ciclo de Vida de Sala (GameRoom)
console.log('  -> Prueba 5: Ciclo de vida y transición de estados en GameRoom');
const room = new GameRoom('TEST-99');
assert.strictEqual(room.status, 'waiting');

// Jugador 1
const p1 = room.addPlayer('tok1', 'sock1', 'Comandante Alfa');
assert.strictEqual(room.status, 'waiting');

// Jugador 2
const p2 = room.addPlayer('tok2', 'sock2', 'Comandante Bravo');
assert.strictEqual(room.status, 'placing');

// No permitir un 3er jugador
assert.throws(() => {
  room.addPlayer('tok3', 'sock3', 'Intruso');
}, /dos jugadores/);

// Despliegue de flotas
const p1Ships = [
  { id: 'carrier', row: 0, col: 0, orientation: 'horizontal' },
  { id: 'battleship', row: 2, col: 0, orientation: 'horizontal' },
  { id: 'cruiser1', row: 4, col: 0, orientation: 'horizontal' },
  { id: 'cruiser2', row: 6, col: 0, orientation: 'horizontal' },
  { id: 'destroyer', row: 8, col: 0, orientation: 'horizontal' }
];

const p2Ships = [
  { id: 'carrier', row: 1, col: 1, orientation: 'horizontal' },
  { id: 'battleship', row: 3, col: 1, orientation: 'horizontal' },
  { id: 'cruiser1', row: 5, col: 1, orientation: 'horizontal' },
  { id: 'cruiser2', row: 7, col: 1, orientation: 'horizontal' },
  { id: 'destroyer', row: 9, col: 1, orientation: 'horizontal' }
];

room.submitFleet('tok1', p1Ships);
assert.strictEqual(room.status, 'placing', 'Aún debe esperar a P2');
room.submitFleet('tok2', p2Ships);
assert.strictEqual(room.status, 'playing', 'Ambos listos: debe cambiar a playing');

// Turno de disparo
const shooterToken = room.players[room.currentTurn].id;
const nonShooterToken = room.players[1 - room.currentTurn].id;

// No permitir disparar fuera de turno
assert.throws(() => {
  room.shoot(nonShooterToken, 0, 0);
}, /No es tu turno/);

// Disparo válido dentro de turno
const shootRes = room.shoot(shooterToken, 9, 9);
assert.ok(['water', 'hit', 'sunk'].includes(shootRes.shotResult.result));

// 6. Prueba de Integración: Modo Bot Naval IA
console.log('  -> Prueba 6: Despliegue automático y disparo del Bot IA');
const botRoom = roomManager.createRoom({ id: 'human-token', socketId: 'sock-h', name: 'Humano' });
const bot = botRoom.addPlayer('bot-token', null, 'Capitán Némesis (IA)');
bot.isBot = true;
bot.board.placeShipsRandomly();
bot.ready = true;
assert.strictEqual(bot.board.isFleetReady(), true, 'El bot debe colocar su flota');

// Enviar flota del humano
botRoom.submitFleet('human-token', p1Ships);
assert.strictEqual(botRoom.status, 'playing', 'Partida vs Bot debe iniciar automáticamente');

console.log('✅ TODAS LAS PRUEBAS AUTOMÁTICAS PASARON EXITOSAMENTE CON CÓDIGO 0.');
