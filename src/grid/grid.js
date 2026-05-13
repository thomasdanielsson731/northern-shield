export const CELL = {
  EMPTY: 0,
  WALL:  1,
  SPAWN: 2,
  GOAL:  3,
  TOWER: 4
};

export class Grid {
  constructor(cols, rows, cellSize) {
    this.cols = cols;
    this.rows = rows;
    this.cellSize = cellSize;
    this.cells = Array.from({ length: rows }, () => new Array(cols).fill(CELL.EMPTY));
  }

  getCell(col, row) {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return null;
    return this.cells[row][col];
  }

  setCell(col, row, type) {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return;
    this.cells[row][col] = type;
  }

  isWalkable(col, row) {
    const cell = this.getCell(col, row);
    return cell !== null && cell !== CELL.WALL && cell !== CELL.TOWER;
  }

  pixelToCell(x, y) {
    return {
      col: Math.floor(x / this.cellSize),
      row: Math.floor(y / this.cellSize)
    };
  }

  cellCenter(col, row) {
    return {
      x: col * this.cellSize + this.cellSize / 2,
      y: row * this.cellSize + this.cellSize / 2
    };
  }

  // BFS pathfinding — returns array of {col,row} or null if no path exists
  findPath(startCol, startRow, goalCol, goalRow) {
    const queue = [{ col: startCol, row: startRow, path: [] }];
    const visited = new Set();
    visited.add(`${startCol},${startRow}`);

    const dirs = [
      { dc: 1, dr: 0 }, { dc: -1, dr: 0 },
      { dc: 0, dr: 1 }, { dc: 0, dr: -1 }
    ];

    while (queue.length > 0) {
      const { col, row, path } = queue.shift();
      const newPath = [...path, { col, row }];

      if (col === goalCol && row === goalRow) return newPath;

      for (const { dc, dr } of dirs) {
        const nc = col + dc;
        const nr = row + dr;
        const key = `${nc},${nr}`;
        if (!visited.has(key) && this.isWalkable(nc, nr)) {
          visited.add(key);
          queue.push({ col: nc, row: nr, path: newPath });
        }
      }
    }
    return null;
  }

  draw(ctx) {
    const fills = {
      [CELL.WALL]:  '#1e1430',
      [CELL.SPAWN]: '#6a3e08',
      [CELL.GOAL]:  '#580810',
      [CELL.TOWER]: '#180e40'
    };
    const edges = {
      [CELL.WALL]:  'rgba(160,110,220,0.12)',
      [CELL.SPAWN]: 'rgba(240,160,40,0.35)',
      [CELL.GOAL]:  'rgba(255,60,60,0.3)',
      [CELL.TOWER]: 'rgba(120,90,255,0.25)'
    };

    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const type = this.cells[row][col];
        if (type === CELL.EMPTY) continue;

        const x = col * this.cellSize;
        const y = row * this.cellSize;

        ctx.fillStyle = fills[type];
        ctx.fillRect(x, y, this.cellSize, this.cellSize);

        ctx.strokeStyle = edges[type] || 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, this.cellSize - 1, this.cellSize - 1);
      }
    }

    ctx.strokeStyle = 'rgba(120,60,180,0.07)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= this.cols; x++) {
      ctx.beginPath();
      ctx.moveTo(x * this.cellSize, 0);
      ctx.lineTo(x * this.cellSize, this.rows * this.cellSize);
      ctx.stroke();
    }
    for (let y = 0; y <= this.rows; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * this.cellSize);
      ctx.lineTo(this.cols * this.cellSize, y * this.cellSize);
      ctx.stroke();
    }
  }
}
