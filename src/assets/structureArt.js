/**
 * Structure dock PNG icons — Wave 10 promoted assets.
 * Single entry point for all skirmish structure types in the left STRUCTURES dock.
 */

import { drawProceduralStructureIcon } from '../ui/structurePortrait.js';

const STRUCTURE_ART = {
  gate:       '/assets/structures/structure_gate@48.png',
  watchtower: '/assets/structures/structure_watchtower@48.png',
  ballista:   '/assets/structures/structure_ballista@48.png',
  catapult:   '/assets/structures/structure_catapult@48.png',
  mine:       '/assets/structures/structure_mine@48.png',
  barracks:   '/assets/structures/structure_barracks@48.png',
  runeshrine: '/assets/structures/structure_runeshrine@48.png',
  piltorn:    '/assets/structures/structure_piltorn@48.png',
  drakship:   '/assets/structures/structure_drakship@48.png',
  reinforce:  '/assets/structures/structure_reinforce_wall@48.png',
};

/** All structure types with promoted dock PNGs. */
export const STRUCTURE_ART_IDS = Object.freeze(Object.keys(STRUCTURE_ART));

const _images = {};

for (const [key, src] of Object.entries(STRUCTURE_ART)) {
  const img = new Image();
  img.src = src;
  _images[key] = img;
}

/** Map build-item ids to PNG keys (e.g. temp wall → reinforce icon). */
export function resolveStructureArtKey(itemId) {
  if (itemId === 'wall') return 'reinforce';
  return STRUCTURE_ART[itemId] ? itemId : null;
}

export function hasStructureArt(itemId) {
  return resolveStructureArtKey(itemId) != null;
}

export function isStructureArtReady(itemId) {
  const key = resolveStructureArtKey(itemId);
  if (!key) return false;
  const img = _images[key];
  return Boolean(img?.complete && img.naturalWidth > 0);
}

/** Draw structure dock icon from PNG when loaded. */
export function drawStructureArtIcon(ctx, itemId, cx, cy, size, affordable = true) {
  const key = resolveStructureArtKey(itemId);
  if (!key) return false;
  const img = _images[key];
  if (!img?.complete || img.naturalWidth === 0) return false;
  ctx.save();
  if (!affordable) ctx.globalAlpha = 0.42;
  const scale = Math.min(size / img.naturalWidth, size / img.naturalHeight);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
  ctx.restore();
  return true;
}

/**
 * Draw structure dock icon — PNG when ready, procedural until load completes.
 * Never falls back to full sprite sheets (wrong scale for dock thumbnails).
 */
export function drawStructureDockIcon(ctx, itemId, cx, cy, size, affordable = true) {
  if (drawStructureArtIcon(ctx, itemId, cx, cy, size, affordable)) return true;
  if (hasStructureArt(itemId)) {
    drawProceduralStructureIcon(ctx, cx, cy, itemId, size, affordable);
    return false;
  }
  drawProceduralStructureIcon(ctx, cx, cy, itemId, size, affordable);
  return false;
}

/** Preload all structure PNGs (optional — images also load at module init). */
export function preloadStructureArt() {
  return Promise.all(
    STRUCTURE_ART_IDS.map(key => new Promise(resolve => {
      const img = _images[key];
      if (!img) { resolve(); return; }
      if (img.complete && img.naturalWidth > 0) { resolve(); return; }
      img.onload = () => resolve();
      img.onerror = () => resolve();
    })),
  );
}
