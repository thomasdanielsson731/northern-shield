/**
 * Fortress — immersive structure upgrade view (settlement backdrop + building sprites).
 */

import { UI_COLORS } from '../ui/uiTheme.js';
import { FORTRESS_DEFS } from '../fortress/fortress.js';
import {
  computeHallOfHeroesLayout,
  computeHallImmersiveRect,
  drawHallImmersiveChrome,
  isHallOfHeroesViewReady,
} from './hallOfHeroesView.js';
import { drawSettlementHubBackdrop, drawHubBuildingGroundShadow } from '../settlement/settlementHubArt.js';
import { drawWarCampGlassChip, WAR_CAMP_THEME } from './warCampVisual.js';
import { drawTreasuryBuildingSprite } from './treasuryViewArt.js';

export { computeHallImmersiveRect as computeTreasuryImmersiveRect };

/** Fortress upgrade view — settlement backdrop always has a procedural fallback. */
export function isTreasuryViewReady() {
  return true;
}

/** Which immersive war-camp view to show (progression building overrides tab). */
export function shouldShowFortressUpgradeView(warCampTab, progressionBuilding) {
  if (progressionBuilding === 'warband' || progressionBuilding === 'recruit') return false;
  if (progressionBuilding === 'fortress') return true;
  return warCampTab === 'fortress';
}

export function shouldShowHallOfHeroesView(warCampTab, progressionBuilding) {
  if (progressionBuilding === 'fortress' || progressionBuilding === 'recruit') return false;
  if (progressionBuilding === 'warband' || progressionBuilding === 'runeSmith') {
    return isHallOfHeroesViewReady();
  }
  return warCampTab === 'warband' && isHallOfHeroesViewReady();
}

export const TREASURY_NODE_KEYS = ['barracks', 'armory', 'watchtower', 'wallworks', 'treasury'];

/**
 * Structure pads on the settlement hill — aligned to hub building footprints.
 * nx/ny = foot contact in view-local 0–1 (same hill as settlement hub).
 */
export const TREASURY_BUILDING_NORM = [
  { nx: 0.63, ny: 0.70, scale: 0.90, z: 2 }, // barracks — recruit yard
  { nx: 0.77, ny: 0.58, scale: 0.86, z: 2 }, // armory — rune smith hut (nudged right)
  { nx: 0.30, ny: 0.52, scale: 1.02, z: 0 }, // watchtower — hall crest
  { nx: 0.26, ny: 0.66, scale: 0.80, z: 1 }, // wallworks — below watchtower, slightly left
  { nx: 0.50, ny: 0.80, scale: 0.88, z: 1 }, // treasury — lower path (former wallworks pad)
];

const _dossierImg = new Image();
_dossierImg.src = '/assets/ui/ui_hall_dossier_panel@280x420.png';

let _dossierRevealAt = 0;
let _lastDossierFocusKey = null;

function dossierRevealAlpha(focusKey) {
  if (!focusKey) return 0;
  if (focusKey !== _lastDossierFocusKey) {
    _lastDossierFocusKey = focusKey;
    _dossierRevealAt = performance.now();
  }
  return Math.min(1, (performance.now() - _dossierRevealAt) / 220);
}

export function getTreasuryInstructionHint(state = {}) {
  if (state.focusKey) {
    return { title: 'BUILDING', line: 'Esc closes · click building again to dismiss' };
  }
  if ((state.goldReserve ?? 0) > 0) {
    return { title: 'FORTRESS', line: `◆ ${state.goldReserve}g reserve · click a structure to upgrade` };
  }
  return { title: 'FORTRESS', line: 'Earn gold in assaults · upgrade fortress structures' };
}

export function getTreasuryObjectiveGuidance(state = {}) {
  if (state.focusKey) {
    return { title: 'BUILDING', subtitle: 'Esc closes · tap again to dismiss' };
  }
  const reserve = state.goldReserve ?? 0;
  if (reserve > 0 && state.nextUpgrade) {
    return {
      title: 'FORTRESS',
      subtitle: `◆ ${reserve}g · next: ${state.nextUpgrade.label} (${state.nextUpgrade.cost}g)`,
    };
  }
  if (reserve > 0) {
    return { title: 'FORTRESS', subtitle: `◆ ${reserve}g reserve · tap a structure` };
  }
  return { title: 'FORTRESS', subtitle: 'Fortress structures unlock after your first assault' };
}

export function computeTreasuryBuildingSlots(hall) {
  return TREASURY_BUILDING_NORM.map((a, i) => ({
    x: hall.x + a.nx * hall.w,
    y: hall.y + a.ny * hall.h,
    scale: a.scale,
    z: a.z ?? 0,
    key: TREASURY_NODE_KEYS[i],
  }));
}

function structureLayout(hall, slot, selected, def) {
  const buildingH = buildingDisplayHeight(hall, slot.scale, selected);
  const footY = slot.y;
  const spriteW = buildingH * 0.72;
  const spriteBox = {
    x: slot.x - spriteW / 2,
    y: footY - buildingH,
    w: spriteW,
    h: buildingH,
  };
  const chipH = 24;
  const shortName = def.label.length > 11 ? `${def.label.slice(0, 10)}…` : def.label;
  const chipW = Math.max(58, Math.min(88, shortName.length * 6.2 + 22));
  const chipX = slot.x - chipW / 2;
  const chipY = footY - buildingH - chipH + 8;
  const padRx = Math.max(spriteW * 0.52, 28);
  const hitW = Math.max(chipW + 10, padRx * 2 + 8);
  const hitH = buildingH + chipH + 6;
  const hitY = chipY - 2;
  return { buildingH, footY, spriteW, spriteBox, chipH, chipW, chipX, chipY, padRx, hitW, hitH, hitY };
}

function drawStructureClickAffordance(ctx, slot, layout, def, lvl, maxed, selected) {
  const { footY, spriteBox, chipH, chipW, chipX, chipY, padRx, buildingH } = layout;
  const cx = slot.x;

  ctx.save();
  ctx.fillStyle = selected ? 'rgba(200,160,50,0.14)' : 'rgba(0,0,0,0.22)';
  ctx.strokeStyle = selected ? 'rgba(240,200,90,0.70)' : 'rgba(180,150,90,0.42)';
  ctx.lineWidth = selected ? 2 : 1.2;
  ctx.beginPath();
  ctx.ellipse(cx, footY + 1, padRx, Math.max(6, buildingH * 0.05), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = selected ? 'rgba(240,200,90,0.55)' : 'rgba(160,140,90,0.28)';
  ctx.lineWidth = 1;
  if (ctx.setLineDash) ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.roundRect(spriteBox.x - 4, spriteBox.y - 2, spriteBox.w + 8, spriteBox.h + chipH + 6, 6);
  ctx.stroke();
  if (ctx.setLineDash) ctx.setLineDash([]);
  ctx.restore();

  const lvlLabel = maxed ? 'MAX' : `L${lvl}`;
  const shortName = def.label.length > 9 ? `${def.label.slice(0, 8)}…` : def.label;
  drawWarCampGlassChip(ctx, chipX, chipY, chipW, chipH, {
    title: shortName.toUpperCase(),
    subtitle: lvlLabel,
  });
}

function buildingDisplayHeight(hall, scale, selected) {
  return hall.h * 0.50 * scale * (selected ? 1.05 : 1);
}

function drawBuildingFallback(ctx, slot, def, buildingH) {
  const footY = slot.y;
  const cx = slot.x;
  const w = buildingH * 0.55;
  const h = buildingH * 0.72;
  ctx.fillStyle = 'rgba(28,22,16,0.92)';
  ctx.strokeStyle = 'rgba(140,110,60,0.45)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(cx - w / 2, footY - h, w, h, 4);
  ctx.fill();
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.font = 'bold 14px monospace';
  ctx.fillStyle = UI_COLORS.gold;
  ctx.fillText(def.icon, cx, footY - h * 0.42);
  ctx.font = 'bold 6px monospace';
  ctx.fillStyle = 'rgba(180,160,120,0.75)';
  ctx.fillText(def.label.toUpperCase(), cx, footY - 8);
  ctx.textAlign = 'left';
}

function drawBuildingDossier(ctx, rect, nodeKey, def, lvl, maxed, cost, canBuy, goldReserve, btnsOut) {
  ctx.save();
  ctx.fillStyle = 'rgba(12,9,14,0.94)';
  ctx.beginPath();
  ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(150,120,70,0.55)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  if (_dossierImg.complete && _dossierImg.naturalWidth > 0) {
    ctx.globalAlpha = 0.35;
    ctx.drawImage(_dossierImg, rect.x, rect.y, rect.w, rect.h);
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  const pad = 12;
  const cx = rect.x + rect.w / 2;
  let ly = rect.y + pad + 6;

  ctx.textAlign = 'center';
  ctx.font = 'bold 11px monospace';
  ctx.fillStyle = UI_COLORS.gold;
  ctx.fillText(`${def.icon} ${def.label.toUpperCase()}`, cx, ly);
  ly += 13;

  ctx.font = '7px monospace';
  ctx.fillStyle = WAR_CAMP_THEME.subtitle;
  const desc = def.desc.length > 42 ? `${def.desc.slice(0, 41)}…` : def.desc;
  ctx.fillText(desc, cx, ly);
  ly += 14;

  const heroH = Math.min(108, Math.floor(rect.h * 0.30));
  const spriteBox = {
    x: rect.x + pad,
    y: ly,
    w: rect.w - pad * 2,
    h: heroH,
  };
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.roundRect(spriteBox.x, spriteBox.y, spriteBox.w, spriteBox.h, 5);
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,100,70,0.35)';
  ctx.lineWidth = 0.8;
  ctx.stroke();
  if (!drawTreasuryBuildingSprite(ctx, nodeKey, spriteBox, { selected: true })) {
    drawBuildingFallback(ctx, { x: cx, y: ly + heroH - 4, scale: 1 }, def, heroH - 8);
  }
  ctx.restore();
  ly += heroH + 10;

  ctx.font = '6px monospace';
  ctx.fillStyle = 'rgba(160,150,130,0.78)';
  ctx.fillText(`Level ${lvl} / ${def.maxLevel}`, cx, ly);
  ly += 10;

  for (let d = 0; d < def.maxLevel; d++) {
    const px = cx - (def.maxLevel - 1) * 5 + d * 10;
    ctx.beginPath();
    ctx.arc(px, ly, 3.5, 0, Math.PI * 2);
    if (d < lvl) {
      ctx.fillStyle = maxed ? '#f0d040' : 'rgba(70,200,50,0.90)';
      ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(48,42,34,0.70)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(75,65,50,0.40)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
  }
  ly += 14;

  ctx.font = '7px monospace';
  ctx.fillStyle = maxed ? 'rgba(200,170,80,0.65)' : 'rgba(160,150,130,0.78)';
  const benefit = maxed ? 'Fully upgraded' : (def.levelDesc?.[lvl] ?? '');
  ctx.fillText(benefit, cx, ly);
  ly += 16;

  ctx.font = '6px monospace';
  ctx.fillStyle = 'rgba(200,170,90,0.72)';
  ctx.fillText(`◆ ${goldReserve}g reserve`, cx, ly);
  ly += 18;

  if (!maxed) {
    const btnW = rect.w - pad * 2;
    const btnH = 32;
    const btnX = rect.x + pad;
    const btnY = ly;
    if (canBuy) {
      ctx.fillStyle = 'rgba(10,40,10,0.98)';
      ctx.strokeStyle = 'rgba(60,220,60,0.85)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(btnX, btnY, btnW, btnH, 5);
      ctx.fill();
      ctx.stroke();
      ctx.font = 'bold 7px monospace';
      ctx.fillStyle = 'rgba(130,240,90,0.95)';
      ctx.fillText('UPGRADE', btnX + btnW / 2, btnY + 12);
      ctx.font = 'bold 10px monospace';
      ctx.fillStyle = '#f0e060';
      ctx.fillText(`${cost}g`, btnX + btnW / 2, btnY + 24);
      btnsOut.push({ x: btnX, y: btnY, w: btnW, h: btnH, action: 'upgradeFortress', key: nodeKey });
    } else {
      ctx.fillStyle = 'rgba(20,16,10,0.92)';
      ctx.strokeStyle = 'rgba(90,70,45,0.45)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.roundRect(btnX, btnY, btnW, btnH, 5);
      ctx.fill();
      ctx.stroke();
      ctx.font = 'bold 8px monospace';
      ctx.fillStyle = 'rgba(160,140,100,0.55)';
      ctx.fillText(`NEED ${cost}g`, btnX + btnW / 2, btnY + 20);
    }
  }

  ctx.textAlign = 'left';
}

/**
 * @param {'all'|'base'|'overlays'} [opts.phase]
 */
export function drawTreasuryView(ctx, rect, opts = {}) {
  const {
    upgrades = {},
    goldReserve = 0,
    focusKey = null,
    btnsOut = [],
    phase = 'all',
  } = opts;

  const drawBase = phase === 'all' || phase === 'base';
  const drawOverlays = phase === 'all' || phase === 'overlays';

  const focus = focusKey && FORTRESS_DEFS[focusKey] ? focusKey : null;
  const layout = computeHallOfHeroesLayout(rect.x, rect.y, rect.w, rect.h, Boolean(focus));
  const { hall, dossier } = layout;
  const slots = computeTreasuryBuildingSlots(hall).sort((a, b) => (a.z ?? 0) - (b.z ?? 0));

  if (drawBase) {
    drawSettlementHubBackdrop(ctx, hall);

    ctx.textAlign = 'center';
    ctx.font = 'bold 8px monospace';
    ctx.fillStyle = 'rgba(200,180,130,0.55)';
    ctx.fillText('FORTRESS STRUCTURES', hall.x + hall.w / 2, hall.y + 14);
    ctx.textAlign = 'left';

    for (const slot of slots) {
      const def = FORTRESS_DEFS[slot.key];
      const selected = focus === slot.key;
      const layout = structureLayout(hall, slot, selected, def);
      const { spriteBox, buildingH } = layout;

      drawHubBuildingGroundShadow(ctx, spriteBox, { alpha: 0.75 });
      if (!drawTreasuryBuildingSprite(ctx, slot.key, spriteBox, { selected })) {
        drawBuildingFallback(ctx, slot, def, buildingH);
      }
    }
  }

  if (drawOverlays) {
    if (!focus) {
      for (const slot of slots) {
        const def = FORTRESS_DEFS[slot.key];
        const layout = structureLayout(hall, slot, false, def);
        const { hitW, hitH, hitY } = layout;
        const lvl = upgrades[slot.key] ?? 0;
        const maxed = lvl >= def.maxLevel;
        drawStructureClickAffordance(ctx, slot, layout, def, lvl, maxed, false);

        btnsOut.push({
          x: slot.x - hitW / 2,
          y: hitY,
          w: hitW,
          h: hitH,
          action: 'focusFortressNode',
          key: slot.key,
        });
      }

      ctx.textAlign = 'center';
      ctx.font = '7px monospace';
      ctx.fillStyle = 'rgba(160,140,100,0.42)';
      ctx.fillText('Tap a labeled structure to upgrade', hall.x + hall.w / 2, hall.y + hall.h - 8);
      ctx.textAlign = 'left';
    }

    if (focus && dossier) {
      const def = FORTRESS_DEFS[focus];
      const lvl = upgrades[focus] ?? 0;
      const maxed = lvl >= def.maxLevel;
      const cost = maxed ? 0 : def.cost[lvl];
      const canBuy = !maxed && goldReserve >= cost;
      const dossierAlpha = dossierRevealAlpha(focus);
      ctx.save();
      ctx.globalAlpha = dossierAlpha;
      drawBuildingDossier(ctx, dossier, focus, def, lvl, maxed, cost, canBuy, goldReserve, btnsOut);
      ctx.restore();
    }
  }

  return { layout, focusKey: focus };
}
