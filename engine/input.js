import { CELL_SIZE, WALL, EMPTY, SPAWN, GOAL } from './game.js';

export class Input {
    constructor(canvas, game) {
        this.game = game;
        this.painting = false;
        this.paintMode = null; // 'place' | 'erase'

        canvas.addEventListener('mousedown',  e => this._onDown(e, canvas));
        canvas.addEventListener('mousemove',  e => this._onMove(e, canvas));
        canvas.addEventListener('mouseup',    () => { this.painting = false; });
        canvas.addEventListener('mouseleave', () => { this.painting = false; });
        canvas.addEventListener('contextmenu', e => e.preventDefault());
    }

    _cellAt(e, canvas) {
        const rect = canvas.getBoundingClientRect();
        return {
            col: Math.floor((e.clientX - rect.left) / CELL_SIZE),
            row: Math.floor((e.clientY - rect.top)  / CELL_SIZE),
        };
    }

    _onDown(e, canvas) {
        this.paintMode = e.button === 2 ? 'erase' : 'place';
        this.painting = true;
        const { col, row } = this._cellAt(e, canvas);
        this._apply(col, row);
    }

    _onMove(e, canvas) {
        if (!this.painting) return;
        const { col, row } = this._cellAt(e, canvas);
        this._apply(col, row);
    }

    _apply(col, row) {
        const { grid } = this.game;
        if (row < 0 || row >= grid.length || col < 0 || col >= grid[0].length) return;
        const cell = grid[row][col];
        if (cell === SPAWN || cell === GOAL) return;

        if (this.paintMode === 'erase') {
            grid[row][col] = EMPTY;
        } else {
            grid[row][col] = cell === WALL ? EMPTY : WALL;
        }
    }
}
