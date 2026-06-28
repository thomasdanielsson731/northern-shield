/**
 * Structure dock PNG icons — promoted from design/art Wave 10.
 * Falls back to procedural icons when art is not yet promoted.
 */

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

const _images = {};

for (const [key, src] of Object.entries(STRUCTURE_ART)) {
  const img = new Image();
  img.src = src;
  _images[key] = img;
}

export function isStructureArtReady(itemId) {
  const img = _images[itemId];
  return Boolean(img?.complete && img.naturalWidth > 0);
}

/** Draw structure dock icon from PNG when promoted. */
export function drawStructureArtIcon(ctx, itemId, cx, cy, size, affordable = true) {
  const img = _images[itemId];
  if (!isStructureArtReady(itemId)) return false;
  ctx.save();
  if (!affordable) ctx.globalAlpha = 0.42;
  const scale = Math.min(size / img.naturalWidth, size / img.naturalHeight);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
  ctx.restore();
  return true;
}
