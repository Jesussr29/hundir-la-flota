const GameRoom = require('./GameRoom');
const { generateRoomCode } = require('../utils/codeGenerator');
const db = require('../db/database');

class RoomManager {
  constructor() {
    this.rooms = new Map(); // roomCode -> GameRoom
    this.socketToPlayer = new Map(); // socketId -> { roomCode, playerToken }
  }

  /**
   * Crea una nueva sala con un código único garantizado.
   */
  createRoom(hostPlayer) {
    let attempts = 0;
    let code = '';
    do {
      code = generateRoomCode();
      attempts++;
      if (attempts > 100) {
        code = `BATALLA-${Date.now().toString().slice(-4)}`;
      }
    } while (this.rooms.has(code) || db.loadRoom(code));

    const room = new GameRoom(code, hostPlayer);
    this.rooms.set(code, room);
    this.socketToPlayer.set(hostPlayer.socketId, { roomCode: code, playerToken: hostPlayer.id });

    // Guardar estado inicial en SQLite
    db.saveRoom(room);

    return room;
  }

  /**
   * Obtiene una sala por su código (en memoria o cargada desde SQLite).
   */
  getRoom(code) {
    if (!code) return null;
    const normalizedCode = code.toUpperCase().trim();

    if (this.rooms.has(normalizedCode)) {
      return this.rooms.get(normalizedCode);
    }

    // Intentar recuperar desde SQLite si el proceso de Node se reinició
    const dbRecord = db.loadRoom(normalizedCode);
    if (dbRecord && dbRecord.state) {
      const restoredRoom = GameRoom.deserializeFullState(dbRecord.state);
      this.rooms.set(normalizedCode, restoredRoom);
      return restoredRoom;
    }

    return null;
  }

  /**
   * Asocia un socket a una sala y token de jugador.
   */
  bindSocket(socketId, roomCode, playerToken) {
    this.socketToPlayer.set(socketId, { roomCode, playerToken });
  }

  /**
   * Obtiene la relación de sala y jugador dado un socket.
   */
  getPlayerSessionBySocket(socketId) {
    return this.socketToPlayer.get(socketId) || null;
  }

  /**
   * Elimina la asociación de un socket.
   */
  unbindSocket(socketId) {
    this.socketToPlayer.delete(socketId);
  }

  /**
   * Guarda el estado actual de una sala en la base de datos.
   */
  persistRoom(room) {
    if (room) {
      db.saveRoom(room);
    }
  }

  /**
   * Registra una partida completada en el histórico.
   */
  recordMatch(room) {
    if (room && room.status === 'finished') {
      const p1 = room.players[0] ? room.players[0].name : 'Comandante 1';
      const p2 = room.players[1] ? room.players[1].name : 'Comandante 2';
      db.recordMatch(room.code, p1, p2, room.winnerName || 'Desconocido', room.totalTurns);
    }
  }
}

// Singleton
module.exports = new RoomManager();
