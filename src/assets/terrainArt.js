/**
 * Ash Fen terrain tiles — First Saga battlefields.
 * @see design/art/BATCH_PROMPTS.md Wave 4
 */

const TILE_SRC = {
  groundA: '/assets/terrain/tile_ashfen_ground_01@28.png',
  groundB: '/assets/terrain/tile_ashfen_ground_02@28.png',
  path: '/assets/terrain/tile_ashfen_path_01@28.png',
  spawnMist: '/assets/fx/fx_spawn_fen_mist@56.png',
  fenTrees: '/assets/terrain/prop_fen_trees_backdrop@128x256.png',
};

const _images = {};

for (const [key, src] of Object.entries(TILE_SRC)) {
  const img = new Image();
  img.src = src;
  _images[key] = img;
}

function ready(key) {
  const img = _images[key];
  return Boolean(img?.complete && img.naturalWidth > 0);
}

export function isAshfenTerrainReady() {
  return ready('groundA') && ready('groundB');
}

/** Chebyshev distance from fortress goal cell — keeps courtyard readable. */
function inFortressPad(col, row, goal, ringR = 6) {
  if (!goal) return false;
  return Math.max(Math.abs(col - goal.col), Math.abs(row - goal.row)) <= ringR;
}

/** Paint Ash Fen tile ground into terrain canvas. Returns false if tiles not loaded. */
export function bakeAshfenTerrain(tc, cols, rows, cellSize, width, height, rng, spawn, goal, options = {}) {
  if (!isAshfenTerrainReady()) return false;

  const { pathless = false } = options;
  const groundA = _images.groundA;
  const groundB = _images.groundB;
  const pathTile = _images.path;
  const pathRow = spawn?.row ?? Math.floor(rows / 2);
  const goalCol = goal?.col ?? cols - 1;
  const goalRow = goal?.row ?? Math.floor(rows / 2);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * cellSize;
      const y = row * cellSize;
      const onPad = inFortressPad(col, row, goal);

      if (onPad) {
        const warm = 38 + ((col + row) % 3) * 4;
        tc.fillStyle = `rgb(${warm + 18},${warm + 8},${warm - 10})`;
        tc.fillRect(x, y, cellSize, cellSize);
        tc.fillStyle = 'rgba(90,70,45,0.12)';
        tc.fillRect(x, y, cellSize, 1);
        continue;
      }

      const variant = (col + row * 3) % 2;
      const tile = variant ? groundB : groundA;
      tc.save();
      tc.globalAlpha = 0.88;
      tc.drawImage(tile, x, y, cellSize, cellSize);
      tc.fillStyle = 'rgba(32,28,22,0.14)';
      tc.fillRect(x, y, cellSize, cellSize);
      tc.restore();

      if (!pathless && ready('path') && Math.abs(row - pathRow) <= 1 && col >= (spawn?.col ?? 0) && col <= goalCol) {
        tc.drawImage(pathTile, x, y, cellSize, cellSize);
      }
    }
  }

  // Pathless assault — smooth worn lane (no repeating log tiles)
  if (pathless && spawn && goal) {
    const laneY = pathRow * cellSize + cellSize / 2;
    const x0 = Math.max(0, spawn.col * cellSize);
    const x1 = Math.min(width, (goalCol + 1) * cellSize);
    const laneH = cellSize * 2.4;
    const lg = tc.createLinearGradient(x0, laneY, x1, laneY);
    lg.addColorStop(0, 'rgba(48,38,28,0.15)');
    lg.addColorStop(0.12, 'rgba(78,62,44,0.92)');
    lg.addColorStop(0.88, 'rgba(78,62,44,0.92)');
    lg.addColorStop(1, 'rgba(48,38,28,0.15)');
    tc.fillStyle = lg;
    tc.fillRect(x0, laneY - laneH / 2, x1 - x0, laneH);
    tc.fillStyle = 'rgba(130,105,72,0.22)';
    tc.fillRect(x0 + cellSize * 0.5, laneY - cellSize * 0.12, x1 - x0 - cellSize, cellSize * 0.24);
  }

  if (ready('spawnMist') && spawn) {
    const mist = _images.spawnMist;
    const mx = spawn.col * cellSize + cellSize / 2 - mist.naturalWidth * 0.35;
    const my = spawn.row * cellSize + cellSize / 2 - mist.naturalHeight * 0.45;
    tc.save();
    tc.globalAlpha = 0.45;
    tc.drawImage(mist, mx, my, mist.naturalWidth * 0.55, mist.naturalHeight * 0.55);
    tc.restore();
  }

  tc.fillStyle = 'rgba(28,22,16,0.08)';
  tc.fillRect(0, 0, width, height);

  const vg = tc.createRadialGradient(
    goalCol * cellSize, goalRow * cellSize, cellSize * 2,
    width / 2, height / 2, width * 0.82,
  );
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.16)');
  tc.fillStyle = vg;
  tc.fillRect(0, 0, width, height);

  return true;
}
