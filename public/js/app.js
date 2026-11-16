/**
 * Controlador principal de la aplicación y ciclo de vida de la partida
 * Versión Minimalista
 */
document.addEventListener('DOMContentLoaded', () => {
  // Elementos principales de la UI
  const views = {
    menu: document.getElementById('view-menu'),
    lobby: document.getElementById('view-lobby'),
    placement: document.getElementById('view-placement'),
    battle: document.getElementById('view-battle'),
    gameover: document.getElementById('view-gameover')
  };

  // Referencias a elementos del menú
  const inputPlayerName = document.getElementById('input-player-name');
  const btnCreateRoom = document.getElementById('btn-create-room');
  const btnJoinModal = document.getElementById('btn-join-modal');
  const modalJoin = document.getElementById('modal-join');
  const inputJoinCode = document.getElementById('input-join-code');
  const btnConfirmJoin = document.getElementById('btn-confirm-join');
  const btnCancelJoin = document.getElementById('btn-cancel-join');
  const btnSoundToggle = document.getElementById('btn-sound-toggle');

  // Lobby
  const lobbyRoomCode = document.getElementById('lobby-room-code');
  const btnCopyCode = document.getElementById('btn-copy-code');
  const btnCopyLink = document.getElementById('btn-copy-link');
  const btnShareWhatsapp = document.getElementById('btn-share-whatsapp');
  const btnLeaveLobby = document.getElementById('btn-leave-lobby');
  const p1Status = document.getElementById('lobby-p1-status');
  const p2Status = document.getElementById('lobby-p2-status');

  // Placement
  const placementGridEl = document.getElementById('placement-grid');
  const shipDockEl = document.getElementById('ship-dock');
  const btnRotateShip = document.getElementById('btn-rotate-ship');
  const btnRandomPlacement = document.getElementById('btn-random-placement');
  const btnClearPlacement = document.getElementById('btn-clear-placement');
  const btnReadyFight = document.getElementById('btn-ready-fight');
  const placementStatusText = document.getElementById('placement-status-text');

  // Battle
  const playerGridEl = document.getElementById('player-grid');
  const enemyGridEl = document.getElementById('enemy-grid');
  const battleTurnBanner = document.getElementById('battle-turn-banner');
  const enemyFleetTracker = document.getElementById('enemy-fleet-tracker');
  const playerFleetTracker = document.getElementById('player-fleet-tracker');

  // Chat Flotante
  const btnToggleChat = document.getElementById('btn-toggle-chat');
  const btnCloseChat = document.getElementById('btn-close-chat');
  const chatFloatingModal = document.getElementById('chat-floating-modal');
  const chatUnreadBadge = document.getElementById('chat-unread-badge');
  const chatMessagesEl = document.getElementById('chat-messages');
  const inputChatMessage = document.getElementById('input-chat-message');
  const btnSendChat = document.getElementById('btn-send-chat');
  let unreadChatCount = 0;

  // Game Over
  const gameoverTitle = document.getElementById('gameover-title');
  const gameoverSubtitle = document.getElementById('gameover-subtitle');
  const gameoverStats = document.getElementById('gameover-stats');
  const btnRequestRematch = document.getElementById('btn-request-rematch');
  const btnBackToMenu = document.getElementById('btn-back-to-menu');

  // Notificaciones Toast flotantes
  const toastContainer = document.getElementById('toast-container');

  // Estado local del cliente
  let currentRoomState = null;
  let cachedPlayerName = localStorage.getItem('battleship_player_name') || '';

  if (cachedPlayerName) {
    inputPlayerName.value = cachedPlayerName;
  }

  // Comprobar parámetros de URL (ej: ?room=ALFA-482)
  const urlParams = new URLSearchParams(window.location.search);
  const paramRoom = urlParams.get('room');
  if (paramRoom) {
    inputJoinCode.value = paramRoom.toUpperCase();
    modalJoin.classList.remove('hidden');
  }

  // Actualizar icono de sonido
  function updateSoundIcon() {
    btnSoundToggle.textContent = window.soundFx.isMuted ? '🔇' : '🔊';
  }
  updateSoundIcon();

  btnSoundToggle.addEventListener('click', () => {
    const isMuted = window.soundFx.toggleMute();
    updateSoundIcon();
    showToast(isMuted ? 'Sonido silenciado' : 'Sonido activado', 'info');
  });

  // Mostrar vistas
  function switchView(viewName) {
    Object.keys(views).forEach(k => {
      if (views[k]) {
        views[k].classList.toggle('active', k === viewName);
      }
    });

    // En pantallas de menú o lobby podemos ocultar el botón de chat si aún no se juega
    if (btnToggleChat) {
      btnToggleChat.classList.toggle('hidden', viewName === 'menu');
    }
  }

  // Notificaciones Toast limpias
  function showToast(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span class="toast-text">${message}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // Obtener nombre del jugador
  function getPlayerName() {
    const name = inputPlayerName.value.trim() || `Jugador_${Math.floor(Math.random() * 900 + 100)}`;
    localStorage.setItem('battleship_player_name', name);
    return name;
  }

  // Enlace de invitación respetando subrutas (ej: /hundir-la-flota)
  function getInviteUrl(code) {
    const currentPath = window.location.pathname.replace(/\/+$/, '');
    return `${window.location.origin}${currentPath}/?room=${code}`;
  }

  // --- BOTONES MENÚ ---
  btnCreateRoom.addEventListener('click', () => {
    window.soundFx.playClick();
    const name = getPlayerName();
    window.socketClient.createRoom(name);
  });

  btnJoinModal.addEventListener('click', () => {
    window.soundFx.playClick();
    modalJoin.classList.remove('hidden');
    inputJoinCode.focus();
  });

  btnCancelJoin.addEventListener('click', () => {
    modalJoin.classList.add('hidden');
  });

  btnConfirmJoin.addEventListener('click', () => {
    window.soundFx.playClick();
    const code = inputJoinCode.value.trim().toUpperCase();
    if (!code) {
      showToast('Introduce un código de sala válido.', 'error');
      return;
    }
    const name = getPlayerName();
    modalJoin.classList.add('hidden');
    window.socketClient.joinRoom(code, name);
  });

  // --- BOTONES LOBBY ---
  btnCopyCode.addEventListener('click', () => {
    window.soundFx.playClick();
    if (currentRoomState) {
      navigator.clipboard.writeText(currentRoomState.roomCode).then(() => {
        showToast('Código copiado al portapapeles', 'success');
      }).catch(() => {
        showToast('Código: ' + currentRoomState.roomCode, 'info');
      });
    }
  });

  btnCopyLink.addEventListener('click', () => {
    window.soundFx.playClick();
    if (currentRoomState) {
      const link = getInviteUrl(currentRoomState.roomCode);
      navigator.clipboard.writeText(link).then(() => {
        showToast('Enlace de invitación copiado', 'success');
      }).catch(() => {
        showToast(link, 'info');
      });
    }
  });

  btnShareWhatsapp.addEventListener('click', () => {
    window.soundFx.playClick();
    if (currentRoomState) {
      const link = getInviteUrl(currentRoomState.roomCode);
      const msg = encodeURIComponent(`¡Únete a mi partida de Hundir la Flota! Código: ${currentRoomState.roomCode}\nEntra aquí: ${link}`);
      window.open(`https://api.whatsapp.com/send?text=${msg}`, '_blank');
    }
  });

  btnLeaveLobby.addEventListener('click', () => {
    window.soundFx.playClick();
    window.socketClient.clearSession();
    switchView('menu');
  });

  // --- PREPARACIÓN DE FLOTA (MINIMALISTA) ---
  function renderShipDock() {
    shipDockEl.innerHTML = '';
    window.FLEET_SPECS.forEach(ship => {
      const isPlaced = window.boardUI.placementShips.has(ship.id);
      const isSelected = window.boardUI.selectedShipId === ship.id;

      let pipsHtml = '';
      for (let i = 0; i < ship.size; i++) {
        pipsHtml += `<span class="dock-pip"></span>`;
      }

      const pill = document.createElement('div');
      pill.className = `ship-pill ${isPlaced ? 'placed' : ''} ${isSelected ? 'selected' : ''}`;
      pill.innerHTML = `
        <div class="ship-pill-left">
          <span class="ship-title">${ship.name}</span>
          <div class="ship-pips-bar">${pipsHtml}</div>
        </div>
        <span class="ship-status">${isPlaced ? 'Listo' : 'Pendiente'}</span>
      `;

      pill.addEventListener('click', () => {
        window.soundFx.playClick();
        if (isPlaced) {
          window.boardUI.placementShips.delete(ship.id);
          window.boardUI.renderPlacementGrid(placementGridEl);
          btnReadyFight.disabled = true;
        }
        window.boardUI.selectedShipId = ship.id;
        renderShipDock();
      });

      shipDockEl.appendChild(pill);
    });

    const isComplete = window.boardUI.isPlacementComplete();
    btnReadyFight.disabled = !isComplete;
  }

  btnRotateShip.addEventListener('click', () => {
    window.soundFx.playClick();
    window.boardUI.currentOrientation = window.boardUI.currentOrientation === 'horizontal' ? 'vertical' : 'horizontal';
    btnRotateShip.textContent = `Girar orientación (${window.boardUI.currentOrientation === 'horizontal' ? 'Horizontal ↔' : 'Vertical ↕'})`;
    window.boardUI.clearPlacementPreview(placementGridEl);
  });

  btnRandomPlacement.addEventListener('click', () => {
    window.soundFx.playClick();
    window.boardUI.randomizePlacement();
    window.boardUI.renderPlacementGrid(placementGridEl);
    renderShipDock();
    showToast('Flota colocada aleatoriamente', 'info');
  });

  btnClearPlacement.addEventListener('click', () => {
    window.soundFx.playClick();
    window.boardUI.placementShips.clear();
    window.boardUI.selectedShipId = 'carrier';
    window.boardUI.renderPlacementGrid(placementGridEl);
    renderShipDock();
  });

  btnReadyFight.addEventListener('click', () => {
    window.soundFx.playClick();
    if (!window.boardUI.isPlacementComplete()) {
      showToast('Debes colocar todos tus barcos antes de confirmar.', 'error');
      return;
    }
    const fleet = window.boardUI.getFleetArray();
    window.socketClient.placeFleet(fleet);
    btnReadyFight.disabled = true;
    btnReadyFight.textContent = 'Esperando al rival...';
    showToast('Flota confirmada. Esperando a tu rival...', 'info');
  });

  // Inicializar Grid de Colocación
  window.boardUI.createGridDOM(
    placementGridEl,
    (r, c) => {
      if (window.boardUI.placeShipInPlacement(r, c)) {
        window.soundFx.playClick();
        window.boardUI.renderPlacementGrid(placementGridEl);
        renderShipDock();
      } else {
        showToast('Posición no válida', 'error', 1200);
      }
    },
    (r, c) => {
      window.boardUI.previewShipPlacement(placementGridEl, r, c);
    },
    () => {
      window.boardUI.clearPlacementPreview(placementGridEl);
    }
  );

  // Inicializar Grids de Batalla
  window.boardUI.createGridDOM(playerGridEl, null, null, null);
  window.boardUI.createGridDOM(
    enemyGridEl,
    (r, c) => {
      if (!currentRoomState) return;
      if (currentRoomState.status !== 'playing') return;
      if (!currentRoomState.isMyTurn) {
        showToast('Es el turno de tu rival', 'error', 1200);
        return;
      }

      if (currentRoomState.opponent && currentRoomState.opponent.board && currentRoomState.opponent.board.shots) {
        const alreadyShot = currentRoomState.opponent.board.shots.some(s => s.row === r && s.col === c);
        if (alreadyShot) {
          showToast('Ya has disparado en esta casilla', 'error', 1200);
          return;
        }
      }

      window.soundFx.playShot();
      window.socketClient.fireShot(r, c);
    },
    null,
    null
  );

  // --- GESTIÓN DEL CHAT MODAL FLOTANTE ---
  if (btnToggleChat && chatFloatingModal) {
    btnToggleChat.addEventListener('click', () => {
      window.soundFx.playClick();
      const isCurrentlyHidden = chatFloatingModal.classList.contains('hidden');
      chatFloatingModal.classList.toggle('hidden');

      if (isCurrentlyHidden) {
        unreadChatCount = 0;
        if (chatUnreadBadge) {
          chatUnreadBadge.textContent = '0';
          chatUnreadBadge.classList.add('hidden');
        }
        chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
        inputChatMessage.focus();
      }
    });
  }

  if (btnCloseChat && chatFloatingModal) {
    btnCloseChat.addEventListener('click', () => {
      window.soundFx.playClick();
      chatFloatingModal.classList.add('hidden');
    });
  }

  function appendChatMessage(msg) {
    const item = document.createElement('div');
    item.className = `chat-msg ${msg.isSystem ? 'system' : ''} ${msg.senderId === (currentRoomState ? currentRoomState.me.id : '') ? 'mine' : ''}`;

    const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (msg.isSystem) {
      item.innerHTML = `<span class="time">${time}</span> <span class="sys-badge">Sistema:</span> ${msg.text}`;
    } else {
      item.innerHTML = `<span class="time">${time}</span> <strong>${msg.senderName}:</strong> <span>${msg.text}</span>`;
    }

    chatMessagesEl.appendChild(item);
    chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;

    // Si el chat está cerrado y es un mensaje de jugador, incrementar badge
    if (chatFloatingModal && chatFloatingModal.classList.contains('hidden') && !msg.isSystem) {
      unreadChatCount++;
      if (chatUnreadBadge) {
        chatUnreadBadge.textContent = unreadChatCount > 9 ? '9+' : unreadChatCount.toString();
        chatUnreadBadge.classList.remove('hidden');
      }
    }
  }

  function sendChatCurrent() {
    const text = inputChatMessage.value.trim();
    if (!text) return;
    window.socketClient.sendChat(text);
    inputChatMessage.value = '';
  }

  btnSendChat.addEventListener('click', sendChatCurrent);
  inputChatMessage.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendChatCurrent();
  });

  // --- REVANCHA Y REINICIO ---
  btnRequestRematch.addEventListener('click', () => {
    window.soundFx.playClick();
    btnRequestRematch.disabled = true;
    btnRequestRematch.textContent = 'Esperando a tu rival...';
    window.socketClient.requestRematch();
  });

  btnBackToMenu.addEventListener('click', () => {
    window.soundFx.playClick();
    window.socketClient.clearSession();
    switchView('menu');
  });

  // Renderizador minimalista de la flota
  function renderFleetTracker(containerEl, fleetData, isEnemy = false) {
    containerEl.innerHTML = '';
    window.FLEET_SPECS.forEach(def => {
      let isSunk = false;
      if (isEnemy) {
        if (fleetData && fleetData.sunkShips) {
          isSunk = fleetData.sunkShips.some(s => s.id === def.id);
        }
      } else {
        if (fleetData && fleetData.ships) {
          const ship = fleetData.ships.find(s => s.id === def.id);
          isSunk = ship ? ship.sunk : false;
        }
      }

      let pipsHtml = '';
      for (let i = 0; i < def.size; i++) {
        pipsHtml += `<span class="tracker-pip ${isSunk ? 'sunk' : 'active'}"></span>`;
      }

      const item = document.createElement('div');
      item.className = `tracker-item ${isSunk ? 'sunk' : 'intact'}`;
      item.innerHTML = `
        <span class="tracker-ship-icon">${def.icon}</span>
        <span class="tracker-name">${def.name}</span>
        <div class="tracker-pips">${pipsHtml}</div>
      `;
      containerEl.appendChild(item);
    });
  }

  // --- EVENTOS DEL SOCKET ---
  window.socketClient.on('connection_change', ({ connected }) => {
    const indicator = document.getElementById('connection-status-pill');
    if (indicator) {
      indicator.className = `status-pill ${connected ? 'online' : 'offline'}`;
      const statusText = indicator.querySelector('.status-text');
      if (statusText) statusText.textContent = connected ? 'Online' : 'Conectando...';
    }
  });

  window.socketClient.on('action_error', ({ message }) => {
    showToast(message, 'error', 3500);
  });

  window.socketClient.on('room_created', ({ roomCode }) => {
    showToast(`Sala ${roomCode} creada`, 'success');
  });

  window.socketClient.on('room_joined', ({ roomCode, isReconnection }) => {
    showToast(isReconnection ? `Reconectado a sala ${roomCode}` : `Unido a la sala ${roomCode}`, 'success');
  });

  window.socketClient.on('reconnect_failed', ({ message }) => {
    showToast(message, 'error');
    switchView('menu');
  });

  window.socketClient.on('chat_received', (msg) => {
    appendChatMessage(msg);
  });

  // Notificaciones de disparos con animaciones en vivo
  window.socketClient.on('shot_fired', ({ result, ship, shooterToken, row, col }) => {
    const isMeShooter = currentRoomState && currentRoomState.me.id === shooterToken;
    const targetGridEl = isMeShooter ? enemyGridEl : playerGridEl;

    // Disparar animación en la celda impactada
    if (targetGridEl && typeof row === 'number' && typeof col === 'number') {
      const cell = targetGridEl.querySelector(`.grid-cell[data-row="${row}"][data-col="${col}"]`);
      if (cell) {
        if (result === 'water') {
          cell.classList.add('anim-water-splash');
          setTimeout(() => cell.classList.remove('anim-water-splash'), 900);
        } else if (result === 'hit' || result === 'sunk') {
          cell.classList.add('anim-hit-explosion');
          targetGridEl.classList.add('anim-board-shake');
          setTimeout(() => {
            cell.classList.remove('anim-hit-explosion');
            targetGridEl.classList.remove('anim-board-shake');
          }, 600);
        }
      }
    }

    if (result === 'water') {
      window.soundFx.playWater();
      showToast(isMeShooter ? '💧 ¡Agua!' : '💧 El rival falló el disparo (Agua)', 'water', 2000);
    } else if (result === 'hit') {
      window.soundFx.playHit();
      showToast(isMeShooter ? '🔥 ¡Tocado! Tienes otro disparo' : '💥 ¡Impacto recibido en tu barco!', 'hit', 2500);
    } else if (result === 'sunk') {
      window.soundFx.playSunk();
      showToast(isMeShooter ? `🚨 ¡HUNDIDO! Has destruido el ${ship.name}` : `🚨 ¡Tu ${ship.name} ha sido HUNDIDO!`, 'sunk', 4000);
    }
  });

  // Sincronización del estado de la sala
  window.socketClient.on('room_state', (state) => {
    const prevState = currentRoomState;
    currentRoomState = state;

    // Actualizar datos del Lobby
    if (lobbyRoomCode) lobbyRoomCode.textContent = state.roomCode;

    if (p1Status) {
      p1Status.textContent = `${state.me.name} (Tú)`;
    }
    if (p2Status) {
      if (state.opponent) {
        p2Status.textContent = `${state.opponent.name} (${state.opponent.connected ? 'Conectado' : 'Desconectado'})`;
        p2Status.className = state.opponent.connected ? 'player-name status-online' : 'player-name status-offline';
      } else {
        p2Status.textContent = 'Esperando rival...';
        p2Status.className = 'player-name status-waiting';
      }
    }

    // Actualizar historial de chat
    if (chatMessagesEl && state.chatMessages) {
      chatMessagesEl.innerHTML = '';
      state.chatMessages.forEach(msg => appendChatMessage(msg));
    }

    // TRANSICIÓN DE VISTAS SEGÚN EL ESTADO
    if (state.status === 'waiting') {
      switchView('lobby');
    } else if (state.status === 'placing') {
      switchView('placement');
      renderShipDock();
      window.boardUI.renderPlacementGrid(placementGridEl);

      if (state.me.ready) {
        btnReadyFight.disabled = true;
        btnReadyFight.textContent = 'Esperando al rival...';
        placementStatusText.textContent = state.opponent && state.opponent.ready
          ? '¡Ambos listos! Iniciando partida...'
          : 'Flota lista. Esperando a tu rival...';
      } else {
        btnReadyFight.textContent = '¡Listo para jugar!';
        placementStatusText.textContent = state.opponent && state.opponent.ready
          ? 'Tu rival ya está listo. ¡Coloca tus barcos!'
          : 'Coloca tus 5 barcos en la cuadrícula.';
      }
    } else if (state.status === 'playing') {
      switchView('battle');

      // Actualizar los dos tableros (visibles al mismo tiempo sin scroll)
      window.boardUI.renderPlayerBoard(playerGridEl, state.me.board);
      window.boardUI.renderEnemyBoard(enemyGridEl, state.opponent ? state.opponent.board : null, state.isMyTurn);

      // Actualizar rastreadores
      renderFleetTracker(playerFleetTracker, state.me.board, false);
      renderFleetTracker(enemyFleetTracker, state.opponent ? state.opponent.board : null, true);

      // Actualizar banner de turno minimalista
      if (state.isMyTurn) {
        battleTurnBanner.className = 'turn-banner my-turn';
        battleTurnBanner.innerHTML = '🎯 <strong>Tu turno</strong> — Selecciona una casilla en el Radar Rival para disparar';
        if (prevState && !prevState.isMyTurn) {
          window.soundFx.playSonar();
        }
      } else {
        const oppName = state.opponent ? state.opponent.name : 'Rival';
        battleTurnBanner.className = 'turn-banner opponent-turn';
        battleTurnBanner.innerHTML = `⏳ <strong>Turno de ${oppName}</strong> — Esperando disparo...`;
      }
    } else if (state.status === 'finished') {
      switchView('gameover');

      const isWinner = state.winnerId === state.me.id;
      if (isWinner) {
        window.soundFx.playVictory();
        gameoverTitle.textContent = '¡Victoria!';
        gameoverTitle.className = 'title-victory';
        gameoverSubtitle.textContent = `Has destruido toda la flota enemiga.`;
      } else {
        window.soundFx.playDefeat();
        gameoverTitle.textContent = 'Derrota';
        gameoverTitle.className = 'title-defeat';
        gameoverSubtitle.textContent = `Tu flota ha sido destruida por ${state.winnerName}.`;
      }

      gameoverStats.innerHTML = `
        <div class="stat-box"><span>Turnos Totales</span><strong>${state.totalTurns}</strong></div>
        <div class="stat-box"><span>Resultado</span><strong>${isWinner ? 'Ganador' : 'Derrotado'}</strong></div>
      `;

      btnRequestRematch.disabled = false;
      btnRequestRematch.textContent = 'Jugar otra partida';
    }
  });

  // Intentar reconectar si ya existe sesión
  window.socketClient.connect();
});
