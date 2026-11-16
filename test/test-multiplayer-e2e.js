const { io } = require('socket.io-client');
const assert = require('assert');

const SERVER_URL = 'http://127.0.0.1:3005';

async function runE2ETest() {
  console.log('🚀 Iniciando Prueba E2E Multijugador en tiempo real...');

  // 1. Conectar Jugador 1
  const socket1 = io(SERVER_URL, { transports: ['websocket'] });
  let roomCode = null;
  let token1 = null;
  let token2 = null;

  await new Promise((resolve) => {
    socket1.on('connect', () => {
      console.log('  -> Jugador 1 conectado al socket');
      socket1.emit('create_room', { playerName: 'Capitán Nemo' });
    });

    socket1.on('room_created', (data) => {
      roomCode = data.roomCode;
      token1 = data.playerToken;
      console.log(`  -> Sala creada: ${roomCode} | Token P1: ${token1}`);
      resolve();
    });
  });

  // 2. Conectar Jugador 2
  const socket2 = io(SERVER_URL, { transports: ['websocket'] });
  await new Promise((resolve) => {
    socket2.on('connect', () => {
      console.log('  -> Jugador 2 conectado al socket');
      socket2.emit('join_room', { roomCode, playerName: 'Almirante Nelson' });
    });

    socket2.on('room_joined', (data) => {
      token2 = data.playerToken;
      console.log(`  -> Jugador 2 unido con éxito | Token P2: ${token2}`);
      resolve();
    });
  });

  // 3. Verificar que ambos reciben estado 'placing'
  await new Promise((resolve) => {
    socket1.once('room_state', (state) => {
      assert.strictEqual(state.status, 'placing');
      assert.strictEqual(state.opponent.name, 'Almirante Nelson');
      console.log('  -> Jugador 1 detecta al rival correctamente en fase placing');
      resolve();
    });
  });

  // 4. Ambos colocan sus barcos
  const fleetP1 = [
    { id: 'carrier', row: 0, col: 0, orientation: 'horizontal' },
    { id: 'battleship', row: 1, col: 0, orientation: 'horizontal' },
    { id: 'cruiser1', row: 2, col: 0, orientation: 'horizontal' },
    { id: 'cruiser2', row: 3, col: 0, orientation: 'horizontal' },
    { id: 'destroyer', row: 4, col: 0, orientation: 'horizontal' }
  ];

  const fleetP2 = [
    { id: 'carrier', row: 5, col: 0, orientation: 'horizontal' },
    { id: 'battleship', row: 6, col: 0, orientation: 'horizontal' },
    { id: 'cruiser1', row: 7, col: 0, orientation: 'horizontal' },
    { id: 'cruiser2', row: 8, col: 0, orientation: 'horizontal' },
    { id: 'destroyer', row: 9, col: 0, orientation: 'horizontal' }
  ];

  socket1.emit('place_fleet', { roomCode, playerToken: token1, fleet: fleetP1 });
  socket2.emit('place_fleet', { roomCode, playerToken: token2, fleet: fleetP2 });

  // 5. Verificar transición a 'playing'
  let activeTurnPlayer = null;
  await new Promise((resolve) => {
    socket1.on('room_state', (state) => {
      if (state.status === 'playing') {
        console.log(`  -> Ambos listos: Combate naval iniciado! Turno de Comandante ${state.currentTurnPlayerIndex + 1}`);
        activeTurnPlayer = state.currentTurnPlayerIndex === 0 ? { socket: socket1, token: token1 } : { socket: socket2, token: token2 };
        resolve();
      }
    });
  });

  // 6. Efectuar disparo válido
  await new Promise((resolve) => {
    socket1.once('shot_fired', (shot) => {
      console.log(`  -> Notificación de disparo recibida en tiempo real: ${shot.result.toUpperCase()} en (${shot.row}, ${shot.col})`);
      resolve();
    });

    activeTurnPlayer.socket.emit('fire_shot', {
      roomCode,
      playerToken: activeTurnPlayer.token,
      row: 0,
      col: 0
    });
  });

  // 7. Prueba de Chat
  await new Promise((resolve) => {
    socket2.once('chat_received', (msg) => {
      console.log(`  -> Mensaje de chat recibido por Rival: "${msg.text}" de ${msg.senderName}`);
      assert.strictEqual(msg.text, '¡Fuego a discreción por la proa!');
      resolve();
    });

    socket1.emit('send_chat', {
      roomCode,
      playerToken: token1,
      message: '¡Fuego a discreción por la proa!'
    });
  });

  // 8. Desconexión y Reconexión con recuperación de sesión
  console.log('  -> Simulando pérdida de conexión de Jugador 1...');
  socket1.disconnect();

  await new Promise(r => setTimeout(r, 600));

  console.log('  -> Reconectando Jugador 1 con su token persistente...');
  const socket1Reconnected = io(SERVER_URL, { transports: ['websocket'] });

  await new Promise((resolve) => {
    socket1Reconnected.on('connect', () => {
      socket1Reconnected.emit('reconnect_session', { roomCode, playerToken: token1 });
    });

    socket1Reconnected.on('session_restored', (data) => {
      console.log('  -> ¡Sesión restaurada con éxito para Jugador 1!');
      assert.strictEqual(data.roomCode, roomCode);
      resolve();
    });
  });

  socket1Reconnected.disconnect();
  socket2.disconnect();

  console.log('🎉 PRUEBA E2E MULTIJUGADOR COMPLETADA CON ÉXITO ABSOLUTO.');
  process.exit(0);
}

runE2ETest().catch(err => {
  console.error('❌ Error en prueba E2E:', err);
  process.exit(1);
});
