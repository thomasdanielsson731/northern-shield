/**
 * Battle-scale siege props on defensive posts (Wave 15).
 * @see design/art/BATCH_PROMPTS.md Wave 15
 */

import { drawStructureArtIcon } from './structureArt.js';

const SIEGE_BATTLE_ART = {
  ballista: '/assets/fortress/siege/siege_ballista_battle@96x96.png',
  military: '/assets/fortress/siege/siege_ballista_battle@96x96.png',
  catapult: '/assets/fortress/siege/siege_catapult_battle@96x96.png',
};

const _images = {};

for (const [key, src] of Object.entries(SIEGE_BATTLE_ART)) {
  const img = new Image();
  img.src = src;
  _images[key] = img;
}

export function resolveSiegeBattleArtKey(structureType) {
  if (!structureType) return null;
  const id = String(structureType).toLowerCase();
  if (id === 'military') return 'ballista';
  if (SIEGE_BATTLE_ART[id]) return id;
  return null;
}

export function isSiegeBattleArtReady(structureType) {
  const key = resolveSiegeBattleArtKey(structureType);
  if (!key) return false;
  const img = _images[key];
  return Boolean(img?.complete && img.naturalWidth > 0);
}

/** Draw battle-scale siege prop; falls back to 48px dock icon. */
export function drawSiegeBattleProp(ctx, structureType, cx, cy, size, affordable = true) {
  const key = resolveSiegeBattleArtKey(structureType);
  if (key) {
    const img = _images[key];
    if (img?.complete && img.naturalWidth > 0) {
      ctx.save();
      if (!affordable) ctx.globalAlpha = 0.42;
      const scale = Math.min(size / img.naturalWidth, size / img.naturalHeight);
      const dw = img.naturalWidth * scale;
      const dh = img.naturalHeight * scale;
      ctx.drawImage(img, cx - dw / 2, cy - dh, dw, dh);
      ctx.restore();
      return true;
    }
  }
  return drawStructureArtIcon(ctx, structureType, cx, cy - size * 0.08, size * 0.72, affordable);
}
