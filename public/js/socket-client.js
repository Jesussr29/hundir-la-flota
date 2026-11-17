/**
 * Gestor de conexión y eventos con Socket.IO para Hundir la Flota
 */
class SocketClient {
  constructor() {
    this.socket = null;
    this.roomCode = localStorage.getItem('battleship_room_code') || null;
    this.playerToken = localStorage.getItem('battleship_player_token') || null;
    this.eventListeners = new Map();
  }

  connect() {
    if (this.socket) return;

    // Detectar ruta base (soporta tanto /hundir-la-flota como raíz /)
    const currentPath = window.location.pathname.replace(/\/+$/, '');
    const socketPath = (currentPath && currentPath !== '') ? `${currentPath}/socket.io` : '/socket.io';

    // Conectar al mismo origen con fallback a websocket y polling
    this.socket = io({
      path: socketPath,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 15,
      reconnectionDelay: 1000
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Conectado al servidor naval con ID:', this.socket.id);
      this.emitInternal('connection_change', { connected: true });

      // Si teníamos una sesión guardada, intentar reconectar automáticamente
      if (this.roomCode && this.playerToken) {
        this.reconnectSession(this.roomCode, this.playerToken);
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.warn('[Socket] Desconectado:', reason);
      this.emitInternal('connection_change', { connected: false, reason });
    });

    this.socket.on('room_created', (data) => {
      this.setSession(data.roomCode, data.playerToken);
      this.emitInternal('room_created', data);
    });

    this.socket.on('room_joined', (data) => {
      this.setSession(data.roomCode, data.playerToken);
      this.emitInternal('room_joined', data);
    });

    this.socket.on('session_restored', (data) => {
      this.emitInternal('session_restored', data);
    });

    this.socket.on('reconnect_failed', (data) => {
      this.clearSession();
      this.emitInternal('reconnect_failed', data);
    });

    this.socket.on('room_state', (state) => {
      this.emitInternal('room_state', state);
    });

    this.socket.on('shot_fired', (shotData) => {
      this.emitInternal('shot_fired', shotData);
    });

    this.socket.on('chat_received', (msg) => {
      this.emitInternal('chat_received', msg);
    });

    this.socket.on('action_error', (err) => {
      this.emitInternal('action_error', err);
    });
  }

  setSession(roomCode, token) {
    this.roomCode = roomCode;
    this.playerToken = token;
    localStorage.setItem('battleship_room_code', roomCode);
    localStorage.setItem('battleship_player_token', token);
  }

  clearSession() {
    this.roomCode = null;
    this.playerToken = null;
    localStorage.removeItem('battleship_room_code');
    localStorage.removeItem('battleship_player_token');
  }

  createRoom(playerName) {
    this.connect();
    this.socket.emit('create_room', { playerName });
  }

  createBotRoom(playerName, difficulty = 'tactical') {
    this.connect();
    this.socket.emit('create_bot_room', { playerName, difficulty });
  }

  joinRoom(roomCode, playerName) {
    this.connect();
    // Enviar token previo si coincide la sala para reconectar como el mismo jugador
    const token = (this.roomCode === roomCode) ? this.playerToken : null;
    this.socket.emit('join_room', { roomCode, playerName, playerToken: token });
  }

  reconnectSession(roomCode, playerToken) {
    this.connect();
    this.socket.emit('reconnect_session', { roomCode, playerToken });
  }

  placeFleet(fleet) {
    if (!this.roomCode || !this.playerToken) return;
    this.socket.emit('place_fleet', {
      roomCode: this.roomCode,
      playerToken: this.playerToken,
      fleet
    });
  }

  fireShot(row, col) {
    if (!this.roomCode || !this.playerToken) return;
    this.socket.emit('fire_shot', {
      roomCode: this.roomCode,
      playerToken: this.playerToken,
      row,
      col
    });
  }

  sendChat(message) {
    if (!this.roomCode || !this.playerToken) return;
    this.socket.emit('send_chat', {
      roomCode: this.roomCode,
      playerToken: this.playerToken,
      message
    });
  }

  requestRematch() {
    if (!this.roomCode || !this.playerToken) return;
    this.socket.emit('request_rematch', {
      roomCode: this.roomCode,
      playerToken: this.playerToken
    });
  }

  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  emitInternal(event, data) {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach(cb => {
      try {
        cb(data);
      } catch (err) {
        console.error(`Error en listener de evento '${event}':`, err);
      }
    });
  }
}

window.socketClient = new SocketClient();
