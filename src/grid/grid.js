import { SPRITES } from '../assets.js';

function _drawVikingShield(ctx, sx, sy, r, isBlue) {
  // Wooden rim
  ctx.fillStyle = '#2a1408';
  ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();

  // Face — four quadrant colors clipped to interior
  ctx.save();
  ctx.beginPath(); ctx.arc(sx, sy, r - 0.7, 0, Math.PI * 2); ctx.clip();
  const c1 = isBlue ? '#17388c' : '#7a1208';
  const c2 = '#c8b850';
  ctx.fillStyle = c1;
  ctx.fillRect(sx - r, sy - r, r, r);
  ctx.fillRect(sx,     sy,     r, r);
  ctx.fillStyle = c2;
  ctx.fillRect(sx,     sy - r, r, r);
  ctx.fillRect(sx - r, sy,     r, r);
  // Divider cross
  ctx.strokeStyle = 'rgba(15,6,1,0.6)'; ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(sx - r, sy); ctx.lineTo(sx + r, sy);
  ctx.moveTo(sx, sy - r); ctx.lineTo(sx, sy + r);
  ctx.stroke();
  // Rune ring
  ctx.strokeStyle = isBlue ? 'rgba(140,190,255,0.4)' : 'rgba(255,180,130,0.4)';
  ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.arc(sx, sy, r * 0.5, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();

  // Metal boss
  const br = r * 0.25;
  ctx.fillStyle = '#686050';
  ctx.beginPath(); ctx.arc(sx, sy, br, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(210,200,170,0.65)';
  ctx.beginPath(); ctx.arc(sx - br * 0.28, sy - br * 0.3, br * 0.4, 0, Math.PI * 2); ctx.fill();
}

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
    const parent = new Map();
    const startKey = `${startCol},${startRow}`;
    parent.set(startKey, null);
    const queue = [{ col: startCol, row: startRow }];

    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];

    while (queue.length > 0) {
      const { col, row } = queue.shift();

      if (col === goalCol && row === goalRow) {
        const path = [];
        let key = `${col},${row}`;
        while (key != null) {
          const [c, r] = key.split(',').map(Number);
          path.push({ col: c, row: r });
          key = parent.get(key);
        }
        return path.reverse();
      }

      for (const [dc, dr] of dirs) {
        const nc = col + dc, nr = row + dr;
        const key = `${nc},${nr}`;
        if (!parent.has(key) && this.isWalkable(nc, nr)) {
          parent.set(key, `${col},${row}`);
          queue.push({ col: nc, row: nr });
        }
      }
    }
    return null;
  }

  draw(ctx, time = 0, drawGridLines = true) {
    if (drawGridLines) {
      ctx.strokeStyle = 'rgba(0,0,0,0.18)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      for (let x = 0; x <= this.cols; x++) {
        ctx.moveTo(x * this.cellSize, 0);
        ctx.lineTo(x * this.cellSize, this.rows * this.cellSize);
      }
      for (let y = 0; y <= this.rows; y++) {
        ctx.moveTo(0, y * this.cellSize);
        ctx.lineTo(this.cols * this.cellSize, y * this.cellSize);
      }
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
      const dw = cs * 6.5;
      const dh = dw * (sp.frameH / sp.frameW);
      ctx.save();
      ctx.shadowColor = `rgba(140,60,255,${0.65 + pulse * 0.35})`;
      ctx.shadowBlur  = 22 * pulse;
      ctx.drawImage(sp.img, 0, 0, sp.frameW, sp.frameH, cx - dw / 2, cy - dh / 2, dw, dh);
      ctx.restore();
      // Pulsing purple void at center
      ctx.save();
      ctx.globalAlpha = 0.30 * pulse;
      ctx.fillStyle   = '#a030ff';
      ctx.beginPath();
      ctx.arc(cx, cy, cs * 0.9, 0, Math.PI * 2);
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
      ctx.save();
      ctx.shadowColor = 'rgba(210,170,255,0.95)';
      ctx.shadowBlur  = 12 * pulse;
      ctx.fillStyle   = `rgba(245,225,255,${0.75 + pulse * 0.25})`;
      ctx.beginPath();
      ctx.arc(cx, cy, 1.8 + pulse * 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // ── Rotating rune ring — always drawn over sprite or fallback ─────────────
    {
      const rot1 =  time * 1.1;
      const rot2 = -time * 0.7;
      const ringR = cs * 2.6;
      ctx.save();
      ctx.translate(cx, cy);

      ctx.rotate(rot1);
      ctx.strokeStyle = `rgba(160,80,255,${0.28 + pulse * 0.22})`;
      ctx.lineWidth   = 0.8;
      ctx.setLineDash([2, 5]);
      ctx.beginPath(); ctx.arc(0, 0, ringR, 0, Math.PI * 2); ctx.stroke();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ctx.save();
        ctx.translate(Math.cos(a) * ringR, Math.sin(a) * ringR);
        ctx.fillStyle = `rgba(200,140,255,${0.55 + pulse * 0.35})`;
        ctx.beginPath(); ctx.arc(0, 0, 1.2, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }

      ctx.rotate(rot2 - rot1);
      ctx.strokeStyle = `rgba(100,160,255,${0.18 + pulse * 0.14})`;
      ctx.lineWidth   = 0.6;
      ctx.setLineDash([1, 4]);
      ctx.beginPath(); ctx.arc(0, 0, ringR * 0.72, 0, Math.PI * 2); ctx.stroke();

      ctx.setLineDash([]);
      ctx.restore();
    }

    // ── Smoke wisps drifting up from portal base ───────────────────────────────
    for (let i = 0; i < 4; i++) {
      const si = i / 4;
      const sw = cs * 0.7 * Math.sin(time * 1.4 + i * 2.1);
      const sh = cy + cs * (0.4 + Math.sin(time * 2.1 + i * 1.8) * 0.15);
      const sr = 2.2 + Math.sin(time + i) * 0.8;
      const sa = (0.10 + Math.sin(time * 1.8 + i * 0.7) * 0.04) * (1 - si * 0.25);
      ctx.save();
      ctx.globalAlpha = sa;
      ctx.fillStyle   = '#c880ff';
      ctx.beginPath();
      ctx.arc(cx + sw, sh, sr, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
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

    // ── Gold pile — scattered small coins matching flying coin size ──────────────
    const stackLevel = Math.min(Math.floor(Math.log2((this.gold || 0) + 2)), 8);
    const coinTotal  = stackLevel === 0 ? 0 : stackLevel * 3 + 2;
    const gPulse     = 0.5 + Math.sin(time * 5.5 + 0.8) * 0.5;
    const pileBaseY  = cy + cs * 0.3;

    ctx.save();
    if (coinTotal > 0) {
      ctx.shadowColor = 'rgba(255,210,30,0.9)';
      ctx.shadowBlur  = 6 + gPulse * 4 + hPulseF * 12;
      for (let i = 0; i < coinTotal; i++) {
        const angle = i * 2.399963;  // golden angle spread
        const dist  = Math.sqrt(i / coinTotal) * cs * (1.6 + hPulseF * 0.4);
        const px    = cx + Math.cos(angle) * dist;
        const py    = pileBaseY + Math.sin(angle) * dist * 0.45;
        const r     = 3.8 + (i % 3) * 0.4;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fillStyle = i % 5 === 0 ? '#f0b820' : '#f5d030';
        ctx.fill();
        if (i % 4 === 3) {
          ctx.strokeStyle = 'rgba(255,245,120,0.65)';
          ctx.lineWidth   = 0.6;
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

    // ── Fortress torches — two flickering flames flanking the fortress ─────────
    {
      const flickerL = 0.55 + Math.sin(time * 9.1) * 0.25 + Math.sin(time * 13.7) * 0.12;
      const flickerR = 0.55 + Math.sin(time * 8.3 + 1.4) * 0.25 + Math.sin(time * 12.1 + 0.9) * 0.12;
      const torchPositions = [
        { tx: cx - cs * 2.6, ty: cy - cs * 0.5, flicker: flickerL },
        { tx: cx + cs * 2.6, ty: cy - cs * 0.5, flicker: flickerR },
      ];
      for (const { tx, ty, flicker } of torchPositions) {
        ctx.save();
        // Torch pole
        ctx.fillStyle = '#5a3812';
        ctx.fillRect(tx - 1, ty, 2, cs * 1.0);
        // Torch head
        ctx.fillStyle = '#8a5820';
        ctx.fillRect(tx - 2.5, ty - 3, 5, 5);
        // Flame glow
        ctx.shadowColor = `rgba(255,150,40,${flicker * 0.75})`;
        ctx.shadowBlur  = 8 * flicker;
        // Flame body
        const fGrad = ctx.createRadialGradient(tx, ty - 2, 0, tx, ty - 2, 5);
        fGrad.addColorStop(0,   `rgba(255,240,150,${flicker * 0.95})`);
        fGrad.addColorStop(0.4, `rgba(255,140,30,${flicker * 0.75})`);
        fGrad.addColorStop(1,   'rgba(200,60,10,0)');
        ctx.fillStyle = fGrad;
        ctx.beginPath();
        ctx.ellipse(tx, ty - 3, 3 * flicker, 5 * flicker, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();
      }
    }
  }

  _wallAdjacency(col, row) {
    const w = (c, r) => { const t = this.getCell(c, r); return t === CELL.WALL || t === CELL.TOWER; };
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

    // Alternating shield color (blue/red) by grid position
    const isBlue = (((x / cs) | 0) + ((y / cs) | 0)) % 2 === 0;

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, cs, cs);
    ctx.clip();

    ctx.fillStyle = '#1a0e04';
    ctx.fillRect(x, y, cs, cs);

    if (adj === 0) {
      // ── Isolated: two shields side by side ───────────────────────────────
      const r = cs * 0.25;
      _drawVikingShield(ctx, cx - cs * 0.22, cy, r, isBlue);
      _drawVikingShield(ctx, cx + cs * 0.22, cy, r, !isBlue);
    } else {
      // ── Connected: wooden frame + center shield ───────────────────────────
      const beamHW = 2;
      const wood   = '#5c3212';
      const woodDk = '#3a1e08';

      // Horizontal beam
      if (W || E) {
        ctx.fillStyle = wood;
        const bx1 = W ? x : cx - beamHW;
        const bx2 = E ? x + cs : cx + beamHW;
        ctx.fillRect(bx1, cy - beamHW, bx2 - bx1, beamHW * 2);
        ctx.fillStyle = 'rgba(25,10,2,0.35)';
        ctx.fillRect(bx1, cy - 0.4, bx2 - bx1, 0.8);
      }
      // Vertical beam
      if (N || S) {
        ctx.fillStyle = wood;
        const by1 = N ? y : cy - beamHW;
        const by2 = S ? y + cs : cy + beamHW;
        ctx.fillRect(cx - beamHW, by1, beamHW * 2, by2 - by1);
        ctx.fillStyle = 'rgba(25,10,2,0.35)';
        ctx.fillRect(cx - 0.4, by1, 0.8, by2 - by1);
      }

      // Wooden posts at arm ends (edge caps)
      ctx.fillStyle = woodDk;
      const postR = 1.6;
      if (N) { ctx.beginPath(); ctx.arc(cx,          y + 1,      postR, 0, Math.PI * 2); ctx.fill(); }
      if (S) { ctx.beginPath(); ctx.arc(cx,          y + cs - 1, postR, 0, Math.PI * 2); ctx.fill(); }
      if (E) { ctx.beginPath(); ctx.arc(x + cs - 1, cy,          postR, 0, Math.PI * 2); ctx.fill(); }
      if (W) { ctx.beginPath(); ctx.arc(x + 1,      cy,          postR, 0, Math.PI * 2); ctx.fill(); }

      // Center shield (on top of beams)
      const shieldR = cs * 0.34;
      _drawVikingShield(ctx, cx, cy, shieldR, isBlue);

      // Wooden merlons on exposed top edge
      if (!N) {
        const merlonH = Math.max(2, cs * 0.18);
        const wallTop = cy - shieldR;
        for (const mx of [cx - 3.5, cx + 0.5]) {
          ctx.fillStyle = wood;
          ctx.fillRect(mx, wallTop - merlonH, 2.5, merlonH);
          ctx.fillStyle = 'rgba(190,150,80,0.4)';
          ctx.fillRect(mx, wallTop - merlonH, 2.5, 0.7);
        }
      }
    }

    ctx.restore();

    ctx.save();
    ctx.strokeStyle = 'rgba(30,15,5,0.4)';
    ctx.lineWidth   = 0.5;
    ctx.strokeRect(x + 0.5, y + 0.5, cs - 1, cs - 1);
    ctx.restore();
  }
}
