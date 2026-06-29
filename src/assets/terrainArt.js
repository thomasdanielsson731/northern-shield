/**
 * Ash Fen terrain tiles — First Saga battlefields.
 * @see design/art/BATCH_PROMPTS.md Wave 4
 */

const TILE_SRC = {
  groundA: '/assets/terrain/tile_ashfen_ground_01@28.png',
  groundB: '/assets/terrain/tile_ashfen_ground_02@28.png',
  path: '/assets/terrain/tile_ashfen_path_01@28.png',
  palisade: '/assets/terrain/tile_palisade_segment@28.png',
  palisadeCorner: '/assets/terrain/tile_palisade_corner@28.png',
  palisadeDamaged: '/assets/terrain/tile_palisade_damaged@28.png',
  palisadeGateCap: '/assets/terrain/tile_palisade_gate_cap@28.png',
  spawnMist: '/assets/fx/fx_spawn_fen_mist@56.png',
  fenTrees: '/assets/terrain/prop_fen_trees_backdrop@128x256.png',
};

const _images = {};

for (const [key, src] of Object.entries(TILE_SRC)) {
  const img = new Image();
  img.src = src;
  _images[key] = img;
}

function ready(key) {
  const img = _images[key];
  return Boolean(img?.complete && img.naturalWidth > 0);
}

export function isAshfenTerrainReady() {
  return ready('groundA') && ready('groundB');
}

export function isPalisadeTileReady() {
  return ready('palisade');
}

/** Draw promoted palisade segment tile; returns false if art not loaded. */
export function drawPalisadeTile(ctx, x, y, size, variant = 'segment') {
  const key = variant === 'corner' ? 'palisadeCorner'
    : variant === 'damaged' ? 'palisadeDamaged'
      : variant === 'gateCap' ? 'palisadeGateCap'
        : 'palisade';
  const img = _images[key] ?? _images.palisade;
  if (!ready(key) && variant !== 'segment') {
    if (!ready('palisade')) return false;
    return drawPalisadeTile(ctx, x, y, size, 'segment');
  }
  if (!ready(key)) return false;
  ctx.drawImage(img, x, y, size, size);
  return true;
}

/** Chebyshev distance from fortress goal cell — keeps courtyard readable. */
function inFortressPad(col, row, goal, ringR = 6) {
  if (!goal) return false;
  return Math.max(Math.abs(col - goal.col), Math.abs(row - goal.row)) <= ringR;
}

/** One blended courtyard patch — avoids per-cell chessboard tiling. */
function paintCourtyardFloor(tc, goal, ringR, cellSize, groundA, groundB) {
  const minC = goal.col - ringR;
  const maxC = goal.col + ringR;
  const minR = goal.row - ringR;
  const maxR = goal.row + ringR;
  const ox = minC * cellSize;
  const oy = minR * cellSize;
  const pw = (maxC - minC + 1) * cellSize;
  const ph = (maxR - minR + 1) * cellSize;

  tc.drawImage(groundA, 0, 0, groundA.naturalWidth, groundA.naturalHeight, ox, oy, pw, ph);
  tc.save();
  tc.globalAlpha = 0.28;
  tc.drawImage(groundB, ox + cellSize * 0.35, oy + cellSize * 0.25, pw - cellSize * 0.5, ph - cellSize * 0.45);
  tc.restore();

  const warm = tc.createRadialGradient(ox + pw / 2, oy + ph / 2, cellSize, ox + pw / 2, oy + ph / 2, pw * 0.55);
  warm.addColorStop(0, 'rgba(255,200,140,0.10)');
  warm.addColorStop(1, 'rgba(0,0,0,0)');
  tc.fillStyle = warm;
  tc.fillRect(ox, oy, pw, ph);

  tc.strokeStyle = 'rgba(40,28,14,0.12)';
  tc.lineWidth = 1;
  tc.strokeRect(ox + 0.5, oy + 0.5, pw - 1, ph - 1);
}

/** Paint Ash Fen tile ground into terrain canvas. Returns false if tiles not loaded. */
export function bakeAshfenTerrain(tc, cols, rows, cellSize, width, height, rng, spawn, goal, options = {}) {
  if (!isAshfenTerrainReady()) return false;

  const { pathless = false } = options;
  const groundA = _images.groundA;
  const groundB = _images.groundB;
  const pathTile = _images.path;
  const pathRow = spawn?.row ?? Math.floor(rows / 2);
  const goalCol = goal?.col ?? cols - 1;
  const goalRow = goal?.row ?? Math.floor(rows / 2);
  const padRing = 6;

  tc.fillStyle = '#2c1e0e';
  tc.fillRect(0, 0, width, height);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (inFortressPad(col, row, goal, padRing)) continue;

      const x = col * cellSize;
      const y = row * cellSize;
      const variant = (col + row * 3) % 2;
      const tile = variant ? groundB : groundA;
      tc.globalAlpha = 0.92;
      tc.drawImage(tile, x, y, cellSize, cellSize);
      tc.globalAlpha = 1;

      if (((col * 7 + row * 13) % 5) === 0) {
        tc.fillStyle = 'rgba(60,42,18,0.10)';
        tc.fillRect(x, y, cellSize, cellSize);
      }

      if (!pathless && ready('path') && Math.abs(row - pathRow) <= 1 && col >= (spawn?.col ?? 0) && col <= goalCol) {
        tc.drawImage(pathTile, x, y, cellSize, cellSize);
      }
    }
  }

  if (goal) paintCourtyardFloor(tc, goal, padRing, cellSize, groundA, groundB);

  if (pathless && spawn && goal) {
    const laneY = pathRow * cellSize + cellSize / 2;
    const x0 = Math.max(0, spawn.col * cellSize);
    const x1 = Math.min(width, (goalCol + 1) * cellSize);
    const laneH = cellSize * 2.8;

    if (ready('path')) {
      for (let dr = -1; dr <= 1; dr++) {
        const row = pathRow + dr;
        if (row < 0 || row >= rows) continue;
        const y = row * cellSize;
        for (let col = spawn.col; col <= goalCol; col++) {
          const x = col * cellSize;
          tc.globalAlpha = dr === 0 ? 0.92 : 0.58;
          tc.drawImage(pathTile, x, y, cellSize, cellSize);
        }
      }
      tc.globalAlpha = 1;
    } else {
      const lg = tc.createLinearGradient(x0, laneY, x1, laneY);
      lg.addColorStop(0, 'rgba(60,46,26,0.0)');
      lg.addColorStop(0.06, 'rgba(92,70,36,0.80)');
      lg.addColorStop(0.94, 'rgba(92,70,36,0.80)');
      lg.addColorStop(1, 'rgba(60,46,26,0.0)');
      tc.fillStyle = lg;
      tc.fillRect(x0, laneY - laneH / 2, x1 - x0, laneH);
    }

    tc.fillStyle = 'rgba(16,10,4,0.22)';
    tc.fillRect(x0, laneY - laneH / 2, x1 - x0, 2);
    tc.fillRect(x0, laneY + laneH / 2 - 2, x1 - x0, 2);
  }

  const vg = tc.createRadialGradient(
    goalCol * cellSize, goalRow * cellSize, cellSize * 2,
    width / 2, height / 2, width * 0.75,
  );
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.12)');
  tc.fillStyle = vg;
  tc.fillRect(0, 0, width, height);

  return true;
}

/** Animated dirt lane for pathless campaign assault — shimmer + worn center rut. */
export function drawPathlessAssaultLane(ctx, spawn, goal, cols, rows, cellSize, time = 0) {
  if (!spawn || !goal) return;
  const pathRow = spawn.row;
  const x0 = Math.max(0, spawn.col * cellSize);
  const x1 = Math.min(cols * cellSize, (goal.col + 1) * cellSize);
  const laneW = x1 - x0;
  if (laneW <= 0) return;

  const cy = pathRow * cellSize + cellSize / 2;
  const laneH = cellSize * 2.6;

  ctx.save();
  const shimmer = 0.10 + Math.sin(time * 1.35) * 0.06;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = `rgba(200,160,100,${shimmer})`;
  ctx.fillRect(x0 + cellSize * 0.5, cy - laneH * 0.22, laneW - cellSize, laneH * 0.44);

  const rutPulse = 0.14 + Math.sin(time * 0.9 + spawn.col * 0.2) * 0.05;
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = `rgba(80,55,28,${rutPulse})`;
  ctx.fillRect(x0 + cellSize, cy - cellSize * 0.18, laneW - cellSize * 2, cellSize * 0.36);
  ctx.restore();

  // Foot-traffic dust motes drifting along the lane
  ctx.save();
  for (let i = 0; i < 5; i++) {
    const phase = time * 0.55 + i * 1.7;
    const px = x0 + ((phase * cellSize * 0.35 + i * laneW * 0.17) % laneW);
    const py = cy + Math.sin(phase * 1.4 + i) * cellSize * 0.35;
    const alpha = 0.08 + Math.sin(phase * 2.1) * 0.04;
    ctx.fillStyle = `rgba(180,140,90,${alpha})`;
    ctx.beginPath();
    ctx.arc(px, py, 1.2 + (i % 2), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Animated fen mist at spawn edge — replaces static bake + purple portal on saga assaults. */
export function drawAnimatedSpawnFenMist(ctx, spawn, cellSize, time = 0, { drama = false } = {}) {
  if (!spawn) return;
  const cx = spawn.col * cellSize + cellSize / 2;
  const cy = spawn.row * cellSize + cellSize / 2;
  const pulse = 0.72 + Math.sin(time * 0.85) * 0.28;
  const driftX = Math.sin(time * 0.42) * cellSize * 0.22;
  const driftY = Math.sin(time * 0.55 + 1.2) * cellSize * 0.1;
  const boost = drama ? 1.45 : 1;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const veil = ctx.createRadialGradient(cx + driftX, cy + driftY, cellSize * 0.1, cx + driftX, cy + driftY, cellSize * (drama ? 3.8 : 2.6));
  veil.addColorStop(0, `rgba(160,200,210,${(0.22 + pulse * 0.18) * boost})`);
  veil.addColorStop(0.45, `rgba(100,140,160,${(0.14 + pulse * 0.1) * boost})`);
  veil.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = veil;
  ctx.beginPath();
  ctx.arc(cx + driftX, cy + driftY, cellSize * (drama ? 3.8 : 2.6), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (!ready('spawnMist')) return;
  const mist = _images.spawnMist;
  const scale = (0.58 + pulse * 0.08) * (drama ? 1.12 : 1);
  const mw = mist.naturalWidth * scale;
  const mh = mist.naturalHeight * scale;
  const mx = cx - mw * 0.42 + driftX;
  const my = cy - mh * 0.38 + driftY;

  ctx.save();
  ctx.globalAlpha = (0.32 + pulse * 0.22) * boost;
  ctx.drawImage(mist, mx, my, mw, mh);
  ctx.globalAlpha = (0.18 + pulse * 0.12) * boost;
  ctx.drawImage(mist, mx + cellSize * 0.35, my + cellSize * 0.15, mw * 0.88, mh * 0.88);
  ctx.globalAlpha = (0.12 + pulse * 0.08) * boost;
  ctx.drawImage(mist, mx - cellSize * 0.28, my + cellSize * 0.22, mw * 0.72, mh * 0.72);
  ctx.restore();
}

function drawTorchLightPool(ctx, cx, cy, radius, flicker, warm = false) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  const core = warm ? [255, 190, 90] : [255, 150, 60];
  g.addColorStop(0, `rgba(${core[0]},${core[1]},${core[2]},${0.28 * flicker})`);
  g.addColorStop(0.4, `rgba(255,120,40,${0.10 * flicker})`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Warm torch pools along palisade walls and gate lantern — battle night read. */
export function drawCampaignPalisadeTorchPools(ctx, wallData, cellSize, time = 0, { strength = 1 } = {}) {
  if (!wallData) return;
  const dim = Math.max(0, Math.min(1, strength));
  for (const [key, w] of Object.entries(wallData)) {
    const [col, row] = key.split('_').map(Number);
    const cx = col * cellSize + cellSize / 2;
    const cy = row * cellSize + cellSize / 2;
    const flicker = (0.55 + Math.sin(time * 8.5 + col * 1.3 + row) * 0.32) * dim;

    if (w.isGate) {
      drawTorchLightPool(ctx, cx, cy - cellSize * 0.08, cellSize * 1.55, flicker, true);
      continue;
    }
    if ((col + row) % 5 !== 0) continue;
    const ty = cy + cellSize * 0.12;
    drawTorchLightPool(ctx, cx + ((col % 3) - 1) * cellSize * 0.18, ty, cellSize * 1.05, flicker);
  }
}

/** Background color grade — cool fen vignette on terrain only (draw before units). */
export function drawCampaignAssaultColorGradeBg(ctx, cols, rows, cellSize, goal, ringR, time = 0) {
  if (!goal) return;
  const gx = goal.col * cellSize + cellSize / 2;
  const gy = goal.row * cellSize + cellSize / 2;
  const W = cols * cellSize;
  const H = rows * cellSize;
  const breathe = 0.92 + Math.sin(time * 0.35) * 0.08;

  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  const cool = ctx.createRadialGradient(gx, gy, ringR * cellSize * 0.65, gx, gy, Math.max(W, H) * 0.78);
  cool.addColorStop(0, 'rgba(255,255,255,0)');
  cool.addColorStop(0.5, 'rgba(210,220,235,0)');
  cool.addColorStop(1, `rgba(120,145,185,${0.12 * breathe})`);
  ctx.fillStyle = cool;
  ctx.fillRect(0, 0, W, H);

  ctx.globalCompositeOperation = 'overlay';
  const warm = ctx.createRadialGradient(gx, gy, 0, gx, gy, ringR * cellSize * 1.05);
  warm.addColorStop(0, `rgba(255,195,110,${0.14 * breathe})`);
  warm.addColorStop(0.6, `rgba(255,150,70,${0.05 * breathe})`);
  warm.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = warm;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/** @deprecated Use drawCampaignAssaultColorGradeBg before units — full-screen grade muddies combat. */
export function drawCampaignAssaultColorGrade(ctx, cols, rows, cellSize, goal, ringR, time = 0) {
  drawCampaignAssaultColorGradeBg(ctx, cols, rows, cellSize, goal, ringR, time);
}

/** Single illustrated palisade ring — replaces per-cell tile loop during campaign assault combat. */
export function drawCampaignPalisadeRing(ctx, goal, ringR, cellSize, time = 0, { spawnCol = null } = {}) {
  if (!goal) return;
  const gx = goal.col * cellSize + cellSize / 2;
  const gy = goal.row * cellSize + cellSize / 2;
  const outer = ringR * cellSize + cellSize * 0.42;
  const inner = outer - cellSize * 0.55;
  const gateAngle = spawnCol != null && spawnCol < goal.col ? Math.PI : 0;
  const gateSpread = 0.42;

  ctx.save();
  ctx.fillStyle = 'rgba(18,10,4,0.35)';
  ctx.beginPath();
  ctx.ellipse(gx, gy + cellSize * 0.08, outer + cellSize * 0.12, outer * 0.92 + cellSize * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();

  const stakeCount = Math.max(28, Math.round(ringR * 14));
  const woodA = '#5c3a18';
  const woodB = '#3a2410';
  const flicker = 0.55 + Math.sin(time * 8.2) * 0.32;

  for (let i = 0; i < stakeCount; i++) {
    const a = (i / stakeCount) * Math.PI * 2;
    let da = a - gateAngle;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    if (Math.abs(da) < gateSpread) continue;

    const sx = gx + Math.cos(a) * outer;
    const sy = gy + Math.sin(a) * outer * 0.9 + cellSize * 0.08;
    const h = cellSize * (0.72 + (i % 3) * 0.08);
    const lean = Math.sin(a * 2 + time * 0.15) * 0.06;

    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(a + Math.PI / 2 + lean);
    ctx.fillStyle = i % 2 ? woodA : woodB;
    ctx.fillRect(-cellSize * 0.1, -h, cellSize * 0.2, h);
    ctx.fillStyle = 'rgba(255,200,120,0.25)';
    ctx.fillRect(-cellSize * 0.06, -h * 0.85, cellSize * 0.05, h * 0.7);
    ctx.restore();
  }

  ctx.strokeStyle = 'rgba(30,18,8,0.55)';
  ctx.lineWidth = cellSize * 0.14;
  ctx.beginPath();
  ctx.ellipse(gx, gy + cellSize * 0.08, outer, outer * 0.9, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(80,55,28,0.45)';
  ctx.lineWidth = cellSize * 0.08;
  ctx.beginPath();
  ctx.ellipse(gx, gy + cellSize * 0.08, inner, inner * 0.9, 0, 0, Math.PI * 2);
  ctx.stroke();

  const gateX = gx + Math.cos(gateAngle) * outer * 0.92;
  const gateY = gy + Math.sin(gateAngle) * outer * 0.82 + cellSize * 0.08;
  ctx.fillStyle = '#2a1810';
  ctx.fillRect(gateX - cellSize * 0.55, gateY - cellSize * 0.35, cellSize * 1.1, cellSize * 0.7);
  ctx.fillStyle = `rgba(255,190,90,${0.35 + flicker * 0.25})`;
  ctx.beginPath();
  ctx.arc(gateX, gateY - cellSize * 0.12, cellSize * 0.14, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/** Wide playfield atmosphere — 3-layer parallax fen backdrop in letterbox margins. */
export function drawCampaignAssaultPlayfieldBackdrop(ctx, x, y, w, h, time = 0) {
  const drift0 = Math.sin(time * 0.10) * 3;
  const drift1 = Math.sin(time * 0.20) * 7;
  const drift2 = Math.sin(time * 0.34) * 11;
  const mistPulse = 0.62 + Math.sin(time * 0.65) * 0.22;

  // Layer 0 — distant sky / fen haze (slowest)
  const sky = ctx.createLinearGradient(x, y + drift0, x, y + h + drift0);
  sky.addColorStop(0, '#0e0c10');
  sky.addColorStop(0.35, '#16120e');
  sky.addColorStop(0.7, '#1a1612');
  sky.addColorStop(1, '#080604');
  ctx.fillStyle = sky;
  ctx.fillRect(x, y, w, h);

  const haze0 = ctx.createRadialGradient(
    x + w * 0.18 + drift0, y + h * 0.42, 0,
    x + w * 0.18 + drift0, y + h * 0.42, w * 0.55,
  );
  haze0.addColorStop(0, `rgba(55,75,55,${0.10 * mistPulse})`);
  haze0.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = haze0;
  ctx.fillRect(x, y, w, h);

  // Layer 1 — fen tree silhouettes (mid parallax)
  if (ready('fenTrees')) {
    const trees = _images.fenTrees;
    const th = Math.min(h * 0.58, trees.naturalHeight * (w / trees.naturalWidth) * 0.38);
    ctx.save();
    ctx.globalAlpha = 0.34;
    ctx.drawImage(trees, x + drift1, y + h - th, w, th);
    ctx.globalAlpha = 0.20;
    ctx.drawImage(trees, x + w * 0.06 + drift1 * 0.6, y + h - th * 0.88, w * 0.92, th * 0.92);
    ctx.restore();
  }

  // Layer 2 — foreground mist wisps + wind lines (fastest)
  if (ready('spawnMist')) {
    const mist = _images.spawnMist;
    const mw = w * 0.28;
    const mh = mw * (mist.naturalHeight / mist.naturalWidth);
    ctx.save();
    ctx.globalAlpha = 0.14 + mistPulse * 0.08;
    ctx.drawImage(mist, x + w * 0.04 + drift2, y + h * 0.55, mw, mh);
    ctx.globalAlpha = 0.10 + mistPulse * 0.06;
    ctx.drawImage(mist, x + w * 0.62 + drift2 * 0.7, y + h * 0.62, mw * 0.75, mh * 0.75);
    ctx.restore();
  }

  const vg = ctx.createRadialGradient(x + w / 2, y + h * 0.40, w * 0.06, x + w / 2, y + h * 0.40, w * 0.64);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = vg;
  ctx.fillRect(x, y, w, h);

  ctx.save();
  ctx.strokeStyle = 'rgba(80,60,40,0.07)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const ly = y + h * (0.18 + i * 0.16) + Math.sin(time * 0.28 + i) * 2 + drift2 * 0.15;
    ctx.beginPath();
    ctx.moveTo(x, ly);
    ctx.lineTo(x + w, ly + Math.sin(time * 0.45 + i * 1.5) * 3);
    ctx.stroke();
  }
  ctx.restore();
}
