/**
 * Horn launch camera — ease pan toward primary gate before assault starts.
 */

import { getPrimaryGateForFront, resolvePostCell } from '../fortress/defensivePosts.js';

export const HORN_CAMERA_MS = 480;

export function createHornCameraState() {
  return {
    active: false,
    elapsed: 0,
    fromPanX: 0,
    fromPanY: 0,
    toPanX: 0,
    toPanY: 0,
  };
}

export function computePanForCellFocus({
  cell,
  cellSize,
  cols,
  rows,
  playfieldWidth,
  playfieldHeight,
  zoom,
}) {
  const gridCx = cols * cellSize * 0.5;
  const gridCy = rows * cellSize * 0.5;
  const focusX = cell.col * cellSize + cellSize / 2;
  const focusY = cell.row * cellSize + cellSize / 2;
  return {
    panX: playfieldWidth / 2 - gridCx - (focusX - gridCx) * zoom,
    panY: playfieldHeight / 2 - gridCy - (focusY - gridCy) * zoom,
  };
}

export function startHornCameraPan(state, {
  goal,
  ringR,
  frontId = 'west',
  cellSize,
  cols,
  rows,
  playfieldWidth,
  playfieldHeight,
  zoom,
  fromPanX,
  fromPanY,
}) {
  const gatePost = getPrimaryGateForFront(frontId);
  const cell = resolvePostCell(gatePost, goal, ringR);
  const target = computePanForCellFocus({
    cell,
    cellSize,
    cols,
    rows,
    playfieldWidth,
    playfieldHeight,
    zoom,
  });
  state.active = true;
  state.elapsed = 0;
  state.fromPanX = fromPanX;
  state.fromPanY = fromPanY;
  state.toPanX = target.panX;
  state.toPanY = target.panY;
}

/** Returns { panX, panY, done } while animating. */
export function tickHornCameraPan(state, dtMs) {
  if (!state.active) return { done: true };
  state.elapsed += dtMs;
  const t = Math.min(1, state.elapsed / HORN_CAMERA_MS);
  const ease = t * t * (3 - 2 * t);
  const panX = state.fromPanX + (state.toPanX - state.fromPanX) * ease;
  const panY = state.fromPanY + (state.toPanY - state.fromPanY) * ease;
  const done = t >= 1;
  if (done) state.active = false;
  return { panX, panY, done };
}
