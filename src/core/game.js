import { ctx, canvas } from './renderer.js';
import { Grid, CELL } from '../grid/grid.js';
import { Enemy, ENEMY_TYPES, ENEMY_DEFS } from '../entities/enemy.js';
import { Tower, TOWER_DEFS, TOWER_TYPES } from '../entities/tower.js';

const COLS = 50;
const ROWS = 30;
const CELL_SIZE = 16;

const SPAWN = { col: 0,        row: 15 };
const GOAL  = { col: COLS - 1, row: 15 };

const WALL_COST = 5;

const BUILD_BTN = { x: 12, y: 40, w: 112, h: 38, gap: 6 };

const BUILD_ITEMS = [
  { id: 'wall', label: 'Wall', key: '1', color: '#a08040', cost: WALL_COST, mode: CELL.WALL },
  ...Object.values(TOWER_TYPES).map(type => ({
    id:    type,
    label: TOWER_DEFS[type].label,
    key:   TOWER_DEFS[type].key,
    color: TOWER_DEFS[type].color,
    cost:  TOWER_DEFS[type].cost,
    mode:  CELL.TOWER
  }))
];

const STARTING_GOLD  = 120;
const STARTING_LIVES = 20;

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
let selectedTowerType = TOWER_TYPES.GUN;
let gameOver = false;

// ── wave system ───────────────────────────────────────────────────────────────

const COUNTDOWN_FRAMES = 180;
const BREAK_FRAMES     = 360;
const SPAWN_FRAMES     = 40;

let waveNumber  = 0;
let waveState   = 'countdown';  // 'countdown' | 'active' | 'break'
let waveTimer   = 0;
let spawnQueue  = [];
let spawnTimer  = 0;
let waveHpScale = 1;

let particles   = [];
let screenShake = 0;

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

function buildWave(num) {
  const infantry = Math.min(6 + num * 2, 26);
  const drones   = num >= 2 ? Math.min(num - 1, 8) : 0;
  const tanks    = num >= 4 ? Math.min(Math.floor((num - 3) * 0.7), 4) : 0;

  const queue = [
    ...Array(infantry).fill(ENEMY_TYPES.INFANTRY),
    ...Array(drones).fill(ENEMY_TYPES.DRONE),
    ...Array(tanks).fill(ENEMY_TYPES.TANK),
  ];

  for (let i = queue.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [queue[i], queue[j]] = [queue[j], queue[i]];
  }

  return queue;
}

function startNextWave() {
  waveNumber++;
  waveHpScale = 1 + (waveNumber - 1) * 0.12;
  spawnQueue  = buildWave(waveNumber);
  spawnTimer  = 0;
  waveState   = 'active';
}

function updateWave() {
  if (gameOver) return;

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
    waveTimer = 0;
    waveState = 'break';
  }
}

// ── starfield ─────────────────────────────────────────────────────────────────

const STARS = Array.from({ length: 120 }, () => ({
  x:     Math.random(),
  y:     Math.random(),
  r:     0.5 + Math.random() * 1.2,
  phase: Math.random() * Math.PI * 2
}));

// ── helpers ───────────────────────────────────────────────────────────────────

function getViewSize() {
  return {
    width:  canvas.clientWidth  || window.innerWidth,
    height: canvas.clientHeight || window.innerHeight
  };
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

  // gold outer border
  drawRoundedPath(x, y, w, h, radius);
  ctx.strokeStyle = `rgba(210,160,40,${borderAlpha})`;
  ctx.lineWidth   = 1.5;
  ctx.stroke();

  // inner subtle line
  if (w > 16 && h > 16) {
    drawRoundedPath(x + 3, y + 3, w - 6, h - 6, Math.max(radius - 2, 2));
    ctx.strokeStyle = `rgba(210,160,40,${borderAlpha * 0.22})`;
    ctx.lineWidth   = 0.5;
    ctx.stroke();
  }

  // corner gem diamonds
  const gs = 4;
  for (const [cx, cy] of [[x, y], [x + w, y], [x, y + h], [x + w, y + h]]) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = `rgba(230,180,50,${borderAlpha})`;
    ctx.fillRect(-gs / 2, -gs / 2, gs, gs);
    ctx.restore();
  }
}

// ── build buttons ─────────────────────────────────────────────────────────────

function getBuildButtons() {
  return BUILD_ITEMS.map((item, i) => ({
    ...item,
    x:      BUILD_BTN.x + i * (BUILD_BTN.w + BUILD_BTN.gap),
    y:      BUILD_BTN.y,
    width:  BUILD_BTN.w,
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

function spawnEnemy(type = ENEMY_TYPES.INFANTRY, hpScale = 1) {
  if (!currentPath || gameOver) return;

  let path;
  if (ENEMY_DEFS[type].flying) {
    path = [grid.cellCenter(SPAWN.col, SPAWN.row), grid.cellCenter(GOAL.col, GOAL.row)];
  } else {
    path = currentPath.map(({ col, row }) => grid.cellCenter(col, row));
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
  if (gameOver) return;

  const rect   = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  if (e.button === 0) {
    const btn = getBuildButtonAt(mouseX, mouseY);
    if (btn) {
      buildMode = btn.mode;
      if (btn.mode === CELL.TOWER) selectedTowerType = btn.id;
      return;
    }
  }

  const { col, row } = grid.pixelToCell(mouseX, mouseY);
  const cell = grid.getCell(col, row);
  if (cell === null || cell === CELL.SPAWN || cell === CELL.GOAL) return;

  if (e.button === 2) {
    if (cell === CELL.WALL || cell === CELL.TOWER) {
      grid.setCell(col, row, CELL.EMPTY);
      towers      = towers.filter(t => t.col !== col || t.row !== row);
      currentPath = grid.findPath(SPAWN.col, SPAWN.row, GOAL.col, GOAL.row);
      rerouteActiveEnemies();
    }
    return;
  }

  if (e.button !== 0 || cell !== CELL.EMPTY) return;
  if (hasEnemyInCell(col, row)) return;

  const cost = buildMode === CELL.WALL ? WALL_COST : TOWER_DEFS[selectedTowerType].cost;
  if (gold < cost) return;

  grid.setCell(col, row, buildMode);
  const newPath = grid.findPath(SPAWN.col, SPAWN.row, GOAL.col, GOAL.row);
  if (!newPath) {
    grid.setCell(col, row, CELL.EMPTY);
    return;
  }

  currentPath = newPath;
  rerouteActiveEnemies();
  gold -= cost;

  if (buildMode === CELL.TOWER) {
    const { x, y } = grid.cellCenter(col, row);
    towers.push(new Tower(x, y, col, row, selectedTowerType));
  }
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
      gold += reward;
      if (b.target) spawnParticles(b.target.x, b.target.y, b.target.highlightColor ?? b.target.color, 12);
    }
    if (!b.alive) bullets.splice(i, 1);
  }

  for (let i = enemies.length - 1; i >= 0; i--) {
    enemies[i].update();
    if (!enemies[i].alive) {
      enemies.splice(i, 1);
      continue;
    }
    if (enemies[i].reached) {
      lives--;
      screenShake = 10;
      enemies.splice(i, 1);
      if (lives <= 0) gameOver = true;
    }
  }

  updateParticles();
  if (screenShake > 0) screenShake *= 0.82;
}

// ── draw ──────────────────────────────────────────────────────────────────────

function drawBackground() {
  const { width, height } = getViewSize();
  const time = performance.now() * 0.0002;

  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0,    '#06030f');
  grad.addColorStop(0.5,  '#0e0820');
  grad.addColorStop(1,    '#0a0618');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Stars
  const starTime = performance.now() * 0.0009;
  for (const s of STARS) {
    const alpha = 0.2 + Math.sin(starTime + s.phase) * 0.18;
    ctx.fillStyle = `rgba(200,210,255,${Math.max(0, alpha)})`;
    ctx.beginPath();
    ctx.arc(s.x * width, s.y * height, s.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // pulsing purple magic glow
  const p1 = 0.28 + Math.sin(time * 6) * 0.06;
  const g1 = ctx.createRadialGradient(width * 0.65, height * 0.4, 10, width * 0.65, height * 0.4, 400);
  g1.addColorStop(0, `rgba(110,50,190,${p1})`);
  g1.addColorStop(1, 'rgba(110,50,190,0)');
  ctx.fillStyle = g1;
  ctx.fillRect(0, 0, width, height);

  // pulsing amber glow (offset phase)
  const p2 = 0.14 + Math.sin(time * 4 + 1.8) * 0.04;
  const g2 = ctx.createRadialGradient(width * 0.22, height * 0.72, 10, width * 0.22, height * 0.72, 280);
  g2.addColorStop(0, `rgba(170,90,15,${p2})`);
  g2.addColorStop(1, 'rgba(170,90,15,0)');
  ctx.fillStyle = g2;
  ctx.fillRect(0, 0, width, height);
}

function drawPath() {
  if (!currentPath || currentPath.length < 2) return;

  const time = performance.now() * 0.001;

  function buildPathShape() {
    const { x: sx, y: sy } = grid.cellCenter(currentPath[0].col, currentPath[0].row);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    for (let i = 1; i < currentPath.length; i++) {
      const { x, y } = grid.cellCenter(currentPath[i].col, currentPath[i].row);
      ctx.lineTo(x, y);
    }
  }

  // Glow base layer
  ctx.save();
  ctx.lineWidth   = CELL_SIZE * 0.65;
  ctx.lineJoin    = 'round';
  ctx.lineCap     = 'round';
  ctx.strokeStyle = 'rgba(180,130,25,0.32)';
  ctx.shadowColor = 'rgba(220,175,45,0.4)';
  ctx.shadowBlur  = 14;
  ctx.setLineDash([]);
  buildPathShape();
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Animated flowing dashes on top
  ctx.lineWidth      = CELL_SIZE * 0.22;
  ctx.strokeStyle    = 'rgba(255,210,60,0.55)';
  ctx.setLineDash([6, 14]);
  ctx.lineDashOffset = -(time * 28) % 20;
  buildPathShape();
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawHud() {
  const panelX = 10;
  const panelY = 8;
  const panelW = BUILD_BTN.x + BUILD_ITEMS.length * (BUILD_BTN.w + BUILD_BTN.gap) - BUILD_BTN.gap + 10;
  const panelH = BUILD_BTN.y + BUILD_BTN.h + 12;

  drawFantasyPanel(panelX, panelY, panelW, panelH, 'rgba(6,3,16,0.92)');

  // stats row
  ctx.save();
  ctx.font = '13px monospace';

  ctx.fillStyle = '#e8c040';
  ctx.fillText(`◆ Gold: ${gold}`, panelX + 14, panelY + 26);
  const goldW = ctx.measureText(`◆ Gold: ${gold}`).width;

  ctx.fillStyle = '#ff9090';
  ctx.fillText(`♥ Lives: ${lives}`, panelX + 14 + goldW + 18, panelY + 26);
  const livesW = ctx.measureText(`♥ Lives: ${lives}`).width;

  ctx.fillStyle = '#b8c8e0';
  ctx.fillText(`★ Slain: ${slain}`, panelX + 14 + goldW + 18 + livesW + 18, panelY + 26);
  const slainW = ctx.measureText(`★ Slain: ${slain}`).width;

  ctx.fillStyle = '#a0e0c0';
  const waveLabel = waveNumber === 0 ? 'Wave: -' : `Wave: ${waveNumber}`;
  ctx.fillText(`⚔ ${waveLabel}`, panelX + 14 + goldW + 18 + livesW + 18 + slainW + 18, panelY + 26);

  ctx.restore();

  // build buttons
  for (const btn of getBuildButtons()) {
    const isSelected = btn.mode === CELL.WALL
      ? buildMode === CELL.WALL
      : buildMode === CELL.TOWER && selectedTowerType === btn.id;
    const affordable = gold >= btn.cost;

    const fillStyle   = isSelected ? 'rgba(55,30,8,0.96)' : 'rgba(8,4,18,0.90)';
    const borderAlpha = isSelected ? 0.88 : 0.38;
    drawFantasyPanel(btn.x, btn.y, btn.width, btn.height, fillStyle, borderAlpha, 6);

    // key badge
    ctx.font      = 'bold 11px monospace';
    ctx.fillStyle = isSelected ? '#e8c040' : 'rgba(180,150,80,0.65)';
    ctx.fillText(`[${btn.key}]`, btn.x + 7, btn.y + 15);

    // label
    ctx.font      = '12px monospace';
    ctx.fillStyle = !affordable
      ? '#4a4030'
      : isSelected ? '#fff' : '#c0b090';
    ctx.fillText(btn.label, btn.x + 7, btn.y + 29);

    // cost (right-aligned)
    const costStr = `$${btn.cost}`;
    ctx.fillStyle = !affordable
      ? '#3a3020'
      : isSelected ? '#e8c040' : '#907840';
    ctx.fillText(costStr, btn.x + btn.width - ctx.measureText(costStr).width - 7, btn.y + 29);
  }

  // game title — top right
  const { width } = getViewSize();
  ctx.save();
  ctx.textAlign    = 'right';
  ctx.letterSpacing = '4px';
  ctx.font          = 'bold 17px monospace';
  ctx.shadowColor   = 'rgba(220,170,40,0.85)';
  ctx.shadowBlur    = 16;
  ctx.fillStyle     = '#f0c840';
  ctx.fillText('NORTHERN SHIELD', width - 18, 34);
  ctx.shadowBlur    = 0;
  ctx.letterSpacing = '2px';
  ctx.font          = '10px monospace';
  ctx.fillStyle     = 'rgba(200,155,35,0.5)';
  ctx.fillText('TOWER DEFENSE', width - 18, 50);
  ctx.restore();

  if (!gameOver) return;

  const { height } = getViewSize();
  const cx = width / 2;
  const cy = height / 2;

  ctx.fillStyle = 'rgba(3,1,8,0.78)';
  ctx.fillRect(0, 0, width, height);

  drawFantasyPanel(cx - 210, cy - 100, 420, 178, 'rgba(6,2,14,0.96)', 0.8, 12);

  const line1 = 'DEFEATED';
  const line2 = `Warriors Slain: ${slain}`;

  ctx.save();
  ctx.textAlign   = 'center';
  ctx.shadowColor = 'rgba(200,50,50,0.7)';
  ctx.shadowBlur  = 20;
  ctx.fillStyle   = '#e84040';
  ctx.font        = 'bold 42px monospace';
  ctx.fillText(line1, cx, cy - 8);
  ctx.shadowBlur  = 0;
  ctx.fillStyle   = '#e8c040';
  ctx.font        = '18px monospace';
  ctx.fillText(line2, cx, cy + 28);
  ctx.restore();
}

function drawWaveAnnouncement() {
  if (gameOver) return;
  if (waveState === 'active') return;

  const { width, height } = getViewSize();
  const cx = width / 2;
  const cy = height / 2;

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
  ctx.fillText(line1, cx, cy - 10);

  ctx.shadowBlur  = 10;
  ctx.fillStyle   = 'rgba(200,230,200,0.85)';
  ctx.font        = '15px monospace';
  ctx.fillText(line2, cx, cy + 20);

  ctx.restore();
}

function draw() {
  const { width, height } = getViewSize();
  ctx.clearRect(0, 0, width, height);
  drawBackground();

  // Screen shake — applied to game world only, not HUD
  ctx.save();
  if (screenShake > 0.3) {
    ctx.translate(
      (Math.random() - 0.5) * screenShake * 2,
      (Math.random() - 0.5) * screenShake * 2
    );
  }

  const time = performance.now() * 0.001;
  grid.draw(ctx, time);
  drawPath();
  towers.forEach(t => t.draw(ctx));
  bullets.forEach(b => b.draw(ctx));
  enemies.forEach(e => e.draw(ctx));
  drawParticles();
  ctx.restore();

  drawHud();
  drawWaveAnnouncement();
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

gameLoop();
