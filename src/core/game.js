import { ctx, canvas } from './renderer.js';
import { Grid, CELL } from '../grid/grid.js';
import { Enemy } from '../entities/enemy.js';
import { Tower } from '../entities/tower.js';

const COLS = 50;
const ROWS = 30;
const CELL_SIZE = 16;

const SPAWN = { col: 0, row: 15 };
const GOAL = { col: COLS - 1, row: 15 };

const BUILD_COST = {
  [CELL.WALL]: 5,
  [CELL.TOWER]: 20
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
let credits = STARTING_CREDITS;
let lives = STARTING_LIVES;
let kills = 0;
let buildMode = CELL.WALL;
let gameOver = false;

function spawnEnemy() {
  if (!currentPath || gameOver) return;
  const pixelPath = currentPath.map(({ col, row }) => grid.cellCenter(col, row));
  enemies.push(new Enemy(pixelPath));
}

setInterval(spawnEnemy, 2000);
spawnEnemy();

canvas.addEventListener('contextmenu', (e) => e.preventDefault());

window.addEventListener('keydown', (e) => {
  if (e.key === '1' || e.key.toLowerCase() === 'w') buildMode = CELL.WALL;
  if (e.key === '2' || e.key.toLowerCase() === 't') buildMode = CELL.TOWER;
});

canvas.addEventListener('mousedown', (e) => {
  if (gameOver) return;

  const rect = canvas.getBoundingClientRect();
  const { col, row } = grid.pixelToCell(e.clientX - rect.left, e.clientY - rect.top);
  const cell = grid.getCell(col, row);

  if (cell === null || cell === CELL.SPAWN || cell === CELL.GOAL) return;

  if (e.button === 2) {
    if (cell === CELL.WALL || cell === CELL.TOWER) {
      grid.setCell(col, row, CELL.EMPTY);
      towers = towers.filter(t => t.col !== col || t.row !== row);
      currentPath = grid.findPath(SPAWN.col, SPAWN.row, GOAL.col, GOAL.row);
    }
    return;
  }

  if (e.button !== 0 || cell !== CELL.EMPTY) return;

  const placementType = buildMode;
  const cost = BUILD_COST[placementType];
  if (credits < cost) return;

  grid.setCell(col, row, placementType);
  const newPath = grid.findPath(SPAWN.col, SPAWN.row, GOAL.col, GOAL.row);
  if (!newPath) {
    grid.setCell(col, row, CELL.EMPTY);
    return;
  }

  currentPath = newPath;
  credits -= cost;

  if (placementType === CELL.TOWER) {
    const { x, y } = grid.cellCenter(col, row);
    towers.push(new Tower(x, y, col, row));
  }
});

function update() {
  if (gameOver) return;

  for (const tower of towers) {
    const towerKills = tower.update(enemies);
    if (towerKills > 0) {
      kills += towerKills;
      credits += ENEMY_REWARD * towerKills;
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
  ctx.strokeStyle = 'rgba(255, 200, 0, 0.15)';
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
}

function drawHud() {
  ctx.fillStyle = '#dbe5ff';
  ctx.font = '14px monospace';
  const modeLabel = buildMode === CELL.WALL ? 'Wall (1/W)' : 'Tower (2/T)';
  ctx.fillText(`Credits: ${credits}  Lives: ${lives}  Kills: ${kills}`, 12, 22);
  ctx.fillText(`Build: ${modeLabel} | Left click: place | Right click: remove`, 12, 42);

  if (gameOver) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 40px monospace';
    ctx.fillText('GAME OVER', canvas.width / 2 - 120, canvas.height / 2 - 10);
    ctx.font = '18px monospace';
    ctx.fillText(`Final score: ${kills}`, canvas.width / 2 - 70, canvas.height / 2 + 24);
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  grid.draw(ctx);
  drawPath();
  towers.forEach(t => t.draw(ctx));
  enemies.forEach(e => e.draw(ctx));
  drawHud();
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

gameLoop();
