const Board = require('./Board');

class GameRoom {
  constructor(code, initialPlayer = null) {
    this.code = code;
    this.status = 'waiting'; // 'waiting' | 'placing' | 'playing' | 'finished'
    this.players = []; // [{ id, socketId, name, board, ready, connected, disconnectedAt }]
    this.currentTurn = 0; // 0 o 1
    this.winnerId = null;
    this.winnerName = null;
    this.totalTurns = 0;
    this.chatMessages = [];
    this.createdAt = Date.now();
    this.reconnectTimers = new Map();

    if (initialPlayer) {
      this.addPlayer(initialPlayer.id, initialPlayer.socketId, initialPlayer.name);
    }
  }

  /**
   * Agrega un nuevo jugador a la sala si hay hueco disponible.
   */
  addPlayer(playerId, socketId, name) {
    if (this.players.length >= 2) {
      throw new Error('La sala ya tiene dos jugadores.');
    }

    const playerIndex = this.players.length;
    const player = {
      id: playerId,
      socketId,
      name: (name && name.trim()) ? name.trim().slice(0, 20) : `Comandante ${playerIndex + 1}`,
      board: new Board(),
      ready: false,
      connected: true,
      disconnectedAt: null,
      rematchRequested: false
    };

    this.players.push(player);

    if (this.players.length === 2) {
      this.status = 'placing';
      // Asignar aleatoriamente quién iniciará el turno una vez empiece la partida
      this.currentTurn = Math.random() < 0.5 ? 0 : 1;
      this.addSystemMessage(`¡${player.name} se ha unido a la sala! Ambos comandantes deben desplegar su flota.`);
    } else {
      this.addSystemMessage(`Sala creada por ${player.name}. Esperando al segundo comandante...`);
    }

    return player;
  }

  /**
   * Localiza a un jugador por su token persistente.
   */
  getPlayerByToken(token) {
    return this.players.find(p => p.id === token);
  }

  /**
   * Localiza a un jugador por su socket ID activo.
   */
  getPlayerBySocketId(socketId) {
    return this.players.find(p => p.socketId === socketId);
  }

  /**
   * Obtiene el índice (0 o 1) de un jugador dado su token.
   */
  getPlayerIndex(token) {
    return this.players.findIndex(p => p.id === token);
  }

  /**
   * Obtiene el oponente de un jugador.
   */
  getOpponent(token) {
    return this.players.find(p => p.id !== token);
  }

  /**
   * Gestiona la reconexión de un jugador existente con su nuevo socketId.
   */
  reconnectPlayer(token, newSocketId) {
    const player = this.getPlayerByToken(token);
    if (!player) return null;

    player.socketId = newSocketId;
    player.connected = true;
    player.disconnectedAt = null;

    // Cancelar temporizador de derrota por abandono si existía
    if (this.reconnectTimers.has(token)) {
      clearTimeout(this.reconnectTimers.get(token));
      this.reconnectTimers.delete(token);
    }

    this.addSystemMessage(`El comandante ${player.name} ha restablecido la conexión.`);
    return player;
  }

  /**
   * Marca a un jugador como desconectado y programa el temporizador de abandono.
   */
  markDisconnected(socketId, timeoutSec = 300, onForfeitCallback = null) {
    const player = this.getPlayerBySocketId(socketId);
    if (!player) return null;

    player.connected = false;
    player.disconnectedAt = Date.now();

    this.addSystemMessage(`El comandante ${player.name} ha perdido la conexión. Esperando reconexión...`);

    // Si la partida está en curso, programar abandono
    if (this.status === 'playing' && onForfeitCallback) {
      if (this.reconnectTimers.has(player.id)) {
        clearTimeout(this.reconnectTimers.get(player.id));
      }
      const timer = setTimeout(() => {
        this.handleForfeit(player.id);
        if (onForfeitCallback) onForfeitCallback(this);
      }, timeoutSec * 1000);
      this.reconnectTimers.set(player.id, timer);
    }

    return player;
  }

  /**
   * Gestiona la victoria del oponente si el jugador abandona tras el tiempo límite.
   */
  handleForfeit(disconnectedPlayerId) {
    if (this.status !== 'playing') return;

    const winner = this.players.find(p => p.id !== disconnectedPlayerId);
    const loser = this.players.find(p => p.id === disconnectedPlayerId);

    if (winner) {
      this.status = 'finished';
      this.winnerId = winner.id;
      this.winnerName = winner.name;
      this.addSystemMessage(`¡Victoria por abandono! ${winner.name} gana la batalla naval.`);
    }
  }

  /**
   * Guarda y valida la flota enviada por un jugador durante la fase de preparación.
   */
  submitFleet(token, shipsConfig) {
    const player = this.getPlayerByToken(token);
    if (!player) {
      throw new Error('Jugador no encontrado');
    }
    if (this.status !== 'placing') {
      throw new Error('No es momento de colocar barcos');
    }

    const tempBoard = new Board();

    // Validar y colocar cada barco
    for (const ship of shipsConfig) {
      tempBoard.placeShip(ship.id, ship.row, ship.col, ship.orientation);
    }

    if (!tempBoard.isFleetReady()) {
      throw new Error('La flota está incompleta. Debes posicionar todos los barcos reglamentarios.');
    }

    player.board = tempBoard;
    player.ready = true;
    this.addSystemMessage(`${player.name} tiene su flota lista y en posición de combate.`);

    // Si ambos están listos, arranca la batalla
    if (this.players.length === 2 && this.players.every(p => p.ready)) {
      this.status = 'playing';
      const firstPlayer = this.players[this.currentTurn];
      this.addSystemMessage(`¡Fuego a discreción! Comienza el combate. Primer turno para ${firstPlayer.name}.`);
    }

    return true;
  }

  /**
   * Procesa un disparo ejecutado por un jugador.
   */
  shoot(token, row, col) {
    if (this.status !== 'playing') {
      throw new Error('La partida no está en curso.');
    }

    const playerIndex = this.getPlayerIndex(token);
    if (playerIndex === -1) {
      throw new Error('Jugador no pertenece a esta sala.');
    }

    if (this.currentTurn !== playerIndex) {
      throw new Error('No es tu turno.');
    }

    const opponentIndex = 1 - playerIndex;
    const opponent = this.players[opponentIndex];
    const shooter = this.players[playerIndex];

    const shotResult = opponent.board.receiveShot(row, col);
    this.totalTurns++;

    const coordLetter = String.fromCharCode(65 + col);
    const coordNumber = row + 1;
    const coordLabel = `${coordLetter}${coordNumber}`;

    let turnSwitches = false;

    if (shotResult.result === 'water') {
      this.addSystemMessage(`${shooter.name} disparó a ${coordLabel}: ¡AGUA!`);
      // En agua, el turno pasa al adversario
      this.currentTurn = opponentIndex;
      turnSwitches = true;
    } else if (shotResult.result === 'hit') {
      this.addSystemMessage(`${shooter.name} disparó a ${coordLabel}: ¡TOCADO! (${shotResult.shipName})`);
      // En tocado, el jugador que acertó vuelve a disparar (regla clásica Hasbro/Naval)
      turnSwitches = false;
    } else if (shotResult.result === 'sunk') {
      this.addSystemMessage(`¡IMPACTO CRÍTICO! ${shooter.name} ha HUNDIDO el ${shotResult.ship.name} de ${opponent.name}.`);
      if (shotResult.allSunk) {
        this.status = 'finished';
        this.winnerId = shooter.id;
        this.winnerName = shooter.name;
        this.addSystemMessage(`¡VICTORIA! ${shooter.name} ha destruido toda la flota enemiga.`);
      } else {
        // En hundido, también vuelve a disparar
        turnSwitches = false;
      }
    }

    return {
      shotResult,
      turnSwitches,
      nextTurnPlayerId: this.players[this.currentTurn].id,
      isGameOver: this.status === 'finished',
      winnerId: this.winnerId,
      winnerName: this.winnerName
    };
  }

  /**
   * Añade un mensaje de chat o notificación del sistema.
   */
  addChatMessage(senderId, senderName, text) {
    if (!text || !text.trim()) return null;
    const sanitizedText = text.trim().slice(0, 150);
    const msg = {
      senderId,
      senderName,
      text: sanitizedText,
      isSystem: false,
      timestamp: Date.now()
    };
    this.chatMessages.push(msg);
    if (this.chatMessages.length > 80) {
      this.chatMessages.shift();
    }
    return msg;
  }

  addSystemMessage(text) {
    const msg = {
      senderId: 'SYSTEM',
      senderName: 'SISTEMA',
      text,
      isSystem: true,
      timestamp: Date.now()
    };
    this.chatMessages.push(msg);
    if (this.chatMessages.length > 80) {
      this.chatMessages.shift();
    }
    return msg;
  }

  /**
   * Solicitar revancha.
   */
  requestRematch(token) {
    const player = this.getPlayerByToken(token);
    if (!player || this.status !== 'finished') return false;

    player.rematchRequested = true;
    const opponent = this.getOpponent(token);

    if (opponent && opponent.rematchRequested) {
      // Ambos aceptaron la revancha: reiniciar tableros
      this.resetForRematch();
      return { accepted: true };
    }

    this.addSystemMessage(`${player.name} propone una revancha.`);
    return { accepted: false, waitingFor: opponent ? opponent.name : null };
  }

  resetForRematch() {
    this.status = 'placing';
    this.winnerId = null;
    this.winnerName = null;
    this.totalTurns = 0;
    this.currentTurn = Math.random() < 0.5 ? 0 : 1;

    for (const player of this.players) {
      player.board = new Board();
      player.ready = false;
      player.rematchRequested = false;
    }

    this.addSystemMessage('¡Nueva batalla aceptada! Desplegad vuestras flotas de nuevo.');
  }

  /**
   * Construye el estado seguro para un jugador específico.
   * IMPORTANTE: No expone barcos ocultos del rival.
   */
  getStateForPlayer(playerToken) {
    const playerIndex = this.getPlayerIndex(playerToken);
    if (playerIndex === -1) return null;

    const me = this.players[playerIndex];
    const opponentIndex = 1 - playerIndex;
    const opponent = this.players[opponentIndex] || null;

    return {
      roomCode: this.code,
      status: this.status,
      myIndex: playerIndex,
      me: {
        id: me.id,
        name: me.name,
        ready: me.ready,
        connected: me.connected,
        board: me.board.getPrivateView()
      },
      opponent: opponent ? {
        name: opponent.name,
        ready: opponent.ready,
        connected: opponent.connected,
        board: opponent.board.getPublicView() // Solo disparos y barcos hundidos, NUNCA barcos ocultos
      } : null,
      currentTurnPlayerIndex: this.currentTurn,
      isMyTurn: this.status === 'playing' && this.currentTurn === playerIndex,
      winnerId: this.winnerId,
      winnerName: this.winnerName,
      totalTurns: this.totalTurns,
      chatMessages: this.chatMessages,
      myFleetDef: Board.getFleetDefinitions()
    };
  }

  /**
   * Serialización completa para persistir en SQLite.
   */
  serializeFullState() {
    return {
      code: this.code,
      status: this.status,
      currentTurn: this.currentTurn,
      winnerId: this.winnerId,
      winnerName: this.winnerName,
      totalTurns: this.totalTurns,
      createdAt: this.createdAt,
      chatMessages: this.chatMessages,
      players: this.players.map(p => ({
        id: p.id,
        name: p.name,
        ready: p.ready,
        connected: p.connected,
        rematchRequested: p.rematchRequested,
        board: p.board.serialize()
      }))
    };
  }

  /**
   * Deserialización para restaurar sala desde SQLite.
   */
  static deserializeFullState(data) {
    const room = new GameRoom(data.code);
    room.status = data.status;
    room.currentTurn = data.currentTurn;
    room.winnerId = data.winnerId;
    room.winnerName = data.winnerName;
    room.totalTurns = data.totalTurns || 0;
    room.createdAt = data.createdAt || Date.now();
    room.chatMessages = data.chatMessages || [];

    if (data.players && Array.isArray(data.players)) {
      room.players = data.players.map(p => ({
        id: p.id,
        socketId: null, // Se reasigna en reconexión
        name: p.name,
        ready: p.ready,
        connected: false, // Inician como desconectados hasta que el socket se enlace
        disconnectedAt: Date.now(),
        rematchRequested: p.rematchRequested || false,
        board: Board.deserialize(p.board)
      }));
    }

    return room;
  }
}

module.exports = GameRoom;
