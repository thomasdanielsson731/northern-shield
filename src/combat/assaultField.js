/**
 * Campaign assault playfield — zoom, world padding, and scroll bounds.
 * World is larger than the viewport so the player can pan around the fortress.
 */

// Zoom 2.0 was reverted to 1.4 because ASSAULT_UNIT_SCALE stayed at 1.0 — heroes/enemies
// appeared oversized, not because the fortress filling more of the frame was wrong.
// 1.4 left the ring at only ~32% of viewport width (too small vs. the fortress-as-
// main-character art direction). Raising zoom again while compensating unit scale
// (keeping the effective on-screen unit size close to the old 1.4*0.65=0.91) grows
// the fortress ~29% without repeating that mistake.
export const ASSAULT_FIELD_ZOOM = 1.8;
/** Prep uses a tighter, readable view — same world, higher magnification. */
export const PREP_FIELD_ZOOM = 0.98;
export const PREP_INITIAL_GRID_ZOOM = 1.48;
export const PREP_FORTRESS_STRUCTURE_SCALE = 2.35;
export const ASSAULT_WORLD_PAD_COLS = 18;
export const ASSAULT_WORLD_PAD_ROWS = 12;
export const ASSAULT_UNIT_SCALE = 0.5;

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
  gridWidth = worldWidth,
  gridHeight = worldHeight,
}) {
  // The render transform scales around the grid's center (cx,cy), not the
  // world's top-left corner: screenX(localX) = pfLeft + gridPanX + cx + (localX-cx)*zoom.
  // A naive [-maxPan, 0] clamp (correct only when there's no world padding)
  // ignores that offset — with padding (the scroll world always has some),
  // it cuts the reachable pan range short well before the world's real edges,
  // making the far side (here: the left/west padding) permanently unpannable.
  const cx = gridWidth / 2;
  const cy = gridHeight / 2;
  const padX = (worldWidth - gridWidth) / 2;
  const padY = (worldHeight - gridHeight) / 2;
  const maxX = -cx + (padX + cx) * zoom;
  const minX = viewportWidth - cx - (gridWidth + padX - cx) * zoom;
  const maxY = -cy + (padY + cy) * zoom;
  const minY = viewportHeight - cy - (gridHeight + padY - cy) * zoom;
  const loX = Math.min(minX, maxX), hiX = Math.max(minX, maxX);
  const loY = Math.min(minY, maxY), hiY = Math.max(minY, maxY);
  return {
    x: Math.max(loX, Math.min(hiX, gridPanX)),
    y: Math.max(loY, Math.min(hiY, gridPanY)),
  };
}
