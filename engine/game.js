import { Renderer } from './render.js';
import { Input } from './input.js';

export const GRID_COLS = 50;
export const GRID_ROWS = 50;
export const CELL_SIZE = 16;

// Cell types
export const EMPTY = 0;
export const WALL = 1;
export const SPAWN = 2;
export const GOAL = 3;

export class Game {
    constructor(canvas) {
        canvas.width = GRID_COLS * CELL_SIZE;
        canvas.height = GRID_ROWS * CELL_SIZE;

        this.grid = Array.from({ length: GRID_ROWS }, () => new Uint8Array(GRID_COLS));

        // Fixed spawn (top-left area) and goal (bottom-right area)
        this.spawnCell = { col: 1, row: 1 };
        this.goalCell = { col: GRID_COLS - 2, row: GRID_ROWS - 2 };

        this.grid[this.spawnCell.row][this.spawnCell.col] = SPAWN;
        this.grid[this.goalCell.row][this.goalCell.col] = GOAL;

        this.renderer = new Renderer(canvas, this);
        this.input = new Input(canvas, this);
    }

    start() {
        const loop = () => {
            this.update();
            this.renderer.draw();
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }

    update() {
        // game logic goes here later
    }

    toggleWall(col, row) {
        const cell = this.grid[row][col];
        if (cell === SPAWN || cell === GOAL) return;
        this.grid[row][col] = cell === WALL ? EMPTY : WALL;
    }
}
