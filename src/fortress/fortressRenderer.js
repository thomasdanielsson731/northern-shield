/**
 * Fortress layout renderer — prep and assault share structure draw path.
 */

import {
  drawAssaultFortressStructures,
  ASSAULT_FORTRESS_STRUCTURE_SCALE,
} from '../preparation/fortressPrepArt.js';

/**
 * Draw Age I fortress structures for prep or assault.
 * Layout anchors drive future per-post siege props; courtyard uses established art.
 */
export function drawFortressLayout(ctx, {
  goal,
  cellSize,
  ringR,
  wallData = {},
  prepMeta = null,
  spawnCol = 0,
  scale = ASSAULT_FORTRESS_STRUCTURE_SCALE,
  time = 0,
  mode = 'assault',
} = {}) {
  if (!goal || !cellSize) return false;

  ctx.save();
  if (mode === 'prep') {
    ctx.globalAlpha = 0.96;
  }

  const ok = drawAssaultFortressStructures(ctx, goal, cellSize, ringR, {
    wallData,
    prepMeta,
    spawnCol,
    scale,
    time,
  });

  ctx.restore();
  return ok;
}
