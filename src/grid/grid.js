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

  draw(ctx, time = 0) {
    ctx.strokeStyle = 'rgba(0,80,0,0.12)';
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

    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const type = this.cells[row][col];
        if (type === CELL.EMPTY) continue;

        const x = col * this.cellSize;
        const y = row * this.cellSize;
        const cs = this.cellSize;

        if (type === CELL.WALL) {
          this._drawWallBlock(ctx, x, y, cs);
        } else if (type === CELL.SPAWN) {
          this._drawSpawn(ctx, x, y, cs, time);
        } else if (type === CELL.GOAL) {
          this._drawGoal(ctx, x, y, cs, time);
        } else if (type === CELL.TOWER) {
          // CoC tower pad: worn stone
          ctx.fillStyle = '#8a7050';
          ctx.fillRect(x, y, cs, cs);
          ctx.fillStyle = 'rgba(255,220,120,0.12)';
          ctx.fillRect(x, y, cs, 2);
          ctx.strokeStyle = 'rgba(100,70,20,0.5)';
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 0.5, y + 0.5, cs - 1, cs - 1);
        }
      }
    }
  }

  _drawSpawn(ctx, x, y, cs, time) {
    const cx = x + cs / 2;
    const cy = y + cs / 2;
    const pulse = 0.5 + Math.sin(time * 3) * 0.5;

    ctx.fillStyle = '#1a5c08';
    ctx.fillRect(x, y, cs, cs);

    // Pulsing ring
    ctx.save();
    ctx.strokeStyle = `rgba(80,220,60,${0.3 + pulse * 0.5})`;
    ctx.lineWidth   = 1.5;
    ctx.shadowColor = 'rgba(60,200,40,0.9)';
    ctx.shadowBlur  = 10 * pulse;
    ctx.beginPath();
    ctx.arc(cx, cy, (cs / 2 - 2) * (0.7 + pulse * 0.28), 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Inner dot
    ctx.fillStyle = `rgba(80,220,60,${0.5 + pulse * 0.4})`;
    ctx.beginPath();
    ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  _drawGoal(ctx, x, y, cs, time) {
    const cx = x + cs / 2;
    const cy = y + cs / 2;
    const pulse = 0.5 + Math.sin(time * 4 + 1) * 0.5;

    ctx.fillStyle = '#2a0408';
    ctx.fillRect(x, y, cs, cs);

    ctx.save();
    // Outer pulsing ring
    ctx.strokeStyle = `rgba(255,60,60,${0.3 + pulse * 0.5})`;
    ctx.lineWidth   = 1.5;
    ctx.shadowColor = 'rgba(255,40,40,0.9)';
    ctx.shadowBlur  = 10 * pulse;
    ctx.beginPath();
    ctx.arc(cx, cy, cs / 2 - 2, 0, Math.PI * 2);
    ctx.stroke();

    // Inner ring (rotating)
    ctx.strokeStyle = `rgba(255,120,80,${0.4 + pulse * 0.35})`;
    ctx.lineWidth   = 1;
    ctx.shadowBlur  = 5;
    ctx.setLineDash([2, 4]);
    ctx.lineDashOffset = time * 10;
    ctx.beginPath();
    ctx.arc(cx, cy, cs / 2 - 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;

    // Center cross
    ctx.strokeStyle = `rgba(255,80,80,${0.5 + pulse * 0.4})`;
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 3, cy); ctx.lineTo(cx + 3, cy);
    ctx.moveTo(cx, cy - 3); ctx.lineTo(cx, cy + 3);
    ctx.stroke();
    ctx.restore();
  }

  _drawWallBlock(ctx, x, y, cs) {
    const cx = x + cs / 2;
    const cy = y + cs / 2;

    // Clip to cell
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, cs, cs);
    ctx.clip();

    // Dark wood backing
    ctx.fillStyle = '#2a1408';
    ctx.fillRect(x, y, cs, cs);
    // Wood grain
    ctx.strokeStyle = 'rgba(80,40,10,0.55)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(x, y + cs * (0.25 + i * 0.25));
      ctx.lineTo(x + cs, y + cs * (0.25 + i * 0.25));
      ctx.stroke();
    }

    // Two overlapping circular shields
    const shieldR = cs * 0.38;
    const offsets = [[-cs * 0.17, 0], [cs * 0.17, 0]];
    for (const [ox, oy] of offsets) {
      const sx = cx + ox;
      const sy = cy + oy;
      // Shield rim (dark iron)
      ctx.fillStyle = '#3a3028';
      ctx.beginPath();
      ctx.arc(sx, sy, shieldR, 0, Math.PI * 2);
      ctx.fill();
      // Shield face — clip to circle and draw quadrants
      ctx.save();
      ctx.beginPath();
      ctx.arc(sx, sy, shieldR - 1, 0, Math.PI * 2);
      ctx.clip();
      // Red quadrants (top-left, bottom-right)
      ctx.fillStyle = '#aa1a10';
      ctx.fillRect(sx - shieldR, sy - shieldR, shieldR, shieldR);
      ctx.fillRect(sx,           sy,           shieldR, shieldR);
      // Cream quadrants (top-right, bottom-left)
      ctx.fillStyle = '#e8d8a0';
      ctx.fillRect(sx,           sy - shieldR, shieldR, shieldR);
      ctx.fillRect(sx - shieldR, sy,           shieldR, shieldR);
      // Dividing cross lines
      ctx.strokeStyle = 'rgba(30,15,5,0.6)';
      ctx.lineWidth   = 0.8;
      ctx.beginPath();
      ctx.moveTo(sx - shieldR, sy); ctx.lineTo(sx + shieldR, sy);
      ctx.moveTo(sx, sy - shieldR); ctx.lineTo(sx, sy + shieldR);
      ctx.stroke();
      ctx.restore();
      // Boss (center metal knob)
      ctx.fillStyle = '#888880';
      ctx.beginPath();
      ctx.arc(sx, sy, shieldR * 0.24, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(220,220,200,0.7)';
      ctx.beginPath();
      ctx.arc(sx - shieldR * 0.07, sy - shieldR * 0.08, shieldR * 0.1, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // Outer border
    ctx.strokeStyle = 'rgba(60,30,10,0.7)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(x + 0.5, y + 0.5, cs - 1, cs - 1);
  }
}
