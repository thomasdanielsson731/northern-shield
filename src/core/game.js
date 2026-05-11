import { ctx, canvas } from './renderer.js';
import { Grid, CELL } from '../grid/grid.js';
import { Enemy } from '../entities/enemy.js';

const COLS = 50;
const ROWS = 30;
const CELL_SIZE = 16;

const SPAWN = { col: 0, row: 15 };
const GOAL  = { col: COLS - 1, row: 15 };

const grid = new Grid(COLS, ROWS, CELL_SIZE);
grid.setCell(SPAWN.col, SPAWN.row, CELL.SPAWN);
grid.setCell(GOAL.col,  GOAL.row,  CELL.GOAL);

let currentPath = grid.findPath(SPAWN.col, SPAWN.row, GOAL.col, GOAL.row);
let enemies = [];

function spawnEnemy() {
  if (!currentPath) return;
  const pixelPath = currentPath.map(({ col, row }) => grid.cellCenter(col, row));
  enemies.push(new Enemy(pixelPath));
}

setInterval(spawnEnemy, 2000);
spawnEnemy();

canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const { col, row } = grid.pixelToCell(e.clientX - rect.left, e.clientY - rect.top);
  const cell = grid.getCell(col, row);

  if (cell === null || cell === CELL.SPAWN || cell === CELL.GOAL) return;

  if (cell === CELL.WALL) {
    // Remove wall on second click
    grid.setCell(col, row, CELL.EMPTY);
    currentPath = grid.findPath(SPAWN.col, SPAWN.row, GOAL.col, GOAL.row);
  } else {
    // Place wall only if a path remains
    grid.setCell(col, row, CELL.WALL);
    const newPath = grid.findPath(SPAWN.col, SPAWN.row, GOAL.col, GOAL.row);
    if (newPath) {
      currentPath = newPath;
    } else {
      grid.setCell(col, row, CELL.EMPTY); // revert: would fully block path
    }
  }
});

function update() {
  for (let i = enemies.length - 1; i >= 0; i--) {
    enemies[i].update();
    if (enemies[i].reached || !enemies[i].alive) enemies.splice(i, 1);
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

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  grid.draw(ctx);
  drawPath();
  enemies.forEach(e => e.draw(ctx));
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

gameLoop();
