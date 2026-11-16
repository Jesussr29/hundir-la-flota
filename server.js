require('dotenv').config();
const path = require('path');
const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');

const roomManager = require('./src/game/RoomManager');
const db = require('./src/db/database');
const { generatePlayerToken } = require('./src/utils/codeGenerator');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const RECONNECT_TIMEOUT_SEC = parseInt(process.env.RECONNECT_TIMEOUT_SEC, 10) || 300;

// Configuración de cabeceras de seguridad
app.use(helmet({
  contentSecurityPolicy: false, // Permitir estilos y scripts locales de la app
  crossOriginEmbedderPolicy: false
}));

// CORS permisivo para peticiones del frontend o proxy inverso
app.use(cors());
app.use(express.json());

// Limitar peticiones excesivas en la API
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Demasiadas solicitudes desde esta IP, por favor inténtalo más tarde.' }
});
app.use('/api/', apiLimiter);

// Archivos estáticos del Frontend
app.use(express.static(path.join(__dirname, 'public')));

// Ruta de comprobación de salud para Apache y balanceadores
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    activeRooms: roomManager.rooms.size,
    timestamp: Date.now()
  });
});

// Comprobar estado de una sala antes de unirse
app.get('/api/room/:code', (req, res) => {
  const room = roomManager.getRoom(req.params.code);
  if (!room) {
    return res.status(404).json({ error: 'Sala no encontrada' });
  }

  res.json({
    code: room.code,
    status: room.status,
    playerCount: room.players.length,
    isFull: room.players.length >= 2
  });
});

// Enrutador para Single Page Application: cualquier otra ruta sirve index.html
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Configuración de WebSockets con Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingInterval: 10000,
  pingTimeout: 5000,
  transports: ['websocket', 'polling']
});

/**
 * Envía el estado actualizado a cada jugador respetando la privacidad (Anti-trampas).
 */
function syncRoom(room) {
  if (!room) return;
  room.players.forEach(player => {
    if (player.socketId && player.connected) {
      const playerState = room.getStateForPlayer(player.id);
      io.to(player.socketId).emit('room_state', playerState);
    }
  });
  roomManager.persistRoom(room);
}

// Control de frecuencia para evitar abusos por socket
const socketRateMap = new Map();
function isRateLimited(socketId, maxPerSec = 10) {
  const now = Date.now();
  const entry = socketRateMap.get(socketId) || { count: 0, resetAt: now + 1000 };
  if (now > entry.resetAt) {
    entry.count = 1;
    entry.resetAt = now + 1000;
  } else {
    entry.count++;
  }
  socketRateMap.set(socketId, entry);
  return entry.count > maxPerSec;
}

// Lógica de eventos Socket.IO
io.on('connection', (socket) => {

  // 1. CREAR SALA
  socket.on('create_room', ({ playerName }) => {
    try {
      if (isRateLimited(socket.id)) return;

      const playerToken = generatePlayerToken();
      const hostPlayer = {
        id: playerToken,
        socketId: socket.id,
        name: playerName || 'Comandante 1'
      };

      const room = roomManager.createRoom(hostPlayer);
      socket.join(room.code);

      socket.emit('room_created', {
        roomCode: room.code,
        playerToken
      });

      syncRoom(room);
    } catch (err) {
      socket.emit('action_error', { message: err.message });
    }
  });

  // 2. UNIRSE A SALA
  socket.on('join_room', ({ roomCode, playerName, playerToken }) => {
    try {
      if (isRateLimited(socket.id)) return;

      const room = roomManager.getRoom(roomCode);
      if (!room) {
        return socket.emit('action_error', { message: 'La sala especificada no existe.' });
      }

      // Comprobar si es un jugador existente intentando reconectar
      let existingPlayer = null;
      if (playerToken) {
        existingPlayer = room.getPlayerByToken(playerToken);
      }

      if (existingPlayer) {
        // Reconexión de jugador existente
        room.reconnectPlayer(playerToken, socket.id);
        roomManager.bindSocket(socket.id, room.code, playerToken);
        socket.join(room.code);

        socket.emit('room_joined', {
          roomCode: room.code,
          playerToken,
          isReconnection: true
        });

        syncRoom(room);
        return;
      }

      // Si no es reconexión, verificar si hay espacio
      if (room.players.length >= 2) {
        return socket.emit('action_error', { message: 'La sala ya está completa. No pueden entrar más de 2 jugadores.' });
      }

      // Nuevo jugador que se incorpora como Jugador 2
      const newToken = generatePlayerToken();
      room.addPlayer(newToken, socket.id, playerName || 'Comandante 2');
      roomManager.bindSocket(socket.id, room.code, newToken);
      socket.join(room.code);

      socket.emit('room_joined', {
        roomCode: room.code,
        playerToken: newToken,
        isReconnection: false
      });

      syncRoom(room);
    } catch (err) {
      socket.emit('action_error', { message: err.message });
    }
  });

  // 3. RECONEXIÓN AUTOMÁTICA
  socket.on('reconnect_session', ({ roomCode, playerToken }) => {
    try {
      const room = roomManager.getRoom(roomCode);
      if (!room) {
        return socket.emit('reconnect_failed', { message: 'La sala ya no existe o ha expirado.' });
      }

      const player = room.getPlayerByToken(playerToken);
      if (!player) {
        return socket.emit('reconnect_failed', { message: 'Sesión no válida para esta sala.' });
      }

      room.reconnectPlayer(playerToken, socket.id);
      roomManager.bindSocket(socket.id, room.code, playerToken);
      socket.join(room.code);

      socket.emit('session_restored', {
        roomCode: room.code,
        playerToken
      });

      syncRoom(room);
    } catch (err) {
      socket.emit('reconnect_failed', { message: err.message });
    }
  });

  // 4. COLOCAR Y CONFIRMAR FLOTA
  socket.on('place_fleet', ({ roomCode, playerToken, fleet }) => {
    try {
      if (isRateLimited(socket.id)) return;

      const room = roomManager.getRoom(roomCode);
      if (!room) return socket.emit('action_error', { message: 'Sala no encontrada.' });

      room.submitFleet(playerToken, fleet);
      syncRoom(room);
    } catch (err) {
      socket.emit('action_error', { message: err.message });
    }
  });

  // 5. EFECTUAR DISPARO
  socket.on('fire_shot', ({ roomCode, playerToken, row, col }) => {
    try {
      if (isRateLimited(socket.id, 5)) return;

      const room = roomManager.getRoom(roomCode);
      if (!room) return socket.emit('action_error', { message: 'Sala no encontrada.' });

      const shootReport = room.shoot(playerToken, row, col);

      // Si la partida terminó, registrar estadísticas
      if (shootReport.isGameOver) {
        roomManager.recordMatch(room);
      }

      // Sincronizar estado completo a ambos jugadores
      syncRoom(room);

      // Enviar evento sonoro y animaciones específicas del disparo
      io.to(room.code).emit('shot_fired', {
        row,
        col,
        result: shootReport.shotResult.result,
        ship: shootReport.shotResult.ship || null,
        shooterToken: playerToken,
        turnSwitches: shootReport.turnSwitches,
        isGameOver: shootReport.isGameOver
      });

    } catch (err) {
      socket.emit('action_error', { message: err.message });
    }
  });

  // 6. ENVIAR MENSAJE DE CHAT
  socket.on('send_chat', ({ roomCode, playerToken, message }) => {
    try {
      if (isRateLimited(socket.id, 4)) return;

      const room = roomManager.getRoom(roomCode);
      if (!room) return;

      const player = room.getPlayerByToken(playerToken);
      if (!player) return;

      const msg = room.addChatMessage(player.id, player.name, message);
      if (msg) {
        io.to(room.code).emit('chat_received', msg);
        roomManager.persistRoom(room);
      }
    } catch (err) {
      console.error('[Chat Error]:', err.message);
    }
  });

  // 7. SOLICITAR REVANCHA
  socket.on('request_rematch', ({ roomCode, playerToken }) => {
    try {
      const room = roomManager.getRoom(roomCode);
      if (!room) return;

      room.requestRematch(playerToken);
      syncRoom(room);
    } catch (err) {
      socket.emit('action_error', { message: err.message });
    }
  });

  // 8. DESCONEXIÓN
  socket.on('disconnect', () => {
    socketRateMap.delete(socket.id);
    const session = roomManager.getPlayerSessionBySocket(socket.id);
    if (!session) return;

    const room = roomManager.getRoom(session.roomCode);
    if (room) {
      room.markDisconnected(socket.id, RECONNECT_TIMEOUT_SEC, (updatedRoom) => {
        // En caso de que expire el tiempo de abandono
        syncRoom(updatedRoom);
      });
      syncRoom(room);
    }

    roomManager.unbindSocket(socket.id);
  });
});

// Limpieza periódica de salas inactivas (cada 1 hora)
setInterval(() => {
  db.cleanOldRooms(24 * 60 * 60 * 1000); // Borrar salas con más de 24h inactivas
}, 60 * 60 * 1000);

// Iniciar servidor HTTP y WebSockets
server.listen(PORT, HOST, () => {
  console.log(`=================================================`);
  console.log(`  🚢 HUNDIR LA FLOTA ONLINE - SERVIDOR ACTIVO`);
  console.log(`  Escuchando en: http://${HOST}:${PORT}`);
  console.log(`  Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`  WebSocket transportes: websocket, polling`);
  console.log(`=================================================`);
});
