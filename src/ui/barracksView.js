/**
 * Barracks — immersive recruit view (training hall + hall hero statues).
 */

import { TOWER_DEFS } from '../entities/tower.js';
import { FORTRESS_DEFS } from '../fortress/fortress.js';
import { computeContentCoverFit, mapContentNormToScreen } from '../assets/artAlignment.js';
import { computeHallImmersiveRect } from './hallOfHeroesView.js';
import {
  drawObjectiveGuidanceChip,
  WAR_CAMP_THEME,
} from './warCampVisual.js';
import { drawHallHeroStatue, isHallHeroStatueReady } from './hallHeroStatues.js';

export { computeHallImmersiveRect as computeBarracksImmersiveRect };

const BARRACKS_ART_W = 1536;
const BARRACKS_ART_H = 1024;

export const BARRACKS_ART_CONTENT = {
  sx: 0,
  sy: 0.02,
  sw: 1.0,
  sh: 0.94,
};

/** Walkable floor band for recruit statue feet. */
export const BARRACKS_FLOOR_BOUNDS = {
  minX: 0.08,
  maxX: 0.92,
  minY: 0.58,
  maxY: 0.90,
};

const BARRACKS_ART = {
  interior: '/assets/ui/ui_barracks_interior@1536x1024.png',
};

const _images = {};
for (const [key, src] of Object.entries(BARRACKS_ART)) {
  const img = new Image();
  img.src = src;
  _images[key] = img;
}

/** Front-row statue anchors — up to nine types, centered cluster. */
export const BARRACKS_RECRUIT_NORM = [
  { nx: 0.14, ny: 0.82, scale: 0.86, z: 1 },
  { nx: 0.28, ny: 0.80, scale: 0.90, z: 1 },
  { nx: 0.42, ny: 0.78, scale: 0.94, z: 1 },
  { nx: 0.58, ny: 0.78, scale: 0.94, z: 1 },
  { nx: 0.72, ny: 0.80, scale: 0.90, z: 1 },
  { nx: 0.86, ny: 0.82, scale: 0.86, z: 1 },
  { nx: 0.22, ny: 0.70, scale: 0.78, z: 0 },
  { nx: 0.40, ny: 0.68, scale: 0.80, z: 0 },
  { nx: 0.60, ny: 0.68, scale: 0.80, z: 0 },
];

export const BARRACKS_ROSTER_CAP = 6;
export const CAMPAIGN_FIELD_HERO_CAP = 10;

/** Star gates mirrored from game recruit rules — used for barracks statue lock UI. */
export const RECRUIT_STAR_GATES = {
  isjatten: 5,
  drakship: 3,
};

export function filterRecruitableTypesByStars(types, starCount = 0) {
  return types.filter((t) => {
    const gate = RECRUIT_STAR_GATES[t];
    return gate == null || starCount >= gate;
  });
}

export function getBarracksDisplayCap({ firstSagaMap = false, barracksLevel = 0 } = {}) {
  if (firstSagaMap) return 2;
  return Math.min(CAMPAIGN_FIELD_HERO_CAP, getBarracksUnlockedSlots(barracksLevel));
}

export function isBarracksViewReady() {
  const img = _images.interior;
  return Boolean(img?.complete && img.naturalWidth > 0);
}

export function shouldShowBarracksRecruitView(warCampTab, progressionBuilding) {
  if (progressionBuilding === 'warband' || progressionBuilding === 'fortress') return false;
  if (progressionBuilding === 'recruit') return true;
  return warCampTab === 'recruit';
}

export function getRecruitableTypes({ firstSagaMap = false } = {}) {
  if (firstSagaMap) {
    return ['valkyrie', 'military'];
  }
  return [
    'berserk', 'valkyrie', 'military', 'catapult', 'blondie',
    'piltorn', 'hydda', 'isjatten', 'drakship',
  ];
}

export function getBarracksRosterCap({ firstSagaMap = false } = {}) {
  return firstSagaMap ? 2 : CAMPAIGN_FIELD_HERO_CAP;
}

/** How many roster slots are unlocked at the current barracks fortress level. */
export function getBarracksUnlockedSlots(barracksLevel = 0) {
  return Math.min(BARRACKS_ROSTER_CAP, 3 + barracksLevel);
}

export function getBarracksInstructionHint(state = {}) {
  const cost = state.recruitCost ?? 30;
  const reserve = state.goldReserve ?? 0;
  return {
    title: 'BARRACKS',
    subtitle: `Recruit defenders and heroes to strengthen your fortress · ${cost}g each · ◆ ${reserve}g reserve`,
  };
}

export function getBarracksMetaHeader() {
  return {
    line1: 'BARRACKS · RECRUIT',
    line2: 'Recruit defenders and heroes to strengthen your fortress',
  };
}

function barracksArtToScreen(hall, nx, ny) {
  return mapContentNormToScreen(
    computeContentCoverFit(BARRACKS_ART_W, BARRACKS_ART_H, BARRACKS_ART_CONTENT, hall.x, hall.y, hall.w, hall.h),
    nx, ny,
  );
}

function hallCoverFit(hall) {
  return computeContentCoverFit(BARRACKS_ART_W, BARRACKS_ART_H, BARRACKS_ART_CONTENT, hall.x, hall.y, hall.w, hall.h);
}

export function drawBarracksInteriorBackdrop(ctx, hall) {
  const img = _images.interior;
  if (img?.complete && img.naturalWidth > 0) {
    const fit = hallCoverFit(hall);
    ctx.save();
    ctx.beginPath();
    ctx.rect(hall.x, hall.y, hall.w, hall.h);
    ctx.clip();
    ctx.fillStyle = '#0a0810';
    ctx.fillRect(hall.x, hall.y, hall.w, hall.h);
    ctx.globalAlpha = 0.98;
    const c = BARRACKS_ART_CONTENT;
    ctx.drawImage(
      img,
      c.sx * img.naturalWidth, c.sy * img.naturalHeight,
      c.sw * img.naturalWidth, c.sh * img.naturalHeight,
      fit.dx, fit.dy, fit.dw, fit.dh,
    );
    const vig = ctx.createLinearGradient(hall.x, hall.y, hall.x, hall.y + hall.h);
    vig.addColorStop(0, 'rgba(8,6,10,0.12)');
    vig.addColorStop(0.55, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(4,3,6,0.34)');
    ctx.fillStyle = vig;
    ctx.globalAlpha = 1;
    ctx.fillRect(hall.x, hall.y, hall.w, hall.h);
    ctx.restore();
    return true;
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(hall.x, hall.y, hall.w, hall.h);
  ctx.clip();
  const bg = ctx.createLinearGradient(hall.x, hall.y, hall.x, hall.y + hall.h);
  bg.addColorStop(0, '#1a1410');
  bg.addColorStop(0.55, '#120e0a');
  bg.addColorStop(1, '#080604');
  ctx.fillStyle = bg;
  ctx.fillRect(hall.x, hall.y, hall.w, hall.h);
  const fireX = hall.x + hall.w * 0.5;
  const fireY = hall.y + hall.h * 0.62;
  const glow = ctx.createRadialGradient(fireX, fireY, 0, fireX, fireY, hall.w * 0.35);
  glow.addColorStop(0, 'rgba(255,140,50,0.22)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(hall.x, hall.y, hall.w, hall.h);
  ctx.restore();
  return false;
}

export function computeBarracksRecruitSlots(types, hall) {
  const norms = BARRACKS_RECRUIT_NORM.slice(0, types.length);
  const center = (norms.length - 1) / 2;
  return types.map((type, i) => {
    const a = norms[i] ?? BARRACKS_RECRUIT_NORM[i % BARRACKS_RECRUIT_NORM.length];
    let nx = a.nx;
    if (norms.length <= 5) {
      const t = norms.length === 1 ? 0.5 : i / (norms.length - 1);
      nx = 0.14 + t * 0.72;
    }
    const p = barracksArtToScreen(hall, nx, a.ny);
    return {
      type,
      x: p.x,
      y: p.y,
      scale: a.scale * (1 - Math.abs(i - center) * 0.02),
      z: a.z ?? 0,
    };
  });
}

function statueDisplayHeight(hall, scale, selected) {
  return hall.h * 0.34 * scale * (selected ? 1.04 : 1);
}

function drawBarracksLevelCard(ctx, hall, barracksLevel, goldReserve, btnsOut) {
  const def = FORTRESS_DEFS.barracks;
  const maxed = barracksLevel >= def.maxLevel;
  const cost = maxed ? 0 : def.cost[barracksLevel];
  const canBuy = !maxed && goldReserve >= cost;
  const pad = 10;
  const cardW = Math.min(210, Math.max(168, Math.floor(hall.w * 0.28)));
  const cardX = hall.x + pad;
  const cardY = hall.y + pad;
  const nextDesc = maxed ? 'Fully upgraded' : (def.levelDesc?.[barracksLevel] ?? def.desc);
  const reduction = def.bonuses[barracksLevel]?.recruitCostReduction ?? 0;

  const cardH = drawObjectiveGuidanceChip(ctx, cardX, cardY, cardW, 'BARRACKS LEVEL', [
    `Level ${barracksLevel} / ${def.maxLevel}`,
    nextDesc,
    reduction > 0 ? `Recruit cost −${reduction}g` : 'Upgrade to unlock roster slots',
  ]);

  if (!maxed) {
    const btnY = cardY + cardH + 4;
    const btnW = cardW;
    const btnH = 26;
    ctx.save();
    ctx.fillStyle = canBuy ? 'rgba(10,40,10,0.96)' : 'rgba(20,16,10,0.92)';
    ctx.strokeStyle = canBuy ? 'rgba(60,220,60,0.85)' : 'rgba(90,70,45,0.45)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(cardX, btnY, btnW, btnH, 5);
    ctx.fill();
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.font = 'bold 7px monospace';
    ctx.fillStyle = canBuy ? 'rgba(130,240,90,0.95)' : 'rgba(160,140,100,0.55)';
    ctx.fillText('UPGRADE', cardX + btnW / 2, btnY + 11);
    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = canBuy ? '#f0e060' : 'rgba(140,120,80,0.55)';
    ctx.fillText(`${cost}g`, cardX + btnW / 2, btnY + 22);
    if (canBuy) {
      btnsOut.push({ x: cardX, y: btnY, w: btnW, h: btnH, action: 'upgradeFortress', key: 'barracks' });
    }
    ctx.restore();
  }
}

function drawBarracksRosterPanel(ctx, hall, defenders, barracksLevel, firstSagaMap = false) {
  const cap = getBarracksRosterCap({ firstSagaMap });
  const unlocked = getBarracksDisplayCap({ firstSagaMap, barracksLevel });
  const panelW = Math.min(220, Math.max(168, Math.floor(hall.w * 0.30)));
  const rowH = 22;
  const headerH = 36;
  const panelH = headerH + cap * rowH + 10;
  const panelX = hall.x + hall.w - panelW - 10;
  const panelY = hall.y + 10;

  ctx.save();
  ctx.fillStyle = 'rgba(10,8,16,0.58)';
  ctx.beginPath();
  ctx.roundRect(panelX, panelY, panelW, panelH, 8);
  ctx.fill();
  const gloss = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelH);
  gloss.addColorStop(0, 'rgba(255,255,255,0.10)');
  gloss.addColorStop(1, 'rgba(0,0,0,0.08)');
  ctx.fillStyle = gloss;
  ctx.fillRect(panelX, panelY, panelW, panelH);
  ctx.strokeStyle = 'rgba(200,170,100,0.48)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.font = 'bold 7px monospace';
  ctx.fillStyle = WAR_CAMP_THEME.gold;
  ctx.fillText('ROSTER', panelX + 10, panelY + 14);
  const countLabel = `${defenders.length} / ${cap}`;
  ctx.font = '6px monospace';
  ctx.fillStyle = 'rgba(200,185,155,0.82)';
  ctx.fillText(countLabel, panelX + panelW - 10 - ctx.measureText(countLabel).width, panelY + 14);

  let ly = panelY + headerH;
  for (let i = 0; i < cap; i++) {
    const def = defenders[i];
    const slotLocked = i >= unlocked;

    if (slotLocked) {
      const needLv = i - 2;
      ctx.font = '6px monospace';
      ctx.fillStyle = 'rgba(110,100,80,0.40)';
      ctx.fillText(`Locked · Barracks Lv.${needLv}`, panelX + 10, ly + 12);
    } else if (def) {
      const label = def.name?.trim() || TOWER_DEFS[def.type]?.label || def.type;
      const lvl = def.careerLevel ?? 1;
      ctx.font = 'bold 7px monospace';
      ctx.fillStyle = 'rgba(220,200,160,0.92)';
      ctx.fillText(label.slice(0, 14), panelX + 10, ly + 8);
      ctx.font = '6px monospace';
      ctx.fillStyle = 'rgba(160,150,130,0.78)';
      const sub = `${TOWER_DEFS[def.type]?.label ?? def.type} · L${lvl}`;
      ctx.fillText(sub, panelX + 10, ly + 17);
    } else {
      ctx.font = '6px monospace';
      ctx.fillStyle = 'rgba(130,120,100,0.45)';
      ctx.fillText('— empty slot —', panelX + 10, ly + 12);
    }
    ly += rowH;
  }
  ctx.restore();
}

function drawRecruitStatues(ctx, hall, slots, {
  selectedType, recruitCost, goldReserve, recruitAllowed, btnsOut,
  registerHits = true,
  hitsOnly = false,
  starGates = RECRUIT_STAR_GATES,
  starCount = 0,
}) {
  const sorted = [...slots].sort((a, b) => (a.z ?? 0) - (b.z ?? 0));
  for (const slot of sorted) {
    const def = TOWER_DEFS[slot.type];
    const selected = selectedType === slot.type;
    const starLocked = starGates[slot.type] != null && starCount < starGates[slot.type];
    const statueH = statueDisplayHeight(hall, slot.scale, selected);
    const footY = slot.y;
    const canAfford = recruitAllowed && !starLocked && goldReserve >= recruitCost;

    if (hitsOnly) {
      if (!registerHits || starLocked) continue;
      const hitW = Math.max(48, statueH * 0.22);
      const hitH = statueH + 24;
      btnsOut.push({
        x: slot.x - hitW / 2,
        y: footY - statueH - 4,
        w: hitW,
        h: hitH,
        action: 'selectRecruitType',
        recruitType: slot.type,
      });
      if (selected && canAfford) {
        const btnW = Math.max(72, hitW + 8);
        const btnH = 20;
        btnsOut.push({
          x: slot.x - btnW / 2,
          y: footY + 22,
          w: btnW,
          h: btnH,
          action: 'recruit',
        });
      }
      continue;
    }

    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.ellipse(slot.x, footY + 2, statueH * 0.14, statueH * 0.04, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (selected) {
      const g = ctx.createRadialGradient(slot.x, footY - statueH * 0.45, 0, slot.x, footY - statueH * 0.45, statueH * 0.55);
      g.addColorStop(0, 'rgba(200,150,60,0.18)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(slot.x, footY - statueH * 0.45, statueH * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }

    const useStatue = isHallHeroStatueReady(slot.type);
    if (useStatue) {
      drawHallHeroStatue(ctx, slot.x, footY, slot.type, statueH, {
        muted: !selected || starLocked,
        selected: selected && !starLocked,
      });
    }

    if (starLocked) {
      ctx.textAlign = 'center';
      ctx.font = 'bold 6px monospace';
      ctx.fillStyle = 'rgba(200,160,80,0.75)';
      ctx.fillText(`★ ${starGates[slot.type]}`, slot.x, footY - statueH - 6);
      ctx.textAlign = 'left';
      continue;
    }

    const displayName = (def?.label ?? slot.type).toUpperCase();
    ctx.textAlign = 'center';
    ctx.font = 'bold 6.5px monospace';
    ctx.fillStyle = selected ? '#ffd878' : 'rgba(200,185,155,0.88)';
    ctx.fillText(displayName.slice(0, 12), slot.x, footY + 10);

    ctx.font = '6px monospace';
    ctx.fillStyle = canAfford ? 'rgba(200,170,90,0.85)' : 'rgba(140,120,80,0.55)';
    ctx.fillText(`${recruitCost}g`, slot.x, footY + 19);

    const hitW = Math.max(48, statueH * 0.22);
    const hitH = statueH + 24;
    if (registerHits) {
      btnsOut.push({
        x: slot.x - hitW / 2,
        y: footY - statueH - 4,
        w: hitW,
        h: hitH,
        action: 'selectRecruitType',
        recruitType: slot.type,
      });

      if (selected && canAfford) {
        const btnW = Math.max(72, hitW + 8);
        const btnH = 20;
        const btnX = slot.x - btnW / 2;
        const btnY = footY + 22;
        ctx.fillStyle = 'rgba(10,40,10,0.96)';
        ctx.strokeStyle = 'rgba(60,220,60,0.85)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.roundRect(btnX, btnY, btnW, btnH, 4);
        ctx.fill();
        ctx.stroke();
        ctx.font = 'bold 7px monospace';
        ctx.fillStyle = 'rgba(130,240,90,0.95)';
        ctx.fillText('RECRUIT', slot.x, btnY + 13);
        btnsOut.push({ x: btnX, y: btnY, w: btnW, h: btnH, action: 'recruit' });
      }
    }
    ctx.textAlign = 'left';
  }
}

/**
 * @param {'all'|'base'|'overlays'} [opts.phase]
 */
export function drawBarracksView(ctx, rect, opts = {}) {
  const {
    defenders = [],
    recruitTypes = [],
    selectedType = null,
    recruitCost = 30,
    goldReserve = 0,
    barracksLevel = 0,
    recruitAllowed = true,
    recruitBlockReason = '',
    firstSagaMap = false,
    starCount = 0,
    btnsOut = [],
    phase = 'all',
  } = opts;

  const drawBase = phase === 'all' || phase === 'base';
  const drawOverlays = phase === 'all' || phase === 'overlays';
  const pad = 2;
  const hall = { x: rect.x + pad, y: rect.y + pad, w: rect.w - pad * 2, h: rect.h - pad * 2 };
  const slots = computeBarracksRecruitSlots(recruitTypes, hall);

  if (drawBase) {
    drawBarracksInteriorBackdrop(ctx, hall);

    if (recruitAllowed) {
      drawRecruitStatues(ctx, hall, slots, {
        selectedType, recruitCost, goldReserve, recruitAllowed: true,
        btnsOut, registerHits: false, starCount,
      });
    } else {
      ctx.textAlign = 'center';
      ctx.font = 'bold 9px monospace';
      ctx.fillStyle = 'rgba(175,145,95,0.82)';
      ctx.fillText(recruitBlockReason, hall.x + hall.w / 2, hall.y + hall.h * 0.42);
      ctx.font = '7px monospace';
      ctx.fillStyle = 'rgba(130,110,75,0.55)';
      ctx.fillText('Complete objectives on the command map to unlock recruitment.', hall.x + hall.w / 2, hall.y + hall.h * 0.48);
      ctx.textAlign = 'left';
    }
  }

  if (drawOverlays) {
    drawBarracksLevelCard(ctx, hall, barracksLevel, goldReserve, btnsOut);
    drawBarracksRosterPanel(ctx, hall, defenders, barracksLevel, firstSagaMap);

    if (recruitAllowed) {
      drawRecruitStatues(ctx, hall, slots, {
        selectedType, recruitCost, goldReserve, recruitAllowed: true,
        btnsOut, hitsOnly: true, starCount,
      });
      ctx.textAlign = 'center';
      ctx.font = '7px monospace';
      ctx.fillStyle = 'rgba(160,140,100,0.42)';
      ctx.fillText('Tap a statue to select · RECRUIT when ready', hall.x + hall.w / 2, hall.y + hall.h - 8);
      ctx.textAlign = 'left';
    }
  }

  return { hall, layout: { hall } };
}

export function getBarracksChromeGuidance(state = {}) {
  if (!state.recruitAllowed) {
    return { title: 'BARRACKS', subtitle: state.recruitBlockReason ?? 'Recruitment locked' };
  }
  const cap = state.rosterCap;
  if (cap != null && (state.rosterCount ?? 0) >= cap) {
    return {
      title: 'ROSTER FULL',
      subtitle: cap < 10 ? 'Upgrade Barracks to unlock more slots' : 'Dismiss or retire a defender first',
    };
  }
  if (state.selectedType) {
    const label = TOWER_DEFS[state.selectedType]?.label ?? state.selectedType;
    return { title: 'RECRUIT', subtitle: `Selected: ${label} · ${state.recruitCost}g` };
  }
  return {
    title: 'AVAILABLE HEROES',
    subtitle: `◆ ${state.goldReserve ?? 0}g reserve · tap a statue`,
  };
}
