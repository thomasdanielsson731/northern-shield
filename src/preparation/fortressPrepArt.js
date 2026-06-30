/**
 * Fortress prep schematic sprites (Age I · First Saga).
 * @see design/art/BATCH_PROMPTS.md Wave 1
 */

import { getPrepBackdropRect } from './fortressPrepLayout.js';

const PREP_ART = {
  watchTower: '/assets/fortress/fort_watch_tower@80x100.png',
  longhouse: '/assets/fortress/fort_longhouse@140x90.png',
  treasury: '/assets/settlement/hub_building_treasury@80x72.png',
  westGateIntact: '/assets/fortress/fort_west_gate_intact@120x80.png',
  westGateCracked: '/assets/fortress/fort_west_gate_cracked@120x80.png',
  westGateBreached: '/assets/fortress/fort_west_gate_breached@120x80.png',
  westGateStoneCeremony: '/assets/fortress/fort_west_gate_stone_ceremony@120x80.png',
  wallScar: '/assets/fortress/fort_wall_scar@56x56.png',
  repairScaffold: '/assets/fortress/fort_repair_scaffold@56x72.png',
  schematicPlate: '/assets/fortress/fort_prep_coordinate_schematic@1254x1254.png',
  assaultPlateClean: '/assets/fortress/fort_assault_plate_clean@1254x1254.png',
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

/** Full playfield schematic backdrop — cover-fit to art plate aspect. */
export function drawFortressPrepBackground(ctx, pf) {
  const img = _images.schematicPlate;
  if (!isFortressPrepArtReady('schematicPlate')) return false;
  const rect = getPrepBackdropRect(pf);
  ctx.fillStyle = '#0e1418';
  ctx.fillRect(pf.x, pf.y, pf.w, pf.h);
  ctx.drawImage(
    img,
    0, 0, img.naturalWidth, img.naturalHeight,
    rect.dx, rect.dy, rect.dw, rect.dh,
  );
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

export const ASSAULT_FORTRESS_STRUCTURE_SCALE = 1.3;

/**
 * Assault combat fortress — buildings, gate, towers only (no terrain plate / courtyard ground).
 * Palisade ring comes from live wall tiles on the grid.
 */
export function drawAssaultFortressStructures(ctx, goal, cellSize, ringR, {
  wallData = {},
  prepMeta = null,
  spawnCol = 0,
  scale = ASSAULT_FORTRESS_STRUCTURE_SCALE,
  time = 0,
} = {}) {
  const cs = cellSize;
  const S = scale;
  const gx = goal.col * cs + cs / 2;
  const gy = goal.row * cs + cs / 2;
  const ringOuter = ringR * cs + cs * 0.38;
  const gateAngle = spawnCol < goal.col ? Math.PI : 0;
  const gateX = gx + Math.cos(gateAngle) * ringOuter * 0.92 * S;
  const gateY = gy + Math.sin(gateAngle) * ringOuter * 0.82 * S + cs * 0.06 * S;

  let westGateEntry = null;
  for (const w of Object.values(wallData)) {
    if (w.isGate) { westGateEntry = w; break; }
  }
  const gateArt = getBattleWestGateArtKey(westGateEntry, prepMeta);
  const gateBox = {
    x: gateX - cs * 1.85 * S,
    y: gateY - cs * 1.05 * S,
    w: cs * 3.7 * S,
    h: cs * 2.15 * S,
  };
  if (!drawFortressPrepSprite(ctx, gateArt, gateBox)) {
    ctx.fillStyle = '#2a1810';
    ctx.fillRect(gateBox.x, gateBox.y, gateBox.w, gateBox.h);
    ctx.fillStyle = `rgba(255,170,70,${0.35 + Math.sin(time * 2.4) * 0.15})`;
    ctx.beginPath();
    ctx.arc(gateX, gateY - cs * 0.12 * S, cs * 0.12 * S, 0, Math.PI * 2);
    ctx.fill();
  }

  const lhBox = {
    x: gx - cs * 2.75 * S,
    y: gy - cs * 0.55 * S,
    w: cs * 5.5 * S,
    h: cs * 2.45 * S,
  };
  if (!drawFortressPrepSprite(ctx, 'longhouse', lhBox)) {
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(lhBox.x + 2, lhBox.y + 3, lhBox.w, lhBox.h);
    ctx.fillStyle = '#1e1208';
    ctx.fillRect(lhBox.x, lhBox.y, lhBox.w, lhBox.h);
    const roofH = cs * 0.55 * S;
    ctx.fillStyle = '#342010';
    ctx.beginPath();
    ctx.moveTo(lhBox.x - cs * 0.08 * S, lhBox.y);
    ctx.lineTo(lhBox.x + lhBox.w + cs * 0.08 * S, lhBox.y);
    ctx.lineTo(gx, lhBox.y - roofH);
    ctx.closePath();
    ctx.fill();
  } else {
    const winPulse = 0.14 + Math.sin(time * 1.2) * 0.08;
    ctx.fillStyle = `rgba(255,175,55,${winPulse})`;
    ctx.fillRect(lhBox.x + lhBox.w * 0.22, lhBox.y + lhBox.h * 0.28, 3, 4);
    ctx.fillRect(lhBox.x + lhBox.w * 0.62, lhBox.y + lhBox.h * 0.28, 3, 4);
  }

  const towerBox = {
    x: gx + cs * 0.35 * S,
    y: gy - cs * 3.15 * S,
    w: cs * 2.05 * S,
    h: cs * 2.65 * S,
  };
  if (!drawFortressPrepSprite(ctx, 'watchTower', towerBox)) {
    ctx.fillStyle = '#4a3828';
    ctx.fillRect(towerBox.x + towerBox.w * 0.22, towerBox.y + towerBox.h * 0.22, towerBox.w * 0.56, towerBox.h * 0.72);
    ctx.strokeStyle = '#90c0e0';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(towerBox.x + towerBox.w / 2, towerBox.y + towerBox.h * 0.48, Math.max(4, towerBox.w * 0.12), 0, Math.PI * 2);
    ctx.stroke();
  }

  const treasuryBox = {
    x: gx - cs * 2.35 * S,
    y: gy + cs * 0.95 * S,
    w: cs * 1.65 * S,
    h: cs * 1.55 * S,
  };
  if (!drawFortressPrepSprite(ctx, 'treasury', treasuryBox)) {
    ctx.fillStyle = '#2a1c10';
    ctx.fillRect(treasuryBox.x, treasuryBox.y, treasuryBox.w, treasuryBox.h);
  }

  const pulse = 0.55 + Math.sin(time * 2.1) * 0.25;
  const rg = ctx.createRadialGradient(gx, gy + cs * 0.15 * S, 0, gx, gy + cs * 0.15 * S, cs * 1.6 * S);
  rg.addColorStop(0, `rgba(255,150,60,${0.10 * pulse})`);
  rg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = rg;
  ctx.beginPath();
  ctx.arc(gx, gy + cs * 0.15 * S, cs * 1.6 * S, 0, Math.PI * 2);
  ctx.fill();

  return true;
}
