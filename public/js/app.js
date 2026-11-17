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

  // Nuevos elementos: Barra táctica y Sonar
  const btnSonarPing = document.getElementById('btn-sonar-ping');

  // Dossier del Comandante
  const btnSelectAvatar = document.getElementById('btn-select-avatar');
  const commanderAvatarIcon = document.getElementById('commander-avatar-icon');
  const commanderRankTitle = document.getElementById('commander-rank-title');
  const commanderRankFill = document.getElementById('commander-rank-fill');
  const commanderRankExp = document.getElementById('commander-rank-exp');
  const statWins = document.getElementById('stat-wins');
  const statMatches = document.getElementById('stat-matches');
  const statAccuracy = document.getElementById('stat-accuracy');
  const statSunk = document.getElementById('stat-sunk');
  const btnOpenMedals = document.getElementById('btn-open-medals');
  const medalsCountUnlocked = document.getElementById('medals-count-unlocked');

  // Centro de Operaciones: Bot IA
  const btnPlayBot = document.getElementById('btn-play-bot');
  const diffButtons = document.querySelectorAll('.btn-diff');
  const diffExplanation = document.getElementById('diff-explanation');
  let selectedBotDiff = 'tactical';

  // Hangar Naval
  const hangarShipsTabs = document.getElementById('hangar-ships-tabs');
  const hangarShipDisplay = document.getElementById('hangar-ship-display');
  const btnOpenTacticalGuide = document.getElementById('btn-open-tactical-guide');
  let currentHangarShipId = 'carrier';

  // Modales adicionales
  const modalMedals = document.getElementById('modal-medals');
  const btnCloseMedals = document.getElementById('btn-close-medals');
  const btnDoneMedals = document.getElementById('btn-done-medals');
  const medalsGridContainer = document.getElementById('medals-grid-container');

  const modalAvatars = document.getElementById('modal-avatars');
  const btnCloseAvatars = document.getElementById('btn-close-avatars');
  const avatarsSelectionGrid = document.getElementById('avatars-selection-grid');

  const modalGuide = document.getElementById('modal-guide');
  const btnCloseGuide = document.getElementById('btn-close-guide');
  const btnDoneGuide = document.getElementById('btn-done-guide');

  // Lobby Tip
  const lobbyTipText = document.getElementById('lobby-tip-text');
  let lobbyTipInterval = null;

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

  // Catálogos del Dossier Militar
  const COMMANDER_RANKS = [
    { minWins: 0, title: 'Cadete Naval', reqWins: 1 },
    { minWins: 1, title: 'Marinero Distinguido', reqWins: 3 },
    { minWins: 3, title: 'Alférez de Fragata', reqWins: 6 },
    { minWins: 6, title: 'Teniente de Navío', reqWins: 10 },
    { minWins: 10, title: 'Capitán de Corbeta', reqWins: 16 },
    { minWins: 16, title: 'Comodoro Naval', reqWins: 25 },
    { minWins: 25, title: 'Almirante de la Flota', reqWins: 999 }
  ];

  const MEDALS_CATALOG = [
    { id: 'first_match', icon: '🌊', title: 'Bautismo de Fuego', desc: 'Completar tu primera batalla naval' },
    { id: 'first_win', icon: '🏆', title: 'Primera Sangre', desc: 'Conseguir tu primera victoria militar' },
    { id: 'first_sunk', icon: '💥', title: 'Tiro Certero', desc: 'Hundir tu primer buque enemigo' },
    { id: 'marksman', icon: '🎯', title: 'Ojo de Águila', desc: 'Alcanzar una precisión de disparo >= 40%' },
    { id: 'streak_3', icon: '🔥', title: 'Racha Imparable', desc: 'Ganar 3 batallas consecutivas' },
    { id: 'carrier_hunter', icon: '🚢', title: 'Hundidor de Titanes', desc: 'Hundir el Portaaviones enemigo (5 casillas)' },
    { id: 'veteran', icon: '⚓', title: 'Lobo de Mar', desc: 'Completar al menos 5 batallas' },
    { id: 'grand_admiral', icon: '👑', title: 'Leyenda Oceánica', desc: 'Alcanzar 10 victorias navales' }
  ];

  const AVATARS = [
    { id: 'anchor', icon: '⚓', name: 'Almirante Supremo' },
    { id: 'medal', icon: '🎖️', name: 'Capitán de Fragata' },
    { id: 'shark', icon: '🦈', name: 'Lobo del Abismo' },
    { id: 'lightning', icon: '⚡', name: 'As Corsario' },
    { id: 'shield', icon: '🛡️', name: 'Titán Blindado' },
    { id: 'compass', icon: '🧭', name: 'Navegante Polar' }
  ];

  const HANGAR_SHIPS = [
    {
      id: 'carrier',
      name: 'Portaaviones Titan',
      cells: 5,
      icon: '🚢',
      class: 'Clase Apex Supercarrier',
      armor: 95,
      firepower: 80,
      radar: 100,
      speed: 60,
      role: 'Buque Insignia & Reconocimiento',
      desc: 'El barco más imponente de la flota. Su tamaño lo hace vulnerable a un barrido en línea, pero cuenta con blindaje de alta resistencia.'
    },
    {
      id: 'battleship',
      name: 'Acorazado Dreadnought',
      cells: 4,
      icon: '🛳️',
      class: 'Clase Leviatán Pesado',
      armor: 100,
      firepower: 95,
      radar: 70,
      speed: 55,
      role: 'Artillería de Gran Calibre',
      desc: 'Fortaleza marina armada con cañones balísticos pesados. Excelente blindaje de placas templadas para resistir fuego concentrado.'
    },
    {
      id: 'cruiser1',
      name: 'Crucero Lanzamisiles Alfa',
      cells: 3,
      icon: '🛥️',
      class: 'Clase Aegis Táctica',
      armor: 75,
      firepower: 85,
      radar: 90,
      speed: 75,
      role: 'Intercepción & Misiles Guiados',
      desc: 'Equipado con radares de matriz activa. Rápido y letal para patrullar sectores oceánicos medianos.'
    },
    {
      id: 'cruiser2',
      name: 'Crucero Bravo',
      cells: 3,
      icon: '🛥️',
      class: 'Clase Aegis Táctica',
      armor: 75,
      firepower: 85,
      radar: 90,
      speed: 75,
      role: 'Guerra Antiaérea & Escolta',
      desc: 'Hermano táctico del Crucero Alfa. Su camuflaje lo convierte en una pieza estratégica en cuadrantes periféricos.'
    },
    {
      id: 'destroyer',
      name: 'Destructor Corbeta Flash',
      cells: 2,
      icon: '🚤',
      class: 'Clase Corsario Sigiloso',
      armor: 50,
      firepower: 70,
      radar: 80,
      speed: 100,
      role: 'Ataque Relámpago & Sigilo',
      desc: 'El navío más esquivo. Ocupa solo 2 casillas, por lo que suele ser el último en ser encontrado y el que decide partidas apretadas.'
    }
  ];

  const LOBBY_TIPS = [
    'Disparar en patrón de ajedrez (paridad) te garantiza encontrar cualquier barco ahorrando la mitad de tiros.',
    'Cuando consigas un "¡TOCADO!", dispara en cruz (Norte, Sur, Este y Oeste) para fijar el rumbo del buque.',
    'Colocar barcos en los bordes extremos del tablero suele engañar a los rivales que concentran su fuego en el centro.',
    'Si tocas o hundes un barco enemigo, ¡tienes derecho a disparar de nuevo inmediatamente!',
    'Invita a tu rival con 1 toque usando el botón de WhatsApp o copiando el enlace directo.'
  ];

  const DIFF_EXPLANATIONS = {
    easy: '🟢 <strong>Recluta:</strong> Disparos dispersos y relajados, ideal para probar la interfaz o jugar sin presión.',
    tactical: '🔵 <strong>Táctico:</strong> Dispara de forma inteligente y activa la búsqueda en cruz tras cada impacto.',
    hard: '🔴 <strong>Almirante Némesis:</strong> Utiliza el algoritmo de paridad matemática y persecución implacable.'
  };

  // Gestión de perfil del Comandante
  function loadCommanderProfile() {
    const defaultProfile = {
      avatar: '⚓',
      wins: 0,
      matches: 0,
      losses: 0,
      streak: 0,
      bestStreak: 0,
      shotsTotal: 0,
      shotsHit: 0,
      shipsSunk: 0,
      medals: []
    };
    try {
      const raw = localStorage.getItem('battleship_profile');
      if (raw) return { ...defaultProfile, ...JSON.parse(raw) };
    } catch (e) {}
    return defaultProfile;
  }

  function saveCommanderProfile(profile) {
    try {
      localStorage.setItem('battleship_profile', JSON.stringify(profile));
    } catch (e) {}
  }

  let commanderProfile = loadCommanderProfile();
  let currentMatchCombatStats = { shotsTotal: 0, shotsHit: 0, shipsSunk: 0, enemyShipsSunk: [] };

  function getCommanderRank(wins) {
    let currentRank = COMMANDER_RANKS[0];
    for (const r of COMMANDER_RANKS) {
      if (wins >= r.minWins) currentRank = r;
    }
    return currentRank;
  }

  function updateCommanderDossierUI() {
    if (!statWins) return;
    statWins.textContent = commanderProfile.wins || 0;
    statMatches.textContent = commanderProfile.matches || 0;

    const acc = commanderProfile.shotsTotal > 0
      ? Math.round((commanderProfile.shotsHit / commanderProfile.shotsTotal) * 100)
      : 0;
    statAccuracy.textContent = `${acc}%`;
    statSunk.textContent = commanderProfile.shipsSunk || 0;

    if (commanderAvatarIcon) {
      commanderAvatarIcon.textContent = commanderProfile.avatar || '⚓';
    }

    const rank = getCommanderRank(commanderProfile.wins || 0);
    if (commanderRankTitle) {
      commanderRankTitle.textContent = rank.title;
    }

    if (commanderRankFill && commanderRankExp) {
      if (rank.reqWins === 999) {
        commanderRankFill.style.width = '100%';
        commanderRankExp.textContent = 'Rango Máximo Alcanzado 👑';
      } else {
        const prevMin = rank.minWins;
        const nextMin = rank.reqWins;
        const progress = Math.min(Math.max((commanderProfile.wins - prevMin) / (nextMin - prevMin), 0.08), 1);
        commanderRankFill.style.width = `${Math.round(progress * 100)}%`;
        const needed = nextMin - commanderProfile.wins;
        commanderRankExp.textContent = `${needed} ${needed === 1 ? 'victoria' : 'victorias'} para ascender`;
      }
    }

    if (medalsCountUnlocked) {
      const count = (commanderProfile.medals && commanderProfile.medals.length) || 0;
      medalsCountUnlocked.textContent = count;
    }
  }

  updateCommanderDossierUI();

  // Radar de fondo interactivo
  function initRadarCanvasBg() {
    const canvas = document.getElementById('radar-canvas-bg');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    let angle = 0;
    const blips = [
      { dist: 0.28, angle: 0.7, opacity: 0, size: 4 },
      { dist: 0.45, angle: 2.1, opacity: 0, size: 5 },
      { dist: 0.62, angle: 4.2, opacity: 0, size: 4.5 },
      { dist: 0.75, angle: 5.6, opacity: 0, size: 3.5 }
    ];

    function draw() {
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      const maxRadius = Math.max(width, height) * 0.62;

      // Anillos del sonar
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
      ctx.lineWidth = 1;
      const rings = 5;
      for (let i = 1; i <= rings; i++) {
        const r = (maxRadius / rings) * i;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Cruz táctica
      ctx.beginPath();
      ctx.moveTo(cx - maxRadius, cy);
      ctx.lineTo(cx + maxRadius, cy);
      ctx.moveTo(cx, cy - maxRadius);
      ctx.lineTo(cx, cy + maxRadius);
      ctx.stroke();

      // Haz rotatorio
      angle = (angle + 0.011) % (Math.PI * 2);

      const sweepGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxRadius);
      sweepGradient.addColorStop(0, 'rgba(56, 189, 248, 0.16)');
      sweepGradient.addColorStop(1, 'rgba(56, 189, 248, 0.0)');

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, maxRadius, angle - 0.28, angle);
      ctx.closePath();
      ctx.fillStyle = sweepGradient;
      ctx.fill();

      // Línea frontal
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * maxRadius, cy + Math.sin(angle) * maxRadius);
      ctx.stroke();
      ctx.restore();

      // Blips
      blips.forEach(b => {
        const bx = cx + Math.cos(b.angle) * (maxRadius * b.dist);
        const by = cy + Math.sin(b.angle) * (maxRadius * b.dist);

        const diff = Math.abs((angle - b.angle + Math.PI * 2) % (Math.PI * 2));
        if (diff < 0.035) {
          b.opacity = 1.0;
        }

        if (b.opacity > 0.01) {
          ctx.fillStyle = `rgba(56, 189, 248, ${b.opacity * 0.75})`;
          ctx.beginPath();
          ctx.arc(bx, by, b.size, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = `rgba(56, 189, 248, ${b.opacity * 0.4})`;
          ctx.beginPath();
          ctx.arc(bx, by, b.size + (1 - b.opacity) * 16, 0, Math.PI * 2);
          ctx.stroke();

          b.opacity -= 0.007;
        }
      });

      if (!document.hidden) {
        requestAnimationFrame(draw);
      }
    }

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) draw();
    });

    draw();
  }
  initRadarCanvasBg();

  // Botón Probar Sonar
  if (btnSonarPing) {
    btnSonarPing.addEventListener('click', () => {
      window.soundFx.playSonar();
      showToast('📡 Pulso acústico de sonar emitido', 'info', 2000);
    });
  }

  // Guardar nombre en tiempo real
  if (inputPlayerName) {
    inputPlayerName.addEventListener('input', () => {
      localStorage.setItem('battleship_player_name', inputPlayerName.value.trim());
    });
  }

  // Selector de Dificultad para el Bot IA
  diffButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      window.soundFx.playClick();
      diffButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedBotDiff = btn.dataset.diff;
      if (diffExplanation && DIFF_EXPLANATIONS[selectedBotDiff]) {
        diffExplanation.innerHTML = DIFF_EXPLANATIONS[selectedBotDiff];
      }
    });
  });

  // Botón Jugar contra el Bot IA
  if (btnPlayBot) {
    btnPlayBot.addEventListener('click', () => {
      window.soundFx.playClick();
      const name = getPlayerName();
      window.socketClient.createBotRoom(name, selectedBotDiff);
    });
  }

  // Renderizar Hangar Naval
  function renderHangar() {
    if (!hangarShipsTabs || !hangarShipDisplay) return;

    hangarShipsTabs.innerHTML = '';
    HANGAR_SHIPS.forEach(ship => {
      const tab = document.createElement('button');
      tab.className = `hangar-tab-btn ${ship.id === currentHangarShipId ? 'active' : ''}`;
      tab.innerHTML = `<span>${ship.icon}</span> <span>${ship.name.split(' ')[0]}</span>`;
      tab.addEventListener('click', () => {
        window.soundFx.playInspect();
        currentHangarShipId = ship.id;
        renderHangar();
      });
      hangarShipsTabs.appendChild(tab);
    });

    const activeShip = HANGAR_SHIPS.find(s => s.id === currentHangarShipId) || HANGAR_SHIPS[0];

    let segmentsHtml = '';
    for (let i = 0; i < activeShip.cells; i++) {
      segmentsHtml += `<div class="ship-segment-block"></div>`;
    }

    hangarShipDisplay.innerHTML = `
      <div class="ship-blueprint-top">
        <span class="ship-class-title">${activeShip.name}</span>
        <span class="ship-cells-badge">${activeShip.cells} Casillas</span>
      </div>

      <div class="ship-visual-render">
        <div class="ship-render-icon">${activeShip.icon}</div>
        <div class="ship-render-segments">${segmentsHtml}</div>
      </div>

      <div class="ship-bars-container">
        <div class="spec-bar-row">
          <div class="spec-bar-header"><span>Blindaje</span><span>${activeShip.armor}%</span></div>
          <div class="spec-bar-track"><div class="spec-bar-fill" style="width: ${activeShip.armor}%;"></div></div>
        </div>
        <div class="spec-bar-row">
          <div class="spec-bar-header"><span>Potencia Balística</span><span>${activeShip.firepower}%</span></div>
          <div class="spec-bar-track"><div class="spec-bar-fill" style="width: ${activeShip.firepower}%;"></div></div>
        </div>
        <div class="spec-bar-row">
          <div class="spec-bar-header"><span>Radar & Detección</span><span>${activeShip.radar}%</span></div>
          <div class="spec-bar-track"><div class="spec-bar-fill" style="width: ${activeShip.radar}%;"></div></div>
        </div>
        <div class="spec-bar-row">
          <div class="spec-bar-header"><span>Velocidad & Maniobra</span><span>${activeShip.speed}%</span></div>
          <div class="spec-bar-track"><div class="spec-bar-fill" style="width: ${activeShip.speed}%;"></div></div>
        </div>
      </div>

      <p class="ship-lore-text">${activeShip.desc}</p>
    `;
  }
  renderHangar();

  // Modal de Condecoraciones
  function renderMedalsList() {
    if (!medalsGridContainer) return;
    medalsGridContainer.innerHTML = '';
    const unlockedIds = new Set(commanderProfile.medals || []);

    MEDALS_CATALOG.forEach(medal => {
      const isUnlocked = unlockedIds.has(medal.id);
      const card = document.createElement('div');
      card.className = `medal-card-item ${isUnlocked ? 'unlocked' : 'locked'}`;
      card.innerHTML = `
        <div class="medal-icon-box">${medal.icon}</div>
        <div class="medal-info">
          <span class="medal-title-text">${medal.title}</span>
          <span class="medal-desc-text">${medal.desc}</span>
          <span class="medal-status-badge ${isUnlocked ? 'status-badge-unlocked' : 'status-badge-locked'}">
            ${isUnlocked ? '✓ DESBLOQUEADA' : '🔒 BLOQUEADA'}
          </span>
        </div>
      `;
      medalsGridContainer.appendChild(card);
    });
  }

  if (btnOpenMedals) {
    btnOpenMedals.addEventListener('click', () => {
      window.soundFx.playClick();
      renderMedalsList();
      modalMedals.classList.remove('hidden');
    });
  }
  if (btnCloseMedals) btnCloseMedals.addEventListener('click', () => modalMedals.classList.add('hidden'));
  if (btnDoneMedals) btnDoneMedals.addEventListener('click', () => modalMedals.classList.add('hidden'));

  // Modal de Avatares
  function renderAvatarsList() {
    if (!avatarsSelectionGrid) return;
    avatarsSelectionGrid.innerHTML = '';
    AVATARS.forEach(av => {
      const btn = document.createElement('button');
      btn.className = `avatar-choice-btn ${commanderProfile.avatar === av.icon ? 'active' : ''}`;
      btn.innerHTML = `
        <span class="avatar-choice-icon">${av.icon}</span>
        <span class="avatar-choice-name">${av.name}</span>
      `;
      btn.addEventListener('click', () => {
        window.soundFx.playClick();
        commanderProfile.avatar = av.icon;
        saveCommanderProfile(commanderProfile);
        updateCommanderDossierUI();
        modalAvatars.classList.add('hidden');
        showToast(`Insignia cambiada a ${av.name}`, 'success');
      });
      avatarsSelectionGrid.appendChild(btn);
    });
  }

  if (btnSelectAvatar) {
    btnSelectAvatar.addEventListener('click', () => {
      window.soundFx.playClick();
      renderAvatarsList();
      modalAvatars.classList.remove('hidden');
    });
  }
  if (btnCloseAvatars) btnCloseAvatars.addEventListener('click', () => modalAvatars.classList.add('hidden'));

  // Modal Guía Táctica
  if (btnOpenTacticalGuide) {
    btnOpenTacticalGuide.addEventListener('click', () => {
      window.soundFx.playClick();
      modalGuide.classList.remove('hidden');
    });
  }
  if (btnCloseGuide) btnCloseGuide.addEventListener('click', () => modalGuide.classList.add('hidden'));
  if (btnDoneGuide) btnDoneGuide.addEventListener('click', () => modalGuide.classList.add('hidden'));

  // Rotación de consejos en el Lobby
  let tipIndex = 0;
  function startLobbyTips() {
    if (lobbyTipInterval) clearInterval(lobbyTipInterval);
    if (!lobbyTipText) return;
    lobbyTipText.textContent = LOBBY_TIPS[0];
    lobbyTipInterval = setInterval(() => {
      tipIndex = (tipIndex + 1) % LOBBY_TIPS.length;
      lobbyTipText.textContent = LOBBY_TIPS[tipIndex];
    }, 6000);
  }

  // Mostrar vistas
  function switchView(viewName) {
    Object.keys(views).forEach(k => {
      if (views[k]) {
        views[k].classList.toggle('active', k === viewName);
      }
    });

    if (viewName === 'lobby') {
      startLobbyTips();
    } else {
      if (lobbyTipInterval) clearInterval(lobbyTipInterval);
    }

    if (viewName === 'menu') {
      updateCommanderDossierUI();
    }

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

    // Registrar estadísticas para la hoja de servicio del comandante
    if (isMeShooter) {
      currentMatchCombatStats.shotsTotal++;
      if (result === 'hit' || result === 'sunk') {
        currentMatchCombatStats.shotsHit++;
      }
      if (result === 'sunk' && ship && ship.id) {
        currentMatchCombatStats.shipsSunk++;
        currentMatchCombatStats.enemyShipsSunk.push(ship.id);
      }
    }

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

      // Reiniciar estadísticas de tiro para la nueva partida
      currentMatchCombatStats = { shotsTotal: 0, shotsHit: 0, shipsSunk: 0, enemyShipsSunk: [] };

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

      // Actualizar estadísticas permanentes del comandante
      commanderProfile.matches = (commanderProfile.matches || 0) + 1;
      if (isWinner) {
        commanderProfile.wins = (commanderProfile.wins || 0) + 1;
        commanderProfile.streak = (commanderProfile.streak || 0) + 1;
        if (commanderProfile.streak > (commanderProfile.bestStreak || 0)) {
          commanderProfile.bestStreak = commanderProfile.streak;
        }
      } else {
        commanderProfile.losses = (commanderProfile.losses || 0) + 1;
        commanderProfile.streak = 0;
      }

      commanderProfile.shotsTotal = (commanderProfile.shotsTotal || 0) + currentMatchCombatStats.shotsTotal;
      commanderProfile.shotsHit = (commanderProfile.shotsHit || 0) + currentMatchCombatStats.shotsHit;
      commanderProfile.shipsSunk = (commanderProfile.shipsSunk || 0) + currentMatchCombatStats.shipsSunk;

      // Comprobar medallas desbloqueadas
      const unlockedSet = new Set(commanderProfile.medals || []);
      const newlyUnlocked = [];

      const checkUnlock = (id, condition) => {
        if (!unlockedSet.has(id) && condition) {
          unlockedSet.add(id);
          newlyUnlocked.push(id);
        }
      };

      checkUnlock('first_match', commanderProfile.matches >= 1);
      checkUnlock('first_win', commanderProfile.wins >= 1);
      checkUnlock('first_sunk', commanderProfile.shipsSunk >= 1);
      checkUnlock('marksman', commanderProfile.shotsTotal >= 8 && (commanderProfile.shotsHit / commanderProfile.shotsTotal) >= 0.40);
      checkUnlock('streak_3', (commanderProfile.bestStreak || 0) >= 3);
      checkUnlock('carrier_hunter', currentMatchCombatStats.enemyShipsSunk.includes('carrier'));
      checkUnlock('veteran', commanderProfile.matches >= 5);
      checkUnlock('grand_admiral', commanderProfile.wins >= 10);

      commanderProfile.medals = Array.from(unlockedSet);
      saveCommanderProfile(commanderProfile);
      updateCommanderDossierUI();

      if (newlyUnlocked.length > 0) {
        const medalObj = MEDALS_CATALOG.find(m => m.id === newlyUnlocked[0]);
        setTimeout(() => {
          window.soundFx.playMedal();
          showToast(`🏅 ¡Condecoración Desbloqueada: ${medalObj ? medalObj.title : 'Medalla'}!`, 'success', 5000);
        }, 1200);
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
