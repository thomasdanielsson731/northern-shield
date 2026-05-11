import { ctx, canvas } from './renderer.js';
import { Grid, CELL } from '../grid/grid.js';
import { Enemy } from '../entities/enemy.js';
import { Tower, TOWER_DEFS, TOWER_TYPES } from '../entities/tower.js';

const COLS = 50;
const ROWS = 30;
const CELL_SIZE = 16;

const SPAWN = { col: 0, row: 15 };
const GOAL = { col: COLS - 1, row: 15 };

const WALL_COST = 5;
const KEYBINDINGS = {
  WALL: ['1', 'w']
};
const TOWER_ORDER = [TOWER_TYPES.GUN, TOWER_TYPES.SNIPER, TOWER_TYPES.RAPID];
const TOWER_BUTTON = {
  x: 12,
  y: 50,
  width: 130,
  height: 24,
  gap: 8
};

const ENEMY_REWARD = 6;
const STARTING_CREDITS = 120;
const STARTING_LIVES = 20;

const grid = new Grid(COLS, ROWS, CELL_SIZE);
grid.setCell(SPAWN.col, SPAWN.row, CELL.SPAWN);
grid.setCell(GOAL.col, GOAL.row, CELL.GOAL);

let currentPath = grid.findPath(SPAWN.col, SPAWN.row, GOAL.col, GOAL.row);
let enemies = [];
let towers = [];
let bullets = [];
let credits = STARTING_CREDITS;
let lives = STARTING_LIVES;
let kills = 0;
let buildMode = CELL.WALL;
let selectedTowerType = TOWER_TYPES.GUN;
let gameOver = false;

function getViewSize() {
  return {
    width: canvas.clientWidth || window.innerWidth,
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

function drawBackground() {
  const { width, height } = getViewSize();
  const time = performance.now() * 0.0002;

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#071422');
  gradient.addColorStop(0.45, '#0e2235');
  gradient.addColorStop(1, '#11192a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const pulse = 0.35 + Math.sin(time * 8) * 0.05;
  const glow = ctx.createRadialGradient(width * 0.7, height * 0.35, 20, width * 0.7, height * 0.35, 360);
  glow.addColorStop(0, `rgba(75, 126, 255, ${pulse})`);
  glow.addColorStop(1, 'rgba(75, 126, 255, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
}

function getTowerButtons() {
  return TOWER_ORDER.map((type, index) => ({
    type,
    x: TOWER_BUTTON.x + index * (TOWER_BUTTON.width + TOWER_BUTTON.gap),
    y: TOWER_BUTTON.y,
    width: TOWER_BUTTON.width,
    height: TOWER_BUTTON.height
  }));
}

function getTowerButtonAt(x, y) {
  const buttons = getTowerButtons();
  for (const button of buttons) {
    const inX = x >= button.x && x <= button.x + button.width;
    const inY = y >= button.y && y <= button.y + button.height;
    if (inX && inY) return button.type;
  }
  return null;
}

function spawnEnemy() {
  if (!currentPath || gameOver) return;
  const pixelPath = currentPath.map(({ col, row }) => grid.cellCenter(col, row));
  enemies.push(new Enemy(pixelPath));
}

function rerouteActiveEnemies() {
  for (const enemy of enemies) {
    if (!enemy.alive || enemy.reached) continue;

    const { col, row } = grid.pixelToCell(enemy.x, enemy.y);
    const enemyPath = grid.findPath(col, row, GOAL.col, GOAL.row);
    if (!enemyPath || enemyPath.length < 2) continue;

    const pixelPath = enemyPath.map(({ col: pathCol, row: pathRow }) =>
      grid.cellCenter(pathCol, pathRow)
    );
    enemy.setPath(pixelPath);
  }
}

function hasEnemyInCell(col, row) {
  const halfCell = CELL_SIZE / 2;
  const { x, y } = grid.cellCenter(col, row);

  return enemies.some((enemy) => {
    if (!enemy.alive || enemy.reached) return false;
    return Math.abs(enemy.x - x) < halfCell && Math.abs(enemy.y - y) < halfCell;
  });
}

setInterval(spawnEnemy, 2000);
spawnEnemy();

canvas.addEventListener('contextmenu', (e) => e.preventDefault());

window.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  if (KEYBINDINGS.WALL.includes(key)) buildMode = CELL.WALL;

  for (const type of TOWER_ORDER) {
    const towerDef = TOWER_DEFS[type];
    if (key === towerDef.key.toLowerCase()) {
      selectedTowerType = type;
      buildMode = CELL.TOWER;
      break;
    }
  }
});

canvas.addEventListener('mousedown', (e) => {
  if (gameOver) return;

  const rect = canvas.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  if (e.button === 0) {
    const clickedTowerType = getTowerButtonAt(mouseX, mouseY);
    if (clickedTowerType) {
      selectedTowerType = clickedTowerType;
      buildMode = CELL.TOWER;
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

  const placementType = buildMode;
  const cost = placementType === CELL.WALL ? WALL_COST : TOWER_DEFS[selectedTowerType].cost;
  if (credits < cost) return;

  grid.setCell(col, row, placementType);
  const newPath = grid.findPath(SPAWN.col, SPAWN.row, GOAL.col, GOAL.row);
  if (!newPath) {
    grid.setCell(col, row, CELL.EMPTY);
    return;
  }

  currentPath = newPath;
  rerouteActiveEnemies();
  credits -= cost;

  if (placementType === CELL.TOWER) {
    const { x, y } = grid.cellCenter(col, row);
    towers.push(new Tower(x, y, col, row, selectedTowerType));
  }
});

function update() {
  if (gameOver) return;

  for (const tower of towers) {
    const towerKills = tower.update(enemies, bullets);
    if (towerKills > 0) {
      kills += towerKills;
      credits += ENEMY_REWARD * towerKills;
    }
  }

  for (let i = bullets.length - 1; i >= 0; i--) {
    const bulletKills = bullets[i].update(enemies);
    if (bulletKills > 0) {
      kills += bulletKills;
      credits += ENEMY_REWARD * bulletKills;
    }

    if (!bullets[i].alive) {
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
      enemies.splice(i, 1);
      if (lives <= 0) {
        gameOver = true;
      }
    }
  }
}

function drawPath() {
  if (!currentPath || currentPath.length < 2) return;
  ctx.strokeStyle = 'rgba(255, 202, 112, 0.42)';
  ctx.shadowColor = 'rgba(255, 202, 112, 0.35)';
  ctx.shadowBlur = 8;
  ctx.lineWidth = CELL_SIZE * 0.7;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
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
  const topPanelX = 12;
  const topPanelY = 10;
  const topPanelW = 660;
  const topPanelH = 68;

  drawRoundedPanel(topPanelX, topPanelY, topPanelW, topPanelH, 10);
  ctx.fillStyle = 'rgba(8, 16, 28, 0.72)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(137, 174, 235, 0.4)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#e8f2ff';
  ctx.font = '14px monospace';
  const selectedTowerLabel = TOWER_DEFS[selectedTowerType].label;
  const selectedTowerCost = TOWER_DEFS[selectedTowerType].cost;
  const modeLabel =
    buildMode === CELL.WALL
      ? `Wall (1/W, $${WALL_COST})`
      : `Tower: ${selectedTowerLabel} ($${selectedTowerCost})`;
  ctx.fillText(`Credits: ${credits}  Lives: ${lives}  Kills: ${kills}`, 24, 34);
  ctx.fillStyle = '#c7d7f4';
  ctx.fillText(`Build: ${modeLabel} | Left: place/select | Right: remove`, 24, 56);

  const buttons = getTowerButtons();
  for (const button of buttons) {
    const towerDef = TOWER_DEFS[button.type];
    const isSelected = button.type === selectedTowerType;
    const affordable = credits >= towerDef.cost;

    drawRoundedPanel(button.x, button.y, button.width, button.height, 6);
    ctx.fillStyle = isSelected ? 'rgba(37, 64, 94, 0.92)' : 'rgba(22, 34, 48, 0.85)';
    ctx.fill();

    ctx.strokeStyle = towerDef.color;
    ctx.lineWidth = isSelected ? 2 : 1;
    ctx.stroke();

    ctx.fillStyle = affordable ? '#ecf5ff' : '#8ea0b8';
    ctx.font = '12px monospace';
    ctx.fillText(
      `${towerDef.key}: ${towerDef.label} $${towerDef.cost}`,
      button.x + 6,
      button.y + 16
    );
  }

  if (gameOver) {
    const { width, height } = getViewSize();
    const centerX = width / 2;
    const centerY = height / 2;
    const gameOverLabel = 'GAME OVER';
    const scoreLabel = `Final score: ${kills}`;

    ctx.fillStyle = 'rgba(3, 6, 10, 0.72)';
    ctx.fillRect(0, 0, width, height);

    drawRoundedPanel(centerX - 200, centerY - 96, 400, 170, 12);
    ctx.fillStyle = 'rgba(12, 20, 35, 0.88)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 40px monospace';
    ctx.fillText(gameOverLabel, centerX - ctx.measureText(gameOverLabel).width / 2, centerY - 10);
    ctx.font = '18px monospace';
    ctx.fillText(scoreLabel, centerX - ctx.measureText(scoreLabel).width / 2, centerY + 24);
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
