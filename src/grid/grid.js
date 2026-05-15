import { SPRITES } from '../assets.js';

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
    this.healthRatio = 1;  // set by game.js each frame: lives / STARTING_LIVES
    this.gold        = 0;  // set by game.js each frame: current gold
    this.hoardPulse  = 0;  // set by game.js each frame: coin-landing bounce
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
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
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
          const adj = this._wallAdjacency(col, row);
          this._drawWallBlock(ctx, x, y, cs, adj);
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
    const pulse = 0.5 + Math.sin(time * 2.5) * 0.5;

    ctx.fillStyle = '#06030c';
    ctx.fillRect(x, y, cs, cs);

    const sp = SPRITES['portal'];
    if (sp && sp.img.complete && sp.img.naturalWidth > 0) {
      const dw = cs * 4;
      const dh = dw * (sp.frameH / sp.frameW);
      ctx.save();
      ctx.shadowColor = `rgba(140,60,255,${0.55 + pulse * 0.45})`;
      ctx.shadowBlur  = 16 * pulse;
      ctx.drawImage(sp.img, 0, 0, sp.frameW, sp.frameH, cx - dw / 2, cy - dh / 2, dw, dh);
      ctx.restore();
      // Pulsing purple void at center
      ctx.save();
      ctx.globalAlpha = 0.25 * pulse;
      ctx.fillStyle   = '#a030ff';
      ctx.beginPath();
      ctx.arc(cx, cy, cs * 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      // Procedural fallback
      const rot = time * 1.4;
      ctx.save();
      ctx.shadowColor = 'rgba(140,60,255,0.9)';
      ctx.shadowBlur  = 18 * pulse;
      ctx.fillStyle   = `rgba(80,20,180,${0.28 + pulse * 0.22})`;
      ctx.beginPath();
      ctx.arc(cx, cy, cs / 2 - 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      const outerR = cs / 2 - 1.5;
      ctx.strokeStyle = `rgba(190,110,255,${0.5 + pulse * 0.4})`;
      ctx.lineWidth   = 0.8;
      ctx.setLineDash([1.5, 2.5]);
      ctx.beginPath();
      ctx.arc(0, 0, outerR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.strokeStyle = `rgba(230,160,255,${0.55 + pulse * 0.35})`;
        ctx.lineWidth   = 0.9;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * (outerR - 1.8), Math.sin(a) * (outerR - 1.8));
        ctx.lineTo(Math.cos(a) * (outerR + 0.5), Math.sin(a) * (outerR + 0.5));
        ctx.stroke();
      }
      ctx.restore();
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-rot * 1.9);
      ctx.strokeStyle = `rgba(100,190,255,${0.38 + pulse * 0.32})`;
      ctx.lineWidth   = 0.7;
      ctx.setLineDash([1, 3]);
      ctx.beginPath();
      ctx.arc(0, 0, cs / 2 - 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cs / 2 - 3);
      grad.addColorStop(0,    `rgba(245,215,255,${0.85 + pulse * 0.15})`);
      grad.addColorStop(0.35, `rgba(160,80,255,${0.5 * pulse})`);
      grad.addColorStop(0.75, `rgba(70,25,150,${0.28 * pulse})`);
      grad.addColorStop(1,    'rgba(15,5,40,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, cs / 2 - 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowColor = 'rgba(210,170,255,0.95)';
      ctx.shadowBlur  = 12 * pulse;
      ctx.fillStyle   = `rgba(245,225,255,${0.75 + pulse * 0.25})`;
      ctx.beginPath();
      ctx.arc(cx, cy, 1.8 + pulse * 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  _drawGoal(ctx, x, y, cs, time) {
    const cx = x + cs / 2;
    const cy = y + cs / 2;
    const hr = this.healthRatio;

    const pulseSpeed = hr > 0.33 ? 3.5 : 8;
    const pulse      = 0.5 + Math.sin(time * pulseSpeed) * 0.5;

    const sp = SPRITES['trelleborg'];
    if (sp && sp.img.complete && sp.img.naturalWidth > 0) {
      const dw = cs * 7;
      const dh = dw * (sp.frameH / sp.frameW);
      ctx.save();
      if (hr < 0.66) {
        const dmgAlpha = (1 - hr) * 0.65 * pulse;
        ctx.shadowColor = `rgba(255,70,0,${dmgAlpha})`;
        ctx.shadowBlur  = 16 * pulse;
      }
      ctx.drawImage(sp.img, 0, 0, sp.frameW, sp.frameH, cx - dw / 2, cy - dh * 0.6, dw, dh);
      ctx.restore();
    } else {
      // Procedural fallback
      const outerR = cs * 2.5;
      const innerR = cs * 1.15;
      const gateH  = 0.24;
      const wr = hr > 0.66 ? 110 : hr > 0.33 ? 145 : 175;
      const wg = hr > 0.66 ? 88  : hr > 0.33 ? 70  : 35;
      const wb = hr > 0.66 ? 50  : hr > 0.33 ? 22  : 15;
      ctx.fillStyle = '#1a1108';
      ctx.beginPath();
      ctx.arc(cx, cy, outerR + 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2a1c09';
      ctx.beginPath();
      ctx.arc(cx, cy, outerR - 7, 0, Math.PI * 2);
      ctx.fill();
      const pw = 4.5;
      ctx.fillStyle = '#362210';
      ctx.fillRect(cx - outerR - cs, cy - pw / 2, (outerR + cs) * 2, pw);
      ctx.fillRect(cx - pw / 2, cy - outerR - cs, pw, (outerR + cs) * 2);
      const gateAngles = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];
      ctx.save();
      const dmgGlow = hr < 0.66 ? (1 - hr) * 0.7 * pulse : 0;
      ctx.shadowColor = dmgGlow > 0 ? `rgba(255,70,0,${dmgGlow})` : 'rgba(180,130,50,0.25)';
      ctx.shadowBlur  = dmgGlow > 0 ? 14 * pulse : 5;
      ctx.strokeStyle = `rgb(${wr},${wg},${wb})`;
      ctx.lineWidth   = 9;
      ctx.lineCap     = 'butt';
      for (const ga of gateAngles) {
        ctx.beginPath();
        ctx.arc(cx, cy, outerR, ga + gateH, ga + Math.PI / 2 - gateH);
        ctx.stroke();
      }
      ctx.strokeStyle = `rgba(${Math.min(wr + 70, 255)},${Math.min(wg + 60, 255)},${Math.min(wb + 35, 255)},0.32)`;
      ctx.lineWidth   = 2;
      ctx.shadowBlur  = 0;
      for (const ga of gateAngles) {
        ctx.beginPath();
        ctx.arc(cx, cy, outerR - 4, ga + gateH, ga + Math.PI / 2 - gateH);
        ctx.stroke();
      }
      ctx.strokeStyle = `rgba(${wr},${wg},${wb},0.65)`;
      ctx.lineWidth   = 4.5;
      ctx.shadowColor = dmgGlow > 0 ? `rgba(255,70,0,${dmgGlow * 0.8})` : 'rgba(0,0,0,0)';
      ctx.shadowBlur  = dmgGlow > 0 ? 9 * pulse : 0;
      ctx.beginPath();
      ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();
      ctx.fillStyle = '#100b04';
      ctx.beginPath();
      ctx.arc(cx, cy, cs * 0.78, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Gold pile (always on top) ────────────────────────────────────────────────
    const goldCount = Math.min(Math.floor(Math.log2((this.gold || 0) + 2)), 8);
    const pileScale = this.hoardPulse > 0 ? 1 + (this.hoardPulse / 10) * 0.38 : 1.0;
    const gPulse    = 0.5 + Math.sin(time * 5.5 + 0.8) * 0.5;
    const pileRx    = cs * 0.52 * pileScale;

    ctx.save();
    if (goldCount > 0) {
      ctx.shadowColor = 'rgba(255,210,30,0.85)';
      ctx.shadowBlur  = 5 + gPulse * 4 + (this.hoardPulse > 0 ? 9 : 0);
      for (let i = 0; i < goldCount; i++) {
        const coinY = cy + 2.5 - i * 2.0;
        const rx    = pileRx * (1 - i * 0.04);
        ctx.beginPath();
        ctx.ellipse(cx, coinY, rx, rx * 0.36, 0, 0, Math.PI * 2);
        ctx.fillStyle = i === goldCount - 1 ? '#f0c840' : '#7a5018';
        ctx.fill();
        if (i === goldCount - 1) {
          ctx.strokeStyle = 'rgba(255,240,110,0.85)';
          ctx.lineWidth   = 0.8;
          ctx.stroke();
        }
      }
      ctx.shadowBlur = 0;
    } else {
      ctx.strokeStyle = 'rgba(100,70,20,0.4)';
      ctx.lineWidth   = 0.8;
      ctx.beginPath();
      ctx.arc(cx, cy, cs * 0.32, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  _wallAdjacency(col, row) {
    const w = (c, r) => this.getCell(c, r) === CELL.WALL;
    return (w(col, row - 1) ? 1 : 0)   // N
         | (w(col + 1, row) ? 2 : 0)   // E
         | (w(col, row + 1) ? 4 : 0)   // S
         | (w(col - 1, row) ? 8 : 0);  // W
  }

  _drawWallBlock(ctx, x, y, cs, adj = 0) {
    const N  = (adj & 1) !== 0;
    const E  = (adj & 2) !== 0;
    const S  = (adj & 4) !== 0;
    const W  = (adj & 8) !== 0;
    const cx = x + cs / 2;
    const cy = y + cs / 2;
    const hw = Math.round(cs * 5 / 14);  // wall half-width (5px at cs=14)

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, cs, cs);
    ctx.clip();

    ctx.fillStyle = '#2a1408';
    ctx.fillRect(x, y, cs, cs);

    if (adj === 0) {
      // ── Isolated: two-shield design ────────────────────────────────────
      ctx.strokeStyle = 'rgba(80,40,10,0.55)';
      ctx.lineWidth = 0.5;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(x, y + cs * (0.25 + i * 0.25));
        ctx.lineTo(x + cs, y + cs * (0.25 + i * 0.25));
        ctx.stroke();
      }
      const shieldR = cs * 0.38;
      for (const [ox, oy] of [[-cs * 0.17, 0], [cs * 0.17, 0]]) {
        const sx = cx + ox, sy = cy + oy;
        ctx.fillStyle = '#3a3028';
        ctx.beginPath(); ctx.arc(sx, sy, shieldR, 0, Math.PI * 2); ctx.fill();
        ctx.save();
        ctx.beginPath(); ctx.arc(sx, sy, shieldR - 1, 0, Math.PI * 2); ctx.clip();
        ctx.fillStyle = '#aa1a10';
        ctx.fillRect(sx - shieldR, sy - shieldR, shieldR, shieldR);
        ctx.fillRect(sx, sy, shieldR, shieldR);
        ctx.fillStyle = '#e8d8a0';
        ctx.fillRect(sx, sy - shieldR, shieldR, shieldR);
        ctx.fillRect(sx - shieldR, sy, shieldR, shieldR);
        ctx.strokeStyle = 'rgba(30,15,5,0.6)'; ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(sx - shieldR, sy); ctx.lineTo(sx + shieldR, sy);
        ctx.moveTo(sx, sy - shieldR); ctx.lineTo(sx, sy + shieldR);
        ctx.stroke();
        ctx.restore();
        ctx.fillStyle = '#888880';
        ctx.beginPath(); ctx.arc(sx, sy, shieldR * 0.24, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(220,220,200,0.7)';
        ctx.beginPath();
        ctx.arc(sx - shieldR * 0.07, sy - shieldR * 0.08, shieldR * 0.1, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // ── Connected: stone/wood palisade wall ────────────────────────────

      // Main stone body
      ctx.fillStyle = '#6e5038';
      ctx.fillRect(cx - hw, cy - hw, hw * 2, hw * 2);
      if (N) ctx.fillRect(cx - hw, y,       hw * 2, cy - hw - y);
      if (S) ctx.fillRect(cx - hw, cy + hw, hw * 2, y + cs - cy - hw);
      if (E) ctx.fillRect(cx + hw, cy - hw, x + cs - cx - hw, hw * 2);
      if (W) ctx.fillRect(x,       cy - hw, cx - hw - x,      hw * 2);

      // Top-face highlight (lit from above)
      ctx.fillStyle = '#9a7050';
      const topY = N ? y : cy - hw;
      ctx.fillRect(cx - hw, topY, hw * 2, 2);
      if (W) ctx.fillRect(x,       cy - hw, cx - hw - x, 2);
      if (E) ctx.fillRect(cx + hw, cy - hw, x + cs - cx - hw, 2);
      if (S) ctx.fillRect(cx - hw, cy + hw, 2, y + cs - cy - hw);  // left highlight of S arm

      // Dark mortar cross through center
      ctx.fillStyle = 'rgba(20, 10, 3, 0.55)';
      ctx.fillRect(cx - 0.4, cy - hw, 0.8, hw * 2);
      ctx.fillRect(cx - hw, cy - 0.4, hw * 2, 0.8);

      // Metal boss at center
      const br = hw * 0.46;
      ctx.fillStyle = '#504840';
      ctx.beginPath(); ctx.arc(cx, cy, br, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(210,200,175,0.65)';
      ctx.beginPath();
      ctx.arc(cx - br * 0.22, cy - br * 0.26, br * 0.38, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    ctx.strokeStyle = 'rgba(30,15,5,0.4)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(x + 0.5, y + 0.5, cs - 1, cs - 1);
  }
}
