import { GRID_COLS, GRID_ROWS, CELL_SIZE, EMPTY, WALL, SPAWN, GOAL } from './game.js';

const COLORS = {
    [EMPTY]: '#1a1a2e',
    [WALL]:  '#4a4a6a',
    [SPAWN]: '#00ff88',
    [GOAL]:  '#ff4444',
};

const GRID_LINE = '#222244';

export class Renderer {
    constructor(canvas, game) {
        this.ctx = canvas.getContext('2d');
        this.game = game;
    }

    draw() {
        const { ctx, game } = this;
        const { grid } = game;

        for (let row = 0; row < GRID_ROWS; row++) {
            for (let col = 0; col < GRID_COLS; col++) {
                const x = col * CELL_SIZE;
                const y = row * CELL_SIZE;
                const type = grid[row][col];

                ctx.fillStyle = COLORS[type] ?? COLORS[0];
                ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);

                ctx.strokeStyle = GRID_LINE;
                ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);
            }
        }
    }
}
