/**
 * Campaign assault playfield — zoom, world padding, and scroll bounds.
 * World is larger than the viewport so the player can pan around the fortress.
 */

export const ASSAULT_FIELD_ZOOM = 0.54;
/** Prep uses a tighter, readable view — same world, higher magnification. */
export const PREP_FIELD_ZOOM = 0.98;
export const PREP_INITIAL_GRID_ZOOM = 1.48;
export const PREP_FORTRESS_STRUCTURE_SCALE = 2.35;
export const ASSAULT_WORLD_PAD_COLS = 18;
export const ASSAULT_WORLD_PAD_ROWS = 12;
export const ASSAULT_UNIT_SCALE = 0.84;

export function assaultWorldPadPx(cellSize) {
  return {
    x: ASSAULT_WORLD_PAD_COLS * cellSize,
    y: ASSAULT_WORLD_PAD_ROWS * cellSize,
  };
}

export function assaultWorldSize(cols, rows, cellSize) {
  const pad = assaultWorldPadPx(cellSize);
  return {
    width:  cols * cellSize + pad.x * 2,
    height: rows * cellSize + pad.y * 2,
    padX: pad.x,
    padY: pad.y,
  };
}

/** Clamp pan so the viewport can scroll across the padded world. */
/**
 * Pixel spawn on the outer rim of the padded assault world (grid-local coords).
 * Enemies emerge from the forest edge, not the inner tactical grid border.
 */
export function getAssaultBorderSpawnPx(spawn, goal, cols, rows, cellSize, padX, padY) {
  const gx = spawn.col * cellSize + cellSize / 2;
  const gy = spawn.row * cellSize + cellSize / 2;
  const goalX = goal.col * cellSize + cellSize / 2;
  const goalY = goal.row * cellSize + cellSize / 2;
  const dx = gx - goalX;
  const dy = gy - goalY;

  if (Math.abs(dx) >= Math.abs(dy)) {
    if (dx <= 0) {
      return { x: -padX + cellSize * 0.5, y: gy };
    }
    return { x: cols * cellSize + padX - cellSize * 0.5, y: gy };
  }
  if (dy <= 0) {
    return { x: gx, y: -padY + cellSize * 0.5 };
  }
  return { x: gx, y: rows * cellSize + padY - cellSize * 0.5 };
}

/** Straight assault lane from world border to fortress goal. */
export function getAssaultBorderSpawnPath(spawn, goal, cols, rows, cellSize, padX, padY) {
  const start = getAssaultBorderSpawnPx(spawn, goal, cols, rows, cellSize, padX, padY);
  const end = { x: goal.col * cellSize + cellSize / 2, y: goal.row * cellSize + cellSize / 2 };
  return [start, end];
}

export function clampAssaultGridPan(gridPanX, gridPanY, {
  worldWidth,
  worldHeight,
  viewportWidth,
  viewportHeight,
  zoom,
}) {
  const scaledW = worldWidth * zoom;
  const scaledH = worldHeight * zoom;
  const maxPanX = Math.max(0, scaledW - viewportWidth);
  const maxPanY = Math.max(0, scaledH - viewportHeight);
  return {
    x: Math.max(-maxPanX, Math.min(0, gridPanX)),
    y: Math.max(-maxPanY, Math.min(0, gridPanY)),
  };
}
