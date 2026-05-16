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

    // ── Warm hoard aura — drawn BEFORE the gold so it glows behind ───────────────
    const hPulseF = this.hoardPulse > 0 ? this.hoardPulse / 14 : 0;
    const glowPulse = 0.5 + Math.sin(time * 2.3) * 0.5;
    const auraR   = cs * 3.8 + hPulseF * cs * 1.2;
    const aura    = ctx.createRadialGradient(cx, cy, 0, cx, cy, auraR);
    aura.addColorStop(0,   `rgba(255,185,40,${0.28 + glowPulse * 0.14 + hPulseF * 0.22})`);
    aura.addColorStop(0.35,`rgba(200,110,15,${0.12 + glowPulse * 0.07})`);
    aura.addColorStop(1,   'rgba(100,45,0,0)');
    ctx.fillStyle = aura;
    ctx.beginPath(); ctx.arc(cx, cy, auraR, 0, Math.PI * 2); ctx.fill();

    // ── Gold pile (much bigger) ──────────────────────────────────────────────────
    const goldCount = Math.min(Math.floor(Math.log2((this.gold || 0) + 2)), 8);
    const pileScale = 1 + hPulseF * 0.5;
    const gPulse    = 0.5 + Math.sin(time * 5.5 + 0.8) * 0.5;
    const pileRx    = cs * 1.5 * pileScale;

    ctx.save();
    if (goldCount > 0) {
      ctx.shadowColor = 'rgba(255,210,30,0.95)';
      ctx.shadowBlur  = 10 + gPulse * 8 + hPulseF * 18;
      for (let i = 0; i < goldCount; i++) {
        const coinY = cy + 4 - i * cs * 0.32;
        const rx    = pileRx * (1 - i * 0.04);
        ctx.beginPath();
        ctx.ellipse(cx, coinY, rx, rx * 0.34, 0, 0, Math.PI * 2);
        ctx.fillStyle = i === goldCount - 1 ? '#f5d040' : (i % 2 === 0 ? '#8a5418' : '#704010');
        ctx.fill();
        if (i === goldCount - 1) {
          ctx.strokeStyle = 'rgba(255,245,120,0.90)';
          ctx.lineWidth   = 1.2;
          ctx.stroke();
        }
      }
      ctx.shadowBlur = 0;
    } else {
      // Empty hoard ring
      ctx.strokeStyle = 'rgba(130,90,25,0.5)';
      ctx.lineWidth   = 1.2;
      ctx.beginPath();
      ctx.arc(cx, cy, cs * 0.55, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    // ── Rune artifact (glowing stone left of pile) ──────────────────────────────
    const runePulse = 0.5 + Math.sin(time * 3.1 + 1.2) * 0.5;
    const runeX = cx - Math.round(cs * 1.1);
    const runeY = cy - Math.round(cs * 0.6);
    ctx.save();
    ctx.shadowColor = `rgba(120,170,255,${0.65 + runePulse * 0.35})`;
    ctx.shadowBlur  = 5 + runePulse * 9;
    ctx.fillStyle   = '#3a4455';
    ctx.fillRect(runeX - 3, runeY - 5, 6, 11);
    ctx.fillStyle   = '#505870';
    ctx.fillRect(runeX - 3, runeY - 5, 6, 2);
    ctx.strokeStyle = `rgba(100,165,255,${0.65 + runePulse * 0.35})`;
    ctx.lineWidth   = 0.9;
    ctx.beginPath();
    ctx.moveTo(runeX, runeY - 3); ctx.lineTo(runeX, runeY + 3);
    ctx.moveTo(runeX - 2, runeY - 1); ctx.lineTo(runeX + 2, runeY + 2);
    ctx.moveTo(runeX - 2, runeY + 1); ctx.lineTo(runeX + 2, runeY - 1);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();

    // ── Treasure chest (right of pile) ─────────────────────────────────────────
    const chX = cx + Math.round(cs * 1.0);
    const chY = cy + Math.round(cs * 0.4);
    ctx.save();
    ctx.shadowColor = 'rgba(200,140,30,0.6)';
    ctx.shadowBlur  = 4 + gPulse * 3;
    ctx.fillStyle   = '#3a1c08';  // chest shadow
    ctx.fillRect(chX - 6, chY - 3, 12, 9);
    ctx.fillStyle   = '#5a3012';  // chest body
    ctx.fillRect(chX - 6, chY - 3, 12, 8);
    ctx.fillStyle   = '#7a4820';  // chest lid
    ctx.fillRect(chX - 6, chY - 3, 12, 3);
    ctx.fillStyle   = 'rgba(255,220,100,0.35)';
    ctx.fillRect(chX - 6, chY - 3, 12, 1);
    ctx.fillStyle   = '#c09020';  // latch
    ctx.fillRect(chX - 1, chY - 1, 3, 4);
    ctx.shadowBlur  = 0;
    ctx.restore();

    // ── Orbiting gold sparkles ──────────────────────────────────────────────────
    for (let i = 0; i < 5; i++) {
      const sa  = time * 1.9 + (i / 5) * Math.PI * 2;
      const sr  = cs * (1.2 + Math.sin(time * 2.8 + i) * 0.3);
      const spx = cx + Math.cos(sa) * sr;
      const spy = cy + Math.sin(sa) * sr * 0.42;
      const spA = Math.max(0, 0.25 + Math.sin(time * 6 + i * 1.6) * 0.22);
      ctx.save();
      ctx.globalAlpha = spA;
      ctx.shadowColor = '#ffd030';
      ctx.shadowBlur  = 5;
      ctx.fillStyle   = '#ffe050';
      ctx.beginPath();
      ctx.arc(spx, spy, 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
    }
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

    // Position-seeded pseudo-random for stone color variation
    const seed = x * 0.17 + y * 0.31;
    const stoneV = Math.sin(seed * 7.3) * 0.12;  // ±12% brightness shift

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, cs, cs);
    ctx.clip();

    ctx.fillStyle = '#2a1408';
    ctx.fillRect(x, y, cs, cs);

    if (adj === 0) {
      // ── Isolated: two round shields leaning against wall ───────────────
      const shieldR = cs * 0.30;
      for (const [ox, oy] of [[-cs * 0.28, 0], [cs * 0.28, 0]]) {
        const sx = cx + ox, sy = cy + oy;

        // Wooden rim (dark border ring)
        ctx.fillStyle = '#3a2410';
        ctx.beginPath(); ctx.arc(sx, sy, shieldR, 0, Math.PI * 2); ctx.fill();

        // Shield face — four quadrant colours clipped to interior
        ctx.save();
        ctx.beginPath(); ctx.arc(sx, sy, shieldR - 0.8, 0, Math.PI * 2); ctx.clip();
        ctx.fillStyle = '#b01808';            // top-left red
        ctx.fillRect(sx - shieldR, sy - shieldR, shieldR, shieldR);
        ctx.fillRect(sx, sy, shieldR, shieldR);
        ctx.fillStyle = '#d8c888';            // top-right cream
        ctx.fillRect(sx, sy - shieldR, shieldR, shieldR);
        ctx.fillRect(sx - shieldR, sy, shieldR, shieldR);
        // Divider cross
        ctx.strokeStyle = 'rgba(20,10,4,0.55)'; ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(sx - shieldR, sy); ctx.lineTo(sx + shieldR, sy);
        ctx.moveTo(sx, sy - shieldR); ctx.lineTo(sx, sy + shieldR);
        ctx.stroke();
        ctx.restore();

        // Small iron boss — not too large, clearly a rivet not a ring
        const bossR = shieldR * 0.14;
        ctx.fillStyle = '#706860';
        ctx.beginPath(); ctx.arc(sx, sy, bossR, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(230,220,200,0.75)';
        ctx.beginPath(); ctx.arc(sx - bossR * 0.3, sy - bossR * 0.35, bossR * 0.4, 0, Math.PI * 2); ctx.fill();
      }
    } else {
      // ── Connected: stone palisade wall ─────────────────────────────────

      // Stone base color with per-cell variation
      const sv = Math.round(stoneV * 30);
      const stoneR = Math.min(255, 110 + sv), stoneG = Math.min(255, 80 + sv), stoneB = Math.min(255, 56 + sv);
      const stoneColor = `rgb(${stoneR},${stoneG},${stoneB})`;
      const stoneDark  = `rgb(${Math.max(0,stoneR-22)},${Math.max(0,stoneG-18)},${Math.max(0,stoneB-14)})`;

      // Main stone body
      ctx.fillStyle = stoneColor;
      ctx.fillRect(cx - hw, cy - hw, hw * 2, hw * 2);
      if (N) ctx.fillRect(cx - hw, y,       hw * 2, cy - hw - y);
      if (S) ctx.fillRect(cx - hw, cy + hw, hw * 2, y + cs - cy - hw);
      if (E) ctx.fillRect(cx + hw, cy - hw, x + cs - cx - hw, hw * 2);
      if (W) ctx.fillRect(x,       cy - hw, cx - hw - x,      hw * 2);

      // Stone block divisions — horizontal lines in vertical arms
      ctx.strokeStyle = 'rgba(20,10,4,0.38)'; ctx.lineWidth = 0.6;
      ctx.beginPath();
      if (N) {
        const armTop = y, armBot = cy - hw;
        const armH = armBot - armTop;
        for (let li = 1; li < 3; li++) {
          const ly = armTop + armH * li / 3;
          ctx.moveTo(cx - hw + 0.5, ly); ctx.lineTo(cx + hw - 0.5, ly);
        }
      }
      if (S) {
        const armTop = cy + hw, armBot = y + cs;
        const armH = armBot - armTop;
        for (let li = 1; li < 3; li++) {
          const ly = armTop + armH * li / 3;
          ctx.moveTo(cx - hw + 0.5, ly); ctx.lineTo(cx + hw - 0.5, ly);
        }
      }
      // Vertical lines in horizontal arms
      if (E) {
        const armL = cx + hw, armR = x + cs;
        const armW = armR - armL;
        for (let li = 1; li < 3; li++) {
          const lx = armL + armW * li / 3;
          ctx.moveTo(lx, cy - hw + 0.5); ctx.lineTo(lx, cy + hw - 0.5);
        }
      }
      if (W) {
        const armL = x, armR = cx - hw;
        const armW = armR - armL;
        for (let li = 1; li < 3; li++) {
          const lx = armL + armW * li / 3;
          ctx.moveTo(lx, cy - hw + 0.5); ctx.lineTo(lx, cy + hw - 0.5);
        }
      }
      ctx.stroke();

      // Darker inset center block for depth
      ctx.fillStyle = stoneDark;
      ctx.fillRect(cx - hw + 1.5, cy - hw + 1.5, hw * 2 - 3, hw * 2 - 3);

      // Top-face highlight (lit from above — brightest surface)
      ctx.fillStyle = '#b08868';
      const topY = N ? y : cy - hw;
      ctx.fillRect(cx - hw, topY, hw * 2, 1.5);
      if (W) ctx.fillRect(x,       cy - hw, cx - hw - x, 1.5);
      if (E) ctx.fillRect(cx + hw, cy - hw, x + cs - cx - hw, 1.5);

      // Left-face highlight
      ctx.fillStyle = 'rgba(160,130,90,0.4)';
      const leftX = W ? x : cx - hw;
      ctx.fillRect(leftX, cy - hw + 1.5, 1.5, hw * 2 - 1.5);
      if (N) ctx.fillRect(cx - hw, y, 1.5, cy - hw - y);
      if (S) ctx.fillRect(cx - hw, cy + hw, 1.5, y + cs - cy - hw);

      // Shadow on bottom/right faces
      ctx.fillStyle = 'rgba(0,0,0,0.30)';
      if (!S) ctx.fillRect(cx - hw, cy + hw - 1.5, hw * 2, 1.5);
      if (!E) ctx.fillRect(cx + hw - 1.5, cy - hw, 1.5, hw * 2);

      // Dark mortar cross through center
      ctx.fillStyle = 'rgba(18, 9, 2, 0.60)';
      ctx.fillRect(cx - 0.5, cy - hw, 1, hw * 2);
      ctx.fillRect(cx - hw, cy - 0.5, hw * 2, 1);

      // Metal boss at center
      const br = hw * 0.46;
      ctx.fillStyle = '#504840';
      ctx.beginPath(); ctx.arc(cx, cy, br, 0, Math.PI * 2); ctx.fill();
      // Rivets on boss edge
      ctx.fillStyle = '#383228';
      for (let ri = 0; ri < 4; ri++) {
        const ra = ri * Math.PI * 0.5 + Math.PI * 0.25;
        ctx.beginPath(); ctx.arc(cx + Math.cos(ra) * br * 0.72, cy + Math.sin(ra) * br * 0.72, br * 0.16, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = 'rgba(210,200,175,0.65)';
      ctx.beginPath();
      ctx.arc(cx - br * 0.22, cy - br * 0.26, br * 0.38, 0, Math.PI * 2);
      ctx.fill();

      // ── Battlements on exposed top edges ───────────────────────────────
      if (!N) {
        const merlonW = hw * 0.72, merlonH = Math.max(2, cs * 0.15);
        const wallTop = cy - hw;
        // Left merlon
        ctx.fillStyle = stoneColor;
        ctx.fillRect(cx - hw, wallTop - merlonH, merlonW, merlonH);
        ctx.fillStyle = '#b08868';
        ctx.fillRect(cx - hw, wallTop - merlonH, merlonW, 1);
        ctx.fillStyle = 'rgba(0,0,0,0.30)';
        ctx.fillRect(cx - hw + merlonW, wallTop - merlonH, 1, merlonH);
        // Right merlon
        ctx.fillStyle = stoneColor;
        ctx.fillRect(cx + hw - merlonW, wallTop - merlonH, merlonW, merlonH);
        ctx.fillStyle = '#b08868';
        ctx.fillRect(cx + hw - merlonW, wallTop - merlonH, merlonW, 1);
        ctx.fillStyle = 'rgba(0,0,0,0.30)';
        ctx.fillRect(cx + hw - merlonW, wallTop - merlonH, 1, merlonH);
      }
    }

    ctx.restore();

    ctx.strokeStyle = 'rgba(30,15,5,0.4)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(x + 0.5, y + 0.5, cs - 1, cs - 1);
  }
}
