import { ctx, canvas } from './renderer.js';
import { Grid, CELL } from '../grid/grid.js';
import { Enemy, ENEMY_TYPES, ENEMY_DEFS } from '../entities/enemy.js';
import { Tower, TOWER_DEFS, TOWER_TYPES } from '../entities/tower.js';
import { SPRITES } from '../assets.js';

const COLS = 36;
const ROWS = 22;
const CELL_SIZE = 14;

const SIDEBAR_W     = 0;
const RIGHT_PANEL_W = 188;
const GRID_LEFT     = SIDEBAR_W;
const GRID_TOP      = 48;
const GRID_BOTTOM   = GRID_TOP + ROWS * CELL_SIZE;

const SPAWN = { col: 0,        row: 11 };
const GOAL  = { col: COLS - 1, row: 11 };

const WALL_COST = 5;

const BUILD_BTN = { x: SIDEBAR_W + 8, w: 110, h: 76, gap: 6 };

// Natural game dimensions at CELL_SIZE=14 — used to derive the scale factor
const BASE_W = SIDEBAR_W + COLS * CELL_SIZE + RIGHT_PANEL_W; // 940
const BASE_H = GRID_TOP  + ROWS * CELL_SIZE + BUILD_BTN.h + 56; // 580

let gameScale = 1;

const BUILD_ITEMS = [
  { id: 'wall', label: 'Shield Wall', key: '1', color: '#6644aa', cost: WALL_COST, mode: CELL.WALL },
  ...Object.values(TOWER_TYPES).map(type => ({
    id:    type,
    label: TOWER_DEFS[type].label,
    key:   TOWER_DEFS[type].key,
    color: TOWER_DEFS[type].color,
    cost:  TOWER_DEFS[type].cost,
    mode:  CELL.TOWER
  }))
];

const STARTING_GOLD  = 85;
const STARTING_LIVES = 15;

const grid = new Grid(COLS, ROWS, CELL_SIZE);
grid.setCell(SPAWN.col, SPAWN.row, CELL.SPAWN);
grid.setCell(GOAL.col,  GOAL.row,  CELL.GOAL);

let currentPath = grid.findPath(SPAWN.col, SPAWN.row, GOAL.col, GOAL.row);
let enemies  = [];
let towers   = [];
let bullets  = [];
let gold     = STARTING_GOLD;
let lives    = STARTING_LIVES;
let slain    = 0;
let buildMode         = CELL.WALL;
let selectedTowerType = TOWER_TYPES.BERSERK;
let gameOver = false;

let selectedTower   = null;
let panelUpgradeBtn = null;
let panelSellBtn    = null;
let restartBtn      = null;
let toplistBtn      = null;
let nextWaveBtn     = null;
let activeSidebarTab = 'towers';
let gameSpeed  = 1;
let speedBtn   = null;
let _frameTick = 0;

let dragItem  = null;  // { id, label, color, cost, mode } while dragging from build bar
let dragX     = 0;
let dragY     = 0;

let goldCoins  = [];   // flying coin particles: { sx, sy, t, speed }
let hoardPulse = 0;    // frames of bounce animation when coin lands
// Gold hoard target = trelleborg center (GOAL cell, in screen space — never moves)
const hoardX   = GRID_LEFT + GOAL.col * CELL_SIZE + CELL_SIZE / 2;
const hoardY   = GRID_TOP  + GOAL.row * CELL_SIZE + CELL_SIZE / 2;

let bossWarnAlpha = 0; // 0-1 fade for boss warning banner
let portalFlash   = 0; // frames of red portal flash on Golem spawn

// ── high-score table ──────────────────────────────────────────────────────────

const HS_KEY    = 'northern-shield-hs';
const HS_MAX    = 8;

function loadHighScores() {
  try { return JSON.parse(localStorage.getItem(HS_KEY)) || []; } catch { return []; }
}

function saveHighScore(score) {
  const list = loadHighScores();
  list.push(score);
  list.sort((a, b) => b.waves - a.waves || b.slain - a.slain);
  const trimmed = list.slice(0, HS_MAX);
  localStorage.setItem(HS_KEY, JSON.stringify(trimmed));
  return trimmed;
}

let highScores    = loadHighScores();
let showTopList   = false;

// ── restart ───────────────────────────────────────────────────────────────────

function restartGame() {
  grid.cells = Array.from({ length: ROWS }, () => new Array(COLS).fill(CELL.EMPTY));
  grid.setCell(SPAWN.col, SPAWN.row, CELL.SPAWN);
  grid.setCell(GOAL.col,  GOAL.row,  CELL.GOAL);

  currentPath   = grid.findPath(SPAWN.col, SPAWN.row, GOAL.col, GOAL.row);
  enemies       = [];
  towers        = [];
  bullets       = [];
  particles     = [];
  gold          = STARTING_GOLD;
  lives         = STARTING_LIVES;
  slain         = 0;
  gameOver      = false;
  victory       = false;
  waveLeak      = false;
  selectedTower = null;
  screenShake   = 0;
  goldSpent     = 0;
  goldEarned    = 0;
  showTopList   = false;
  highScores    = loadHighScores();
  gameSpeed     = 1;
  _frameTick    = 0;
  goldCoins     = [];
  hoardPulse    = 0;
  bossWarnAlpha = 0;
  portalFlash   = 0;

  waveNumber    = 0;
  waveTotal     = 0;
  waveState     = 'countdown';
  waveTimer     = 0;
  spawnQueue    = [];
  spawnTimer    = 0;
  waveHpScale   = 1;
}

// ── wave system ───────────────────────────────────────────────────────────────

const COUNTDOWN_FRAMES  = 150;
const BREAK_FRAMES      = 250;
const SPAWN_FRAMES      = 30;
const EMP_RANGE         = 50;
const EMP_DISABLE_FRAMES = 150;
const MAX_WAVES          = 100;

let waveNumber  = 0;
let waveTotal   = 0;
let waveState   = 'countdown';  // 'countdown' | 'active' | 'break'
let waveTimer   = 0;
let spawnQueue  = [];
let spawnTimer  = 0;
let waveHpScale = 1;

let particles     = [];
let screenShake   = 0;
let goldSpent     = 0;
let goldEarned    = 0;

function spawnParticles(x, y, color, count = 10) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.6;
    const speed = 1.2 + Math.random() * 2.8;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 0.5,
      life: 1,
      decay: 0.022 + Math.random() * 0.018,
      radius: 1.5 + Math.random() * 2.5,
      color
    });
  }
}

function spawnGoldCoins(screenX, screenY, reward) {
  const n = reward >= 20 ? 3 : reward >= 8 ? 2 : 1;
  for (let i = 0; i < n; i++) {
    goldCoins.push({
      sx:    screenX + (Math.random() - 0.5) * 10,
      sy:    screenY + (Math.random() - 0.5) * 10,
      t:     0,
      speed: 0.028 + Math.random() * 0.018,
    });
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x  += p.vx;
    p.y  += p.vy;
    p.vy += 0.06;
    p.vx *= 0.95;
    p.vy *= 0.95;
    p.life -= p.decay;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function drawParticles() {
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle   = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur  = 5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius * p.life, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  ctx.globalAlpha = 1;
}

function drawGoldCoins() {
  for (const c of goldCoins) {
    const t  = c.t;
    // quadratic bezier: start → control point (arc apex) → hoard
    const mx = (c.sx + hoardX) / 2;
    const my = Math.min(c.sy, hoardY) - 72;
    const bx = (1-t)*(1-t)*c.sx + 2*(1-t)*t*mx + t*t*hoardX;
    const by = (1-t)*(1-t)*c.sy + 2*(1-t)*t*my + t*t*hoardY;
    const r  = Math.max(4.5 - t * 2, 1.2);
    ctx.save();
    ctx.globalAlpha = t > 0.82 ? (1 - t) / 0.18 : 1;
    ctx.beginPath();
    ctx.arc(bx, by, r, 0, Math.PI * 2);
    ctx.fillStyle   = '#f5d030';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,240,100,0.6)';
    ctx.lineWidth   = 0.7;
    ctx.stroke();
    ctx.restore();
  }
}

function waveComposition(num) {
  // Phase scaling: harder as waves progress
  const n = Math.min(num, MAX_WAVES);
  const speedBonus = n > 50 ? (n - 50) * 0.005 : 0;  // stored for use in spawnEnemy
  return {
    draugr:     Math.min(8  + Math.floor(n * 2.2), 40),
    mylings:    n >= 2  ? Math.min(Math.floor(n * 1.1),  16) : 0,
    jotunn:     n >= 3  ? Math.min(Math.floor((n - 2) * 0.85), n >= 51 ? 8 : 6) : 0,
    maras:      n >= 2  ? Math.min(Math.floor((n - 1) * 0.6),  8) : 0,
    speedBonus,
  };
}

function buildWave(num) {
  const { draugr, mylings, jotunn, maras } = waveComposition(num);

  const queue = [
    ...Array(draugr).fill(ENEMY_TYPES.DRAUGR),
    ...Array(mylings).fill(ENEMY_TYPES.MYLING),
    ...Array(jotunn).fill(ENEMY_TYPES.JOTUNN),
    ...Array(maras).fill(ENEMY_TYPES.MARA),
  ];

  for (let i = queue.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [queue[i], queue[j]] = [queue[j], queue[i]];
  }

  return queue;
}

let victory   = false;
let waveLeak  = false;

function startNextWave() {
  waveNumber++;
  waveHpScale = 1 + (waveNumber - 1) * 0.16;
  spawnQueue  = buildWave(waveNumber);
  waveTotal   = spawnQueue.length;
  spawnTimer  = 0;
  waveState   = 'active';
}

function updateWave() {
  if (gameOver) return;

  if (portalFlash > 0) portalFlash--;

  if (waveState === 'countdown' || waveState === 'break') {
    const nextHasBoss = waveComposition(waveNumber + 1).jotunn > 0;
    bossWarnAlpha = nextHasBoss
      ? Math.min(1, bossWarnAlpha + 0.025)
      : Math.max(0, bossWarnAlpha - 0.04);
  } else {
    bossWarnAlpha = Math.max(0, bossWarnAlpha - 0.04);
  }

  if (waveState === 'countdown') {
    waveTimer++;
    if (waveTimer >= COUNTDOWN_FRAMES) { waveTimer = 0; startNextWave(); }
    return;
  }

  if (waveState === 'break') {
    waveTimer++;
    if (waveTimer >= BREAK_FRAMES) { waveTimer = 0; startNextWave(); }
    return;
  }

  // active — spawn from queue
  if (spawnQueue.length > 0) {
    spawnTimer++;
    if (spawnTimer >= SPAWN_FRAMES) {
      spawnTimer = 0;
      spawnEnemy(spawnQueue.shift(), waveHpScale);
    }
  } else if (enemies.length === 0) {
    if (waveNumber >= MAX_WAVES) {
      victory  = true;
      gameOver = true;
      highScores = saveHighScore({ waves: waveNumber, slain, goldEarned, cleared: true, date: new Date().toLocaleDateString('en-GB') });
    } else {
      // Wave-clear bonus
      const clearBonus = 10 + (waveLeak ? 0 : 5);
      gold       += clearBonus;
      goldEarned += clearBonus;
      hoardPulse  = 14;
      // Hoard interest (5% of gold, max 50g)
      const interest = Math.min(Math.floor(gold * 0.05), 50);
      if (interest > 0) {
        gold       += interest;
        goldEarned += interest;
      }
      waveLeak  = false;
      waveTimer = 0;
      waveState = 'break';
    }
  }
}

// ── starfield ─────────────────────────────────────────────────────────────────

const STARS = Array.from({ length: 120 }, () => ({
  x:     Math.random(),
  y:     Math.random(),
  r:     0.5 + Math.random() * 1.2,
  phase: Math.random() * Math.PI * 2
}));

// ── terrain canvas — static grass, generated once at startup ─────────────────

let terrainCanvas    = null;
let terrainUsesSprite = false;  // true once ground sprite has been baked in

function initTerrain() {
  terrainCanvas = document.createElement('canvas');
  terrainCanvas.width  = COLS * CELL_SIZE;
  terrainCanvas.height = ROWS * CELL_SIZE;
  const tc = terrainCanvas.getContext('2d');
  const cs = CELL_SIZE;
  const W  = COLS * cs;
  const H  = ROWS * cs;

  // Deterministic sequential RNG — consistent look every restart
  let _s = 0x9e3779b9;
  const rng = () => {
    _s ^= _s << 13; _s ^= _s >>> 7; _s ^= _s << 17;
    return (_s >>> 0) / 0xffffffff;
  };

  // ── Base layer ────────────────────────────────────────────────────────────
  const groundSp = SPRITES['ground'];
  if (groundSp && groundSp.img.complete && groundSp.img.naturalWidth > 0) {
    terrainUsesSprite = true;
    const tileSize = cs * 7;
    const tileCanvas = document.createElement('canvas');
    tileCanvas.width = tileCanvas.height = tileSize;
    const tileCtx = tileCanvas.getContext('2d');
    tileCtx.drawImage(groundSp.img, 0, 0, groundSp.frameW, groundSp.frameH,
      0, 0, tileSize, tileSize);
    // Darken midtones so the palette reads as cold Nordic ground
    tileCtx.fillStyle = 'rgba(0,0,0,0.48)';
    tileCtx.fillRect(0, 0, tileSize, tileSize);
    const pattern = tc.createPattern(tileCanvas, 'repeat');
    tc.fillStyle = pattern;
    tc.fillRect(0, 0, W, H);
  } else {
    // ── Procedural fallback ───────────────────────────────────────────────
    terrainUsesSprite = false;

    // Dark tundra base
    tc.fillStyle = '#0e1407';
    tc.fillRect(0, 0, W, H);

    // Large coherent colour patches (not per-cell noise)
    for (let i = 0; i < 45; i++) {
      const px = rng() * W, py = rng() * H;
      const rx = cs * 2 + rng() * cs * 5;
      const ry = rx * (0.4 + rng() * 0.55);
      const g  = Math.floor(18 + rng() * 10);
      tc.fillStyle = `rgba(8,${g},4,${0.22 + rng() * 0.22})`;
      tc.beginPath();
      tc.ellipse(px, py, rx, ry, rng() * Math.PI, 0, Math.PI * 2);
      tc.fill();
    }
    // Soil patches
    for (let i = 0; i < 22; i++) {
      const px = rng() * W, py = rng() * H;
      const rx = cs + rng() * cs * 3;
      tc.fillStyle = `rgba(20,10,3,${0.28 + rng() * 0.28})`;
      tc.beginPath();
      tc.ellipse(px, py, rx, rx * (0.4 + rng() * 0.55), rng() * Math.PI, 0, Math.PI * 2);
      tc.fill();
    }
    // Sparse grass — in clusters, not per-cell
    for (let ci = 0; ci < 32; ci++) {
      const gcx = rng() * W, gcy = rng() * H;
      const count = 3 + Math.floor(rng() * 6);
      const gr = Math.floor(52 + rng() * 28);
      tc.strokeStyle = `rgb(12,${gr},7)`;
      tc.lineWidth = 0.65;
      for (let b = 0; b < count; b++) {
        const bx = gcx + (rng() - 0.5) * cs * 1.6;
        const by = gcy + (rng() - 0.5) * cs;
        tc.beginPath();
        tc.moveTo(bx, by);
        tc.lineTo(bx + (rng() - 0.5) * 3.5, by - 2 - rng() * 2.5);
        tc.stroke();
      }
    }
  }

  // ── Frost patches ─────────────────────────────────────────────────────────
  for (let i = 0, n = 10 + Math.floor(rng() * 8); i < n; i++) {
    const px = rng() * W, py = rng() * H;
    const rx = cs * 1.2 + rng() * cs * 4.5;
    const ry = rx * (0.28 + rng() * 0.45);
    const a  = rng() * Math.PI;
    const fg = tc.createRadialGradient(px, py, 0, px, py, rx);
    fg.addColorStop(0,   `rgba(200,225,255,${0.13 + rng() * 0.09})`);
    fg.addColorStop(0.55,`rgba(185,215,255,${0.05 + rng() * 0.04})`);
    fg.addColorStop(1,   'rgba(170,205,250,0)');
    tc.fillStyle = fg;
    tc.beginPath(); tc.ellipse(px, py, rx, ry, a, 0, Math.PI * 2); tc.fill();
    // Crystal arms at the edge
    tc.strokeStyle = `rgba(195,218,255,${0.30 + rng() * 0.22})`;
    tc.lineWidth   = 0.45;
    const nc = 4 + Math.floor(rng() * 5);
    for (let c = 0; c < nc; c++) {
      const ca  = rng() * Math.PI * 2;
      const cr  = rx * (0.45 + rng() * 0.4);
      const ccx = px + Math.cos(ca) * cr;
      const ccy = py + Math.sin(ca) * cr * (ry / rx);
      const cl  = 1 + rng() * 2;
      for (let arm = 0; arm < 3; arm++) {
        const aa = ca + arm * Math.PI / 3;
        tc.beginPath();
        tc.moveTo(ccx, ccy);
        tc.lineTo(ccx + Math.cos(aa) * cl, ccy + Math.sin(aa) * cl);
        tc.stroke();
      }
    }
  }

  // ── Stones ────────────────────────────────────────────────────────────────
  for (let i = 0, n = 28 + Math.floor(rng() * 22); i < n; i++) {
    const sx = rng() * W, sy = rng() * H;
    const sr = 0.7 + rng() * 2.4;
    const fl = 0.45 + rng() * 0.5;
    const sa = rng() * Math.PI;
    tc.fillStyle = 'rgba(0,0,0,0.38)';
    tc.beginPath(); tc.ellipse(sx + sr * 0.28, sy + sr * 0.18, sr, sr * fl * 0.75, sa, 0, Math.PI * 2); tc.fill();
    const sg = Math.floor(52 + rng() * 42);
    tc.fillStyle = `rgb(${sg},${sg - 3},${sg + 5})`;
    tc.beginPath(); tc.ellipse(sx, sy, sr, sr * fl, sa, 0, Math.PI * 2); tc.fill();
    tc.fillStyle = `rgba(${sg + 58},${sg + 54},${sg + 48},0.55)`;
    tc.beginPath(); tc.ellipse(sx - sr * 0.2, sy - sr * fl * 0.25, sr * 0.38, sr * fl * 0.26, sa, 0, Math.PI * 2); tc.fill();
  }

  // ── Dead roots ────────────────────────────────────────────────────────────
  tc.lineCap = 'round';
  for (let i = 0, n = 7 + Math.floor(rng() * 6); i < n; i++) {
    const rx = rng() * W, ry = rng() * H;
    const br = Math.floor(28 + rng() * 14);
    const baseAlpha = 0.50 + rng() * 0.32;
    const branches  = 2 + Math.floor(rng() * 4);
    for (let b = 0; b < branches; b++) {
      const ba  = rng() * Math.PI * 2;
      const len = cs * 0.9 + rng() * cs * 2.8;
      const cpx = rx + Math.cos(ba + (rng() - 0.5) * 0.9) * len * 0.42;
      const cpy = ry + Math.sin(ba + (rng() - 0.5) * 0.9) * len * 0.42;
      const ex  = rx + Math.cos(ba) * len;
      const ey  = ry + Math.sin(ba) * len;
      tc.strokeStyle = `rgba(${br},${Math.floor(br * 0.55)},${Math.floor(br * 0.22)},${baseAlpha})`;
      tc.lineWidth   = 0.55 + rng() * 0.6;
      tc.beginPath(); tc.moveTo(rx, ry); tc.quadraticCurveTo(cpx, cpy, ex, ey); tc.stroke();
      if (rng() < 0.55) {
        const mx = (rx + ex) / 2, my = (ry + ey) / 2;
        const sl = len * (0.28 + rng() * 0.28);
        const sa = ba + (rng() - 0.5) * 1.3;
        tc.lineWidth *= 0.6;
        tc.beginPath(); tc.moveTo(mx, my); tc.lineTo(mx + Math.cos(sa) * sl, my + Math.sin(sa) * sl); tc.stroke();
        tc.lineWidth /= 0.6;
      }
    }
  }
  tc.lineCap = 'butt';

  // ── Small runestones ──────────────────────────────────────────────────────
  for (let i = 0, n = 3 + Math.floor(rng() * 4); i < n; i++) {
    const rstx = cs * 0.6 + rng() * (W - cs * 1.2);
    const rsty = cs * 0.6 + rng() * (H - cs * 1.2);
    const rw   = Math.max(2, Math.round(cs * 0.26));
    const rh   = Math.max(3, Math.round(cs * 0.46));
    const lean = (rng() - 0.5) * 0.1;
    const sg   = Math.floor(58 + rng() * 30);
    tc.save();
    tc.translate(rstx, rsty);
    tc.rotate(lean);
    tc.fillStyle = 'rgba(0,0,0,0.42)';
    tc.fillRect(-rw / 2 + 1, -rh / 2 + 1, rw, rh);
    tc.fillStyle = `rgb(${sg},${sg - 2},${sg + 6})`;
    tc.fillRect(-rw / 2, -rh / 2, rw, rh);
    tc.fillStyle = `rgba(${sg + 48},${sg + 46},${sg + 55},0.52)`;
    tc.fillRect(-rw / 2, -rh / 2, rw, 1);
    // Carved rune
    tc.strokeStyle = 'rgba(18,12,6,0.62)';
    tc.lineWidth   = 0.45;
    tc.beginPath();
    tc.moveTo(0, -rh * 0.3); tc.lineTo(0, rh * 0.3);          // vertical
    tc.moveTo(-rw * 0.3, -rh * 0.05); tc.lineTo(rw * 0.3, -rh * 0.05); // crossarm
    tc.moveTo(-rw * 0.28, -rh * 0.22); tc.lineTo(rw * 0.28, rh * 0.12); // diagonal
    tc.stroke();
    tc.restore();
  }

  // ── Vignette — darken edges, slight warm centre ───────────────────────────
  const vig = tc.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.22, W / 2, H / 2, Math.max(W, H) * 0.82);
  vig.addColorStop(0,   'rgba(0,0,0,0)');
  vig.addColorStop(0.65,'rgba(0,0,0,0.22)');
  vig.addColorStop(1,   'rgba(0,0,0,0.72)');
  tc.fillStyle = vig;
  tc.fillRect(0, 0, W, H);

  const glow = tc.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.min(W, H) * 0.48);
  glow.addColorStop(0, 'rgba(255,200,120,0.03)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  tc.fillStyle = glow;
  tc.fillRect(0, 0, W, H);
}

// ── helpers ───────────────────────────────────────────────────────────────────

function getViewSize() {
  return {
    width:  (canvas.clientWidth  || window.innerWidth)  / gameScale,
    height: (canvas.clientHeight || window.innerHeight) / gameScale,
  };
}

function computeScale() {
  gameScale = Math.min(
    (window.innerWidth)  / BASE_W,
    (window.innerHeight) / BASE_H
  );
}

function drawRoundedPath(x, y, w, h, r = 8) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// Draws a fantasy panel: dark fill + gold border + inner line + corner gem diamonds.
// fillStyle / borderAlpha let callers control selected vs idle appearance.
function drawFantasyPanel(x, y, w, h, fillStyle, borderAlpha = 0.7, radius = 8) {
  // drop shadow
  ctx.save();
  ctx.shadowColor   = 'rgba(0,0,0,0.85)';
  ctx.shadowBlur    = 18;
  ctx.shadowOffsetY = 4;
  drawRoundedPath(x, y, w, h, radius);
  ctx.fillStyle = fillStyle;
  ctx.fill();
  ctx.restore();

  // warm brown outer border (CoC style)
  drawRoundedPath(x, y, w, h, radius);
  ctx.strokeStyle = `rgba(180,110,30,${borderAlpha})`;
  ctx.lineWidth   = 2;
  ctx.stroke();

  // highlight line (top edge — lit from above)
  drawRoundedPath(x + 2, y + 2, w - 4, h - 4, Math.max(radius - 2, 2));
  ctx.strokeStyle = `rgba(255,200,80,${borderAlpha * 0.28})`;
  ctx.lineWidth   = 0.5;
  ctx.stroke();

  // corner rivets
  const gs = 3.5;
  for (const [cx, cy] of [[x + 5, y + 5], [x + w - 5, y + 5], [x + 5, y + h - 5], [x + w - 5, y + h - 5]]) {
    ctx.fillStyle = `rgba(220,160,40,${borderAlpha * 0.9})`;
    ctx.beginPath();
    ctx.arc(cx, cy, gs / 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── build buttons ─────────────────────────────────────────────────────────────

function getBuildButtons() {
  const nBtn   = BUILD_ITEMS.length;
  const panelX = SIDEBAR_W + 2;
  const panelW = COLS * CELL_SIZE - 4;   // grid width only, not full BASE_W
  const padX   = 8;
  const gap    = 5;
  const cardW  = Math.floor((panelW - 2 * padX - (nBtn - 1) * gap) / nBtn);
  const btnY   = GRID_BOTTOM + 9;
  return BUILD_ITEMS.map((item, i) => ({
    ...item,
    x:      panelX + padX + i * (cardW + gap),
    y:      btnY,
    width:  cardW,
    height: BUILD_BTN.h
  }));
}

function getBuildButtonAt(mx, my) {
  for (const btn of getBuildButtons()) {
    if (mx >= btn.x && mx <= btn.x + btn.width &&
        my >= btn.y && my <= btn.y + btn.height) return btn;
  }
  return null;
}

// ── spawning ──────────────────────────────────────────────────────────────────

function spawnEnemy(type = ENEMY_TYPES.DRAUGR, hpScale = 1) {
  if (!currentPath || gameOver) return;

  let path;
  if (ENEMY_DEFS[type].flying) {
    path = [grid.cellCenter(SPAWN.col, SPAWN.row), grid.cellCenter(GOAL.col, GOAL.row)];
  } else {
    path = currentPath.map(({ col, row }) => grid.cellCenter(col, row));
  }

  if (type === ENEMY_TYPES.JOTUNN) {
    screenShake = Math.max(screenShake, 9);
    portalFlash = 22;
  }
  enemies.push(new Enemy(path, type, hpScale));
}

// ── rerouting ─────────────────────────────────────────────────────────────────

function rerouteActiveEnemies() {
  for (const enemy of enemies) {
    if (!enemy.alive || enemy.reached || enemy.flying) continue;

    const { col, row } = grid.pixelToCell(enemy.x, enemy.y);
    const enemyPath = grid.findPath(col, row, GOAL.col, GOAL.row);
    if (!enemyPath || enemyPath.length < 2) continue;

    enemy.setPath(enemyPath.map(({ col: c, row: r }) => grid.cellCenter(c, r)));
  }
}

function hasEnemyInCell(col, row) {
  const half = CELL_SIZE / 2;
  const { x, y } = grid.cellCenter(col, row);
  return enemies.some(e => {
    if (!e.alive || e.reached) return false;
    return Math.abs(e.x - x) < half && Math.abs(e.y - y) < half;
  });
}

function tryPlaceAt(col, row, mode, towerType) {
  const cell = grid.getCell(col, row);
  if (cell === null || cell === CELL.SPAWN || cell === CELL.GOAL) return false;
  if (cell !== CELL.EMPTY) return false;
  if (hasEnemyInCell(col, row)) return false;

  const cost = mode === CELL.WALL ? WALL_COST : TOWER_DEFS[towerType].cost;
  if (gold < cost) return false;

  grid.setCell(col, row, mode);
  const newPath = grid.findPath(SPAWN.col, SPAWN.row, GOAL.col, GOAL.row);
  if (!newPath) { grid.setCell(col, row, CELL.EMPTY); return false; }

  currentPath = newPath;
  rerouteActiveEnemies();
  goldSpent += cost;
  gold      -= cost;

  if (mode === CELL.TOWER) {
    const { x, y } = grid.cellCenter(col, row);
    towers.push(new Tower(x, y, col, row, towerType));
  }
  return true;
}

// ── input ─────────────────────────────────────────────────────────────────────

canvas.addEventListener('contextmenu', e => e.preventDefault());

window.addEventListener('keydown', e => {
  const key = e.key.toLowerCase();
  for (const item of BUILD_ITEMS) {
    if (key === item.key.toLowerCase()) {
      buildMode = item.mode;
      if (item.mode === CELL.TOWER) selectedTowerType = item.id;
      break;
    }
  }
});

canvas.addEventListener('mousedown', e => {
  const rect   = canvas.getBoundingClientRect();
  const mouseX = (e.clientX - rect.left) / gameScale;
  const mouseY = (e.clientY - rect.top)  / gameScale;

  // Game over: only overlay buttons are interactive
  if (gameOver) {
    if (e.button === 0) {
      if (restartBtn &&
          mouseX >= restartBtn.x && mouseX <= restartBtn.x + restartBtn.w &&
          mouseY >= restartBtn.y && mouseY <= restartBtn.y + restartBtn.h) {
        if (restartBtn.action === 'back') { showTopList = false; }
        else                             { restartGame(); }
      }
      if (!showTopList && toplistBtn &&
          mouseX >= toplistBtn.x && mouseX <= toplistBtn.x + toplistBtn.w &&
          mouseY >= toplistBtn.y && mouseY <= toplistBtn.y + toplistBtn.h) {
        showTopList = true;
      }
    }
    return;
  }

  // Build-mode button row — left-click starts a drag
  if (e.button === 0) {
    const btn = getBuildButtonAt(mouseX, mouseY);
    if (btn) {
      buildMode = btn.mode;
      if (btn.mode === CELL.TOWER) selectedTowerType = btn.id;
      selectedTower = null;
      dragItem = btn;
      dragX    = mouseX;
      dragY    = mouseY;
      return;
    }
  }

  // Tower panel buttons (when a tower is selected)
  if (e.button === 0 && selectedTower) {
    if (panelUpgradeBtn &&
        mouseX >= panelUpgradeBtn.x && mouseX <= panelUpgradeBtn.x + panelUpgradeBtn.w &&
        mouseY >= panelUpgradeBtn.y && mouseY <= panelUpgradeBtn.y + panelUpgradeBtn.h) {
      if (!selectedTower.maxed && gold >= selectedTower.upgradeCost) {
        goldSpent += selectedTower.upgradeCost;
        gold      -= selectedTower.upgradeCost;
        selectedTower.upgrade();
      }
      return;
    }
    if (panelSellBtn &&
        mouseX >= panelSellBtn.x && mouseX <= panelSellBtn.x + panelSellBtn.w &&
        mouseY >= panelSellBtn.y && mouseY <= panelSellBtn.y + panelSellBtn.h) {
      gold += selectedTower.sellValue;
      grid.setCell(selectedTower.col, selectedTower.row, CELL.EMPTY);
      towers      = towers.filter(t => t !== selectedTower);
      currentPath = grid.findPath(SPAWN.col, SPAWN.row, GOAL.col, GOAL.row) ?? currentPath;
      rerouteActiveEnemies();
      selectedTower = null;
      return;
    }
  }

  // Speed toggle button
  if (e.button === 0 && speedBtn) {
    if (mouseX >= speedBtn.x && mouseX <= speedBtn.x + speedBtn.w &&
        mouseY >= speedBtn.y && mouseY <= speedBtn.y + speedBtn.h) {
      gameSpeed = gameSpeed >= 2 ? 1 : 2;
      return;
    }
  }

  // Next-wave button (right panel)
  if (e.button === 0 && nextWaveBtn && !gameOver) {
    if (mouseX >= nextWaveBtn.x && mouseX <= nextWaveBtn.x + nextWaveBtn.w &&
        mouseY >= nextWaveBtn.y && mouseY <= nextWaveBtn.y + nextWaveBtn.h) {
      if (waveState === 'countdown' || waveState === 'break') startNextWave();
      return;
    }
  }

  const { col, row } = grid.pixelToCell(mouseX - GRID_LEFT, mouseY - GRID_TOP);
  const cell = grid.getCell(col, row);

  if (cell === null || cell === CELL.SPAWN || cell === CELL.GOAL) {
    selectedTower = null;
    return;
  }

  // Right-click: remove wall or tower instantly
  if (e.button === 2) {
    if (cell === CELL.WALL || cell === CELL.TOWER) {
      if (selectedTower && selectedTower.col === col && selectedTower.row === row) {
        selectedTower = null;
      }
      grid.setCell(col, row, CELL.EMPTY);
      towers      = towers.filter(t => t.col !== col || t.row !== row);
      currentPath = grid.findPath(SPAWN.col, SPAWN.row, GOAL.col, GOAL.row) ?? currentPath;
      rerouteActiveEnemies();
    }
    return;
  }

  if (e.button !== 0) return;

  // Left-click on placed tower: select it
  if (cell === CELL.TOWER) {
    selectedTower = towers.find(t => t.col === col && t.row === row) ?? null;
    return;
  }

  // Left-click elsewhere: deselect then try to place
  selectedTower = null;
  tryPlaceAt(col, row, buildMode, selectedTowerType);
});

canvas.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  dragX = (e.clientX - rect.left) / gameScale;
  dragY = (e.clientY - rect.top)  / gameScale;
});

canvas.addEventListener('mouseup', e => {
  if (!dragItem || gameOver) { dragItem = null; return; }
  const rect   = canvas.getBoundingClientRect();
  const mouseX = (e.clientX - rect.left) / gameScale;
  const mouseY = (e.clientY - rect.top)  / gameScale;
  const { col, row } = grid.pixelToCell(mouseX - GRID_LEFT, mouseY - GRID_TOP);
  tryPlaceAt(col, row, dragItem.mode, dragItem.id);
  dragItem = null;
});

// ── update ────────────────────────────────────────────────────────────────────

function update() {
  if (gameOver) return;

  updateWave();

  for (const tower of towers) tower.update(enemies, bullets);

  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    const reward = b.update();
    if (reward > 0) {
      slain++;
      gold        += reward;
      goldEarned  += reward;
      if (b.target) {
        spawnParticles(b.target.x, b.target.y, b.target.highlightColor ?? b.target.color, 12);
        spawnGoldCoins(GRID_LEFT + b.target.x, GRID_TOP + b.target.y, reward);
      }
    }
    if (!b.alive) {
      // Splash damage for missile bullets
      if (b.splashRadius > 0) {
        const ix = b.x, iy = b.y;
        spawnParticles(ix, iy, '#ff6622', 20);
        for (const enemy of enemies) {
          if (!enemy.alive || enemy.reached || enemy === b.target) continue;
          const dx = enemy.x - ix;
          const dy = enemy.y - iy;
          if (dx * dx + dy * dy <= b.splashRadius * b.splashRadius) {
            enemy.hp -= b.splashDamage;
            if (enemy.hp <= 0) {
              enemy.hp    = 0;
              enemy.alive = false;
              slain++;
              gold       += enemy.reward;
              goldEarned += enemy.reward;
              spawnParticles(enemy.x, enemy.y, enemy.highlightColor, 10);
              spawnGoldCoins(GRID_LEFT + enemy.x, GRID_TOP + enemy.y, enemy.reward);
            }
          }
        }
      }
      bullets.splice(i, 1);
    }
  }

  for (let i = enemies.length - 1; i >= 0; i--) {
    enemies[i].update();
    if (!enemies[i].alive) {
      enemies.splice(i, 1);
      continue;
    }
    if (enemies[i].reached) {
      lives--;
      waveLeak   = true;
      screenShake = 10;
      enemies.splice(i, 1);
      if (lives <= 0) {
        gameOver   = true;
        highScores = saveHighScore({ waves: waveNumber, slain, goldEarned, date: new Date().toLocaleDateString('en-GB') });
      }
    }
  }

  // Mara: supernatural fear disables nearby towers
  for (const enemy of enemies) {
    if (enemy.type !== ENEMY_TYPES.MARA || !enemy.alive || enemy.reached) continue;
    for (const tower of towers) {
      const dx = tower.x - enemy.x;
      const dy = tower.y - enemy.y;
      if (dx * dx + dy * dy <= EMP_RANGE * EMP_RANGE) {
        tower.disabledTimer = Math.max(tower.disabledTimer, EMP_DISABLE_FRAMES);
      }
    }
  }

  // Sköldborg: adjacent wall blocks slow passing enemies by 20%
  for (const enemy of enemies) {
    if (!enemy.alive || enemy.reached) continue;
    const { col, row } = grid.pixelToCell(enemy.x, enemy.y);
    const adj = [[col - 1, row], [col + 1, row], [col, row - 1], [col, row + 1]];
    for (const [ac, ar] of adj) {
      if (grid.getCell(ac, ar) === CELL.WALL) {
        enemy.slowTimer  = Math.max(enemy.slowTimer, 4);
        enemy.slowFactor = Math.min(enemy.slowFactor, 0.8);
        break;
      }
    }
  }

  updateParticles();

  for (let i = goldCoins.length - 1; i >= 0; i--) {
    goldCoins[i].t += goldCoins[i].speed;
    if (goldCoins[i].t >= 1) {
      goldCoins.splice(i, 1);
      hoardPulse = 10;
    }
  }
  if (hoardPulse > 0) hoardPulse--;

  if (screenShake > 0) screenShake *= 0.82;
}

// ── draw ──────────────────────────────────────────────────────────────────────

function drawBackground() {
  const { width, height } = getViewSize();
  const time = performance.now() * 0.0004;

  // Dark stone/earth — Nordic dungeon feel (matches concept art)
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0,   '#1a1008');
  grad.addColorStop(0.5, '#130c05');
  grad.addColorStop(1,   '#0d0803');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Subtle stone texture (irregular dark blotches)
  const starTime = performance.now() * 0.0002;
  for (const s of STARS) {
    const alpha = 0.045 + Math.sin(starTime + s.phase) * 0.02;
    ctx.fillStyle = `rgba(60,38,14,${Math.max(0, alpha)})`;
    ctx.beginPath();
    ctx.ellipse(s.x * width, s.y * height, s.r * 7, s.r * 3, s.phase, 0, Math.PI * 2);
    ctx.fill();
  }

  // Warm torch-light glow top-right (distant fire)
  const p1 = 0.12 + Math.sin(time * 3.2) * 0.04;
  const g1 = ctx.createRadialGradient(width * 0.88, height * 0.08, 8, width * 0.88, height * 0.08, 320);
  g1.addColorStop(0, `rgba(255,140,30,${p1})`);
  g1.addColorStop(1, 'rgba(255,100,10,0)');
  ctx.fillStyle = g1;
  ctx.fillRect(0, 0, width, height);

  // Faint left-side ambient (cool blue — moonlight)
  const g2 = ctx.createRadialGradient(width * 0.04, height * 0.5, 0, width * 0.04, height * 0.5, 260);
  g2.addColorStop(0, `rgba(40,60,120,0.09)`);
  g2.addColorStop(1, 'rgba(20,30,80,0)');
  ctx.fillStyle = g2;
  ctx.fillRect(0, 0, width, height);
}

function drawPath() {
  if (!currentPath || currentPath.length < 2) return;

  const t  = performance.now() * 0.001;
  const cs = CELL_SIZE;

  // Build world-space polyline with cumulative distances
  const pts = currentPath.map(({ col, row }) => grid.cellCenter(col, row));
  const segs = [];
  let totalLen = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const dx = pts[i + 1].x - pts[i].x;
    const dy = pts[i + 1].y - pts[i].y;
    const len = Math.sqrt(dx * dx + dy * dy);
    segs.push({ x0: pts[i].x, y0: pts[i].y, x1: pts[i + 1].x, y1: pts[i + 1].y, len, cum: totalLen });
    totalLen += len;
  }

  function posAt(d) {
    d = ((d % totalLen) + totalLen) % totalLen;
    for (const s of segs) {
      if (d < s.cum + s.len) {
        const f = (d - s.cum) / s.len;
        return { x: s.x0 + (s.x1 - s.x0) * f, y: s.y0 + (s.y1 - s.y0) * f };
      }
    }
    return pts[pts.length - 1];
  }

  ctx.save();

  // ── Stone road ────────────────────────────────────────────────────────────
  const mkPath = () => {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  };
  ctx.lineJoin = 'round';
  ctx.lineCap  = 'round';

  const pathSp = SPRITES['path'];
  if (pathSp && pathSp.img.complete && pathSp.img.naturalWidth > 0) {
    // Use path_tile.png as a stroked texture pattern
    const tileSize = cs * 4;
    const tileCvs  = document.createElement('canvas');
    tileCvs.width  = tileSize;
    tileCvs.height = tileSize;
    const tileCtx  = tileCvs.getContext('2d');
    tileCtx.drawImage(pathSp.img, 0, 0, pathSp.frameW, pathSp.frameH, 0, 0, tileSize, tileSize);
    const pat = ctx.createPattern(tileCvs, 'repeat');
    // Outer shadow
    mkPath(); ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = cs * 1.05; ctx.stroke();
    // Path sprite fill
    mkPath(); ctx.strokeStyle = pat;                 ctx.lineWidth = cs * 0.88; ctx.stroke();
    // Subtle dark edge to contain the sprite
    mkPath(); ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = cs * 0.92; ctx.globalCompositeOperation = 'multiply'; ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  } else {
    // Procedural fallback (no joint lines — continuous stone look)
    mkPath(); ctx.strokeStyle = 'rgba(0,0,0,0.62)';    ctx.lineWidth = cs * 1.00; ctx.stroke();
    mkPath(); ctx.strokeStyle = 'rgba(30,22,12,0.95)'; ctx.lineWidth = cs * 0.82; ctx.stroke();
    mkPath(); ctx.strokeStyle = 'rgba(54,42,26,0.90)'; ctx.lineWidth = cs * 0.64; ctx.stroke();
    mkPath(); ctx.strokeStyle = 'rgba(74,60,38,0.65)'; ctx.lineWidth = cs * 0.38; ctx.stroke();
  }
  // Faint embedded glow on road surface
  mkPath(); ctx.strokeStyle = 'rgba(100,160,255,0.07)'; ctx.lineWidth = cs * 0.30; ctx.stroke();

  // ── Will-o'-wisps — glowing orbs that travel along the path ──────────────
  const orbCount = 5;
  const speed    = totalLen / 4.2;

  for (let i = 0; i < orbCount; i++) {
    const phase  = i / orbCount;
    const d      = (t * speed + phase * totalLen) % totalLen;
    const pos    = posAt(d);
    const pulse  = 0.5 + Math.sin(t * 5.2 + i * 1.8) * 0.5;
    const wobble = Math.sin(t * 6.5 + i * 2.4) * 0.9;

    const wAngle = t * 1.8 + i * 1.05;
    const wx = pos.x + Math.cos(wAngle) * wobble;
    const wy = pos.y + Math.sin(wAngle) * wobble;

    const outerR = cs * (0.42 + pulse * 0.28);
    const grad = ctx.createRadialGradient(wx, wy, 0, wx, wy, outerR);
    grad.addColorStop(0,    `rgba(195,238,255,${0.48 + pulse * 0.28})`);
    grad.addColorStop(0.28, `rgba(110,205,255,${0.22 * pulse})`);
    grad.addColorStop(0.65, `rgba(70,150,255,${0.10 * pulse})`);
    grad.addColorStop(1,    'rgba(50,110,220,0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(wx, wy, outerR, 0, Math.PI * 2); ctx.fill();

    const innerR = cs * (0.16 + pulse * 0.12);
    const halo = ctx.createRadialGradient(wx, wy, 0, wx, wy, innerR);
    halo.addColorStop(0, `rgba(220,180,255,${0.35 + pulse * 0.25})`);
    halo.addColorStop(1, 'rgba(160,100,255,0)');
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(wx, wy, innerR, 0, Math.PI * 2); ctx.fill();

    ctx.shadowColor = 'rgba(200,240,255,0.98)';
    ctx.shadowBlur  = 9 + pulse * 6;
    ctx.fillStyle   = `rgba(235,250,255,${0.82 + pulse * 0.18})`;
    ctx.beginPath(); ctx.arc(wx, wy, 1.1 + pulse * 0.9, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur  = 0;

    if (pulse > 0.72) {
      const si = (pulse - 0.72) / 0.28;
      const sl = 2.8 * si;
      ctx.strokeStyle = `rgba(255,255,255,${si * 0.85})`;
      ctx.lineWidth   = 0.45;
      ctx.lineCap     = 'round';
      ctx.beginPath();
      ctx.moveTo(wx - sl, wy); ctx.lineTo(wx + sl, wy);
      ctx.moveTo(wx, wy - sl); ctx.lineTo(wx, wy + sl);
      ctx.stroke();
      ctx.lineCap = 'butt';
    }
  }

  ctx.restore();
}

function drawFrames() {
  const W = BASE_W, H = BASE_H;

  const thick = 32;

  ctx.save();

  // ── Solid border fills — always connected, never dashed ───────────────────
  ctx.fillStyle = '#12080200';  // start transparent
  const bands = [
    { c: '#100802', w: thick },
    { c: '#1c1006', w: thick - 4 },
    { c: '#241408', w: thick - 10 },
  ];
  // Fill border rectangles with darkening bands
  for (const { c, w } of bands) {
    ctx.fillStyle = c;
    ctx.fillRect(0, 0, W, w);              // top
    ctx.fillRect(0, H - w, W, w);          // bottom
    ctx.fillRect(0, w, w, H - w * 2);     // left (between corners)
    ctx.fillRect(W - w, w, w, H - w * 2); // right
  }

  // ── Outer hard edge ───────────────────────────────────────────────────────
  ctx.strokeStyle = 'rgba(4,2,0,0.95)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, W - 2, H - 2);

  // ── Outer thin gold accent ────────────────────────────────────────────────
  ctx.strokeStyle = 'rgba(160,100,18,0.55)';
  ctx.lineWidth = 1;
  ctx.strokeRect(4, 4, W - 8, H - 8);

  // ── Inner gold trim — the primary ornamental line ─────────────────────────
  ctx.shadowColor = 'rgba(220,148,28,0.80)';
  ctx.shadowBlur  = 10;
  ctx.strokeStyle = '#c8901a';
  ctx.lineWidth   = 2;
  ctx.strokeRect(thick - 1, thick - 1, W - 2 * thick + 2, H - 2 * thick + 2);
  ctx.shadowBlur  = 0;

  // Fine bright highlight just inside the gold trim
  ctx.strokeStyle = 'rgba(255,220,100,0.22)';
  ctx.lineWidth   = 0.8;
  ctx.strokeRect(thick + 1, thick + 1, W - 2 * thick - 2, H - 2 * thick - 2);

  // ── Corner ornament sprites ───────────────────────────────────────────────
  const spCorner = SPRITES['frameCorner'];
  if (spCorner && spCorner.img.complete && spCorner.img.naturalWidth > 0) {
    const cH = thick;
    const cW = Math.round(cH * spCorner.frameW / spCorner.frameH);
    const drawCorner = (flipH, flipV) => {
      ctx.save();
      ctx.translate(flipH ? W : 0, flipV ? H : 0);
      ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
      ctx.drawImage(spCorner.img, 0, 0, spCorner.frameW, spCorner.frameH, 0, 0, cW, cH);
      ctx.restore();
    };
    drawCorner(false, false);  // top-left
    drawCorner(true,  false);  // top-right
    drawCorner(false, true);   // bottom-left
    drawCorner(true,  true);   // bottom-right
  } else {
    // Procedural diamond corner gems
    for (const [cx, cy] of [
      [thick / 2, thick / 2], [W - thick / 2, thick / 2],
      [thick / 2, H - thick / 2], [W - thick / 2, H - thick / 2]
    ]) {
      ctx.shadowColor = 'rgba(220,150,30,0.8)';
      ctx.shadowBlur  = 8;
      ctx.fillStyle   = '#c8901a';
      ctx.beginPath();
      ctx.moveTo(cx, cy - 9); ctx.lineTo(cx + 6, cy);
      ctx.lineTo(cx, cy + 9); ctx.lineTo(cx - 6, cy);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  ctx.restore();
}

function drawRightPanel() {
  const px = GRID_LEFT + COLS * CELL_SIZE + 4;
  const pw = BASE_W - px - 36;  // 32px frame + 4px inner gap
  speedBtn = null;
  if (pw < 60) return;

  const fullH = BASE_H - GRID_TOP - 36;  // 32px frame + 4px inner gap
  drawFantasyPanel(px, GRID_TOP, pw, fullH, 'rgba(42,22,6,0.97)');

  const lx    = px + 10;
  const dotX  = px + 7;
  let   ly    = GRID_TOP + 14;
  const rEdge = px + pw - 8;
  const barW  = pw - 20;

  ctx.save();

  function divider() {
    ctx.strokeStyle = 'rgba(200,150,30,0.18)';
    ctx.lineWidth   = 0.5;
    ctx.beginPath();
    ctx.moveTo(px + 6, ly); ctx.lineTo(px + pw - 6, ly);
    ctx.stroke();
    ly += 9;
  }

  // ── WAVE PROGRESS ──────────────────────────────────────────────────────────
  ctx.font      = 'bold 9px monospace';
  ctx.fillStyle = '#c0a060';
  ctx.textAlign = 'left';
  ctx.fillText('WAVE', lx, ly);
  ctx.fillStyle = '#f0c840';
  ctx.textAlign = 'right';
  ctx.fillText(`${waveNumber} / ${MAX_WAVES}`, rEdge, ly);
  ctx.textAlign = 'left';
  ly += 7;

  const progress  = waveNumber / MAX_WAVES;
  const barColor  = progress < 0.5 ? '#60c840' : progress < 0.8 ? '#e8c040' : '#e84040';
  ctx.fillStyle   = 'rgba(60,30,8,0.8)';
  ctx.beginPath(); ctx.roundRect(lx, ly, barW, 6, 3); ctx.fill();
  if (progress > 0) {
    ctx.fillStyle = barColor;
    ctx.beginPath(); ctx.roundRect(lx, ly, barW * progress, 6, 3); ctx.fill();
  }
  ly += 14;
  divider();

  // ── INCOMING ───────────────────────────────────────────────────────────────
  ctx.font        = 'bold 10px monospace';
  ctx.fillStyle   = '#f0c840';
  ctx.shadowColor = 'rgba(220,170,30,0.7)';
  ctx.shadowBlur  = 6;
  ctx.fillText('INCOMING', lx, ly); ly += 14;
  ctx.shadowBlur  = 0;

  const next    = waveComposition(waveNumber + 1);
  const entries = [
    { label: 'Draugr', count: next.draugr,  color: '#bb70ff', skip: next.draugr  === 0, boss: false },
    { label: 'Myling', count: next.mylings, color: '#88bbff', skip: next.mylings === 0, boss: false },
    { label: 'Jötunn', count: next.jotunn,  color: '#d08820', skip: next.jotunn  === 0, boss: true  },
    { label: 'Mara',   count: next.maras,   color: '#00ddcc', skip: next.maras   === 0, boss: false },
  ];

  let bossHeaderDrawn = false;
  ctx.font = '10px monospace';
  for (const e of entries) {
    if (e.skip) continue;
    if (e.boss && !bossHeaderDrawn) {
      ctx.font = 'bold 8px monospace'; ctx.fillStyle = 'rgba(220,130,30,0.7)'; ctx.textAlign = 'left';
      ctx.fillText('— BOSS —', lx + 4, ly); ly += 12;
      bossHeaderDrawn = true; ctx.font = '10px monospace';
    }
    ctx.beginPath(); ctx.arc(dotX, ly - 3, 4, 0, Math.PI * 2);
    ctx.fillStyle = e.color; ctx.fill();
    ctx.fillStyle = e.color; ctx.textAlign = 'left';
    ctx.fillText(e.label, lx + 2, ly);
    ctx.fillStyle = '#e8c040'; ctx.textAlign = 'right';
    ctx.fillText(`×${e.count}`, rEdge, ly);
    ctx.textAlign = 'left'; ly += 15;
  }

  ly += 4;
  divider();

  // ── COMBAT ─────────────────────────────────────────────────────────────────
  ctx.font = 'bold 9px monospace'; ctx.fillStyle = '#c0a060'; ctx.textAlign = 'left';
  ctx.fillText('COMBAT', lx, ly); ly += 13;

  ctx.font = '10px monospace';
  const leaked = STARTING_LIVES - lives;

  const rows = [
    { label: '★ Slain',   value: `${slain}`,                      color: '#f0e060' },
    { label: '♥ Lives',   value: `${lives} / ${STARTING_LIVES}`,  color: lives <= 3 ? '#ff6060' : lives <= 7 ? '#ffaa60' : '#60e880' },
    { label: '⚡ Leaked',  value: `${leaked}`,                     color: leaked > 0 ? '#ff8080' : '#60e880' },
  ];
  if (waveState === 'active') {
    rows.push({ label: '◈ On field', value: `${enemies.length} / ${waveTotal}`, color: '#e8a060' });
  }
  for (const r of rows) {
    ctx.fillStyle = '#e8d0a0'; ctx.textAlign = 'left';  ctx.fillText(r.label, lx, ly);
    ctx.fillStyle = r.color;   ctx.textAlign = 'right'; ctx.fillText(r.value, rEdge, ly);
    ctx.textAlign = 'left'; ly += 13;
  }

  // Top damage dealer
  if (towers.length > 0) {
    const top = towers.reduce((a, b) => b.damageDealt > a.damageDealt ? b : a, towers[0]);
    if (top.damageDealt > 0) {
      const def = TOWER_DEFS[top.type];
      ctx.fillStyle = '#e8d0a0'; ctx.textAlign = 'left';
      ctx.fillText('⚔ Top dealer', lx, ly);
      ctx.fillStyle = def.color; ctx.textAlign = 'right';
      ctx.fillText(`${def.label} ${top.damageDealt}`, rEdge, ly);
      ctx.textAlign = 'left'; ly += 13;
    }
  }

  ly += 2;
  divider();

  // ── ECONOMY ────────────────────────────────────────────────────────────────
  ctx.font = 'bold 9px monospace'; ctx.fillStyle = '#c0a060'; ctx.textAlign = 'left';
  ctx.fillText('ECONOMY', lx, ly); ly += 13;

  ctx.font = '10px monospace';
  const net = goldEarned - goldSpent;
  const econRows = [
    { label: '◆ Earned', value: `+${goldEarned}`,                       color: '#e8c040' },
    { label: '◆ Spent',  value: `-${goldSpent}`,                        color: 'rgba(200,140,60,0.75)' },
    { label: '◆ Net',    value: `${net >= 0 ? '+' : ''}${net}`,         color: net >= 0 ? '#a0e880' : '#ff9090' },
  ];
  for (const r of econRows) {
    ctx.fillStyle = '#e8d0a0'; ctx.textAlign = 'left';  ctx.fillText(r.label, lx, ly);
    ctx.fillStyle = r.color;   ctx.textAlign = 'right'; ctx.fillText(r.value, rEdge, ly);
    ctx.textAlign = 'left'; ly += 13;
  }

  // ── SPEED TOGGLE ───────────────────────────────────────────────────────────
  const spR      = 17;
  const spX      = px + pw / 2;
  const spY      = GRID_TOP + fullH - (gameOver || waveState === 'active' ? 54 : 104);
  const spActive = gameSpeed >= 2;

  ctx.beginPath(); ctx.arc(spX, spY, spR, 0, Math.PI * 2);
  ctx.fillStyle   = spActive ? 'rgba(200,130,20,0.95)' : 'rgba(40,22,8,0.90)'; ctx.fill();
  ctx.strokeStyle = spActive ? 'rgba(255,190,60,0.9)' : 'rgba(160,110,40,0.4)';
  ctx.lineWidth   = 1.5; ctx.stroke();
  ctx.font        = 'bold 11px monospace';
  ctx.fillStyle   = spActive ? '#fff' : 'rgba(200,160,80,0.6)';
  ctx.textAlign   = 'center'; ctx.fillText('×2', spX, spY + 4); ctx.textAlign = 'left';
  speedBtn = { x: spX - spR, y: spY - spR, w: spR * 2, h: spR * 2 };

  // ── NEXT WAVE ──────────────────────────────────────────────────────────────
  if (!gameOver && waveState !== 'active') {
    const btnH = 44;
    const btnY = GRID_TOP + fullH - btnH - 10;
    const btnX = px + 6;
    const btnW = pw - 12;

    ctx.shadowColor = 'rgba(200,30,20,0.8)'; ctx.shadowBlur = 12;
    drawFantasyPanel(btnX, btnY, btnW, btnH, 'rgba(140,18,18,0.97)', 0.92, 6);
    ctx.shadowBlur  = 0;
    ctx.textAlign   = 'center'; ctx.font = 'bold 11px monospace';
    ctx.fillStyle   = '#ffffff'; ctx.shadowColor = 'rgba(255,100,80,0.7)'; ctx.shadowBlur = 8;
    ctx.fillText('NEXT WAVE', btnX + btnW / 2, btnY + 17);
    const secs = waveState === 'countdown'
      ? Math.ceil((COUNTDOWN_FRAMES - waveTimer) / 60)
      : Math.ceil((BREAK_FRAMES    - waveTimer) / 60);
    ctx.font = '9px monospace'; ctx.fillStyle = 'rgba(255,200,180,0.8)'; ctx.shadowBlur = 0;
    ctx.fillText(`auto ${secs}s`, btnX + btnW / 2, btnY + 32);
    nextWaveBtn = { x: btnX, y: btnY, w: btnW, h: btnH };
  } else {
    nextWaveBtn = null;
  }

  ctx.restore();
}

function drawTopBar() {
  drawFantasyPanel(2, 2, BASE_W - 4, GRID_TOP - 4, 'rgba(42,22,6,0.97)');

  const barH = GRID_TOP - 6;
  const cy   = Math.round(barH / 2) + 8;
  ctx.save();

  // ── LEFT: avatar circle + title ─────────────────────────────────────────────
  const avX = 22, avY = Math.round(barH / 2) + 2, avR = 15;
  ctx.beginPath();
  ctx.arc(avX, avY, avR, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(80,42,10,0.95)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(210,148,35,0.8)';
  ctx.lineWidth   = 1.5;
  ctx.stroke();
  ctx.font      = '14px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f0c840';
  ctx.fillText('⚔', avX, avY + 5);

  ctx.font        = 'bold 12px monospace';
  ctx.fillStyle   = '#f0c840';
  ctx.shadowColor = 'rgba(220,170,40,0.7)';
  ctx.shadowBlur  = 8;
  ctx.textAlign   = 'left';
  ctx.fillText('NORTHERN SHIELD', avX + avR + 6, cy);
  ctx.shadowBlur  = 0;

  // ── CENTER: wave label + timer ───────────────────────────────────────────────
  const midX = Math.round(BASE_W / 2);
  const wLabel = `WAVE ${waveNumber} / ${MAX_WAVES}`;

  ctx.font        = 'bold 14px monospace';
  ctx.fillStyle   = '#a8ecd0';
  ctx.shadowColor = 'rgba(100,220,160,0.45)';
  ctx.shadowBlur  = 6;
  ctx.textAlign   = 'center';
  ctx.fillText(wLabel, midX - 30, cy);
  ctx.shadowBlur  = 0;

  if (waveState !== 'active') {
    const tSecs = waveState === 'countdown'
      ? Math.ceil((COUNTDOWN_FRAMES - waveTimer) / 60)
      : Math.ceil((BREAK_FRAMES   - waveTimer) / 60);
    const mm = String(Math.floor(tSecs / 60)).padStart(2, '0');
    const ss = String(tSecs % 60).padStart(2, '0');
    ctx.font        = 'bold 13px monospace';
    ctx.fillStyle   = 'rgba(245,215,105,0.95)';
    ctx.shadowColor = 'rgba(220,180,40,0.5)';
    ctx.shadowBlur  = 4;
    ctx.fillText(`${mm}:${ss}`, midX + 42, cy);
    ctx.shadowBlur  = 0;
  } else {
    const rem = spawnQueue.length + enemies.length;
    ctx.font      = '12px monospace';
    ctx.fillStyle = rem > 0 ? '#e8a060' : '#60e880';
    ctx.fillText(`◈ ${rem}/${waveTotal}`, midX + 38, cy);
  }

  // ── RIGHT: resources ─────────────────────────────────────────────────────────
  let rx = BASE_W - 14;
  ctx.font      = 'bold 12px monospace';
  ctx.textAlign = 'right';

  ctx.fillStyle   = '#ff9898';
  ctx.shadowColor = 'rgba(255,80,80,0.4)';
  ctx.shadowBlur  = 4;
  ctx.fillText(`♥ ${lives}`, rx, cy);
  rx -= ctx.measureText(`♥ ${lives}`).width + 20;
  ctx.shadowBlur  = 0;

  // ── Gold ────────────────────────────────────────────────────────────────────
  const goldStr = `◆ ${gold}`;
  ctx.font        = 'bold 12px monospace';
  ctx.fillStyle   = hoardPulse > 0 ? '#fff8a0' : '#e8c040';
  ctx.shadowColor = 'rgba(220,180,30,0.5)';
  ctx.shadowBlur  = hoardPulse > 0 ? 8 : 3;
  ctx.fillText(goldStr, rx, cy);
  ctx.shadowBlur  = 0;
  rx -= ctx.measureText(goldStr).width + 20;

  ctx.fillStyle = '#b0d0f0';
  ctx.fillText(`★ ${slain}`, rx, cy);

  ctx.restore();
}

function drawBottomBuildBar() {
  const PORTRAIT_H = BUILD_BTN.h - 26;  // 50px
  const INFO_H     = 26;

  const spriteKeys = {
    [TOWER_TYPES.BERSERK]:  'berserker',
    [TOWER_TYPES.VALKYRIE]: 'valkyrie',
    [TOWER_TYPES.MILITARY]: 'archer',
    [TOWER_TYPES.CATAPULT]: 'catapult',
    [TOWER_TYPES.BLONDIE]:  'blondie',
  };

  const buttons     = getBuildButtons();
  const buildPanelX = SIDEBAR_W + 2;
  const buildPanelW = COLS * CELL_SIZE - 4;  // grid width only, not full BASE_W
  const buildPanelY = GRID_BOTTOM + 4;
  const buildPanelH = BUILD_BTN.h + 22;
  drawFantasyPanel(buildPanelX, buildPanelY, buildPanelW, buildPanelH, 'rgba(42,22,6,0.97)');

  for (const btn of buttons) {
    const isSelected = btn.mode === CELL.WALL
      ? buildMode === CELL.WALL
      : buildMode === CELL.TOWER && selectedTowerType === btn.id;
    const affordable = gold >= btn.cost;

    const fillStyle   = isSelected ? 'rgba(70,40,10,0.97)' : 'rgba(18,9,28,0.92)';
    const borderAlpha = isSelected ? 0.90 : 0.35;
    drawFantasyPanel(btn.x, btn.y, btn.width, btn.height, fillStyle, borderAlpha, 6);

    // ── Portrait area ───────────────────────────────────────────────────────────
    const ppx = btn.x + 4;
    const ppy = btn.y + 4;
    const ppw = btn.width - 8;
    const pph = PORTRAIT_H - 4;

    const sprKey = spriteKeys[btn.id];
    const sp     = sprKey ? SPRITES[sprKey] : null;
    if (btn.mode === CELL.WALL) {
      // ── Shield Wall portrait: two round shields ─────────────────────────────
      const scx = ppx + ppw / 2;
      const scy = ppy + pph / 2;
      const shR = Math.min(pph * 0.40, ppw * 0.21);
      ctx.save();
      if (!affordable) ctx.globalAlpha = 0.35;
      for (const ox of [-ppw * 0.21, ppw * 0.21]) {
        const sx = scx + ox, sy = scy;
        ctx.fillStyle = '#3a2410';
        ctx.beginPath(); ctx.arc(sx, sy, shR, 0, Math.PI * 2); ctx.fill();
        ctx.save();
        ctx.beginPath(); ctx.arc(sx, sy, shR - 1, 0, Math.PI * 2); ctx.clip();
        ctx.fillStyle = '#b01808';
        ctx.fillRect(sx - shR, sy - shR, shR, shR);
        ctx.fillRect(sx, sy, shR, shR);
        ctx.fillStyle = '#d8c888';
        ctx.fillRect(sx, sy - shR, shR, shR);
        ctx.fillRect(sx - shR, sy, shR, shR);
        ctx.strokeStyle = 'rgba(20,10,4,0.55)'; ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sx - shR, sy); ctx.lineTo(sx + shR, sy);
        ctx.moveTo(sx, sy - shR); ctx.lineTo(sx, sy + shR);
        ctx.stroke();
        ctx.restore();
        const bossR = shR * 0.18;
        ctx.fillStyle = '#706860';
        ctx.beginPath(); ctx.arc(sx, sy, bossR, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(230,220,200,0.75)';
        ctx.beginPath(); ctx.arc(sx - bossR * 0.3, sy - bossR * 0.35, bossR * 0.4, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    } else if (sp && sp.img && sp.img.complete && sp.img.naturalWidth > 0) {
      ctx.save();
      if (!affordable) ctx.globalAlpha = 0.30;
      ctx.drawImage(sp.img, 0, 0, sp.frameW, sp.frameH, ppx, ppy, ppw, pph);
      ctx.restore();
    } else {
      // fallback: gem circle with tower color
      ctx.save();
      ctx.globalAlpha = affordable ? 1 : 0.4;
      ctx.beginPath();
      ctx.arc(btn.x + btn.width / 2, btn.y + PORTRAIT_H / 2 + 2, 13, 0, Math.PI * 2);
      ctx.fillStyle = affordable ? btn.color : 'rgba(60,45,30,0.5)';
      ctx.fill();
      ctx.restore();
    }

    // ── Hotkey badge top-left ───────────────────────────────────────────────────
    ctx.font      = 'bold 9px monospace';
    ctx.fillStyle = isSelected ? '#e8c040' : 'rgba(200,160,80,0.55)';
    ctx.textAlign = 'left';
    ctx.fillText(`[${btn.key}]`, btn.x + 4, btn.y + 11);

    // ── Info strip (bottom 26px) ────────────────────────────────────────────────
    const infoY = btn.y + btn.height - INFO_H;

    ctx.strokeStyle = isSelected ? 'rgba(220,170,50,0.4)' : 'rgba(160,120,40,0.2)';
    ctx.lineWidth   = 0.5;
    ctx.beginPath();
    ctx.moveTo(btn.x + 4, infoY); ctx.lineTo(btn.x + btn.width - 4, infoY);
    ctx.stroke();

    ctx.font      = 'bold 9px monospace';
    ctx.fillStyle = !affordable ? '#3a3020' : isSelected ? '#fff' : '#c0b090';
    ctx.textAlign = 'left';
    ctx.fillText(btn.label, btn.x + 5, infoY + 11);

    ctx.fillStyle = !affordable ? '#302818' : isSelected ? '#e8c040' : '#907840';
    ctx.textAlign = 'right';
    ctx.fillText(`◆${btn.cost}`, btn.x + btn.width - 4, infoY + 11);
    ctx.textAlign = 'left';
  }
}

function drawHud() {
  drawTopBar();
  drawBottomBuildBar();

  if (!gameOver) return;

  const { width, height } = getViewSize();
  const cx = GRID_LEFT + (COLS * CELL_SIZE) / 2;
  const cy = height / 2;

  ctx.fillStyle = 'rgba(3,1,8,0.82)';
  ctx.fillRect(0, 0, width, height);

  if (showTopList) {
    const pw = 380, ph = Math.min(60 + highScores.length * 30 + 60, 380);
    const px = cx - pw / 2, py = cy - ph / 2;
    drawFantasyPanel(px, py, pw, ph, 'rgba(6,2,14,0.97)', 0.85, 12);

    ctx.save();
    ctx.textAlign   = 'center';
    ctx.shadowColor = 'rgba(220,170,30,0.8)';
    ctx.shadowBlur  = 14;
    ctx.fillStyle   = '#f0c840';
    ctx.font        = 'bold 22px monospace';
    ctx.fillText('HIGH SCORES', cx, py + 36);
    ctx.shadowBlur  = 0;

    ctx.textAlign = 'left';
    const colX = [px + 20, px + 80, cx, px + pw - 20];
    let   row   = py + 60;
    ctx.font      = 'bold 10px monospace';
    ctx.fillStyle = 'rgba(200,160,40,0.6)';
    ctx.fillText('#', colX[0], row);
    ctx.fillText('Wave', colX[1], row);
    ctx.fillText('Slain', colX[2], row);
    ctx.textAlign = 'right';
    ctx.fillText('Gold', colX[3], row);
    row += 18;
    ctx.strokeStyle = 'rgba(200,160,40,0.2)';
    ctx.lineWidth   = 0.5;
    ctx.beginPath();
    ctx.moveTo(px + 14, row - 6); ctx.lineTo(px + pw - 14, row - 6);
    ctx.stroke();

    highScores.forEach((s, i) => {
      const medal = i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : '#a0b0c0';
      ctx.font      = i < 3 ? 'bold 11px monospace' : '11px monospace';
      ctx.fillStyle = medal;
      ctx.textAlign = 'left';
      ctx.fillText(`${i + 1}`, colX[0], row);
      ctx.fillText(`${s.waves}`, colX[1], row);
      ctx.fillText(`${s.slain}`, colX[2], row);
      ctx.textAlign = 'right';
      ctx.fillText(`+${s.goldEarned}`, colX[3], row);
      if (s.date) {
        ctx.font      = '8px monospace';
        ctx.fillStyle = 'rgba(160,130,80,0.45)';
        ctx.fillText(s.date, colX[3], row + 11);
      }
      row += 30;
    });
    if (highScores.length === 0) {
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(160,140,100,0.6)';
      ctx.font      = '12px monospace';
      ctx.fillText('No results yet', cx, row);
    }
    ctx.restore();

    const bbW = 160, bbH = 36;
    const bbX = cx - bbW / 2, bbY = py + ph - 50;
    drawFantasyPanel(bbX, bbY, bbW, bbH, 'rgba(8,6,22,0.97)', 0.7, 6);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font      = 'bold 13px monospace';
    ctx.fillStyle = '#a0c0e8';
    ctx.fillText('← BACK', cx, bbY + 23);
    ctx.restore();
    restartBtn = { x: bbX, y: bbY, w: bbW, h: bbH, action: 'back' };

  } else {
    const panelColor = victory ? 'rgba(2,12,6,0.97)' : 'rgba(6,2,14,0.97)';
    drawFantasyPanel(cx - 220, cy - 120, 440, 230, panelColor, 0.82, 12);
    ctx.save();
    ctx.textAlign = 'center';

    if (victory) {
      ctx.shadowColor = 'rgba(50,220,100,0.8)';
      ctx.shadowBlur  = 26;
      ctx.fillStyle   = '#40e880';
      ctx.font        = 'bold 38px monospace';
      ctx.fillText('VICTORY!', cx, cy - 32);
      ctx.shadowBlur  = 0;
      ctx.fillStyle   = '#f0c840';
      ctx.font        = '13px monospace';
      ctx.fillText('Northern Shield held for 100 waves', cx, cy - 4);
    } else {
      ctx.shadowColor = 'rgba(200,50,50,0.7)';
      ctx.shadowBlur  = 22;
      ctx.fillStyle   = '#e84040';
      ctx.font        = 'bold 44px monospace';
      ctx.fillText('DEFEATED', cx, cy - 30);
      ctx.shadowBlur  = 0;
    }
    ctx.fillStyle   = '#e8c040';
    ctx.font        = '14px monospace';
    ctx.fillText(`Enemies slain: ${slain}`, cx, cy + 2);
    ctx.fillText(`Waves: ${waveNumber}   Gold earned: ${goldEarned}`, cx, cy + 22);
    ctx.restore();

    const rbW = 160, rbH = 38, tlW = 160, tlH = 38, gap = 12;
    const totalW = rbW + gap + tlW;
    const rbX = cx - totalW / 2,              rbY = cy + 52;
    const tlX = cx - totalW / 2 + rbW + gap,  tlY = cy + 52;

    drawFantasyPanel(rbX, rbY, rbW, rbH, 'rgba(8,26,8,0.97)', 0.75, 6);
    ctx.save();
    ctx.textAlign   = 'center';
    ctx.font        = 'bold 13px monospace';
    ctx.fillStyle   = '#88ee66';
    ctx.shadowColor = 'rgba(100,220,80,0.55)';
    ctx.shadowBlur  = 10;
    ctx.fillText('PLAY AGAIN', rbX + rbW / 2, rbY + 25);
    ctx.restore();

    drawFantasyPanel(tlX, tlY, tlW, tlH, 'rgba(12,8,28,0.97)', 0.7, 6);
    ctx.save();
    ctx.textAlign   = 'center';
    ctx.font        = 'bold 13px monospace';
    ctx.fillStyle   = '#e8c040';
    ctx.shadowColor = 'rgba(220,170,30,0.55)';
    ctx.shadowBlur  = 8;
    ctx.fillText('HIGH SCORES ★', tlX + tlW / 2, tlY + 25);
    ctx.restore();

    restartBtn = { x: rbX, y: rbY, w: rbW, h: rbH, action: 'restart' };
    toplistBtn = { x: tlX, y: tlY, w: tlW, h: tlH };
  }
}

function drawTowerPanel(tower) {
  const panelW = 162;
  const panelH = 86;
  const { width, height } = getViewSize();

  let px = GRID_LEFT + tower.x - panelW / 2;
  let py = GRID_TOP  + tower.y  - panelH - CELL_SIZE - 4;
  px = Math.max(SIDEBAR_W + 4, Math.min(px, width - RIGHT_PANEL_W - panelW - 4));
  py = Math.max(8, Math.min(py, height - panelH - 8));

  drawFantasyPanel(px, py, panelW, panelH, 'rgba(4,2,12,0.97)', 0.88, 7);

  const def = TOWER_DEFS[tower.type];

  ctx.save();

  // Title + level
  ctx.font      = 'bold 11px monospace';
  ctx.fillStyle = def.color;
  ctx.textAlign = 'left';
  ctx.fillText(def.label.toUpperCase(), px + 10, py + 17);

  ctx.textAlign = 'right';
  ctx.fillStyle = tower.maxed ? '#ff9040' : '#e8c040';
  ctx.fillText(tower.maxed ? 'MAX' : `Lv ${tower.level}`, px + panelW - 10, py + 17);

  // Stats
  ctx.textAlign = 'left';
  ctx.font      = '10px monospace';
  ctx.fillStyle = '#8aaccc';
  ctx.fillText(`DMG ${tower.damage}   RNG ${tower.range}   CD ${tower.fireRate}`, px + 10, py + 32);

  // Divider
  ctx.strokeStyle = 'rgba(210,160,40,0.2)';
  ctx.lineWidth   = 0.5;
  ctx.beginPath();
  ctx.moveTo(px + 8, py + 40); ctx.lineTo(px + panelW - 8, py + 40);
  ctx.stroke();

  // Upgrade button
  const btnY  = py + 47;
  const btnH  = 28;
  const upgW  = 94;
  const sellW = 52;
  const upgX  = px + 8;
  const sellX = px + panelW - 8 - sellW;

  const canUpgrade = !tower.maxed && gold >= tower.upgradeCost;
  drawFantasyPanel(upgX, btnY, upgW, btnH,
    canUpgrade ? 'rgba(8,24,8,0.97)' : 'rgba(10,8,20,0.97)',
    canUpgrade ? 0.65 : 0.18, 4);

  ctx.textAlign = 'center';
  if (tower.maxed) {
    ctx.fillStyle = 'rgba(130,110,60,0.75)';
    ctx.font      = '10px monospace';
    ctx.fillText('MAXED', upgX + upgW / 2, btnY + 18);
  } else {
    ctx.font      = 'bold 10px monospace';
    ctx.fillStyle = canUpgrade ? '#88ee66' : '#3a4030';
    ctx.fillText('Upgrade', upgX + upgW / 2, btnY + 12);
    ctx.font      = '10px monospace';
    ctx.fillStyle = canUpgrade ? '#e8c040' : '#2a2818';
    ctx.fillText(`$${tower.upgradeCost}`, upgX + upgW / 2, btnY + 23);
  }

  // Sell button
  drawFantasyPanel(sellX, btnY, sellW, btnH, 'rgba(22,6,6,0.97)', 0.55, 4);
  ctx.font      = 'bold 10px monospace';
  ctx.fillStyle = '#ee6666';
  ctx.fillText('Sell', sellX + sellW / 2, btnY + 12);
  ctx.font      = '10px monospace';
  ctx.fillStyle = '#e8c040';
  ctx.fillText(`$${tower.sellValue}`, sellX + sellW / 2, btnY + 23);

  ctx.restore();

  panelUpgradeBtn = { x: upgX,  y: btnY, w: upgW,  h: btnH };
  panelSellBtn    = { x: sellX, y: btnY, w: sellW, h: btnH };
}

function drawBossWarning() {
  if (bossWarnAlpha <= 0.01 || gameOver) return;
  const { width } = getViewSize();
  const cx      = GRID_LEFT + (COLS * CELL_SIZE) / 2;
  const bannerY = GRID_TOP + 36;
  const bannerW = 250, bannerH = 34;

  ctx.save();
  ctx.globalAlpha = bossWarnAlpha;
  ctx.fillStyle   = 'rgba(130,16,16,0.94)';
  ctx.beginPath();
  ctx.roundRect(cx - bannerW / 2, bannerY, bannerW, bannerH, 6);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,70,30,0.75)';
  ctx.lineWidth   = 1.2;
  ctx.stroke();

  ctx.textAlign   = 'center';
  ctx.font        = 'bold 13px monospace';
  ctx.fillStyle   = '#fff';
  ctx.shadowColor = 'rgba(255,50,20,0.95)';
  ctx.shadowBlur  = 14;
  ctx.fillText('⚠  BOSS INCOMING  ⚠', cx, bannerY + 22);
  ctx.shadowBlur  = 0;
  ctx.restore();
}

function drawWaveAnnouncement() {
  if (gameOver) return;
  if (waveState === 'active') return;

  const { width } = getViewSize();
  const cx = GRID_LEFT + (COLS * CELL_SIZE) / 2;
  const cy = GRID_TOP  + (ROWS * CELL_SIZE) / 2;

  let line1, line2, glowColor;
  if (waveState === 'countdown') {
    const secs = Math.ceil((COUNTDOWN_FRAMES - waveTimer) / 60);
    line1 = 'PREPARE FOR BATTLE';
    line2 = `Starting in ${secs}...`;
    glowColor = 'rgba(200,160,40,0.7)';
  } else {
    const secs = Math.ceil((BREAK_FRAMES - waveTimer) / 60);
    line1 = `WAVE ${waveNumber} COMPLETE`;
    line2 = `Next wave in ${secs}...`;
    glowColor = 'rgba(80,220,140,0.7)';
  }

  ctx.save();
  ctx.textAlign = 'center';

  ctx.shadowColor = glowColor;
  ctx.shadowBlur  = 22;
  ctx.fillStyle   = '#f0e080';
  ctx.font        = 'bold 28px monospace';
  ctx.fillText(line1, cx, cy - 14);

  ctx.shadowBlur  = 10;
  ctx.fillStyle   = 'rgba(200,230,200,0.85)';
  ctx.font        = '15px monospace';
  ctx.fillText(line2, cx, cy + 14);

  // Next wave composition (shown during break)
  if (waveState === 'break') {
    const next = waveComposition(waveNumber + 1);
    const parts = [];
    if (next.draugr  > 0) parts.push({ label: `● ×${next.draugr}`,  color: '#bb70ff' });
    if (next.mylings > 0) parts.push({ label: `◆ ×${next.mylings}`, color: '#88bbff' });
    if (next.jotunn  > 0) parts.push({ label: `◉ ×${next.jotunn}`,  color: '#c07820' });
    if (next.maras   > 0) parts.push({ label: `✦ ×${next.maras}`,   color: '#00ddcc' });

    ctx.font = '13px monospace';
    const totalW = parts.reduce((sum, p) => sum + ctx.measureText(p.label).width + 18, -18);
    let px = cx - totalW / 2;
    for (const p of parts) {
      ctx.fillStyle   = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur  = 6;
      ctx.textAlign   = 'left';
      ctx.fillText(p.label, px, cy + 36);
      px += ctx.measureText(p.label).width + 18;
    }
    ctx.shadowBlur = 0;
  }

  ctx.restore();
}

function drawLeftSidebar() {
  const { height } = getViewSize();
  drawFantasyPanel(0, GRID_TOP, SIDEBAR_W, height - GRID_TOP, 'rgba(46,24,6,0.97)');

  const tabs = [
    { id: 'towers',  symbol: '⚔',  label: 'TOWERS'  },
    { id: 'troops',  symbol: '●',  label: 'TROOPS'  },
    { id: 'defense', symbol: '🛡', label: 'DEFENSE' },
    { id: 'deco',    symbol: '✦',  label: 'DECO'    },
    { id: 'map',     symbol: '◉',  label: 'MAP'     },
  ];

  const tabH = 68, tabGap = 3;
  tabs.forEach((tab, i) => {
    const ty     = GRID_TOP + 10 + i * (tabH + tabGap);
    const active = activeSidebarTab === tab.id;
    drawFantasyPanel(4, ty, SIDEBAR_W - 8, tabH,
      active ? 'rgba(80,42,8,0.97)' : 'rgba(22,12,3,0.88)',
      active ? 0.88 : 0.25, 6);

    ctx.save();
    ctx.textAlign = 'center';
    ctx.font      = '18px monospace';
    ctx.fillStyle = active ? '#f0c840' : 'rgba(160,120,50,0.55)';
    if (active) { ctx.shadowColor = 'rgba(220,170,30,0.8)'; ctx.shadowBlur = 8; }
    ctx.fillText(tab.symbol, SIDEBAR_W / 2, ty + 28);
    ctx.shadowBlur = 0;
    ctx.font      = '7px monospace';
    ctx.fillStyle = active ? '#c0a030' : 'rgba(120,90,40,0.45)';
    ctx.fillText(tab.label, SIDEBAR_W / 2, ty + 44);
    ctx.restore();
  });
}

function draw() {
  ctx.clearRect(0, 0, canvas.clientWidth || window.innerWidth, canvas.clientHeight || window.innerHeight);
  ctx.save();
  ctx.scale(gameScale, gameScale);
  drawBackground();

  // Game world — translated down by GRID_TOP so the top status bar doesn't cover the grid
  ctx.save();
  const shakeX = screenShake > 0.3 ? (Math.random() - 0.5) * screenShake * 2 : 0;
  const shakeY = screenShake > 0.3 ? (Math.random() - 0.5) * screenShake * 2 : 0;
  ctx.translate(GRID_LEFT + shakeX, GRID_TOP + shakeY);

  const time = performance.now() * 0.001;
  grid.healthRatio = Math.max(0, lives / STARTING_LIVES);
  grid.gold        = gold;
  grid.hoardPulse  = hoardPulse;

  // Grass terrain (blit pre-rendered offscreen canvas — free per frame)
  if (terrainCanvas) ctx.drawImage(terrainCanvas, 0, 0);

  grid.draw(ctx, time);
  drawPath();
  towers.forEach(t => t.draw(ctx));

  // Selection ring on active tower
  if (selectedTower && !gameOver) {
    const st = performance.now() * 0.001;
    ctx.save();
    ctx.strokeStyle    = 'rgba(255,255,180,0.75)';
    ctx.lineWidth      = 1.5;
    ctx.shadowColor    = 'rgba(255,240,100,0.8)';
    ctx.shadowBlur     = 8;
    ctx.setLineDash([4, 5]);
    ctx.lineDashOffset = -(st * 18) % 9;
    ctx.beginPath();
    ctx.arc(selectedTower.x, selectedTower.y, CELL_SIZE * 0.72, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  bullets.forEach(b => b.draw(ctx));
  enemies.forEach(e => e.draw(ctx));
  drawParticles();

  // Portal flash on Golem spawn
  if (portalFlash > 0) {
    const { x: spx, y: spy } = grid.cellCenter(SPAWN.col, SPAWN.row);
    const fa = (portalFlash / 22) * 0.7;
    ctx.save();
    ctx.shadowColor = `rgba(255,40,20,${fa})`;
    ctx.shadowBlur  = 28;
    ctx.fillStyle   = `rgba(255,55,20,${fa * 0.6})`;
    ctx.beginPath();
    ctx.arc(spx, spy, CELL_SIZE * 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  ctx.restore();

  // Critical health vignette (screen-space)
  if (!gameOver && lives <= 5) {
    const { width, height } = getViewSize();
    const vigAlpha = Math.max(0, (5 - lives) / 5) * 0.38;
    const grad = ctx.createRadialGradient(width / 2, height / 2, height * 0.3, width / 2, height / 2, height * 0.85);
    grad.addColorStop(0, 'rgba(180,20,20,0)');
    grad.addColorStop(1, `rgba(180,20,20,${vigAlpha})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  drawRightPanel();
  drawHud();
  drawGoldCoins();
  drawBossWarning();
  drawWaveAnnouncement();
  if (selectedTower && !gameOver) drawTowerPanel(selectedTower);
  drawDragGhost();
  drawFrames();
  ctx.restore();
}

function drawDragGhost() {
  if (!dragItem) return;

  const col    = Math.floor((dragX - GRID_LEFT) / CELL_SIZE);
  const row    = Math.floor((dragY - GRID_TOP)  / CELL_SIZE);
  const onGrid = col >= 0 && col < COLS && row >= 0 && row < ROWS;

  if (onGrid) {
    const cell     = grid.getCell(col, row);
    const canPlace = cell === CELL.EMPTY && gold >= dragItem.cost && !hasEnemyInCell(col, row);
    ctx.save();
    ctx.translate(GRID_LEFT, GRID_TOP);
    ctx.fillStyle   = canPlace ? 'rgba(80,220,80,0.28)' : 'rgba(220,60,60,0.28)';
    ctx.fillRect(col * CELL_SIZE, row * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    ctx.strokeStyle = canPlace ? 'rgba(120,255,120,0.75)' : 'rgba(255,80,80,0.75)';
    ctx.lineWidth   = 1.5;
    ctx.strokeRect(col * CELL_SIZE + 0.75, row * CELL_SIZE + 0.75, CELL_SIZE - 1.5, CELL_SIZE - 1.5);
    ctx.restore();
  }

  // Ghost card floating above cursor
  const gw = 64, gh = 46;
  const gx = dragX - gw / 2;
  const gy = dragY - gh - 12;
  const cx = gx + gw / 2;

  ctx.save();
  ctx.globalAlpha = 0.88;
  drawFantasyPanel(gx, gy, gw, gh, 'rgba(18,9,28,0.96)', 0.9, 6);

  const _ghostSpriteKeys = {
    [TOWER_TYPES.BERSERK]:  'berserker',
    [TOWER_TYPES.VALKYRIE]: 'valkyrie',
    [TOWER_TYPES.MILITARY]: 'archer',
    [TOWER_TYPES.CATAPULT]: 'catapult',
    [TOWER_TYPES.BLONDIE]:  'blondie',
  };
  const _gsp = SPRITES[_ghostSpriteKeys[dragItem.id]];
  const ppx = gx + 4, ppy = gy + 3, ppw = gw - 8, pph = gh - 20;
  if (_gsp && _gsp.img.complete && _gsp.img.naturalWidth > 0) {
    ctx.drawImage(_gsp.img, 0, 0, _gsp.frameW, _gsp.frameH, ppx, ppy, ppw, pph);
  } else {
    ctx.beginPath();
    ctx.arc(cx, gy + 14, 10, 0, Math.PI * 2);
    ctx.fillStyle = dragItem.color;
    ctx.fill();
  }

  ctx.textAlign = 'center';
  ctx.font      = 'bold 8px monospace';
  ctx.fillStyle = '#fff';
  ctx.fillText(dragItem.label, cx, gy + 31);

  ctx.font      = '8px monospace';
  ctx.fillStyle = gold >= dragItem.cost ? '#e8c040' : '#ff6060';
  ctx.fillText(`◆${dragItem.cost}`, cx, gy + gh - 3);
  ctx.restore();
}

function gameLoop() {
  // Re-bake terrain once the ground sprite finishes loading
  if (!terrainUsesSprite && SPRITES['ground']?.img.complete && SPRITES['ground'].img.naturalWidth > 0) {
    initTerrain();
  }
  _frameTick++;
  // Normal speed = 30 logic ticks/sec (every other frame). Fast = 60/sec.
  if (gameSpeed >= 2 || _frameTick % 2 === 1) update();
  draw();
  requestAnimationFrame(gameLoop);
}

computeScale();
window.addEventListener('resize', computeScale);
initTerrain();
gameLoop();
