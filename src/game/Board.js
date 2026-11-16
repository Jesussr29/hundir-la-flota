const BOARD_SIZE = 10;

const FLEET_DEFINITIONS = [
  { id: 'carrier', name: 'Portaaviones', size: 5 },
  { id: 'battleship', name: 'Acorazado', size: 4 },
  { id: 'cruiser1', name: 'Crucero Alfa', size: 3 },
  { id: 'cruiser2', name: 'Crucero Bravo', size: 3 },
  { id: 'destroyer', name: 'Destructor', size: 2 }
];

class Board {
  constructor() {
    this.size = BOARD_SIZE;
    this.ships = new Map(); // id -> { id, name, size, row, col, orientation, hits: Set }
    this.shots = new Map(); // "row,col" -> 'water' | 'hit'
  }

  /**
   * Obtiene la definición oficial de la flota.
   */
  static getFleetDefinitions() {
    return FLEET_DEFINITIONS;
  }

  /**
   * Calcula las casillas que ocuparía un barco.
   */
  static calculateCoordinates(size, row, col, orientation) {
    const coords = [];
    for (let i = 0; i < size; i++) {
      const r = orientation === 'horizontal' ? row : row + i;
      const c = orientation === 'horizontal' ? col + i : col;
      coords.push({ row: r, col: c });
    }
    return coords;
  }

  /**
   * Valida si un barco puede ser colocado en una posición dada sin salir del tablero
   * y sin solaparse con otros barcos ya colocados.
   */
  canPlaceShip(shipId, size, row, col, orientation) {
    if (row < 0 || col < 0) return false;
    if (orientation === 'horizontal') {
      if (col + size > this.size || row >= this.size) return false;
    } else if (orientation === 'vertical') {
      if (row + size > this.size || col >= this.size) return false;
    } else {
      return false;
    }

    const proposedCoords = Board.calculateCoordinates(size, row, col, orientation);

    // Comprobar colisión con otros barcos existentes
    for (const [id, ship] of this.ships.entries()) {
      if (id === shipId) continue; // Permitir reubicación del mismo barco
      const existingCoords = Board.calculateCoordinates(ship.size, ship.row, ship.col, ship.orientation);
      for (const p of proposedCoords) {
        if (existingCoords.some(e => e.row === p.row && e.col === p.col)) {
          return false; // Hay solapamiento
        }
      }
    }

    return true;
  }

  /**
   * Coloca un barco en el tablero.
   */
  placeShip(shipId, row, col, orientation) {
    const def = FLEET_DEFINITIONS.find(d => d.id === shipId);
    if (!def) {
      throw new Error(`Barco desconocido: ${shipId}`);
    }

    if (!this.canPlaceShip(shipId, def.size, row, col, orientation)) {
      throw new Error(`Posición inválida para ${def.name}`);
    }

    this.ships.set(shipId, {
      id: def.id,
      name: def.name,
      size: def.size,
      row,
      col,
      orientation,
      hits: new Set()
    });

    return true;
  }

  /**
   * Quita un barco del tablero.
   */
  removeShip(shipId) {
    return this.ships.delete(shipId);
  }

  /**
   * Limpia todos los barcos colocados.
   */
  clear() {
    this.ships.clear();
  }

  /**
   * Verifica si toda la flota reglamentaria está colocada.
   */
  isFleetReady() {
    if (this.ships.size !== FLEET_DEFINITIONS.length) return false;
    for (const def of FLEET_DEFINITIONS) {
      if (!this.ships.has(def.id)) return false;
    }
    return true;
  }

  /**
   * Genera una colocación aleatoria válida para todos los barcos.
   */
  placeShipsRandomly() {
    this.clear();
    for (const def of FLEET_DEFINITIONS) {
      let placed = false;
      let attempts = 0;
      while (!placed && attempts < 500) {
        attempts++;
        const orientation = Math.random() < 0.5 ? 'horizontal' : 'vertical';
        const maxRow = orientation === 'vertical' ? this.size - def.size : this.size - 1;
        const maxCol = orientation === 'horizontal' ? this.size - def.size : this.size - 1;
        const row = Math.floor(Math.random() * (maxRow + 1));
        const col = Math.floor(Math.random() * (maxCol + 1));

        if (this.canPlaceShip(def.id, def.size, row, col, orientation)) {
          this.placeShip(def.id, row, col, orientation);
          placed = true;
        }
      }
      if (!placed) {
        // En caso extremadamente raro de bloqueo, reintentar desde cero
        return this.placeShipsRandomly();
      }
    }
    return true;
  }

  /**
   * Procesa un disparo entrante a las coordenadas (row, col).
   * Devuelve: { result: 'water'|'hit'|'sunk', ship?, row, col, allSunk }
   */
  receiveShot(row, col) {
    if (row < 0 || row >= this.size || col < 0 || col >= this.size) {
      throw new Error(`Coordenadas fuera del tablero: (${row}, ${col})`);
    }

    const key = `${row},${col}`;
    if (this.shots.has(key)) {
      throw new Error(`Casilla ya disparada: (${row}, ${col})`);
    }

    // Comprobar si golpea a algún barco
    for (const ship of this.ships.values()) {
      const coords = Board.calculateCoordinates(ship.size, ship.row, ship.col, ship.orientation);
      const isHit = coords.some(c => c.row === row && c.col === col);

      if (isHit) {
        ship.hits.add(key);
        this.shots.set(key, 'hit');

        const isSunk = ship.hits.size === ship.size;
        const allSunk = this.areAllShipsSunk();

        if (isSunk) {
          return {
            result: 'sunk',
            ship: {
              id: ship.id,
              name: ship.name,
              size: ship.size,
              coordinates: coords
            },
            row,
            col,
            allSunk
          };
        }

        return {
          result: 'hit',
          shipName: ship.name,
          row,
          col,
          allSunk
        };
      }
    }

    // Disparo al agua
    this.shots.set(key, 'water');
    return {
      result: 'water',
      row,
      col,
      allSunk: false
    };
  }

  /**
   * Verifica si todos los barcos han sido hundidos.
   */
  areAllShipsSunk() {
    if (this.ships.size === 0) return false;
    for (const ship of this.ships.values()) {
      if (ship.hits.size < ship.size) {
        return false;
      }
    }
    return true;
  }

  /**
   * Devuelve la visión del tablero para el propio jugador (barcos visibles + disparos recibidos).
   */
  getPrivateView() {
    const shipsArray = [];
    for (const ship of this.ships.values()) {
      shipsArray.push({
        id: ship.id,
        name: ship.name,
        size: ship.size,
        row: ship.row,
        col: ship.col,
        orientation: ship.orientation,
        hits: Array.from(ship.hits),
        sunk: ship.hits.size === ship.size
      });
    }

    const shotsArray = [];
    for (const [key, status] of this.shots.entries()) {
      const [r, c] = key.split(',').map(Number);
      shotsArray.push({ row: r, col: c, status });
    }

    return {
      ships: shipsArray,
      shots: shotsArray
    };
  }

  /**
   * Devuelve la visión pública del tablero (para el adversario).
   * NUNCA incluye posiciones de barcos ocultos.
   * Solo incluye el historial de disparos y la información de barcos ya hundidos.
   */
  getPublicView() {
    const shotsArray = [];
    for (const [key, status] of this.shots.entries()) {
      const [r, c] = key.split(',').map(Number);
      shotsArray.push({ row: r, col: c, status });
    }

    const sunkShips = [];
    for (const ship of this.ships.values()) {
      if (ship.hits.size === ship.size) {
        sunkShips.push({
          id: ship.id,
          name: ship.name,
          size: ship.size,
          coordinates: Board.calculateCoordinates(ship.size, ship.row, ship.col, ship.orientation)
        });
      }
    }

    return {
      shots: shotsArray,
      sunkShips
    };
  }

  /**
   * Serializa el estado completo para almacenar en base de datos.
   */
  serialize() {
    const ships = [];
    for (const s of this.ships.values()) {
      ships.push({
        id: s.id,
        name: s.name,
        size: s.size,
        row: s.row,
        col: s.col,
        orientation: s.orientation,
        hits: Array.from(s.hits)
      });
    }

    const shots = [];
    for (const [k, v] of this.shots.entries()) {
      shots.push({ key: k, status: v });
    }

    return { ships, shots };
  }

  /**
   * Restaura el estado desde la base de datos.
   */
  static deserialize(data) {
    const board = new Board();
    if (!data) return board;

    if (data.ships) {
      for (const s of data.ships) {
        board.ships.set(s.id, {
          id: s.id,
          name: s.name,
          size: s.size,
          row: s.row,
          col: s.col,
          orientation: s.orientation,
          hits: new Set(s.hits || [])
        });
      }
    }

    if (data.shots) {
      for (const shot of data.shots) {
        board.shots.set(shot.key, shot.status);
      }
    }

    return board;
  }
}

module.exports = Board;
