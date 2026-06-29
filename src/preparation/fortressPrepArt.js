/**
 * Fortress prep schematic sprites (Age I · First Saga).
 * @see design/art/BATCH_PROMPTS.md Wave 1
 */

const PREP_ART = {
  watchTower: '/assets/fortress/fort_watch_tower@80x100.png',
  longhouse: '/assets/fortress/fort_longhouse@140x90.png',
  treasury: '/assets/settlement/hub_building_treasury@80x72.png',
  westGateIntact: '/assets/fortress/fort_west_gate_intact@120x80.png',
  westGateCracked: '/assets/fortress/fort_west_gate_cracked@120x80.png',
  westGateBreached: '/assets/fortress/fort_west_gate_breached@120x80.png',
  westGateStoneCeremony: '/assets/fortress/fort_west_gate_stone_ceremony@120x80.png',
  wallScar: '/assets/fortress/fort_wall_scar@56x56.png',
  schematicPlate: '/assets/fortress/fort_prep_schematic_age1@640x360.png',
  horn: '/assets/ui/ui_horn_prep@48.png',
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

/** Full playfield schematic backdrop when promoted art is available. */
export function drawFortressPrepBackground(ctx, pf) {
  const img = _images.schematicPlate;
  if (!isFortressPrepArtReady('schematicPlate')) return false;
  ctx.drawImage(img, pf.x, pf.y, pf.w, pf.h);
  return true;
}

export function getWestGateArtKey(prepMeta) {
  if (prepMeta?.westGateScarred && !prepMeta?.westGateRepaired) return 'westGateCracked';
  return 'westGateIntact';
}

/** Live gate HP + prep scar state for campaign assault battle render. */
export function getBattleWestGateArtKey(wallEntry, prepMeta) {
  if (wallEntry) {
    const max = wallEntry.maxHp ?? wallEntry.hp ?? 120;
    const hp = wallEntry.hp ?? max;
    if (hp <= 0) return 'westGateBreached';
    if (hp < max * 0.45) return 'westGateCracked';
  }
  return getWestGateArtKey(prepMeta);
}

/** West gate sprite on PORT cell — wider than one grid cell, faces the lane. */
export function drawCampaignGateSprite(ctx, artKey, cx, cy, cellSize, time = 0) {
  const key = artKey ?? 'westGateIntact';
  if (!isFortressPrepArtReady(key)) return false;
  const box = {
    x: cx - cellSize * 1.85,
    y: cy - cellSize * 1.05,
    w: cellSize * 3.7,
    h: cellSize * 2.15,
  };
  if (!drawFortressPrepSprite(ctx, key, box)) return false;
  return true;
}
