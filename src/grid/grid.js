import { SPRITES } from '../assets.js';
import { getSpriteScale, getCombatSpriteScale } from '../config.js';
import { drawPalisadeTile } from '../assets/terrainArt.js';
import { getBattleWestGateArtKey, drawCampaignGateSprite } from '../preparation/fortressPrepArt.js';

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
  TOWER: 4,
  GATE:  5,
};

export class Grid {
  constructor(cols, rows, cellSize) {
    this.cols = cols;
    this.rows = rows;
    this.cellSize = cellSize;
    this.cells = Array.from({ length: rows }, () => new Array(cols).fill(CELL.EMPTY));
    this.useCampaignPalisade = false;
    this.healthRatio     = 1;  // set by game.js each frame: lives / STARTING_LIVES
    this.gold            = 0;  // set by game.js each frame: current gold
    this.hoardPulse      = 0;  // set by game.js each frame: coin-landing bounce
    this.fortressUpgrades = {}; // set by game.js: { barracks, armory, watchtower, wallworks } levels
    this.bannerWaveBoost = 0;  // set by game.js on wave clear, decays each drawn frame
    /** When true, goal cell skips decorative buildings (campaign assault clarity). */
    this.minimalGoalDecor = false;
    /** Ash Fen spawn mist instead of purple portal (First Saga assault). */
    this.useAshfenSpawn = false;
    this.campaignPrepMeta = null;
    this.wallData = null;
  }

  setFortressUpgrades(upgrades) {
    this.fortressUpgrades = upgrades ?? {};
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
    return cell !== null && cell !== CELL.WALL && cell !== CELL.GATE && cell !== CELL.TOWER;
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

  draw(ctx, time = 0, gridAlpha = 0.22, options = {}) {
    const skipFortifications = options.skipFortifications === true;
    if (gridAlpha > 0) {
      ctx.strokeStyle = `rgba(80,60,30,${gridAlpha})`;
      ctx.lineWidth = 0.6;
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

        if (type === CELL.WALL || type === CELL.GATE) {
          if (skipFortifications) continue;
        }
        if (type === CELL.WALL) {
          const adj = this._wallRenderAdjacency(col, row);
          this._drawWallBlock(ctx, x, y, cs, adj);
        } else if (type === CELL.GATE) {
          this._drawGate(ctx, x, y, cs, time);
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

    if (this.useAshfenSpawn) {
      ctx.fillStyle = '#14100c';
      ctx.fillRect(x, y, cs, cs);
      const edge = ctx.createRadialGradient(cx, cy, cs * 0.2, cx, cy, cs * 2.8);
      edge.addColorStop(0, 'rgba(40,32,24,0.0)');
      edge.addColorStop(1, 'rgba(8,6,4,0.35)');
      ctx.fillStyle = edge;
      ctx.beginPath();
      ctx.arc(cx, cy, cs * 2.8, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    const pulse = 0.5 + Math.sin(time * 2.5) * 0.5;

    ctx.fillStyle = '#06030c';
    ctx.fillRect(x, y, cs, cs);

    // ── Outer corruption aura ─────────────────────────────────────────────────
    {
      const auraGrad = ctx.createRadialGradient(cx, cy, cs * 0.5, cx, cy, cs * 5.5);
      auraGrad.addColorStop(0,   `rgba(48,40,34,${0.32 + pulse * 0.18})`);
      auraGrad.addColorStop(0.45,`rgba(40,10,100,${0.14 + pulse * 0.08})`);
      auraGrad.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = auraGrad;
      ctx.beginPath(); ctx.arc(cx, cy, cs * 5.5, 0, Math.PI * 2); ctx.fill();
    }

    const sp = SPRITES['portal'];
    if (sp && sp.img.complete && sp.img.naturalWidth > 0) {
      const scale = getCombatSpriteScale();
      const dw = cs * (this.minimalGoalDecor ? 5.2 : 6.8) * scale;
      const dh = dw * (sp.frameH / sp.frameW);
      ctx.save();
      ctx.drawImage(sp.img, 0, 0, sp.frameW, sp.frameH, cx - dw / 2, cy - dh / 2, dw, dh);
      ctx.restore();
      // Pulsing purple void at center
      ctx.save();
      ctx.globalAlpha = 0.35 * pulse;
      ctx.fillStyle   = 'rgba(52,44,38,0.72)';
      ctx.beginPath();
      ctx.arc(cx, cy, cs * 1.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      // Procedural fallback
      const rot = time * 1.4;
      ctx.save();
      ctx.fillStyle   = `rgba(48,40,34,${0.28 + pulse * 0.22})`;
      ctx.beginPath();
      ctx.arc(cx, cy, cs / 2 - 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      const outerR = cs / 2 - 1.5;
      ctx.strokeStyle = `rgba(105,92,78,${0.5 + pulse * 0.4})`;
      ctx.lineWidth   = 0.8;
      ctx.setLineDash([1.5, 2.5]);
      ctx.beginPath();
      ctx.arc(0, 0, outerR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.strokeStyle = `rgba(125,110,92,${0.55 + pulse * 0.35})`;
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
      ctx.strokeStyle = `rgba(88,82,72,${0.38 + pulse * 0.32})`;
      ctx.lineWidth   = 0.7;
      ctx.setLineDash([1, 3]);
      ctx.beginPath();
      ctx.arc(0, 0, cs / 2 - 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cs / 2 - 3);
      grad.addColorStop(0,    `rgba(155,140,118,${0.85 + pulse * 0.15})`);
      grad.addColorStop(0.35, `rgba(92,78,68,${0.5 * pulse})`);
      grad.addColorStop(0.75, `rgba(42,36,30,${0.28 * pulse})`);
      grad.addColorStop(1,    'rgba(15,5,40,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, cs / 2 - 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.fillStyle   = `rgba(148,132,108,${0.75 + pulse * 0.25})`;
      ctx.beginPath();
      ctx.arc(cx, cy, 1.8 + pulse * 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // ── Rotating rune rings (4 concentric) ────────────────────────────────────
    {
      const rot1 =  time * 1.1;
      const rot2 = -time * 0.7;
      const rot3 =  time * 0.45;
      const rot4 = -time * 1.55;
      const outerR = cs * 4.0;
      ctx.save();
      ctx.translate(cx, cy);

      // Outermost ring — slow, spaced rune glyphs
      ctx.rotate(rot3);
      ctx.strokeStyle = `rgba(78,68,58,${0.18 + pulse * 0.12})`;
      ctx.lineWidth   = 0.6;
      ctx.setLineDash([1.5, 7]);
      ctx.beginPath(); ctx.arc(0, 0, outerR, 0, Math.PI * 2); ctx.stroke();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.save();
        ctx.translate(Math.cos(a) * outerR, Math.sin(a) * outerR);
        ctx.fillStyle = `rgba(102,88,74,${0.40 + pulse * 0.25})`;
        ctx.beginPath(); ctx.arc(0, 0, 1.0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }

      // Second ring — medium
      ctx.rotate(rot1 - rot3);
      ctx.strokeStyle = `rgba(92,78,68,${0.30 + pulse * 0.22})`;
      ctx.lineWidth   = 0.85;
      ctx.setLineDash([2, 5]);
      ctx.beginPath(); ctx.arc(0, 0, outerR * 0.72, 0, Math.PI * 2); ctx.stroke();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ctx.save();
        ctx.translate(Math.cos(a) * outerR * 0.72, Math.sin(a) * outerR * 0.72);
        ctx.fillStyle = `rgba(118,102,86,${0.62 + pulse * 0.32})`;
        ctx.beginPath(); ctx.arc(0, 0, 1.4, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }

      // Third ring — inner
      ctx.rotate(rot2 - rot1);
      ctx.strokeStyle = `rgba(82,78,68,${0.22 + pulse * 0.16})`;
      ctx.lineWidth   = 0.65;
      ctx.setLineDash([1.5, 4]);
      ctx.beginPath(); ctx.arc(0, 0, outerR * 0.46, 0, Math.PI * 2); ctx.stroke();

      // Innermost ring — tight, bright
      ctx.rotate(rot4 - rot2);
      ctx.strokeStyle = `rgba(108,96,82,${0.35 + pulse * 0.28})`;
      ctx.lineWidth   = 0.7;
      ctx.setLineDash([1, 3]);
      ctx.beginPath(); ctx.arc(0, 0, outerR * 0.26, 0, Math.PI * 2); ctx.stroke();

      ctx.setLineDash([]);
      ctx.restore();
    }

    // ── Energy tendrils — crackling arms from portal ───────────────────────────
    if (pulse > 0.55) {
      ctx.save();
      for (let t = 0; t < 5; t++) {
        const ta    = (t / 5) * Math.PI * 2 + time * 0.8;
        const tLen  = cs * (2.0 + Math.sin(time * 3.2 + t * 1.4) * 0.8);
        const tAlpha = (pulse - 0.55) * 0.45;
        ctx.strokeStyle = `rgba(98,86,72,${tAlpha})`;
        ctx.lineWidth = 0.65;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        // Zigzag path
        const midX = cx + Math.cos(ta + 0.3) * tLen * 0.55;
        const midY = cy + Math.sin(ta + 0.3) * tLen * 0.55;
        ctx.lineTo(midX, midY);
        ctx.lineTo(cx + Math.cos(ta) * tLen, cy + Math.sin(ta) * tLen);
        ctx.stroke();
      }
      ctx.restore();
    }

    // ── Smoke wisps — more, larger, dramatic upward drift ─────────────────────
    for (let i = 0; i < 10; i++) {
      const si    = i / 10;
      const phase = time * (1.2 + si * 0.6) + i * 2.35;
      const drift = cs * 0.85 * Math.sin(phase);
      const rise  = cs * (0.5 + si * 1.8 + Math.sin(time * 1.8 + i * 0.8) * 0.22);
      const sr    = 2.5 + si * 2.8 + Math.sin(time * 1.4 + i) * 0.9;
      const baseA = 0.12 + Math.sin(time * 1.6 + i * 0.9) * 0.04;
      const sa    = baseA * (1 - si * 0.55) * (i < 5 ? 1 : 0.7);
      const col   = i % 3 === 0 ? '#6a5a48' : i % 3 === 1 ? '#4a4038' : '#5a5048';
      ctx.save();
      ctx.globalAlpha = sa;
      ctx.fillStyle   = col;
      ctx.beginPath();
      ctx.arc(cx + drift, cy - rise, sr, 0, Math.PI * 2);
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

    // ── Fortress complex — decorative buildings around the goal ───────────────
    if (!this.minimalGoalDecor) {
      ctx.save();
      ctx.globalAlpha = 0.60;

      // Helper — draw a stone building with peaked or flat roof
      const drawBuilding = (bx, by, bw, bh, roofH, roofColor, wallColor, shadowAlpha = 0.50) => {
        // Drop shadow
        ctx.fillStyle = `rgba(0,0,0,${shadowAlpha})`;
        ctx.fillRect(bx + 2, by + 2, bw, bh);
        // Wall body
        ctx.fillStyle = wallColor;
        ctx.fillRect(bx, by, bw, bh);
        // Stone row lines
        ctx.strokeStyle = 'rgba(0,0,0,0.28)';
        ctx.lineWidth = 0.4;
        for (let row = cs * 0.5; row < bh; row += cs * 0.55) {
          ctx.beginPath(); ctx.moveTo(bx, by + row); ctx.lineTo(bx + bw, by + row); ctx.stroke();
        }
        // Highlight (top-left edge lit)
        ctx.fillStyle = 'rgba(200,175,120,0.18)';
        ctx.fillRect(bx, by, 1.5, bh);
        ctx.fillRect(bx, by, bw, 1.5);
        // Peaked roof
        if (roofH > 0) {
          ctx.fillStyle = 'rgba(0,0,0,0.42)';
          ctx.beginPath();
          ctx.moveTo(bx + 2, by + 2); ctx.lineTo(bx + bw / 2 + 2, by - roofH + 2); ctx.lineTo(bx + bw + 2, by + 2);
          ctx.closePath(); ctx.fill();
          ctx.fillStyle = roofColor;
          ctx.beginPath();
          ctx.moveTo(bx, by); ctx.lineTo(bx + bw / 2, by - roofH); ctx.lineTo(bx + bw, by);
          ctx.closePath(); ctx.fill();
          ctx.fillStyle = 'rgba(200,175,120,0.22)';
          ctx.beginPath();
          ctx.moveTo(bx, by); ctx.lineTo(bx + bw / 2, by - roofH);
          ctx.lineWidth = 1.0; ctx.stroke();
        }
        // Window amber glow
        const winFlicker = 0.55 + Math.sin(time * 6.8 + bx * 0.03) * 0.22;
        ctx.fillStyle = `rgba(255,175,55,${winFlicker * 0.55})`;
        const winW = Math.max(2, bw * 0.15), winH = Math.max(2, bh * 0.22);
        const winY = by + bh * 0.28;
        for (let wi = 0; wi < Math.floor(bw / (winW + cs * 0.5)); wi++) {
          const winX = bx + cs * 0.3 + wi * (winW + cs * 0.5);
          if (winX + winW < bx + bw - cs * 0.2) {
            ctx.fillRect(winX, winY, winW, winH);
            ctx.fillRect(winX, winY, winW, winH);
            ctx.shadowBlur  = 0;
          }
        }
      };

      // Decay banner wave boost each frame — exponential so it lingers then snaps to zero
    if (this.bannerWaveBoost > 0) {
      this.bannerWaveBoost *= 0.94;
      if (this.bannerWaveBoost < 0.005) this.bannerWaveBoost = 0;
    }

      // Helper — draw a banner pole with hanging flag
      const drawBannerPole = (px, py, ph, flagColor) => {
        // Pole
        ctx.fillStyle = 'rgba(60,35,12,0.85)';
        ctx.fillRect(px - 0.8, py - ph, 1.6, ph);
        // Flag (triangular pennant, animated wave — amplified on wave clear)
        const waveAmp = cs * (0.18 + this.bannerWaveBoost * 0.55);
        const waveFreq = 2.8 + this.bannerWaveBoost * 5.0;
        const wave = Math.sin(time * waveFreq + px * 0.02) * waveAmp;
        ctx.fillStyle = flagColor;
        ctx.beginPath();
        ctx.moveTo(px, py - ph);
        ctx.lineTo(px + cs * 1.1 + wave, py - ph + cs * 0.4);
        ctx.lineTo(px, py - ph + cs * 0.75);
        ctx.closePath(); ctx.fill();
        // Flag highlight
        ctx.fillStyle = 'rgba(255,255,255,0.20)';
        ctx.beginPath();
        ctx.moveTo(px, py - ph);
        ctx.lineTo(px + cs * 0.5 + wave * 0.5, py - ph + cs * 0.2);
        ctx.lineTo(px, py - ph + cs * 0.35);
        ctx.closePath(); ctx.fill();
      };

      // Helper — draw a round watchtower
      const drawTower = (tx, ty, tr, th, wallColor, roofColor) => {
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.beginPath(); ctx.arc(tx + 1.5, ty + 2, tr, 0, Math.PI * 2); ctx.fill();
        // Tower body (cylinder as rect for simplicity)
        ctx.fillStyle = wallColor;
        ctx.fillRect(tx - tr, ty - th, tr * 2, th);
        ctx.beginPath(); ctx.arc(tx, ty, tr, 0, Math.PI * 2); ctx.fill();
        // Battlements on top
        ctx.fillStyle = wallColor;
        const mCount = Math.max(2, Math.floor(tr * 0.8));
        const mW = tr * 0.4;
        for (let m = 0; m < mCount; m++) {
          const ma = (m / mCount) * Math.PI * 2;
          const mx = tx + Math.cos(ma) * tr * 0.75;
          const my = ty - th + Math.sin(ma) * tr * 0.35;
          ctx.fillRect(mx - mW / 2, my - cs * 0.22, mW, cs * 0.22);
        }
        // Cone roof
        ctx.fillStyle = 'rgba(0,0,0,0.40)';
        ctx.beginPath();
        ctx.moveTo(tx - tr + 2, ty - th + 2); ctx.lineTo(tx + 2, ty - th - tr * 1.8 + 2); ctx.lineTo(tx + tr + 2, ty - th + 2);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = roofColor;
        ctx.beginPath();
        ctx.moveTo(tx - tr, ty - th); ctx.lineTo(tx, ty - th - tr * 1.8); ctx.lineTo(tx + tr, ty - th);
        ctx.closePath(); ctx.fill();
        // Window slit
        const winFlicker2 = 0.50 + Math.sin(time * 5.5 + tx * 0.05) * 0.25;
        ctx.fillStyle = `rgba(255,160,40,${winFlicker2 * 0.62})`;
        ctx.fillRect(tx - 1, ty - th * 0.55, 2, cs * 0.28);
        ctx.fillRect(tx - 1, ty - th * 0.55, 2, cs * 0.28);
        ctx.shadowBlur = 0;
      };

      const stone = '#2a2216';
      const stoneLt = '#3c3228';
      const roofDk = '#1e1608';
      const roofWood = '#4a2c10';

      const fu = this.fortressUpgrades ?? {};
      const barrLvl  = fu.barracks   ?? 0;
      const armLvl   = fu.armory     ?? 0;
      const watchLvl = fu.watchtower ?? 0;
      const wallLvl  = fu.wallworks  ?? 0;

      // Great Hall — scales with total fortress investment
      const totalLvl = barrLvl + armLvl + watchLvl + wallLvl;
      const hallW = cs * (3.8 + totalLvl * 0.08);
      const hallH = cs * (2.2 + totalLvl * 0.04);
      drawBuilding(cx - cs * 5.8, cy - cs * 5.2, hallW, hallH, cs * 1.1, roofWood, stone);

      // Barracks — grows with barracks upgrade level
      const barrW = cs * (3.2 + barrLvl * 0.35);
      const barrH = cs * (1.8 + barrLvl * 0.18);
      drawBuilding(cx - cs * 5.5, cy + cs * 2.5, barrW, barrH, cs * 0.8, roofWood, stone);

      // Armory/treasury annex — grows with armory upgrade; gets forge glow
      const armW = cs * (1.8 + armLvl * 0.4);
      const armH = cs * (1.5 + armLvl * 0.3);
      drawBuilding(cx - cs * 2.0, cy - cs * 4.5, armW, armH, cs * (0.7 + armLvl * 0.15), roofDk, armLvl >= 2 ? '#3a2018' : stoneLt);
      // Forge glow (armory L1+)
      if (armLvl >= 1) {
        const forgeFlicker = 0.12 + Math.sin(time * 5.5 + 1.2) * 0.06;
        ctx.fillStyle = `rgba(255,90,10,${forgeFlicker})`;
        ctx.beginPath(); ctx.arc(cx - cs * 0.8, cy - cs * 3.2, cs * (0.55 + armLvl * 0.15), 0, Math.PI * 2); ctx.fill();
        if (armLvl >= 2) {
          // Sparks
          for (let sp = 0; sp < 3; sp++) {
            const sx = cx - cs * 0.8 + Math.sin(time * 7.1 + sp * 2.1) * cs * 0.4;
            const sy = cy - cs * 3.2 - Math.abs(Math.sin(time * 6.3 + sp * 1.7)) * cs * 0.6;
            ctx.fillStyle = `rgba(255,180,40,${0.4 + sp * 0.1})`;
            ctx.beginPath(); ctx.arc(sx, sy, 0.8, 0, Math.PI * 2); ctx.fill();
          }
        }
      }
      // Full smithy building (armory L3)
      if (armLvl >= 3) {
        drawBuilding(cx - cs * 0.2, cy - cs * 4.8, cs * 1.4, cs * 1.2, cs * 0.5, roofDk, '#3a2018');
      }

      // Main watchtower — taller with each watchtower upgrade
      const wt1H = cs * (3.5 + watchLvl * 0.7);
      drawTower(cx - cs * 3.8, cy - cs * 1.0, cs * (0.85 + watchLvl * 0.06), wt1H, stoneLt, roofDk);
      // Beacon fire at top (watchtower L3)
      if (watchLvl >= 3) {
        const bfFlicker = 0.6 + Math.sin(time * 9.2) * 0.3;
        ctx.fillStyle = `rgba(255,120,20,${bfFlicker * 0.7})`;
        ctx.beginPath(); ctx.arc(cx - cs * 3.8, cy - cs * 1.0 - wt1H - cs * 0.3, cs * 0.45, 0, Math.PI * 2); ctx.fill();
      }

      // Second watchtower — taller with watchtower upgrade
      const wt2H = cs * (2.8 + watchLvl * 0.5);
      drawTower(cx - cs * 2.2, cy - cs * 5.8, cs * (0.65 + watchLvl * 0.05), wt2H, stone, roofDk);
      // Third watchtower (watchLvl L2+)
      if (watchLvl >= 2) {
        drawTower(cx - cs * 6.5, cy + cs * 0.5, cs * 0.70, cs * 3.0, stone, roofDk);
      }

      // Banner poles — base 3; barracks adds one, wallworks adds one
      drawBannerPole(cx - cs * 6.0, cy - cs * 4.8, cs * 3.5, 'rgba(140,18,18,0.88)');   // deep red
      drawBannerPole(cx - cs * 4.2, cy - cs * 2.5, cs * 3.0, 'rgba(18,38,120,0.88)');   // midnight blue
      drawBannerPole(cx - cs * 1.5, cy - cs * 5.5, cs * 2.5, 'rgba(120,90,18,0.88)');   // gold ochre
      if (barrLvl >= 2) {
        drawBannerPole(cx - cs * 3.5, cy + cs * 3.5, cs * 2.2, 'rgba(18,80,30,0.88)'); // forest green
      }
      if (wallLvl >= 1) {
        drawBannerPole(cx - cs * 5.0, cy - cs * 3.0, cs * 2.8, 'rgba(100,60,18,0.88)'); // bronze
      }
      if (wallLvl >= 3) {
        drawBannerPole(cx - cs * 0.5, cy - cs * 3.5, cs * 2.2, 'rgba(80,10,100,0.88)'); // royal purple
      }

      ctx.globalAlpha = 1;
      ctx.restore();
    }

    const sp = SPRITES['trelleborg'];
    if (sp && sp.img.complete && sp.img.naturalWidth > 0) {
      const scale = getCombatSpriteScale();
      const fortMul = this.minimalGoalDecor ? 4.2 : 5.5;
      const dw = cs * fortMul * scale;
      const dh = dw * (sp.frameH / sp.frameW);
      ctx.save();
      if (hr < 0.66) {
        const dmgAlpha = (1 - hr) * 0.65 * pulse;
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

    // ── Treasury room geometry — structural floor/walls that grow with gold ──────
    {
      const g = this.gold || 0;
      if (g >= 10) {
        ctx.save();
        ctx.globalAlpha = 0.55;
        // Stone floor slab under the hoard (always present from stage 1)
        const slabW = cs * (2.2 + (g >= 500 ? 1.6 : g >= 100 ? 0.8 : 0));
        const slabH = cs * (1.0 + (g >= 500 ? 0.5 : g >= 100 ? 0.25 : 0));
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(cx - slabW / 2 + 2, cy - slabH / 2 + 3, slabW, slabH);
        // Stone floor
        const floorGrad = ctx.createLinearGradient(cx, cy - slabH / 2, cx, cy + slabH / 2);
        floorGrad.addColorStop(0, '#1e1810');
        floorGrad.addColorStop(1, '#16120a');
        ctx.fillStyle = floorGrad;
        ctx.fillRect(cx - slabW / 2, cy - slabH / 2, slabW, slabH);
        // Stone tile lines
        ctx.strokeStyle = 'rgba(0,0,0,0.40)'; ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(cx - slabW / 2, cy); ctx.lineTo(cx + slabW / 2, cy);
        ctx.moveTo(cx, cy - slabH / 2); ctx.lineTo(cx, cy + slabH / 2);
        ctx.stroke();
        // Slab edge highlight
        ctx.strokeStyle = 'rgba(100,80,40,0.35)'; ctx.lineWidth = 0.8;
        ctx.strokeRect(cx - slabW / 2, cy - slabH / 2, slabW, slabH);

        // Stage 2+ (g >= 100): iron wall brackets with candle flames
        if (g >= 100) {
          const candleFlicker = 0.55 + Math.sin(time * 8.1) * 0.28;
          for (const bx2 of [cx - slabW / 2 - cs * 0.4, cx + slabW / 2 + cs * 0.4]) {
            const by2 = cy - slabH * 0.15;
            // Bracket
            ctx.fillStyle = '#3a3028';
            ctx.fillRect(bx2 - 1, by2 - cs * 0.35, 2, cs * 0.35);
            ctx.fillRect(bx2 - 2, by2 - cs * 0.38, 4, 3);
            // Candle flame — radial gradient only, no shadowBlur
            const cGrad = ctx.createRadialGradient(bx2, by2 - cs * 0.5, 0, bx2, by2 - cs * 0.5, 5);
            cGrad.addColorStop(0,   `rgba(255,240,160,${candleFlicker * 0.95})`);
            cGrad.addColorStop(0.4, `rgba(255,130,25,${candleFlicker * 0.70})`);
            cGrad.addColorStop(0.7, `rgba(220,70,10,${candleFlicker * 0.35})`);
            cGrad.addColorStop(1,   'rgba(180,40,0,0)');
            ctx.fillStyle = cGrad;
            ctx.beginPath();
            ctx.ellipse(bx2, by2 - cs * 0.54, 2.5 * candleFlicker, 4.5 * candleFlicker, 0, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Stage 3+ (g >= 500): stone arch doorway frame behind the pile
        if (g >= 500) {
          const archW = slabW * 0.7, archH = cs * 1.2;
          const archX = cx - archW / 2, archY = cy - slabH / 2 - archH;
          // Door pillars
          ctx.fillStyle = '#2a2018';
          ctx.fillRect(archX, archY, cs * 0.28, archH + cs * 0.12);
          ctx.fillRect(archX + archW - cs * 0.28, archY, cs * 0.28, archH + cs * 0.12);
          // Arch curve
          ctx.strokeStyle = '#2a2018'; ctx.lineWidth = cs * 0.28;
          ctx.beginPath();
          ctx.arc(cx, archY + cs * 0.05, archW / 2 - cs * 0.14, Math.PI, 0);
          ctx.stroke();
          // Keystone
          ctx.fillStyle = '#362a1c';
          ctx.beginPath();
          ctx.moveTo(cx - cs * 0.18, archY - cs * 0.05);
          ctx.lineTo(cx, archY - cs * 0.32);
          ctx.lineTo(cx + cs * 0.18, archY - cs * 0.05);
          ctx.closePath(); ctx.fill();
          // Pillar highlight
          ctx.fillStyle = 'rgba(160,130,70,0.18)';
          ctx.fillRect(archX, archY, 1.5, archH + cs * 0.12);
        }

        // Stage 4+ (g >= 1000): four vault corner pillars + chain gate
        if (g >= 1000) {
          const vaultR = cs * 1.8;
          const pillR = 3.0;
          const pillH = cs * 0.9;
          for (const [px2, py2] of [
            [cx - vaultR, cy - vaultR * 0.55],
            [cx + vaultR, cy - vaultR * 0.55],
            [cx - vaultR, cy + vaultR * 0.40],
            [cx + vaultR, cy + vaultR * 0.40],
          ]) {
            // Pillar shadow
            ctx.fillStyle = 'rgba(0,0,0,0.40)';
            ctx.beginPath(); ctx.arc(px2 + 1.5, py2 + 2, pillR, 0, Math.PI * 2); ctx.fill();
            // Pillar body
            ctx.fillStyle = '#2e2418';
            ctx.fillRect(px2 - pillR, py2 - pillH, pillR * 2, pillH);
            ctx.beginPath(); ctx.arc(px2, py2, pillR, 0, Math.PI * 2); ctx.fill();
            // Capital
            ctx.fillStyle = '#3e3222';
            ctx.fillRect(px2 - pillR - 0.5, py2 - pillH - 2, pillR * 2 + 1, 3);
            ctx.fillRect(px2 - pillR - 0.5, py2 - pillH, pillR * 2 + 1, 2);
          }
          // Chain between left pillars
          const chainAlpha = 0.45 + Math.sin(time * 1.4) * 0.08;
          ctx.strokeStyle = `rgba(80,65,40,${chainAlpha})`; ctx.lineWidth = 0.8;
          ctx.setLineDash([2, 2.5]);
          ctx.beginPath();
          ctx.moveTo(cx - vaultR, cy + vaultR * 0.40 - pillH * 0.5);
          ctx.lineTo(cx + vaultR, cy + vaultR * 0.40 - pillH * 0.5);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Stage 5 (g >= 5000): dragon skull arch + scattered bones
        if (g >= 5000) {
          // Dragon skull silhouette above the arch
          const skX = cx, skY = cy - slabH / 2 - cs * 2.4;
          ctx.fillStyle = 'rgba(0,0,0,0.35)';
          ctx.beginPath(); ctx.ellipse(skX + 1.5, skY + 2, cs * 0.9, cs * 0.62, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#2e2c1e';
          ctx.beginPath(); ctx.ellipse(skX, skY, cs * 0.9, cs * 0.62, 0, 0, Math.PI * 2); ctx.fill();
          // Snout
          ctx.fillStyle = '#2a2818';
          ctx.beginPath(); ctx.ellipse(skX, skY + cs * 0.38, cs * 0.45, cs * 0.26, 0, 0, Math.PI * 2); ctx.fill();
          // Eye sockets
          for (const ex of [skX - cs * 0.28, skX + cs * 0.28]) {
            ctx.fillStyle = '#100e06';
            ctx.beginPath(); ctx.ellipse(ex, skY - cs * 0.06, cs * 0.14, cs * 0.12, 0, 0, Math.PI * 2); ctx.fill();
            const eyeGlow = 0.35 + Math.sin(time * 3.5 + ex) * 0.20;
            ctx.fillStyle = `rgba(255,80,10,${eyeGlow})`;
            ctx.beginPath(); ctx.ellipse(ex, skY - cs * 0.06, cs * 0.06, cs * 0.05, 0, 0, Math.PI * 2); ctx.fill();
          }
          // Teeth
          ctx.fillStyle = '#1c1a10';
          for (let t = 0; t < 5; t++) {
            const tx2 = skX - cs * 0.32 + t * cs * 0.16;
            ctx.beginPath();
            ctx.moveTo(tx2 - cs * 0.045, skY + cs * 0.50);
            ctx.lineTo(tx2, skY + cs * 0.72);
            ctx.lineTo(tx2 + cs * 0.045, skY + cs * 0.50);
            ctx.closePath(); ctx.fill();
          }
          // Scattered bones on the floor
          ctx.strokeStyle = 'rgba(55,50,34,0.62)'; ctx.lineWidth = 1.2; ctx.lineCap = 'round';
          for (const [bx3, by3, ba] of [
            [cx - cs * 1.4, cy + cs * 0.35, 0.4],
            [cx + cs * 1.5, cy + cs * 0.45, -0.3],
            [cx - cs * 0.6, cy + cs * 0.65, 1.1],
          ]) {
            ctx.save(); ctx.translate(bx3, by3); ctx.rotate(ba);
            ctx.beginPath(); ctx.moveTo(-cs * 0.35, 0); ctx.lineTo(cs * 0.35, 0); ctx.stroke();
            ctx.beginPath(); ctx.arc(-cs * 0.35, 0, cs * 0.08, 0, Math.PI * 2); ctx.stroke();
            ctx.beginPath(); ctx.arc(cs * 0.35, 0, cs * 0.08, 0, Math.PI * 2); ctx.stroke();
            ctx.restore();
          }
          ctx.lineCap = 'butt';
        }

        ctx.globalAlpha = 1;
        ctx.restore();
      }
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

    // ── Gold pile — coin count tied to treasury thresholds for emotional weight ───
    //   0 g  → empty ring    100 g → small pile    500 g → medium
    //   1000g → large pile  5000 g → overflowing
    const g = this.gold || 0;
    const stackLevel = g >= 5000 ? 8
                     : g >= 1000 ? 6 + Math.min(Math.floor((g - 1000) / 2000), 1)
                     : g >= 500  ? 5
                     : g >= 100  ? 3 + Math.min(Math.floor((g - 100) / 200), 1)
                     : g >= 50   ? 2
                     : g >= 10   ? 1
                     : 0;
    const coinTotal  = stackLevel === 0 ? 0 : stackLevel * 3 + 2;
    const gPulse     = 0.5 + Math.sin(time * 5.5 + 0.8) * 0.5;
    const pileBaseY  = cy + cs * 0.3;

    ctx.save();
    if (coinTotal > 0) {
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

      // Stage 4+ (1000g): vault glow ring around coin pile
      if (g >= 1000) {
        const vaultAlpha = g >= 5000 ? 0.55 : 0.32 + (g - 1000) / 16000;
        const vaultR = cs * 2.0 + hPulseF * cs * 0.5;
        ctx.strokeStyle = `rgba(255,200,40,${vaultAlpha * 0.70})`;
        ctx.lineWidth   = 1.2;
        ctx.setLineDash([3, 5]);
        ctx.beginPath();
        ctx.arc(cx, pileBaseY, vaultR, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.shadowBlur = 0;
        // Scattered gems inside the vault ring
        const gemColors = ['#8a7a58', '#9a6048', '#6a7848', '#f0c040'];
        const gemCount  = g >= 5000 ? 8 : 4;
        for (let gi = 0; gi < gemCount; gi++) {
          const ga  = time * 0.6 + gi * (Math.PI * 2 / gemCount);
          const gr  = cs * (0.85 + Math.sin(time * 2.1 + gi) * 0.18);
          const gpx = cx + Math.cos(ga) * gr;
          const gpy = pileBaseY + Math.sin(ga) * gr * 0.42;
          const gAlpha = 0.45 + Math.sin(time * 4.5 + gi * 1.8) * 0.30;
          ctx.globalAlpha = gAlpha;
          ctx.fillStyle   = gemColors[gi % gemColors.length];
          ctx.beginPath();
          ctx.arc(gpx, gpy, 2.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.globalAlpha = 1;
        }
      }

      // Stage 5 (5000g): dragon hoard — overflow crown sparkles above pile
      if (g >= 5000) {
        const crownPulse = 0.5 + Math.sin(time * 7.2) * 0.5;
        const sparkCount = 6;
        for (let si = 0; si < sparkCount; si++) {
          const sa  = time * 1.2 + si * (Math.PI * 2 / sparkCount);
          const sAlpha = Math.max(0, 0.35 + Math.sin(time * 5.0 + si * 2.1) * 0.40);
          const spxD = cx + Math.cos(sa) * cs * 1.5;
          const spyD = pileBaseY - cs * 0.8 + Math.sin(time * 3.1 + si) * cs * 0.3;
          ctx.save();
          ctx.globalAlpha = sAlpha;
          // 4-pointed star sparkle
          ctx.fillStyle = '#c9b070';
          ctx.beginPath();
          for (let p = 0; p < 8; p++) {
            const pa = (p / 8) * Math.PI * 2 - Math.PI / 2;
            const pr = p % 2 === 0 ? 4.5 : 1.5;
            if (p === 0) ctx.moveTo(spxD + Math.cos(pa) * pr, spyD + Math.sin(pa) * pr);
            else         ctx.lineTo(spxD + Math.cos(pa) * pr, spyD + Math.sin(pa) * pr);
          }
          ctx.closePath();
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.restore();
        }
      }
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
    ctx.fillStyle   = '#3a4455';
    ctx.fillRect(runeX - 3, runeY - 5, 6, 11);
    ctx.fillStyle   = '#505870';
    ctx.fillRect(runeX - 3, runeY - 5, 6, 2);
    ctx.strokeStyle = `rgba(120,110,95,${0.65 + runePulse * 0.35})`;
    ctx.lineWidth   = 0.9;
    ctx.beginPath();
    ctx.moveTo(runeX, runeY - 3); ctx.lineTo(runeX, runeY + 3);
    ctx.moveTo(runeX - 2, runeY - 1); ctx.lineTo(runeX + 2, runeY + 2);
    ctx.moveTo(runeX - 2, runeY + 1); ctx.lineTo(runeX + 2, runeY - 1);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();

    // ── Treasure chest (right of pile) — drawn after coins so it reads on top ───
    const chX    = cx + Math.round(cs * 1.05);
    const chY    = cy + Math.round(cs * 0.35);
    const chW    = 14, chH = 9;
    const chGlow = g >= 1000 ? 8 + gPulse * 5 : g >= 500 ? 5 + gPulse * 3 : 3 + gPulse * 2;
    ctx.save();
    // Chest drop shadow (dark outline makes chest pop against gold coins)
    ctx.fillStyle = 'rgba(0,0,0,0.60)';
    ctx.fillRect(chX - chW / 2 + 1, chY - chH / 2 + 2, chW, chH);
    // Chest body
    ctx.fillStyle = '#5a2e0e';
    ctx.fillRect(chX - chW / 2, chY - chH / 2, chW, chH);
    // Chest lid (lighter top third)
    ctx.fillStyle = '#7a4020';
    ctx.fillRect(chX - chW / 2, chY - chH / 2, chW, Math.ceil(chH * 0.4));
    // Gold band across lid edge
    ctx.fillStyle = g >= 100 ? '#d4a020' : '#907020';
    ctx.fillRect(chX - chW / 2, chY - chH / 2 + Math.ceil(chH * 0.4) - 1, chW, 1);
    // Latch — center gold buckle
    ctx.fillStyle = g >= 200 ? '#f0c030' : '#a08020';
    ctx.fillRect(chX - 2, chY - 2, 4, 5);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(chX - 1, chY - 1, 2, 3);
    ctx.shadowBlur = 0;
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

  _drawGate(ctx, x, y, cs, time) {
    const col = Math.floor(x / cs);
    const row = Math.floor(y / cs);
    const cx = x + cs / 2;
    const cy = y + cs / 2;

    if (this.useCampaignPalisade) {
      const wEntry = this.wallData?.[`${col}_${row}`];
      const artKey = getBattleWestGateArtKey(wEntry, this.campaignPrepMeta);
      if (drawCampaignGateSprite(ctx, artKey, cx, cy, cs, time)) return;
    }

    const pulse = 0.45 + Math.sin(time * 2.2) * 0.25;
    ctx.save();
    ctx.fillStyle = '#120a04';
    ctx.fillRect(x, y, cs, cs);
    // Stone posts flanking the opening
    ctx.fillStyle = '#4a3828';
    ctx.fillRect(x + 1, y + 2, cs * 0.22, cs - 4);
    ctx.fillRect(x + cs - cs * 0.22 - 1, y + 2, cs * 0.22, cs - 4);
    // Portcullis bars
    ctx.strokeStyle = `rgba(180,140,70,${0.55 + pulse * 0.35})`;
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 4; i++) {
      const bx = x + cs * 0.28 + i * cs * 0.14;
      ctx.beginPath();
      ctx.moveTo(bx, y + cs * 0.18);
      ctx.lineTo(bx, y + cs * 0.82);
      ctx.stroke();
    }
    // Lantern glow
    ctx.fillStyle = `rgba(255,200,80,${0.35 + pulse * 0.25})`;
    ctx.beginPath();
    ctx.arc(cx, y + cs * 0.22, cs * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  _wallAdjacency(col, row) {
    const w = (c, r) => {
      const t = this.getCell(c, r);
      return t === CELL.WALL || t === CELL.GATE || t === CELL.TOWER;
    };
    return (w(col, row - 1) ? 1 : 0)   // N
         | (w(col + 1, row) ? 2 : 0)   // E
         | (w(col, row + 1) ? 4 : 0)   // S
         | (w(col - 1, row) ? 8 : 0);  // W
  }

  /** Wall art adjacency — only stone/gate segments, not hero pads (avoids frame bleed). */
  _wallRenderAdjacency(col, row) {
    const w = (c, r) => {
      const t = this.getCell(c, r);
      return t === CELL.WALL || t === CELL.GATE;
    };
    return (w(col, row - 1) ? 1 : 0)
         | (w(col + 1, row) ? 2 : 0)
         | (w(col, row + 1) ? 4 : 0)
         | (w(col - 1, row) ? 8 : 0);
  }

  /** Draw one wall or gate cell (for y-sorted field pass). */
  drawFortificationAt(ctx, col, row, time = 0) {
    const type = this.getCell(col, row);
    if (type !== CELL.WALL && type !== CELL.GATE) return;
    const cs = this.cellSize;
    const x = col * cs;
    const y = row * cs;
    if (type === CELL.WALL) {
      this._drawWallBlock(ctx, x, y, cs, this._wallRenderAdjacency(col, row));
    } else {
      this._drawGate(ctx, x, y, cs, time);
    }
  }

  _drawPalisadeTorch(ctx, x, y, cs, col, row, N) {
    if (N || (col + row) % 5 !== 0) return;
    const time2 = performance.now() * 0.001;
    const flicker = 0.55 + Math.sin(time2 * 9 + col) * 0.3;
    const cx = x + cs / 2;
    const tx = cx + ((col % 3) - 1) * cs * 0.22;
    const ty = y + cs * 0.2;
    ctx.save();
    ctx.fillStyle = `rgba(255,170,60,${flicker * 0.85})`;
    ctx.beginPath();
    ctx.ellipse(tx, ty, 1.8 * flicker, 2.8 * flicker, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  _drawPalisadeWallBlock(ctx, x, y, cs, adj = 0) {
    const col = Math.floor(x / cs);
    const row = Math.floor(y / cs);
    const N = (adj & 1) !== 0;
    const wallKey = `${col}_${row}`;
    const wEntry = this.wallData?.[wallKey];
    const hpFrac = wEntry?.maxHp ? (wEntry.hp ?? wEntry.maxHp) / wEntry.maxHp : 1;
    const isCorner = [3, 6, 9, 12].includes(adj);
    const variant = hpFrac < 0.45 ? 'damaged' : isCorner ? 'corner' : 'segment';

    if (drawPalisadeTile(ctx, x, y, cs, variant)) {
      if (!N && adj !== 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        ctx.fillRect(x, y, cs, cs * 0.14);
      }
      this._drawPalisadeTorch(ctx, x, y, cs, col, row, N);
      return;
    }

    const cx = x + cs / 2;

    ctx.fillStyle = '#1a1008';
    ctx.fillRect(x, y, cs, cs);

    const earth = ctx.createLinearGradient(x, y + cs, x, y);
    earth.addColorStop(0, 'rgba(40,28,14,0.55)');
    earth.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = earth;
    ctx.fillRect(x, y + cs - 3, cs, 3);

    const logCount = adj === 0 ? 3 : 4;
    const logW = Math.max(2.2, cs * 0.22);
    const gap = (cs - logCount * logW) / (logCount + 1);
    for (let i = 0; i < logCount; i++) {
      const lx = x + gap + i * (logW + gap);
      const hJitter = ((col * 17 + row * 31 + i * 13) % 5) - 2;
      const logH = cs - 2 + hJitter;
      const tone = 70 + ((col + row + i) % 4) * 12;
      ctx.fillStyle = `rgb(${tone + 18},${Math.floor(tone * 0.55)},${Math.floor(tone * 0.22)})`;
      ctx.fillRect(lx, y + cs - logH, logW, logH);
      ctx.fillStyle = 'rgba(255,200,120,0.12)';
      ctx.fillRect(lx, y + cs - logH, logW * 0.35, logH);
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(lx + logW - 0.6, y + cs - logH, 0.6, logH);
    }

    if (!N && adj !== 0) {
      ctx.fillStyle = '#3a2410';
      for (const mx of [x + 2, x + cs - 4]) {
        ctx.fillRect(mx, y, 2, Math.max(2, cs * 0.16));
      }
    }

    if ((col + row) % 5 === 0 && !N) {
      this._drawPalisadeTorch(ctx, x, y, cs, col, row, N);
    }

    ctx.strokeStyle = 'rgba(20,10,4,0.35)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(x + 0.5, y + 0.5, cs - 1, cs - 1);
  }

  _drawWallBlock(ctx, x, y, cs, adj = 0) {
    if (this.useCampaignPalisade) {
      this._drawPalisadeWallBlock(ctx, x, y, cs, adj);
      return;
    }
    const N  = (adj & 1) !== 0;
    const E  = (adj & 2) !== 0;
    const S  = (adj & 4) !== 0;
    const W  = (adj & 8) !== 0;
    const cx = x + cs / 2;
    const cy = y + cs / 2;

    // Alternating shield color (blue/red) by grid position
    const isBlue = (((x / cs) | 0) + ((y / cs) | 0)) % 2 === 0;

    ctx.fillStyle = '#1a0e04';
    ctx.fillRect(x, y, cs, cs);

    if (adj === 0) {
      // ── Isolated: single centred shield — less visual repetition ─────────
      const r = cs * 0.30;
      _drawVikingShield(ctx, cx, cy, r, isBlue);
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

      // Center shield — only on every 3rd connected wall segment for visual variety
      const shieldR = cs * 0.34;
      const showShield = ((Math.floor(x / cs) * 3 + Math.floor(y / cs) * 7) % 3) === 0;
      if (showShield) _drawVikingShield(ctx, cx, cy, shieldR, isBlue);
      else {
        // Replace shield with a wooden rivet/boss
        ctx.fillStyle = '#3a2010';
        ctx.beginPath(); ctx.arc(cx, cy, cs * 0.14, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(120,90,50,0.60)';
        ctx.beginPath(); ctx.arc(cx - cs * 0.04, cy - cs * 0.04, cs * 0.06, 0, Math.PI * 2); ctx.fill();
      }

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

    ctx.save();
    ctx.strokeStyle = 'rgba(30,15,5,0.4)';
    ctx.lineWidth   = 0.5;
    ctx.strokeRect(x + 0.5, y + 0.5, cs - 1, cs - 1);
    ctx.restore();

    // Cast shadow onto adjacent empty cells below and to the right (perceived height)
    if (!S) {
      ctx.save();
      const shGrad = ctx.createLinearGradient(x, y + cs, x, y + cs + 4);
      shGrad.addColorStop(0, 'rgba(0,0,0,0.38)');
      shGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = shGrad;
      ctx.fillRect(x, y + cs, cs, 4);
      ctx.restore();
    }
    if (!E) {
      ctx.save();
      const shGradR = ctx.createLinearGradient(x + cs, y, x + cs + 3, y);
      shGradR.addColorStop(0, 'rgba(0,0,0,0.22)');
      shGradR.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = shGradR;
      ctx.fillRect(x + cs, y, 3, cs);
      ctx.restore();
    }

    // ── Wall variation — deterministic decorations per cell position ──────────
    {
      const col = Math.floor(x / cs);
      const row = Math.floor(y / cs);
      const h   = (col * 31 + row * 17 + col * row * 7) & 0xffff;

      // Torch (1 in 5 walls, only on connected walls with exposed top)
      if ((h % 5) === 0 && adj !== 0 && !N) {
        const time2 = performance.now() * 0.001;
        const flicker = 0.55 + Math.sin(time2 * (8.2 + (h % 5) * 0.9)) * 0.26 + Math.sin(time2 * (13.4 + (h % 3))) * 0.12;
        const tx = cx + ((h % 3) - 1) * cs * 0.28;
        const ty = cy - cs * 0.25;
        ctx.save();
        // Torch bracket
        ctx.fillStyle = '#4a2a0a';
        ctx.fillRect(tx - 0.8, ty - 1, 1.6, cs * 0.55);
        ctx.fillStyle = '#7a4a18';
        ctx.fillRect(tx - 2, ty - 3, 4, 4);
        // Flame glow
        const fGrad = ctx.createRadialGradient(tx, ty - 2, 0, tx, ty - 2, 4.5 * flicker);
        fGrad.addColorStop(0,   `rgba(255,248,180,${flicker * 0.98})`);
        fGrad.addColorStop(0.4, `rgba(255,130,20,${flicker * 0.72})`);
        fGrad.addColorStop(1,   'rgba(200,50,5,0)');
        ctx.fillStyle = fGrad;
        ctx.beginPath();
        ctx.ellipse(tx, ty - 2.5, 2.8 * flicker, 4.5 * flicker, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();
      }

      // Banner (1 in 7 walls, hanging cloth)
      if ((h % 7) === 0 && adj !== 0) {
        const time2 = performance.now() * 0.001;
        const wave   = Math.sin(time2 * 1.8 + col * 0.4) * 0.8;
        const bannerH = cs * 0.55;
        const bannerW = cs * 0.38;
        const bx = cx - bannerW / 2 + wave * 0.3;
        const by = cy - cs * 0.45;
        // Color alternates between red and blue by column
        const bannerCol = (col % 3 === 0) ? 'rgba(130,15,15,0.75)' : (col % 3 === 1) ? 'rgba(15,30,110,0.75)' : 'rgba(100,80,12,0.70)';
        ctx.save();
        ctx.fillStyle = bannerCol;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + bannerW + wave * 0.5, by);
        ctx.lineTo(bx + bannerW * 0.8 + wave * 0.5, by + bannerH);
        ctx.lineTo(bx + bannerW * 0.2, by + bannerH);
        ctx.closePath(); ctx.fill();
        // Banner rune mark
        ctx.strokeStyle = 'rgba(255,220,80,0.45)';
        ctx.lineWidth = 0.45;
        ctx.beginPath();
        ctx.moveTo(cx, by + bannerH * 0.2); ctx.lineTo(cx, by + bannerH * 0.75);
        ctx.moveTo(cx - bannerW * 0.18, by + bannerH * 0.42); ctx.lineTo(cx + bannerW * 0.18, by + bannerH * 0.42);
        ctx.stroke();
        ctx.restore();
      }

      // Damage cracks (1 in 8 walls)
      if ((h % 8) === 0 && adj !== 0) {
        ctx.save();
        ctx.strokeStyle = 'rgba(0,0,0,0.62)';
        ctx.lineWidth = 0.55;
        const crackX = cx + ((h >> 4) % 3 - 1) * cs * 0.22;
        const crackY = cy + ((h >> 7) % 3 - 1) * cs * 0.18;
        ctx.beginPath();
        ctx.moveTo(crackX, crackY - cs * 0.30);
        ctx.lineTo(crackX + cs * 0.10, crackY);
        ctx.lineTo(crackX - cs * 0.08, crackY + cs * 0.25);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255,200,120,0.14)';
        ctx.beginPath();
        ctx.moveTo(crackX - 0.5, crackY - cs * 0.30);
        ctx.lineTo(crackX + cs * 0.10 - 0.5, crackY);
        ctx.lineTo(crackX - cs * 0.08 - 0.5, crackY + cs * 0.25);
        ctx.stroke();
        ctx.restore();
      }

      // Iron spikes on top merlons (1 in 4 walls with exposed top)
      if ((h % 4) === 0 && !N && adj !== 0) {
        ctx.save();
        ctx.fillStyle = 'rgba(55,50,48,0.88)';
        const spikeY = cy - cs * 0.46;
        for (const sx of [cx - cs * 0.22, cx + cs * 0.22]) {
          ctx.beginPath();
          ctx.moveTo(sx - 1, spikeY);
          ctx.lineTo(sx, spikeY - cs * 0.18);
          ctx.lineTo(sx + 1, spikeY);
          ctx.closePath(); ctx.fill();
        }
        ctx.restore();
      }
    }

    // ── Wall level badge + HP bar ─────────────────────────────────────────────
    {
      const _wallKey = `${Math.floor(x / cs)}_${Math.floor(y / cs)}`;
      const _wd = this.wallData?.[_wallKey];
      if (_wd) {
        // Temporary (REINFORCE) wall: amber tint overlay + waves-left countdown
        if (_wd.temporary) {
          ctx.save();
          ctx.globalAlpha = 0.22;
          ctx.fillStyle   = '#e8a020';
          ctx.fillRect(x, y, cs, cs);
          ctx.globalAlpha = 1;
          ctx.font         = `bold ${Math.max(5, cs * 0.42)}px monospace`;
          ctx.textAlign    = 'right';
          ctx.textBaseline = 'top';
          ctx.fillStyle    = '#f0c050';
          ctx.fillText(`${_wd.wavesLeft}`, x + cs - 1, y + 1);
          ctx.restore();
        } else if (_wd.level > 0) {
          // Level badge (top-right corner) if upgraded
          const _lvlColors = ['', '#88bb70', '#70a8d0', '#d4aa30', '#e8d080'];
          ctx.save();
          ctx.font         = `bold ${Math.max(5, cs * 0.40)}px monospace`;
          ctx.textAlign    = 'right';
          ctx.textBaseline = 'top';
          ctx.fillStyle    = _lvlColors[_wd.level] ?? '#ffffff';
          ctx.fillText(['', 'I', 'II', 'III', 'IV'][_wd.level], x + cs - 1, y + 1);
          ctx.restore();
        }
        // HP bar at bottom if damaged
        if (_wd.hp < _wd.maxHp) {
          const _bx     = x + 1;
          const _by     = y + cs - 3;
          const _bw     = cs - 2;
          const _ratio  = _wd.hp / _wd.maxHp;
          ctx.save();
          ctx.fillStyle = 'rgba(0,0,0,0.65)';
          ctx.fillRect(_bx, _by, _bw, 2);
          ctx.fillStyle = _ratio > 0.5 ? '#60c830' : _ratio > 0.25 ? '#d4a010' : '#c83020';
          ctx.fillRect(_bx, _by, Math.max(1, Math.round(_bw * _ratio)), 2);
          ctx.restore();
        }
      }
    }
  }
}
