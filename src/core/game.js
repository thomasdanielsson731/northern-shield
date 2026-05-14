import { ctx, canvas } from './renderer.js';
import { Grid, CELL } from '../grid/grid.js';
import { Enemy, ENEMY_TYPES, ENEMY_DEFS } from '../entities/enemy.js';
import { Tower, TOWER_DEFS, TOWER_TYPES } from '../entities/tower.js';

const COLS = 50;
const ROWS = 30;
const CELL_SIZE = 14;

const GRID_TOP    = 42;
const GRID_BOTTOM = GRID_TOP + ROWS * CELL_SIZE;

const SPAWN = { col: 0,        row: 15 };
const GOAL  = { col: COLS - 1, row: 15 };

const WALL_COST = 5;

const BUILD_BTN = { x: 12, w: 106, h: 38, gap: 5 };

const BUILD_ITEMS = [
  { id: 'wall', label: 'Sköldborg', key: '1', color: '#6644aa', cost: WALL_COST, mode: CELL.WALL },
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
  selectedTower = null;
  screenShake   = 0;
  goldSpent     = 0;
  goldEarned    = 0;
  showTopList   = false;
  highScores    = loadHighScores();

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

function waveComposition(num) {
  return {
    infantry: Math.min(8 + num * 2, 32),
    drones:   num >= 2 ? Math.min(num, 12)                           : 0,
    tanks:    num >= 3 ? Math.min(Math.floor((num - 2) * 0.85), 6)   : 0,
    emps:     num >= 2 ? Math.min(Math.floor((num - 1) * 0.6),  6)   : 0,
  };
}

function buildWave(num) {
  const { infantry, drones, tanks, emps } = waveComposition(num);

  const queue = [
    ...Array(infantry).fill(ENEMY_TYPES.INFANTRY),
    ...Array(drones).fill(ENEMY_TYPES.DRONE),
    ...Array(tanks).fill(ENEMY_TYPES.TANK),
    ...Array(emps).fill(ENEMY_TYPES.EMP),
  ];

  for (let i = queue.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [queue[i], queue[j]] = [queue[j], queue[i]];
  }

  return queue;
}

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
  const btnY = GRID_BOTTOM + 9;
  return BUILD_ITEMS.map((item, i) => ({
    ...item,
    x:      BUILD_BTN.x + i * (BUILD_BTN.w + BUILD_BTN.gap),
    y:      btnY,
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
  const rect   = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

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

  // Build-mode button row (left-click only)
  if (e.button === 0) {
    const btn = getBuildButtonAt(mouseX, mouseY);
    if (btn) {
      buildMode = btn.mode;
      if (btn.mode === CELL.TOWER) selectedTowerType = btn.id;
      selectedTower = null;
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
      currentPath = grid.findPath(SPAWN.col, SPAWN.row, GOAL.col, GOAL.row);
      rerouteActiveEnemies();
      selectedTower = null;
      return;
    }
  }

  const { col, row } = grid.pixelToCell(mouseX, mouseY - GRID_TOP);
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
      currentPath = grid.findPath(SPAWN.col, SPAWN.row, GOAL.col, GOAL.row);
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

  // Left-click elsewhere: deselect
  selectedTower = null;

  if (cell !== CELL.EMPTY) return;
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
  goldSpent += cost;
  gold      -= cost;

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
      gold        += reward;
      goldEarned  += reward;
      if (b.target) spawnParticles(b.target.x, b.target.y, b.target.highlightColor ?? b.target.color, 12);
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
      screenShake = 10;
      enemies.splice(i, 1);
      if (lives <= 0) {
        gameOver   = true;
        highScores = saveHighScore({ waves: waveNumber, slain, goldEarned });
      }
    }
  }

  // EMP: Banshee disables nearby towers
  for (const enemy of enemies) {
    if (enemy.type !== ENEMY_TYPES.EMP || !enemy.alive || enemy.reached) continue;
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

  // CoC dirt path — warm sandy brown
  ctx.save();
  ctx.lineWidth   = CELL_SIZE * 0.72;
  ctx.lineJoin    = 'round';
  ctx.lineCap     = 'round';
  ctx.strokeStyle = 'rgba(180,130,60,0.55)';
  ctx.shadowColor = 'rgba(200,150,60,0.3)';
  ctx.shadowBlur  = 8;
  ctx.setLineDash([]);
  buildPathShape();
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Animated flowing dashes (direction indicator)
  ctx.lineWidth      = CELL_SIZE * 0.2;
  ctx.strokeStyle    = 'rgba(240,200,90,0.5)';
  ctx.setLineDash([6, 14]);
  ctx.lineDashOffset = -(time * 28) % 20;
  buildPathShape();
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawFrames() {
  const { width, height } = getViewSize();
  const gx = 0, gy = GRID_TOP;
  const gw = COLS * CELL_SIZE, gh = ROWS * CELL_SIZE;

  ctx.save();

  // ── Ornate grid border: silver outer → dark body → gold center ───────────────

  // 1. Deep drop shadow
  ctx.shadowColor   = 'rgba(0,0,0,0.95)';
  ctx.shadowBlur    = 20;
  ctx.shadowOffsetY = 4;
  ctx.strokeStyle   = '#0a0501';
  ctx.lineWidth     = 10;
  ctx.strokeRect(gx + 5, gy + 5, gw - 10, gh - 10);
  ctx.shadowBlur = ctx.shadowOffsetY = 0;

  // 2. Silver outer edge
  ctx.shadowColor = 'rgba(190,210,230,0.45)';
  ctx.shadowBlur  = 6;
  ctx.strokeStyle = '#b0bcc8';
  ctx.lineWidth   = 3;
  ctx.strokeRect(gx + 1.5, gy + 1.5, gw - 3, gh - 3);
  ctx.shadowBlur  = 0;

  // 3. Dark charcoal separator
  ctx.strokeStyle = '#1e1208';
  ctx.lineWidth   = 4;
  ctx.strokeRect(gx + 4, gy + 4, gw - 8, gh - 8);

  // 4. Gold center band with warm glow
  ctx.shadowColor = 'rgba(220,155,20,0.85)';
  ctx.shadowBlur  = 14;
  ctx.strokeStyle = '#d4982a';
  ctx.lineWidth   = 3.5;
  ctx.strokeRect(gx + 6.75, gy + 6.75, gw - 13.5, gh - 13.5);
  ctx.shadowBlur  = 0;

  // 5. Bright gold inner highlight
  ctx.strokeStyle = 'rgba(255,235,100,0.5)';
  ctx.lineWidth   = 1;
  ctx.strokeRect(gx + 9, gy + 9, gw - 18, gh - 18);

  // 6. Corner ornaments — silver shell + gold inner gem
  const ds = 11;
  for (const [cx, cy] of [[gx, gy], [gx + gw, gy], [gx, gy + gh], [gx + gw, gy + gh]]) {
    // silver outer diamond
    ctx.shadowColor = 'rgba(200,220,240,0.7)';
    ctx.shadowBlur  = 10;
    ctx.fillStyle   = '#c0ccd8';
    ctx.beginPath();
    ctx.moveTo(cx,                cy - ds);
    ctx.lineTo(cx + ds * 0.72,   cy);
    ctx.lineTo(cx,                cy + ds);
    ctx.lineTo(cx - ds * 0.72,   cy);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    // gold inner diamond
    const gi = ds * 0.58;
    ctx.shadowColor = '#ffe070';
    ctx.shadowBlur  = 12;
    ctx.fillStyle   = '#e8a820';
    ctx.beginPath();
    ctx.moveTo(cx,               cy - gi);
    ctx.lineTo(cx + gi * 0.72,  cy);
    ctx.lineTo(cx,               cy + gi);
    ctx.lineTo(cx - gi * 0.72,  cy);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    // facet gleam
    ctx.fillStyle = 'rgba(255,255,200,0.9)';
    ctx.beginPath();
    ctx.arc(cx - gi * 0.2, cy - gi * 0.28, gi * 0.22, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Outer game border: silver outer, gold middle, dark inner ─────────────────

  // 1. Black shadow
  ctx.shadowColor   = 'rgba(0,0,0,0.98)';
  ctx.shadowBlur    = 16;
  ctx.shadowOffsetY = 3;
  ctx.strokeStyle   = '#0a0501';
  ctx.lineWidth     = 8;
  ctx.strokeRect(4, 4, width - 8, height - 8);
  ctx.shadowBlur = ctx.shadowOffsetY = 0;

  // 2. Silver outer line
  ctx.shadowColor = 'rgba(180,200,220,0.4)';
  ctx.shadowBlur  = 5;
  ctx.strokeStyle = '#a0aeb8';
  ctx.lineWidth   = 2.5;
  ctx.strokeRect(2, 2, width - 4, height - 4);
  ctx.shadowBlur  = 0;

  // 3. Dark separator
  ctx.strokeStyle = '#1a0f05';
  ctx.lineWidth   = 4;
  ctx.strokeRect(5.5, 5.5, width - 11, height - 11);

  // 4. Gold middle band
  ctx.shadowColor = 'rgba(200,140,15,0.65)';
  ctx.shadowBlur  = 8;
  ctx.strokeStyle = '#b8861e';
  ctx.lineWidth   = 2.5;
  ctx.strokeRect(8, 8, width - 16, height - 16);
  ctx.shadowBlur  = 0;

  // 5. Faint inner gold gleam
  ctx.strokeStyle = 'rgba(255,210,60,0.2)';
  ctx.lineWidth   = 1;
  ctx.strokeRect(10.5, 10.5, width - 21, height - 21);

  // 6. Outer corner ornaments — silver outer, gold inner
  const os = 8;
  for (const [cx, cy] of [[14, 14], [width - 14, 14], [14, height - 14], [width - 14, height - 14]]) {
    ctx.shadowColor = 'rgba(190,210,230,0.6)';
    ctx.shadowBlur  = 8;
    ctx.fillStyle   = '#b0bcc8';
    ctx.beginPath();
    ctx.moveTo(cx,               cy - os);
    ctx.lineTo(cx + os * 0.72,  cy);
    ctx.lineTo(cx,               cy + os);
    ctx.lineTo(cx - os * 0.72,  cy);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    const oi = os * 0.55;
    ctx.shadowColor = '#ffd060';
    ctx.shadowBlur  = 8;
    ctx.fillStyle   = '#c88c18';
    ctx.beginPath();
    ctx.moveTo(cx,               cy - oi);
    ctx.lineTo(cx + oi * 0.72,  cy);
    ctx.lineTo(cx,               cy + oi);
    ctx.lineTo(cx - oi * 0.72,  cy);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(255,250,180,0.8)';
    ctx.beginPath();
    ctx.arc(cx - oi * 0.2, cy - oi * 0.28, oi * 0.22, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawSidePanel() {
  const { width } = getViewSize();
  const panelX = COLS * CELL_SIZE + 8;
  const panelW = width - panelX - 8;
  if (panelW < 130) return;

  const panelY = GRID_TOP + 4;
  const panelH = ROWS * CELL_SIZE - 8;
  drawFantasyPanel(panelX, panelY, panelW, panelH, 'rgba(60,35,10,0.92)');

  const lx  = panelX + 12;
  let   ly  = panelY + 20;
  const gap = 17;

  function divider() {
    ctx.strokeStyle = 'rgba(210,160,40,0.22)';
    ctx.lineWidth   = 0.5;
    ctx.beginPath();
    ctx.moveTo(panelX + 8, ly);
    ctx.lineTo(panelX + panelW - 8, ly);
    ctx.stroke();
    ly += 10;
  }

  function stat(icon, label, value, color = '#c0b090') {
    ctx.font      = '11px monospace';
    ctx.fillStyle = color;
    ctx.fillText(`${icon} ${label}`, lx, ly);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#e8c040';
    ctx.fillText(`${value}`, panelX + panelW - 10, ly);
    ctx.textAlign = 'left';
    ly += gap;
  }

  ctx.save();
  ctx.textAlign = 'left';

  // Title
  ctx.font        = 'bold 12px monospace';
  ctx.fillStyle   = '#f0c840';
  ctx.shadowColor = 'rgba(220,170,40,0.7)';
  ctx.shadowBlur  = 8;
  ctx.fillText('RAPPORT', lx, ly);
  ctx.shadowBlur  = 0;
  ly += gap + 2;
  divider();

  // Tower breakdown
  const towerCounts = {};
  let   wallCount   = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid.cells[r][c] === CELL.WALL) wallCount++;
    }
  }
  for (const t of towers) towerCounts[t.type] = (towerCounts[t.type] ?? 0) + 1;

  stat('🗼', 'Torn', towers.length, '#c0b090');
  for (const type of Object.values(TOWER_TYPES)) {
    const n = towerCounts[type] ?? 0;
    if (n === 0) continue;
    const def = TOWER_DEFS[type];
    ctx.font      = '10px monospace';
    ctx.fillStyle = def.color;
    ctx.fillText(`  ${def.label}`, lx, ly);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#e8c040';
    ctx.fillText(`${n}`, panelX + panelW - 10, ly);
    ctx.textAlign = 'left';
    ly += gap - 2;
  }
  stat('🧱', 'Murar', wallCount, '#a09070');
  divider();

  // Economy
  stat('◆', 'Förtjänat', `+${goldEarned}`, '#e8c040');
  stat('◆', 'Spenderat', `-${goldSpent}`, '#c09040');
  divider();

  // Battle
  stat('★', 'Slagna', slain, '#b8c8e0');
  const leaked = STARTING_LIVES - lives;
  stat('♥', 'Läckt', `${leaked}/${STARTING_LIVES}`, leaked > 0 ? '#ff9090' : '#60e880');
  divider();

  // Next wave preview
  if (!gameOver && waveState !== 'active') {
    const nextNum = waveNumber + 1;
    ctx.font      = 'bold 10px monospace';
    ctx.fillStyle = '#a0e0c0';
    ctx.fillText(`Våg ${nextNum}:`, lx, ly);
    ly += gap;
    const next = waveComposition(nextNum);
    const preview = [
      { label: `● ×${next.infantry}`, color: '#bb70ff' },
      { label: `◆ ×${next.drones}`,   color: '#88bbff', skip: next.drones === 0 },
      { label: `◉ ×${next.tanks}`,    color: '#c07820', skip: next.tanks  === 0 },
      { label: `✦ ×${next.emps}`,     color: '#00ddcc', skip: next.emps   === 0 },
    ];
    for (const p of preview) {
      if (p.skip) continue;
      ctx.font      = '10px monospace';
      ctx.fillStyle = p.color;
      ctx.fillText(`  ${p.label}`, lx, ly);
      ly += gap - 2;
    }
  }

  ctx.restore();
}

function drawHud() {
  const { width } = getViewSize();

  // ── Top status bar ────────────────────────────────────────────────────────────
  const topX = 8, topY = 6, topH = 30;
  const topW = width - 16;
  drawFantasyPanel(topX, topY, topW, topH, 'rgba(60,35,10,0.95)');

  ctx.save();
  ctx.font = '13px monospace';
  let sx = topX + 14;
  const sy = topY + 20;

  ctx.fillStyle = '#e8c040';
  ctx.fillText(`◆ Gold: ${gold}`, sx, sy);
  sx += ctx.measureText(`◆ Gold: ${gold}`).width + 18;

  ctx.fillStyle = '#ff9090';
  ctx.fillText(`♥ Lives: ${lives}`, sx, sy);
  sx += ctx.measureText(`♥ Lives: ${lives}`).width + 18;

  ctx.fillStyle = '#b8c8e0';
  ctx.fillText(`★ Slain: ${slain}`, sx, sy);
  sx += ctx.measureText(`★ Slain: ${slain}`).width + 18;

  const waveLabel = waveNumber === 0 ? '-' : `${waveNumber}`;
  ctx.fillStyle = '#a0e0c0';
  ctx.fillText(`⚔ Wave: ${waveLabel}`, sx, sy);
  sx += ctx.measureText(`⚔ Wave: ${waveLabel}`).width + 14;

  if (waveNumber > 0 && waveState === 'active') {
    const remaining = spawnQueue.length + enemies.length;
    ctx.fillStyle = remaining > 0 ? '#e8a060' : '#60e880';
    ctx.fillText(`◈ ${remaining}/${waveTotal}`, sx, sy);
  }
  ctx.restore();

  // title — right side of top bar
  ctx.save();
  ctx.textAlign     = 'right';
  ctx.letterSpacing = '4px';
  ctx.font          = 'bold 17px monospace';
  ctx.shadowColor   = 'rgba(220,170,40,0.85)';
  ctx.shadowBlur    = 16;
  ctx.fillStyle     = '#f0c840';
  ctx.fillText('NORTHERN SHIELD', width - 18, topY + 21);
  ctx.shadowBlur    = 0;
  ctx.restore();

  // ── Bottom build bar ──────────────────────────────────────────────────────────
  const buildPanelX = 8;
  const buildPanelY = GRID_BOTTOM + 4;
  const buildPanelW = BUILD_BTN.x + BUILD_ITEMS.length * (BUILD_BTN.w + BUILD_BTN.gap) - BUILD_BTN.gap + 10;
  const buildPanelH = BUILD_BTN.h + 18;
  drawFantasyPanel(buildPanelX, buildPanelY, buildPanelW, buildPanelH, 'rgba(60,35,10,0.95)');

  for (const btn of getBuildButtons()) {
    const isSelected = btn.mode === CELL.WALL
      ? buildMode === CELL.WALL
      : buildMode === CELL.TOWER && selectedTowerType === btn.id;
    const affordable = gold >= btn.cost;

    const fillStyle   = isSelected ? 'rgba(55,30,8,0.96)' : 'rgba(8,4,18,0.90)';
    const borderAlpha = isSelected ? 0.88 : 0.38;
    drawFantasyPanel(btn.x, btn.y, btn.width, btn.height, fillStyle, borderAlpha, 6);

    ctx.font      = 'bold 11px monospace';
    ctx.fillStyle = isSelected ? '#e8c040' : 'rgba(180,150,80,0.65)';
    ctx.fillText(`[${btn.key}]`, btn.x + 7, btn.y + 15);

    ctx.font      = '12px monospace';
    ctx.fillStyle = !affordable ? '#4a4030' : isSelected ? '#fff' : '#c0b090';
    ctx.fillText(btn.label, btn.x + 7, btn.y + 29);

    const costStr = `$${btn.cost}`;
    ctx.fillStyle = !affordable ? '#3a3020' : isSelected ? '#e8c040' : '#907840';
    ctx.fillText(costStr, btn.x + btn.width - ctx.measureText(costStr).width - 7, btn.y + 29);
  }

  if (!gameOver) return;

  const { height } = getViewSize();
  const cx = width / 2;
  const cy = height / 2;

  ctx.fillStyle = 'rgba(3,1,8,0.82)';
  ctx.fillRect(0, 0, width, height);

  if (showTopList) {
    // ── Toplist screen ──────────────────────────────────────────────────────────
    const pw = 380, ph = Math.min(60 + highScores.length * 26 + 60, 360);
    const px = cx - pw / 2, py = cy - ph / 2;
    drawFantasyPanel(px, py, pw, ph, 'rgba(6,2,14,0.97)', 0.85, 12);

    ctx.save();
    ctx.textAlign   = 'center';
    ctx.shadowColor = 'rgba(220,170,30,0.8)';
    ctx.shadowBlur  = 14;
    ctx.fillStyle   = '#f0c840';
    ctx.font        = 'bold 22px monospace';
    ctx.fillText('TOPPLISTA', cx, py + 36);
    ctx.shadowBlur  = 0;

    ctx.textAlign = 'left';
    const colX = [px + 20, px + 80, cx, px + pw - 20];
    let   row   = py + 60;
    ctx.font      = 'bold 10px monospace';
    ctx.fillStyle = 'rgba(200,160,40,0.6)';
    ctx.fillText('#', colX[0], row);
    ctx.fillText('Våg', colX[1], row);
    ctx.fillText('Slagna', colX[2], row);
    ctx.textAlign = 'right';
    ctx.fillText('Guld', colX[3], row);
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
      row += 24;
    });

    if (highScores.length === 0) {
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(160,140,100,0.6)';
      ctx.font      = '12px monospace';
      ctx.fillText('Inga resultat ännu', cx, row);
      row += 24;
    }
    ctx.restore();

    const bbW = 160, bbH = 36;
    const bbX = cx - bbW / 2, bbY = py + ph - 50;
    drawFantasyPanel(bbX, bbY, bbW, bbH, 'rgba(8,6,22,0.97)', 0.7, 6);
    ctx.save();
    ctx.textAlign   = 'center';
    ctx.font        = 'bold 13px monospace';
    ctx.fillStyle   = '#a0c0e8';
    ctx.fillText('← TILLBAKA', cx, bbY + 23);
    ctx.restore();
    restartBtn = { x: bbX, y: bbY, w: bbW, h: bbH, action: 'back' };

  } else {
    // ── Game-over screen ────────────────────────────────────────────────────────
    drawFantasyPanel(cx - 220, cy - 120, 440, 230, 'rgba(6,2,14,0.97)', 0.82, 12);

    ctx.save();
    ctx.textAlign   = 'center';
    ctx.shadowColor = 'rgba(200,50,50,0.7)';
    ctx.shadowBlur  = 22;
    ctx.fillStyle   = '#e84040';
    ctx.font        = 'bold 44px monospace';
    ctx.fillText('BESEGRAD', cx, cy - 30);
    ctx.shadowBlur  = 0;
    ctx.fillStyle   = '#e8c040';
    ctx.font        = '14px monospace';
    ctx.fillText(`Slagna fiender: ${slain}`, cx, cy + 2);
    ctx.fillText(`Vågor klara: ${waveNumber}   Guld förtjänat: ${goldEarned}`, cx, cy + 22);
    ctx.restore();

    const rbW = 160, rbH = 38;
    const tlW = 160, tlH = 38;
    const gap = 12;
    const totalW = rbW + gap + tlW;
    const rbX  = cx - totalW / 2,         rbY = cy + 52;
    const tlX  = cx - totalW / 2 + rbW + gap, tlY = cy + 52;

    drawFantasyPanel(rbX, rbY, rbW, rbH, 'rgba(8,26,8,0.97)', 0.75, 6);
    ctx.save();
    ctx.textAlign   = 'center';
    ctx.font        = 'bold 13px monospace';
    ctx.fillStyle   = '#88ee66';
    ctx.shadowColor = 'rgba(100,220,80,0.55)';
    ctx.shadowBlur  = 10;
    ctx.fillText('SPELA IGEN', rbX + rbW / 2, rbY + 25);
    ctx.restore();

    drawFantasyPanel(tlX, tlY, tlW, tlH, 'rgba(12,8,28,0.97)', 0.7, 6);
    ctx.save();
    ctx.textAlign   = 'center';
    ctx.font        = 'bold 13px monospace';
    ctx.fillStyle   = '#e8c040';
    ctx.shadowColor = 'rgba(220,170,30,0.55)';
    ctx.shadowBlur  = 8;
    ctx.fillText('TOPPLISTA ★', tlX + tlW / 2, tlY + 25);
    ctx.restore();

    restartBtn = { x: rbX, y: rbY, w: rbW, h: rbH, action: 'restart' };
    toplistBtn = { x: tlX, y: tlY, w: tlW, h: tlH };
  }
}

function drawTowerPanel(tower) {
  const panelW = 162;
  const panelH = 86;
  const { width, height } = getViewSize();

  let px = tower.x - panelW / 2;
  let py = (tower.y + GRID_TOP) - panelH - CELL_SIZE - 4;
  px = Math.max(8, Math.min(px, width  - panelW - 8));
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

function drawWaveAnnouncement() {
  if (gameOver) return;
  if (waveState === 'active') return;

  const { width } = getViewSize();
  const cx = width / 2;
  const cy = GRID_TOP + (ROWS * CELL_SIZE) / 2;

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
    if (next.infantry > 0) parts.push({ label: `● ×${next.infantry}`, color: '#bb70ff' });
    if (next.drones   > 0) parts.push({ label: `◆ ×${next.drones}`,   color: '#88bbff' });
    if (next.tanks    > 0) parts.push({ label: `◉ ×${next.tanks}`,    color: '#c07820' });
    if (next.emps     > 0) parts.push({ label: `✦ ×${next.emps}`,     color: '#00ddcc' });

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

function draw() {
  const { width, height } = getViewSize();
  ctx.clearRect(0, 0, width, height);
  drawBackground();

  // Game world — translated down by GRID_TOP so the top status bar doesn't cover the grid
  ctx.save();
  ctx.translate(
    screenShake > 0.3 ? (Math.random() - 0.5) * screenShake * 2 : 0,
    GRID_TOP + (screenShake > 0.3 ? (Math.random() - 0.5) * screenShake * 2 : 0)
  );

  const time = performance.now() * 0.001;
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
  ctx.restore();

  drawFrames();
  drawSidePanel();
  drawHud();
  drawWaveAnnouncement();
  if (selectedTower && !gameOver) drawTowerPanel(selectedTower);
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

gameLoop();
