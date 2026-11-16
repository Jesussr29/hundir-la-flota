const path = require('path');
const fs = require('fs');

const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../data/battleship.db');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let db = null;
let isNodeSqlite = false;

try {
  // Intentar usar node:sqlite nativo de Node.js (Node 22+)
  const { DatabaseSync } = require('node:sqlite');
  db = new DatabaseSync(dbPath);
  isNodeSqlite = true;
} catch (e1) {
  try {
    const Database = require('better-sqlite3');
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
  } catch (e2) {
    console.warn('[DB] SQLite nativo no disponible, usando fallback en memoria.');
  }
}

// Inicializar tablas
if (db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS rooms (
      code TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      player1_id TEXT,
      player1_name TEXT,
      player2_id TEXT,
      player2_name TEXT,
      winner_id TEXT,
      state_json TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS match_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_code TEXT NOT NULL,
      player1_name TEXT NOT NULL,
      player2_name TEXT NOT NULL,
      winner_name TEXT NOT NULL,
      total_turns INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    );
  `);
}

module.exports = {
  saveRoom(room) {
    if (!db) return;
    try {
      const now = Date.now();
      const code = room.code;
      const status = room.status;
      const p1Id = room.players[0] ? room.players[0].id : null;
      const p1Name = room.players[0] ? room.players[0].name : null;
      const p2Id = room.players[1] ? room.players[1].id : null;
      const p2Name = room.players[1] ? room.players[1].name : null;
      const winnerId = room.winnerId || null;
      const stateJson = JSON.stringify(room.serializeFullState());
      const createdAt = room.createdAt || now;

      const stmt = db.prepare(`
        INSERT INTO rooms (code, status, player1_id, player1_name, player2_id, player2_name, winner_id, state_json, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(code) DO UPDATE SET
          status = excluded.status,
          player1_id = excluded.player1_id,
          player1_name = excluded.player1_name,
          player2_id = excluded.player2_id,
          player2_name = excluded.player2_name,
          winner_id = excluded.winner_id,
          state_json = excluded.state_json,
          updated_at = excluded.updated_at
      `);

      stmt.run(code, status, p1Id, p1Name, p2Id, p2Name, winnerId, stateJson, createdAt, now);
    } catch (err) {
      console.error(`[DB] Error guardando sala ${room.code}:`, err.message);
    }
  },

  loadRoom(code) {
    if (!db) return null;
    try {
      const stmt = db.prepare('SELECT * FROM rooms WHERE code = ?');
      const row = stmt.get(code);
      if (!row) return null;
      return {
        ...row,
        state: JSON.parse(row.state_json)
      };
    } catch (err) {
      console.error(`[DB] Error cargando sala ${code}:`, err.message);
      return null;
    }
  },

  recordMatch(roomCode, p1Name, p2Name, winnerName, totalTurns) {
    if (!db) return;
    try {
      const stmt = db.prepare(`
        INSERT INTO match_history (room_code, player1_name, player2_name, winner_name, total_turns, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      stmt.run(roomCode, p1Name, p2Name, winnerName, totalTurns, Date.now());
    } catch (err) {
      console.error(`[DB] Error registrando partida:`, err.message);
    }
  },

  cleanOldRooms(maxAgeMs = 24 * 60 * 60 * 1000) {
    if (!db) return;
    try {
      const threshold = Date.now() - maxAgeMs;
      const stmt = db.prepare('DELETE FROM rooms WHERE updated_at < ?');
      stmt.run(threshold);
    } catch (err) {
      console.error('[DB] Error limpiando salas antiguas:', err.message);
    }
  }
};
