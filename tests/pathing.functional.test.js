import { describe, it, expect } from 'vitest';
import { Grid, CELL } from '../src/grid/grid.js';
import { Enemy } from '../src/entities/enemy.js';

describe('Pathing (functional)', () => {
  it('reroutes an active enemy around a newly placed blocker', () => {
    const grid = new Grid(10, 5, 10);
    const spawn = { col: 0, row: 2 };
    const goal = { col: 9, row: 2 };

    grid.setCell(spawn.col, spawn.row, CELL.SPAWN);
    grid.setCell(goal.col, goal.row, CELL.GOAL);

    const initialPath = grid.findPath(spawn.col, spawn.row, goal.col, goal.row);
    const initialPixelPath = initialPath.map(({ col, row }) => grid.cellCenter(col, row));
    const enemy = new Enemy(initialPixelPath, 2);

    for (let i = 0; i < 12; i++) enemy.update();

    const enemyCell = grid.pixelToCell(enemy.x, enemy.y);
    const oldY = enemy.y;
    const blockerCol = Math.min(enemyCell.col + 1, goal.col - 1);
    grid.setCell(blockerCol, spawn.row, CELL.TOWER);

    const reroute = grid.findPath(enemyCell.col, enemyCell.row, goal.col, goal.row);

    expect(reroute).not.toBeNull();
    expect(reroute.some((step) => step.row !== spawn.row)).toBe(true);

    const reroutePixel = reroute.map(({ col, row }) => grid.cellCenter(col, row));
    enemy.setPath(reroutePixel);

    let deviatedFromRow = false;
    for (let i = 0; i < 80; i++) {
      enemy.update();
      if (enemy.y !== oldY) deviatedFromRow = true;
      if (enemy.reached) break;
    }

    expect(deviatedFromRow).toBe(true);
    expect(enemy.reached).toBe(true);
  });
});
