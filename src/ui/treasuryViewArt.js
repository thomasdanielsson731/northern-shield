/**
 * Fortress building sprites for Treasury immersive view.
 */

import { drawFortressPrepSprite, isFortressPrepArtReady } from '../preparation/fortressPrepArt.js';
import { drawHubBuildingSprite, isHubBuildingArtReady } from '../settlement/settlementHubArt.js';

/** Art source per fortress upgrade node. */
export const TREASURY_BUILDING_ART = {
  barracks: { kind: 'prep', key: 'longhouse' },
  armory: { kind: 'hub', id: 'runeSmith' },
  watchtower: { kind: 'prep', key: 'watchTower' },
  wallworks: { kind: 'prep', key: 'wallScar' },
  treasury: { kind: 'hub', id: 'fortress' },
};

export function isTreasuryBuildingArtReady(nodeKey) {
  const spec = TREASURY_BUILDING_ART[nodeKey];
  if (!spec) return false;
  if (spec.kind === 'prep') return isFortressPrepArtReady(spec.key);
  return isHubBuildingArtReady(spec.id);
}

/** Draw building bottom-centered in box; returns false if art missing. */
export function drawTreasuryBuildingSprite(ctx, nodeKey, box, { alpha = 1, selected = false } = {}) {
  const spec = TREASURY_BUILDING_ART[nodeKey];
  if (!spec) return false;

  ctx.save();
  if (selected) {
    const cx = box.x + box.w / 2;
    const footY = box.y + box.h;
    const g = ctx.createRadialGradient(cx, footY - box.h * 0.45, 0, cx, footY - box.h * 0.45, box.h * 0.55);
    g.addColorStop(0, 'rgba(220,170,60,0.20)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, footY - box.h * 0.45, box.h * 0.55, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = alpha;
  let ok = false;
  if (spec.kind === 'prep') {
    ok = drawFortressPrepSprite(ctx, spec.key, box);
  } else {
    ok = drawHubBuildingSprite(ctx, spec.id, box, { alpha: 1 });
  }
  ctx.restore();
  return ok;
}
