/**
 * Fortress prep schematic sprites (Age I · First Saga).
 * @see design/art/BATCH_PROMPTS.md Wave 1
 */

const PREP_ART = {
  watchTower: '/assets/fortress/fort_watch_tower@80x100.png',
  longhouse: '/assets/fortress/fort_longhouse@140x90.png',
  treasury: '/assets/fortress/icon_meta_treasury@32.png',
};

const _images = {};

for (const [key, src] of Object.entries(PREP_ART)) {
  const img = new Image();
  img.src = src;
  _images[key] = img;
}

export function isFortressPrepArtReady(key) {
  const img = _images[key];
  return Boolean(img?.complete && img.naturalWidth > 0);
}

/** Draw sprite bottom-center inside box; returns false if art not loaded. */
export function drawFortressPrepSprite(ctx, key, box) {
  const img = _images[key];
  if (!isFortressPrepArtReady(key)) return false;

  const scale = Math.min(box.w / img.naturalWidth, box.h / img.naturalHeight);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const dx = box.x + (box.w - dw) / 2;
  const dy = box.y + box.h - dh;
  ctx.drawImage(img, dx, dy, dw, dh);
  return true;
}
