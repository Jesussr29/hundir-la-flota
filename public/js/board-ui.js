/**
 * Controlador de renderizado interactivo y gestión visual de los tableros
 * Versión Naval Dinámica con Animaciones y Color
 */
const FLEET_SPECS = [
  { id: 'carrier', name: 'Portaaviones', size: 5, icon: '🚢' },
  { id: 'battleship', name: 'Acorazado', size: 4, icon: '🛳️' },
  { id: 'cruiser1', name: 'Crucero 1', size: 3, icon: '🛥️' },
  { id: 'cruiser2', name: 'Crucero 2', size: 3, icon: '🛥️' },
  { id: 'destroyer', name: 'Destructor', size: 2, icon: '🚤' }
];

class BoardUI {
  constructor() {
    this.size = 10;
    this.placementShips = new Map(); // id -> { id, name, size, row, col, orientation }
    this.selectedShipId = 'carrier';
    this.currentOrientation = 'horizontal';
  }

  /**
   * Genera el DOM de un tablero 10x10 con etiquetas A-J y 1-10.
   */
  createGridDOM(gridElement, cellClickHandler, cellHoverHandler, cellLeaveHandler) {
    gridElement.innerHTML = '';

    // Esquina vacía
    const corner = document.createElement('div');
    corner.className = 'grid-header corner';
    gridElement.appendChild(corner);

    // Letras A-J
    for (let c = 0; c < this.size; c++) {
      const colHeader = document.createElement('div');
      colHeader.className = 'grid-header col-header';
      colHeader.dataset.col = c;
      colHeader.textContent = String.fromCharCode(65 + c);
      gridElement.appendChild(colHeader);
    }

    // Filas con número y celdas
    for (let r = 0; r < this.size; r++) {
      const rowHeader = document.createElement('div');
      rowHeader.className = 'grid-header row-header';
      rowHeader.dataset.row = r;
      rowHeader.textContent = (r + 1).toString();
      gridElement.appendChild(rowHeader);

      for (let c = 0; c < this.size; c++) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        cell.dataset.row = r;
        cell.dataset.col = c;

        if (cellClickHandler) {
          cell.addEventListener('click', (e) => cellClickHandler(r, c, e));
        }

        if (cellHoverHandler) {
          cell.addEventListener('mouseenter', () => {
            cellHoverHandler(r, c);
            this.highlightHeaders(gridElement, r, c);
          });
        }

        if (cellLeaveHandler) {
          cell.addEventListener('mouseleave', () => {
            cellLeaveHandler(r, c);
            this.clearHighlightHeaders(gridElement);
          });
        }

        gridElement.appendChild(cell);
      }
    }
  }

  highlightHeaders(gridElement, r, c) {
    const rowH = gridElement.querySelector(`.row-header[data-row="${r}"]`);
    const colH = gridElement.querySelector(`.col-header[data-col="${c}"]`);
    if (rowH) rowH.classList.add('header-active');
    if (colH) colH.classList.add('header-active');
  }

  clearHighlightHeaders(gridElement) {
    const activeHeaders = gridElement.querySelectorAll('.header-active');
    activeHeaders.forEach(h => h.classList.remove('header-active'));
  }

  clearPlacementPreview(gridElement) {
    const cells = gridElement.querySelectorAll('.grid-cell');
    cells.forEach(c => {
      c.classList.remove('preview-valid', 'preview-invalid');
    });
  }

  previewShipPlacement(gridElement, row, col) {
    this.clearPlacementPreview(gridElement);
    if (!this.selectedShipId) return;

    const shipDef = FLEET_SPECS.find(s => s.id === this.selectedShipId);
    if (!shipDef) return;

    const coords = this.calculateCoords(shipDef.size, row, col, this.currentOrientation);
    const isValid = this.canPlaceShip(this.selectedShipId, shipDef.size, row, col, this.currentOrientation);

    coords.forEach(coord => {
      if (coord.row >= 0 && coord.row < this.size && coord.col >= 0 && coord.col < this.size) {
        const cell = gridElement.querySelector(`.grid-cell[data-row="${coord.row}"][data-col="${coord.col}"]`);
        if (cell) {
          cell.classList.add(isValid ? 'preview-valid' : 'preview-invalid');
        }
      }
    });
  }

  calculateCoords(size, row, col, orientation) {
    const coords = [];
    for (let i = 0; i < size; i++) {
      coords.push({
        row: orientation === 'horizontal' ? row : row + i,
        col: orientation === 'horizontal' ? col + i : col
      });
    }
    return coords;
  }

  canPlaceShip(shipId, size, row, col, orientation) {
    if (orientation === 'horizontal') {
      if (col + size > this.size || row >= this.size) return false;
    } else {
      if (row + size > this.size || col >= this.size) return false;
    }

    const proposed = this.calculateCoords(size, row, col, orientation);

    for (const [id, ship] of this.placementShips.entries()) {
      if (id === shipId) continue;
      const existing = this.calculateCoords(ship.size, ship.row, ship.col, ship.orientation);
      for (const p of proposed) {
        if (existing.some(e => e.row === p.row && e.col === p.col)) {
          return false;
        }
      }
    }

    return true;
  }

  placeShipInPlacement(row, col) {
    if (!this.selectedShipId) return false;

    const shipDef = FLEET_SPECS.find(s => s.id === this.selectedShipId);
    if (!shipDef) return false;

    if (!this.canPlaceShip(this.selectedShipId, shipDef.size, row, col, this.currentOrientation)) {
      return false;
    }

    this.placementShips.set(this.selectedShipId, {
      id: shipDef.id,
      name: shipDef.name,
      size: shipDef.size,
      row,
      col,
      orientation: this.currentOrientation
    });

    const remaining = FLEET_SPECS.find(s => !this.placementShips.has(s.id));
    this.selectedShipId = remaining ? remaining.id : null;

    return true;
  }

  randomizePlacement() {
    this.placementShips.clear();

    for (const shipDef of FLEET_SPECS) {
      let placed = false;
      let tries = 0;
      while (!placed && tries < 500) {
        tries++;
        const orientation = Math.random() < 0.5 ? 'horizontal' : 'vertical';
        const maxRow = orientation === 'vertical' ? this.size - shipDef.size : this.size - 1;
        const maxCol = orientation === 'horizontal' ? this.size - shipDef.size : this.size - 1;
        const row = Math.floor(Math.random() * (maxRow + 1));
        const col = Math.floor(Math.random() * (maxCol + 1));

        if (this.canPlaceShip(shipDef.id, shipDef.size, row, col, orientation)) {
          this.placementShips.set(shipDef.id, {
            id: shipDef.id,
            name: shipDef.name,
            size: shipDef.size,
            row,
            col,
            orientation
          });
          placed = true;
        }
      }
    }

    this.selectedShipId = null;
    return this.isPlacementComplete();
  }

  isPlacementComplete() {
    return this.placementShips.size === FLEET_SPECS.length;
  }

  getFleetArray() {
    return Array.from(this.placementShips.values());
  }

  /**
   * Renderiza los barcos en el tablero de preparación
   */
  renderPlacementGrid(gridElement) {
    const cells = gridElement.querySelectorAll('.grid-cell');
    cells.forEach(c => {
      c.className = 'grid-cell';
      c.innerHTML = '';
    });

    for (const ship of this.placementShips.values()) {
      const coords = this.calculateCoords(ship.size, ship.row, ship.col, ship.orientation);
      coords.forEach((coord, idx) => {
        const cell = gridElement.querySelector(`.grid-cell[data-row="${coord.row}"][data-col="${coord.col}"]`);
        if (cell) {
          cell.classList.add('ship-cell');
          if (idx === 0) cell.classList.add('ship-bow');
          if (idx === coords.length - 1) cell.classList.add('ship-stern');
          cell.classList.add(`ship-${ship.orientation}`);
          cell.innerHTML = '<span class="ship-pip"></span>';
        }
      });
    }
  }

  /**
   * Renderiza el tablero propio
   */
  renderPlayerBoard(gridElement, boardData) {
    const cells = gridElement.querySelectorAll('.grid-cell');
    cells.forEach(c => {
      c.className = 'grid-cell';
      c.innerHTML = '';
    });

    if (!boardData) return;

    // Dibujar barcos propios
    if (boardData.ships) {
      boardData.ships.forEach(ship => {
        const coords = this.calculateCoords(ship.size, ship.row, ship.col, ship.orientation);
        coords.forEach((coord, idx) => {
          const cell = gridElement.querySelector(`.grid-cell[data-row="${coord.row}"][data-col="${coord.col}"]`);
          if (cell) {
            cell.classList.add('ship-cell');
            if (idx === 0) cell.classList.add('ship-bow');
            if (idx === coords.length - 1) cell.classList.add('ship-stern');
            cell.classList.add(`ship-${ship.orientation}`);
            cell.innerHTML = '<span class="ship-pip"></span>';
            if (ship.sunk) {
              cell.classList.add('ship-sunk');
            }
          }
        });
      });
    }

    // Dibujar impactos y aguas recibidos con animaciones
    if (boardData.shots) {
      boardData.shots.forEach(shot => {
        const cell = gridElement.querySelector(`.grid-cell[data-row="${shot.row}"][data-col="${shot.col}"]`);
        if (cell) {
          if (shot.status === 'water') {
            cell.classList.add('cell-water');
            cell.innerHTML = `
              <div class="water-splash-container">
                <span class="water-splash-ring"></span>
                <span class="water-splash-core"></span>
              </div>
            `;
          } else if (shot.status === 'hit') {
            cell.classList.add('cell-hit');
            cell.innerHTML = `
              <div class="hit-flame-container">
                <span class="hit-flame-burst"></span>
                <svg class="hit-marker-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <circle cx="12" cy="12" r="2.5" fill="currentColor"></circle>
                </svg>
              </div>
            `;
          }
        }
      });
    }
  }

  /**
   * Renderiza el radar enemigo
   */
  renderEnemyBoard(gridElement, enemyBoardData, isMyTurn) {
    const cells = gridElement.querySelectorAll('.grid-cell');
    cells.forEach(c => {
      c.className = 'grid-cell';
      c.innerHTML = '';
      if (isMyTurn) {
        c.classList.add('radar-targetable');
      }
    });

    if (!enemyBoardData) return;

    // Pintar barcos ya hundidos revelados
    if (enemyBoardData.sunkShips) {
      enemyBoardData.sunkShips.forEach(ship => {
        ship.coordinates.forEach(coord => {
          const cell = gridElement.querySelector(`.grid-cell[data-row="${coord.row}"][data-col="${coord.col}"]`);
          if (cell) {
            cell.classList.add('ship-sunk-revealed');
          }
        });
      });
    }

    // Pintar disparos efectuados
    if (enemyBoardData.shots) {
      enemyBoardData.shots.forEach(shot => {
        const cell = gridElement.querySelector(`.grid-cell[data-row="${shot.row}"][data-col="${shot.col}"]`);
        if (cell) {
          cell.classList.remove('radar-targetable');
          if (shot.status === 'water') {
            cell.classList.add('cell-water');
            cell.innerHTML = `
              <div class="water-splash-container">
                <span class="water-splash-ring"></span>
                <span class="water-splash-core"></span>
              </div>
            `;
          } else if (shot.status === 'hit') {
            cell.classList.add('cell-hit');
            cell.innerHTML = `
              <div class="hit-flame-container">
                <span class="hit-flame-burst"></span>
                <svg class="hit-marker-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <circle cx="12" cy="12" r="2.5" fill="currentColor"></circle>
                </svg>
              </div>
            `;
          }
        }
      });
    }
  }
}

window.boardUI = new BoardUI();
window.FLEET_SPECS = FLEET_SPECS;
