/**
 * Ash Fen terrain tiles — First Saga battlefields.
 * @see design/art/BATCH_PROMPTS.md Wave 4
 */

import { getAssaultBorderSpawnPx } from '../combat/assaultField.js';

const TILE_SRC = {
  groundA: '/assets/terrain/tile_ashfen_ground_01@28.png',
  groundB: '/assets/terrain/tile_ashfen_ground_02@28.png',
  path: '/assets/terrain/tile_ashfen_path_01@28.png',
  palisade: '/assets/terrain/tile_palisade_segment@28.png',
  palisadeCorner: '/assets/terrain/tile_palisade_corner@28.png',
  palisadeDamaged: '/assets/terrain/tile_palisade_damaged@28.png',
  palisadeGateCap: '/assets/terrain/tile_palisade_gate_cap@28.png',
  palisadeStone: '/assets/terrain/tile_palisade_stone_segment@28.png',
  fenTreePine: '/assets/terrain/prop_fen_tree_pine@96x192.png',
  fenTreeBirch: '/assets/terrain/prop_fen_birch@96x192.png',
  fenRock: '/assets/terrain/prop_fen_rock_cluster@64x48.png',
  spawnMist: '/assets/fx/fx_spawn_fen_mist@56.png',
  fenTrees: '/assets/terrain/prop_fen_trees_backdrop@128x256.png',
  assaultWheelBg: '/assets/terrain/assault_battlefield_bg@2048x1320.png',
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
        : variant === 'stone' ? 'palisadeStone'
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

/** Average HP ratio of non-gate wall segments (0–1). */
function wallRingDamageRatio(wallData) {
  if (!wallData) return 0;
  let sum = 0;
  let count = 0;
  for (const w of Object.values(wallData)) {
    if (w?.isGate || w?.temporary) continue;
    const max = w.maxHp ?? w.hp ?? 100;
    const hp = w.hp ?? max;
    if (max <= 0) continue;
    sum += hp / max;
    count++;
  }
  if (!count) return 0;
  return 1 - sum / count;
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
  const cx = ox + pw / 2;
  const cy = oy + ph / 2;

  tc.save();
  tc.beginPath();
  tc.ellipse(cx, cy + cellSize * 0.06, pw * 0.46, ph * 0.42, 0, 0, Math.PI * 2);
  tc.clip();

  tc.drawImage(groundA, 0, 0, groundA.naturalWidth, groundA.naturalHeight, ox, oy, pw, ph);
  tc.globalAlpha = 0.28;
  tc.drawImage(groundB, ox + cellSize * 0.35, oy + cellSize * 0.25, pw - cellSize * 0.5, ph - cellSize * 0.45);
  tc.globalAlpha = 1;

  const warm = tc.createRadialGradient(cx, cy, cellSize, cx, cy, pw * 0.5);
  warm.addColorStop(0, 'rgba(255,200,140,0.14)');
  warm.addColorStop(0.55, 'rgba(120,80,40,0.08)');
  warm.addColorStop(1, 'rgba(0,0,0,0)');
  tc.fillStyle = warm;
  tc.fillRect(ox, oy, pw, ph);

  tc.strokeStyle = 'rgba(40,28,14,0.18)';
  tc.lineWidth = 1.2;
  tc.beginPath();
  tc.ellipse(cx, cy + cellSize * 0.06, pw * 0.44, ph * 0.40, 0, 0, Math.PI * 2);
  tc.stroke();
  tc.restore();
}

/** Fen atmosphere — tree silhouettes, spawn mist, cool sky wash. */
function paintAshfenPlayfieldAtmosphere(tc, width, height, cellSize, spawn, goal) {
  if (spawn) {
    const cx = spawn.col * cellSize + cellSize / 2;
    const cy = spawn.row * cellSize + cellSize / 2;
    const mist = tc.createRadialGradient(cx, cy, cellSize * 0.2, cx, cy, cellSize * 5.5);
    mist.addColorStop(0, 'rgba(120,150,160,0.16)');
    mist.addColorStop(0.45, 'rgba(70,95,105,0.10)');
    mist.addColorStop(1, 'rgba(0,0,0,0)');
    tc.fillStyle = mist;
    tc.beginPath();
    tc.arc(cx, cy, cellSize * 5.5, 0, Math.PI * 2);
    tc.fill();
  }

  if (ready('fenTrees')) {
    const trees = _images.fenTrees;
    const th = height * 0.44;
    tc.save();
    tc.globalAlpha = 0.36;
    tc.drawImage(trees, -width * 0.04, height - th, width * 0.38, th);
    tc.globalAlpha = 0.24;
    tc.drawImage(trees, width * 0.66, height - th * 0.92, width * 0.36, th * 0.92);
    tc.restore();
  }

  const sky = tc.createLinearGradient(0, 0, 0, height * 0.42);
  sky.addColorStop(0, 'rgba(14,20,26,0.42)');
  sky.addColorStop(0.55, 'rgba(18,24,20,0.12)');
  sky.addColorStop(1, 'rgba(0,0,0,0)');
  tc.fillStyle = sky;
  tc.fillRect(0, 0, width, height);

  if (goal) {
    const gx = goal.col * cellSize + cellSize / 2;
    const gy = goal.row * cellSize + cellSize / 2;
    const warm = tc.createRadialGradient(gx, gy, cellSize, gx, gy, cellSize * 7);
    warm.addColorStop(0, 'rgba(255,180,90,0.06)');
    warm.addColorStop(1, 'rgba(0,0,0,0)');
    tc.fillStyle = warm;
    tc.fillRect(0, 0, width, height);
  }
}

/** Single worn dirt lane — avoids tiling vertical path sprites into parallel stripes. */
function paintBakedPathlessLane(tc, spawn, goal, cols, rows, cellSize, width) {
  if (!spawn || !goal) return;
  const pathRow = spawn.row;
  const x0 = Math.max(0, spawn.col * cellSize);
  const x1 = Math.min(width, (goal.col + 1) * cellSize);
  const laneW = x1 - x0;
  if (laneW <= 0) return;

  const cy = pathRow * cellSize + cellSize / 2;
  const laneH = cellSize * 2.35;

  const body = tc.createLinearGradient(x0, cy - laneH / 2, x0, cy + laneH / 2);
  body.addColorStop(0, 'rgba(18,12,6,0.55)');
  body.addColorStop(0.14, 'rgba(68,50,28,0.94)');
  body.addColorStop(0.5, 'rgba(98,76,44,0.96)');
  body.addColorStop(0.86, 'rgba(68,50,28,0.94)');
  body.addColorStop(1, 'rgba(18,12,6,0.55)');
  tc.fillStyle = body;
  tc.fillRect(x0, cy - laneH / 2, laneW, laneH);

  const rut = tc.createLinearGradient(x0, cy, x1, cy);
  rut.addColorStop(0, 'rgba(30,20,10,0)');
  rut.addColorStop(0.08, 'rgba(48,32,16,0.72)');
  rut.addColorStop(0.5, 'rgba(36,24,12,0.82)');
  rut.addColorStop(0.92, 'rgba(48,32,16,0.72)');
  rut.addColorStop(1, 'rgba(30,20,10,0)');
  tc.fillStyle = rut;
  tc.fillRect(x0 + cellSize * 0.25, cy - cellSize * 0.20, laneW - cellSize * 0.5, cellSize * 0.40);

  tc.strokeStyle = 'rgba(24,16,8,0.35)';
  tc.lineWidth = 1;
  tc.beginPath();
  tc.moveTo(x0 + cellSize * 0.2, cy - laneH * 0.38);
  tc.lineTo(x1 - cellSize * 0.2, cy - laneH * 0.38);
  tc.moveTo(x0 + cellSize * 0.2, cy + laneH * 0.38);
  tc.lineTo(x1 - cellSize * 0.2, cy + laneH * 0.38);
  tc.stroke();

  const count = Math.max(8, Math.floor(laneW / (cellSize * 1.4)));
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    const px = x0 + laneW * t;
    const seed = px * 0.17 + pathRow * 0.31;
    const py = cy + Math.sin(seed * 9.1) * cellSize * 0.18;
    const rw = cellSize * (0.10 + Math.abs(Math.sin(seed * 4.2)) * 0.08);
    const rh = cellSize * 0.05;
    const tone = 72 + Math.sin(seed * 6.7) * 14;
    tc.fillStyle = `rgba(${tone},${Math.round(tone * 0.78)},${Math.round(tone * 0.52)},0.35)`;
    tc.beginPath();
    tc.ellipse(px, py, rw, rh, 0, 0, Math.PI * 2);
    tc.fill();
  }
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
      tc.drawImage(tile, x - 0.5, y - 0.5, cellSize + 1, cellSize + 1);
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
    paintBakedPathlessLane(tc, spawn, goal, cols, rows, cellSize, width);
  }

  paintAshfenPlayfieldAtmosphere(tc, width, height, cellSize, spawn, goal);

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

/** Procedural stone wheel paths — fallback when assault bg art is loading. */
function paintProceduralWheelPaths(tc, cx, cy, cellSize, worldW, worldH) {
  const outerR = cellSize * 9.5;
  const innerR = cellSize * 4.8;
  const hubR   = cellSize * 1.6;

  tc.strokeStyle = 'rgba(72,58,38,0.72)';
  tc.lineWidth = cellSize * 0.85;
  tc.lineCap = 'round';
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    tc.beginPath();
    tc.moveTo(cx + Math.cos(a) * hubR, cy + Math.sin(a) * hubR);
    tc.lineTo(cx + Math.cos(a) * outerR * 1.15, cy + Math.sin(a) * outerR * 1.15);
    tc.stroke();
  }
  for (const r of [hubR, innerR, outerR]) {
    tc.beginPath();
    tc.arc(cx, cy, r, 0, Math.PI * 2);
    tc.stroke();
  }

  const vg = tc.createRadialGradient(cx, cy, outerR * 0.4, cx, cy, Math.max(worldW, worldH) * 0.55);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.42)');
  tc.fillStyle = vg;
  tc.fillRect(0, 0, worldW, worldH);
}

/** Scatter trees, stones, and water pools in the wilderness padding. */
function scatterAssaultWilderness(tc, worldW, worldH, padX, padY, cols, rows, cellSize, goal, rng) {
  const gridW = cols * cellSize;
  const gridH = rows * cellSize;
  const goalX = padX + goal.col * cellSize + cellSize / 2;
  const goalY = padY + goal.row * cellSize + cellSize / 2;

  const inCourtyard = (wx, wy) => {
    const lx = wx - padX;
    const ly = wy - padY;
    return Math.max(Math.abs(lx / cellSize - goal.col), Math.abs(ly / cellSize - goal.row)) <= 7;
  };

  for (let i = 0; i < 48; i++) {
    let wx = rng() * worldW;
    let wy = rng() * worldH;
    if (wx > padX && wx < padX + gridW && wy > padY && wy < padY + gridH) continue;
    if (inCourtyard(wx, wy)) continue;

    const pick = rng();
    if (pick < 0.14 && ready('fenRock')) {
      const rock = _images.fenRock;
      const rw = cellSize * (0.9 + rng() * 0.6);
      const rh = rw * (rock.naturalHeight / rock.naturalWidth);
      tc.save();
      tc.globalAlpha = 0.7 + rng() * 0.25;
      tc.drawImage(rock, wx - rw / 2, wy - rh * 0.85, rw, rh);
      tc.restore();
      continue;
    }

    const th = cellSize * (2.4 + rng() * 2.8);
    const tw = th * 0.42;
    const variant = rng();
    let treeImg = null;
    if (variant < 0.22 && ready('fenTreePine')) treeImg = _images.fenTreePine;
    else if (variant < 0.38 && ready('fenTreeBirch')) treeImg = _images.fenTreeBirch;
    else if (ready('fenTrees')) treeImg = _images.fenTrees;

    if (treeImg) {
      tc.save();
      tc.globalAlpha = 0.38 + rng() * 0.28;
      const aspect = treeImg.naturalWidth / Math.max(1, treeImg.naturalHeight);
      const drawH = th;
      const drawW = drawH * aspect;
      tc.drawImage(treeImg, wx - drawW / 2, wy - drawH, drawW, drawH);
      tc.restore();
    } else {
      tc.fillStyle = `rgba(${18 + rng() * 12},${28 + rng() * 14},${18 + rng() * 10},0.75)`;
      tc.beginPath();
      tc.ellipse(wx, wy - th * 0.35, tw * 0.35, th * 0.55, 0, 0, Math.PI * 2);
      tc.fill();
      tc.fillStyle = '#1a1008';
      tc.fillRect(wx - tw * 0.06, wy - th * 0.15, tw * 0.12, th * 0.2);
    }
  }

  for (let i = 0; i < 22; i++) {
    const wx = rng() * worldW;
    const wy = rng() * worldH;
    if (inCourtyard(wx, wy)) continue;
    const r = cellSize * (0.35 + rng() * 0.85);
    tc.fillStyle = `rgba(${48 + rng() * 28},${44 + rng() * 20},${38 + rng() * 18},0.82)`;
    tc.beginPath();
    tc.ellipse(wx, wy, r, r * 0.72, rng() * Math.PI, 0, Math.PI * 2);
    tc.fill();
    tc.strokeStyle = 'rgba(20,16,12,0.35)';
    tc.lineWidth = 1;
    tc.stroke();
  }

  const waterSpots = [
    { x: padX * 0.42, y: padY + gridH * 0.72, rx: padX * 0.55, ry: padY * 0.38 },
    { x: padX + gridW + padX * 0.58, y: padY * 0.35, rx: padX * 0.48, ry: padY * 0.42 },
    { x: goalX + gridW * 0.18, y: padY + gridH + padY * 0.45, rx: gridW * 0.22, ry: padY * 0.35 },
  ];
  for (const pool of waterSpots) {
    const wg = tc.createRadialGradient(pool.x, pool.y, 0, pool.x, pool.y, Math.max(pool.rx, pool.ry));
    wg.addColorStop(0, 'rgba(70,110,120,0.42)');
    wg.addColorStop(0.55, 'rgba(40,70,82,0.28)');
    wg.addColorStop(1, 'rgba(0,0,0,0)');
    tc.fillStyle = wg;
    tc.beginPath();
    tc.ellipse(pool.x, pool.y, pool.rx, pool.ry, 0, 0, Math.PI * 2);
    tc.fill();
  }
}

/**
 * Large scrollable assault backdrop — fen forest art covering the full padded world.
 * No buildings; grid terrain (paths, courtyard) is painted at the pad offset only.
 */
export function bakeAssaultWorldTerrain(tc, cols, rows, cellSize, worldW, worldH, padX, padY, spawn, goal, rng) {
  const gx = padX + (goal?.col ?? Math.floor(cols / 2)) * cellSize + cellSize / 2;
  const gy = padY + (goal?.row ?? Math.floor(rows / 2)) * cellSize + cellSize / 2;

  const hasWheel = ready('assaultWheelBg');
  tc.fillStyle = '#0e1410';
  tc.fillRect(0, 0, worldW, worldH);

  if (hasWheel) {
    const img = _images.assaultWheelBg;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const scale = Math.max(worldW / iw, worldH / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = (worldW - dw) / 2;
    const dy = (worldH - dh) / 2;
    tc.drawImage(img, 0, 0, iw, ih, dx, dy, dw, dh);
  } else {
    paintProceduralWheelPaths(tc, gx, gy, cellSize, worldW, worldH);
    tc.save();
    tc.globalAlpha = 0.88;
    tc.translate(padX, padY);
    if (isAshfenTerrainReady()) {
      bakeAshfenTerrain(tc, cols, rows, cellSize, cols * cellSize, rows * cellSize, rng, spawn, goal, {
        pathless: true,
      });
    }
    tc.restore();
  }

  scatterAssaultWilderness(tc, worldW, worldH, padX, padY, cols, rows, cellSize, goal ?? { col: Math.floor(cols / 2), row: Math.floor(rows / 2) }, rng);

  if (spawn && goal) {
    const border = getAssaultBorderSpawnPx(spawn, goal, cols, rows, cellSize, padX, padY);
    const mist = tc.createRadialGradient(
      border.x, border.y, cellSize * 0.4,
      border.x, border.y, cellSize * 6.5,
    );
    mist.addColorStop(0, 'rgba(120,150,160,0.20)');
    mist.addColorStop(0.45, 'rgba(70,95,105,0.12)');
    mist.addColorStop(1, 'rgba(0,0,0,0)');
    tc.fillStyle = mist;
    tc.beginPath();
    tc.arc(border.x, border.y, cellSize * 6.5, 0, Math.PI * 2);
    tc.fill();
  }

  const edge = tc.createRadialGradient(gx, gy, cellSize * 5, gx, gy, Math.max(worldW, worldH) * 0.62);
  edge.addColorStop(0, 'rgba(0,0,0,0)');
  edge.addColorStop(0.72, 'rgba(0,0,0,0)');
  edge.addColorStop(1, 'rgba(0,0,0,0.32)');
  tc.fillStyle = edge;
  tc.fillRect(0, 0, worldW, worldH);

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
  const laneH = cellSize * 2.35;

  ctx.save();
  const edgePulse = 0.08 + Math.sin(time * 0.8) * 0.04;
  ctx.strokeStyle = `rgba(24,16,8,${0.22 + edgePulse})`;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x0 + cellSize * 0.15, cy - laneH * 0.42);
  ctx.lineTo(x1 - cellSize * 0.15, cy - laneH * 0.42);
  ctx.moveTo(x0 + cellSize * 0.15, cy + laneH * 0.42);
  ctx.lineTo(x1 - cellSize * 0.15, cy + laneH * 0.42);
  ctx.stroke();

  const shimmer = 0.08 + Math.sin(time * 1.35) * 0.05;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = `rgba(210,170,110,${shimmer})`;
  ctx.fillRect(x0 + cellSize * 0.4, cy - laneH * 0.18, laneW - cellSize * 0.8, laneH * 0.36);

  const rutPulse = 0.10 + Math.sin(time * 0.9 + spawn.col * 0.2) * 0.04;
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = `rgba(70,48,24,${rutPulse})`;
  ctx.fillRect(x0 + cellSize * 0.8, cy - cellSize * 0.14, laneW - cellSize * 1.6, cellSize * 0.28);
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
export function drawAnimatedSpawnFenMist(ctx, spawn, cellSize, time = 0, { drama = false, px: overrideX, py: overrideY } = {}) {
  if (!spawn && overrideX == null) return;
  const cx = overrideX ?? (spawn.col * cellSize + cellSize / 2);
  const cy = overrideY ?? (spawn.row * cellSize + cellSize / 2);
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
export function drawCampaignPalisadeRing(ctx, goal, ringR, cellSize, time = 0, {
  wallworksLevel = 0,
  wallData = null,
  mode = 'prep',
} = {}) {
  if (!goal) return;
  const gx = goal.col * cellSize + cellSize / 2;
  const gy = goal.row * cellSize + cellSize / 2;
  const outer = ringR * cellSize + cellSize * 0.42;
  const inner = outer - cellSize * 0.55;
  const isAssault = mode === 'assault';
  // The fortress always has all 4 cardinal gates — palisade ring opens at every one,
  // in both prep and assault, matching the 4 gate structures drawFortressLayout renders.
  const gateAngles = [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2];
  const gateSpread = 0.48;
  const useTiles = isPalisadeTileReady();
  const damageRatio = wallRingDamageRatio(wallData);

  ctx.save();

  // Courtyard ground — more opaque in assault so terrain doesn't bleed through
  ctx.fillStyle = isAssault ? 'rgba(28,18,8,0.72)' : 'rgba(34,24,12,0.42)';
  ctx.beginPath();
  ctx.ellipse(gx, gy + cellSize * 0.08, inner * 0.92, inner * 0.82, 0, 0, Math.PI * 2);
  ctx.fill();

  // Wall band shadow
  ctx.fillStyle = isAssault ? 'rgba(14,8,2,0.68)' : 'rgba(18,10,4,0.38)';
  ctx.beginPath();
  ctx.ellipse(gx, gy + cellSize * 0.08, outer + cellSize * 0.12, outer * 0.92 + cellSize * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();

  const stakeCount = Math.max(32, Math.round(ringR * 16));
  const tier = Math.min(3, Math.max(0, wallworksLevel));
  const woodA = ['#5c3a18', '#6a4820', '#7a7a72', '#8a8a82'][tier];
  const woodB = ['#3a2410', '#4a3018', '#5a5a54', '#6a6a64'][tier];
  const flicker = 0.55 + Math.sin(time * 8.2) * 0.32;
  const tileVariant = tier >= 2 && ready('palisadeStone') ? 'stone' : 'segment';
  const stakeW = isAssault ? cellSize * 0.30 : cellSize * 0.22;

  for (let i = 0; i < stakeCount; i++) {
    const a = (i / stakeCount) * Math.PI * 2;
    const inGap = gateAngles.some(ga => {
      let da = a - ga;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      return Math.abs(da) < gateSpread;
    });
    if (inGap) continue;

    const sx = gx + Math.cos(a) * outer;
    const sy = gy + Math.sin(a) * outer * 0.9 + cellSize * 0.08;
    const h = cellSize * (0.88 + (i % 3) * 0.10);
    const damaged = damageRatio > 0.28 && (i % 4 === 0 || damageRatio > 0.55);

    if (useTiles) {
      const ts = cellSize * 0.30;
      const variant = damaged && ready('palisadeDamaged') ? 'damaged' : tileVariant;
      drawPalisadeTile(ctx, sx - ts / 2, sy - h, ts, variant);
      continue;
    }

    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(a + Math.PI / 2 + Math.sin(a * 2 + time * 0.15) * 0.06);
    ctx.fillStyle = damaged ? '#4a3020' : (i % 2 ? woodA : woodB);
    ctx.fillRect(-stakeW / 2, -h, stakeW, h);
    ctx.fillStyle = 'rgba(255,200,120,0.28)';
    ctx.fillRect(-stakeW * 0.35, -h * 0.88, stakeW * 0.28, h * 0.72);
    ctx.restore();
  }

  ctx.strokeStyle = tier >= 2 ? 'rgba(100,100,108,0.72)' : 'rgba(30,18,8,0.68)';
  ctx.lineWidth = cellSize * (tier >= 2 ? 0.22 : 0.16);
  ctx.beginPath();
  ctx.ellipse(gx, gy + cellSize * 0.08, outer, outer * 0.9, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = tier >= 2 ? 'rgba(140,140,150,0.55)' : 'rgba(90,62,32,0.52)';
  ctx.lineWidth = cellSize * 0.09;
  ctx.beginPath();
  ctx.ellipse(gx, gy + cellSize * 0.08, inner, inner * 0.9, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Torch glow at each gate opening
  for (const ga of gateAngles) {
    const gateX = gx + Math.cos(ga) * outer * 0.92;
    const gateY = gy + Math.sin(ga) * outer * 0.82 + cellSize * 0.08;
    const gateGlow = `rgba(255,190,90,${0.22 + flicker * 0.18})`;
    const gatePool = ctx.createRadialGradient(gateX, gateY, 0, gateX, gateY, cellSize * 1.2);
    gatePool.addColorStop(0, gateGlow);
    gatePool.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gatePool;
    ctx.beginPath();
    ctx.arc(gateX, gateY, cellSize * 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/** Wide playfield atmosphere — 3-layer parallax fen backdrop in letterbox margins. */
export function drawCampaignAssaultPlayfieldBackdrop(ctx, x, y, w, h, time = 0, { scrollAssault = false } = {}) {
  if (scrollAssault) {
    const mistPulse = 0.62 + Math.sin(time * 0.65) * 0.22;
    const vg = ctx.createRadialGradient(x + w / 2, y + h * 0.42, w * 0.06, x + w / 2, y + h * 0.42, w * 0.72);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, `rgba(0,0,0,${0.18 + mistPulse * 0.06})`);
    ctx.fillStyle = vg;
    ctx.fillRect(x, y, w, h);
    return;
  }

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
