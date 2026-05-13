import { ctx, canvas } from './renderer.js';
import { Grid, CELL } from '../grid/grid.js';
import { Enemy, ENEMY_TYPES, ENEMY_DEFS } from '../entities/enemy.js';
import { Tower, TOWER_DEFS, TOWER_TYPES } from '../entities/tower.js';

const COLS = 50;
const ROWS = 30;
const CELL_SIZE = 16;

const SPAWN = { col: 0, row: 15 };
const GOAL  = { col: COLS - 1, row: 15 };

const WALL_COST = 5;

const BUILD_BTN = { x: 12, y: 40, w: 112, h: 38, gap: 6 };

const BUILD_ITEMS = [
  { id: 'wall', label: 'Wall', key: '1', color: '#8899bb', cost: WALL_COST, mode: CELL.WALL },
  ...Object.values(TOWER_TYPES).map(type => ({
    id: type,
    label: TOWER_DEFS[type].label,
    key: TOWER_DEFS[type].key,
    color: TOWER_DEFS[type].color,
    cost: TOWER_DEFS[type].cost,
    mode: CELL.TOWER
  }))
];

const STARTING_CREDITS = 120;
const STARTING_LIVES   = 20;

const grid = new Grid(COLS, ROWS, CELL_SIZE);
grid.setCell(SPAWN.col, SPAWN.row, CELL.SPAWN);
grid.setCell(GOAL.col,  GOAL.row,  CELL.GOAL);

let currentPath = grid.findPath(SPAWN.col, SPAWN.row, GOAL.col, GOAL.row);
let enemies  = [];
let towers   = [];
let bullets  = [];
let credits  = STARTING_CREDITS;
let lives    = STARTING_LIVES;
let kills    = 0;
let buildMode = CELL.WALL;
let selectedTowerType = TOWER_TYPES.GUN;
let gameOver = false;

// ── helpers ──────────────────────────────────────────────────────────────────

function getViewSize() {
  return {
    width:  canvas.clientWidth  || window.innerWidth,
    height: canvas.clientHeight || window.innerHeight
  };
}

function drawRoundedPanel(x, y, width, height, radius = 8) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function getBuildButtons() {
  return BUILD_ITEMS.map((item, i) => ({
    ...item,
    x: BUILD_BTN.x + i * (BUILD_BTN.w + BUILD_BTN.gap),
    y: BUILD_BTN.y,
    width: BUILD_BTN.w,
    height: BUILD_BTN.h
  }));
}

function getBuildButtonAt(mx, my) {
  for (const btn of getBuildButtons()) {
    if (mx >= btn.x && mx <= btn.x + btn.width &&
        my >= btn.y && my <= btn.y + btn.height) {
      return btn;
    }
  }
  return null;
}

// ── spawning ──────────────────────────────────────────────────────────────────

function spawnEnemy(type = ENEMY_TYPES.INFANTRY) {
  if (!currentPath || gameOver) return;

  let path;
  if (ENEMY_DEFS[type].flying) {
    const start = grid.cellCenter(SPAWN.col, SPAWN.row);
    const goal  = grid.cellCenter(GOAL.col,  GOAL.row);
    path = [start, goal];
  } else {
    path = currentPath.map(({ col, row }) => grid.cellCenter(col, row));
  }

  enemies.push(new Enemy(path, type));
}

setInterval(() => spawnEnemy(ENEMY_TYPES.INFANTRY), 1800);
setInterval(() => spawnEnemy(ENEMY_TYPES.DRONE),    5000);
setInterval(() => spawnEnemy(ENEMY_TYPES.TANK),    12000);
spawnEnemy(ENEMY_TYPES.INFANTRY);

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
  const halfCell = CELL_SIZE / 2;
  const { x, y } = grid.cellCenter(col, row);
  return enemies.some(e => {
    if (!e.alive || e.reached) return false;
    return Math.abs(e.x - x) < halfCell && Math.abs(e.y - y) < halfCell;
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

  const rect  = canvas.getBoundingClientRect();
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
      towers = towers.filter(t => t.col !== col || t.row !== row);
      currentPath = grid.findPath(SPAWN.col, SPAWN.row, GOAL.col, GOAL.row);
      rerouteActiveEnemies();
    }
    return;
  }

  if (e.button !== 0 || cell !== CELL.EMPTY) return;
  if (hasEnemyInCell(col, row)) return;

  const cost = buildMode === CELL.WALL ? WALL_COST : TOWER_DEFS[selectedTowerType].cost;
  if (credits < cost) return;

  grid.setCell(col, row, buildMode);
  const newPath = grid.findPath(SPAWN.col, SPAWN.row, GOAL.col, GOAL.row);
  if (!newPath) {
    grid.setCell(col, row, CELL.EMPTY);
    return;
  }

  currentPath = newPath;
  rerouteActiveEnemies();
  credits -= cost;

  if (buildMode === CELL.TOWER) {
    const { x, y } = grid.cellCenter(col, row);
    towers.push(new Tower(x, y, col, row, selectedTowerType));
  }
});

// ── update ────────────────────────────────────────────────────────────────────

function update() {
  if (gameOver) return;

  for (const tower of towers) {
    tower.update(enemies, bullets);
  }

  for (let i = bullets.length - 1; i >= 0; i--) {
    const reward = bullets[i].update();
    if (reward > 0) {
      kills++;
      credits += reward;
    }
    if (!bullets[i].alive) bullets.splice(i, 1);
  }

  for (let i = enemies.length - 1; i >= 0; i--) {
    enemies[i].update();
    if (!enemies[i].alive) {
      enemies.splice(i, 1);
      continue;
    }
    if (enemies[i].reached) {
      lives--;
      enemies.splice(i, 1);
      if (lives <= 0) gameOver = true;
    }
  }
}

// ── draw ──────────────────────────────────────────────────────────────────────

function drawBackground() {
  const { width, height } = getViewSize();
  const time = performance.now() * 0.0002;

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0,    '#071422');
  gradient.addColorStop(0.45, '#0e2235');
  gradient.addColorStop(1,    '#11192a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const pulse = 0.35 + Math.sin(time * 8) * 0.05;
  const glow  = ctx.createRadialGradient(width * 0.7, height * 0.35, 20, width * 0.7, height * 0.35, 360);
  glow.addColorStop(0, `rgba(75,126,255,${pulse})`);
  glow.addColorStop(1, 'rgba(75,126,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
}

function drawPath() {
  if (!currentPath || currentPath.length < 2) return;

  ctx.strokeStyle = 'rgba(255,202,112,0.42)';
  ctx.shadowColor  = 'rgba(255,202,112,0.35)';
  ctx.shadowBlur   = 8;
  ctx.lineWidth    = CELL_SIZE * 0.7;
  ctx.lineJoin     = 'round';
  ctx.lineCap      = 'round';
  ctx.beginPath();

  const { x: sx, y: sy } = grid.cellCenter(currentPath[0].col, currentPath[0].row);
  ctx.moveTo(sx, sy);
  for (let i = 1; i < currentPath.length; i++) {
    const { x, y } = grid.cellCenter(currentPath[i].col, currentPath[i].row);
    ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function drawHud() {
  const panelX = 10;
  const panelY = 8;
  const panelW = BUILD_BTN.x + BUILD_ITEMS.length * (BUILD_BTN.w + BUILD_BTN.gap) - BUILD_BTN.gap + 10;
  const panelH = BUILD_BTN.y + BUILD_BTN.h + 10;

  // panel background
  drawRoundedPanel(panelX, panelY, panelW, panelH, 10);
  ctx.fillStyle = 'rgba(8,16,28,0.78)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(137,174,235,0.35)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // stats
  ctx.fillStyle = '#e8f2ff';
  ctx.font = '13px monospace';
  ctx.fillText(`Credits: ${credits}   Lives: ${lives}   Kills: ${kills}`, panelX + 14, panelY + 26);

  // build buttons
  for (const btn of getBuildButtons()) {
    const isWallSelected  = btn.mode === CELL.WALL   && buildMode === CELL.WALL;
    const isTowerSelected = btn.mode === CELL.TOWER  && buildMode === CELL.TOWER && selectedTowerType === btn.id;
    const isSelected      = isWallSelected || isTowerSelected;
    const affordable      = credits >= btn.cost;

    drawRoundedPanel(btn.x, btn.y, btn.width, btn.height, 6);
    ctx.fillStyle = isSelected ? 'rgba(40,70,110,0.95)' : 'rgba(18,28,44,0.88)';
    ctx.fill();

    ctx.strokeStyle = isSelected ? btn.color : 'rgba(100,120,160,0.4)';
    ctx.lineWidth   = isSelected ? 2 : 1;
    ctx.stroke();

    // key badge
    ctx.fillStyle = isSelected ? btn.color : 'rgba(180,200,230,0.5)';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(`[${btn.key}]`, btn.x + 7, btn.y + 15);

    // label
    ctx.fillStyle = affordable ? (isSelected ? '#fff' : '#c8daef') : '#5a6a80';
    ctx.font = '12px monospace';
    ctx.fillText(btn.label, btn.x + 7, btn.y + 28);

    // cost — right-aligned
    const costStr = `$${btn.cost}`;
    const costW   = ctx.measureText(costStr).width;
    ctx.fillStyle = affordable ? (isSelected ? '#aaddff' : '#7a9ab8') : '#445060';
    ctx.fillText(costStr, btn.x + btn.width - costW - 7, btn.y + 28);
  }

  if (gameOver) {
    const { width, height } = getViewSize();
    const cx = width / 2;
    const cy = height / 2;

    ctx.fillStyle = 'rgba(3,6,10,0.72)';
    ctx.fillRect(0, 0, width, height);

    drawRoundedPanel(cx - 200, cy - 96, 400, 170, 12);
    ctx.fillStyle = 'rgba(12,20,35,0.88)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.stroke();

    const label1 = 'GAME OVER';
    const label2 = `Final score: ${kills}`;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 40px monospace';
    ctx.fillText(label1, cx - ctx.measureText(label1).width / 2, cy - 10);
    ctx.font = '18px monospace';
    ctx.fillText(label2, cx - ctx.measureText(label2).width / 2, cy + 24);
  }
}

function draw() {
  const { width, height } = getViewSize();
  ctx.clearRect(0, 0, width, height);
  drawBackground();
  grid.draw(ctx);
  drawPath();
  towers.forEach(t => t.draw(ctx));
  bullets.forEach(b => b.draw(ctx));
  enemies.forEach(e => e.draw(ctx));
  drawHud();
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

gameLoop();
