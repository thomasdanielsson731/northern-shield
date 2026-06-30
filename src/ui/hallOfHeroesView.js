/**
 * Hall of Heroes — longhouse interior with full-body statue overlays (no plinth art).
 * @see design/art/BATCH_PROMPTS.md Wave 13 / 13.1b
 */

import { UI_COLORS } from './uiTheme.js';
import { CAREER_XP } from '../roster/defender.js';
import { TOWER_DEFS } from '../entities/tower.js';
import { computeContentCoverFit, mapContentNormToScreen } from '../assets/artAlignment.js';
import { getWarCampObjectives } from './warCampPanel.js';
import { drawWarCampGlassChip, WAR_CAMP_THEME, drawImmersiveBackToTownChip } from './warCampVisual.js';
import { drawHallHeroStatue, isHallHeroStatueReady } from './hallHeroStatues.js';

const HALL_ART_W = 1536;
const HALL_ART_H = 1024;

/** Painted hall band — statue feet anchors are normalized inside this crop only. */
export const HALL_ART_CONTENT = {
  sx: 0,
  sy: 0.04,
  sw: 1.0,
  sh: 0.92,
};

export const HALL_FRAME_INSET_BOTTOM = 12;

/** Walkable wooden floor on the interior plate (content-normalized 0–1). */
export const HALL_FLOOR_BOUNDS = {
  minX: 0.14,
  maxX: 0.86,
  minY: 0.52,
  maxY: 0.94,
};

/** Inset from floor edges — keeps statue feet off benches and plank ends. */
export const HALL_FLOOR_MARGIN = { x: 0.12, y: 0.08 };

/** Horizontal span of statue rows as fraction of placement band (centered). */
const HALL_STATUE_CLUSTER_SPAN = 0.56;

/** Max heroes shown as floor statues without scrolling. */
export const HALL_MAX_STATUES = 10;

/** Usable floor band after margin — all statue feet land here. */
export function getHallFloorPlacementBounds() {
  const b = HALL_FLOOR_BOUNDS;
  const w = b.maxX - b.minX;
  const h = b.maxY - b.minY;
  return {
    minX: b.minX + HALL_FLOOR_MARGIN.x * w,
    maxX: b.maxX - HALL_FLOOR_MARGIN.x * w,
    minY: b.minY + HALL_FLOOR_MARGIN.y * h,
    maxY: b.maxY - HALL_FLOOR_MARGIN.y * h,
  };
}

export function getHallFloorCenter() {
  const p = getHallFloorPlacementBounds();
  return { nx: (p.minX + p.maxX) / 2, ny: (p.minY + p.maxY) / 2 };
}

/** Two rows × five columns — tight cluster centered on the walkable floor. */
function buildHallPlinthNorm() {
  const place = getHallFloorPlacementBounds();
  const cols = 5;
  const rowDepths = [0.34, 0.68];
  const centerX = (place.minX + place.maxX) / 2;
  const clusterW = (place.maxX - place.minX) * HALL_STATUE_CLUSTER_SPAN;
  const anchors = [];
  for (let r = 0; r < rowDepths.length; r++) {
    const ny = place.minY + rowDepths[r] * (place.maxY - place.minY);
    const rowTaper = 0.05 * (1 - rowDepths[r]);
    const rowSpan = clusterW * (1 - rowTaper);
    const rowMinX = centerX - rowSpan / 2;
    const rowMaxX = centerX + rowSpan / 2;
    const z = r;
    for (let c = 0; c < cols; c++) {
      const t = cols === 1 ? 0.5 : c / (cols - 1);
      const nx = rowMinX + t * (rowMaxX - rowMinX);
      const scale = 0.62 + r * 0.10 + (c === 2 ? 0.06 : Math.abs(c - 2) === 1 ? 0.03 : 0);
      anchors.push({ nx, ny, scale, z });
    }
  }
  return anchors;
}

/**
 * Statue foot anchors — generated inside inset floor bounds.
 * z: 0 = back row, 1 = front row.
 */
export const HALL_PLINTH_NORM = buildHallPlinthNorm();

const HALL_ART = {
  interior: '/assets/ui/ui_hall_of_heroes_interior_noplinths@1536x1024.png',
  interiorLegacy: '/assets/ui/ui_hall_of_heroes_interior@1536x1024.png',
  dossier: '/assets/ui/ui_hall_dossier_panel@280x420.png',
};

const _images = {};
for (const [key, src] of Object.entries(HALL_ART)) {
  const img = new Image();
  img.src = src;
  _images[key] = img;
}

let _dossierRevealAt = 0;
let _lastDossierFocusId = null;

function dossierRevealAlpha(focusId) {
  if (!focusId) return 0;
  if (focusId !== _lastDossierFocusId) {
    _lastDossierFocusId = focusId;
    _dossierRevealAt = performance.now();
  }
  return Math.min(1, (performance.now() - _dossierRevealAt) / 220);
}

export function getHallInstructionHint(state = {}) {
  if (state.focusId) {
    return { title: 'DOSSIER', line: 'Esc closes panel · click statue again to dismiss' };
  }
  if (state.renameActive) {
    return { title: 'NAMING', line: 'Type a name · Enter saves · Esc cancels' };
  }
  if ((state.defenderCount ?? 0) > HALL_MAX_STATUES) {
    return { title: 'HALL OF HEROES', line: '◀ ▶ scroll for more · click a statue for dossier' };
  }
  if ((state.defenderCount ?? 0) > 0) {
    return { title: 'HALL OF HEROES', line: 'Click a statue to open their dossier' };
  }
  return { title: 'HALL OF HEROES', line: 'Recruit defenders at the Barracks' };
}

function ready(key) {
  const img = _images[key];
  return Boolean(img?.complete && img.naturalWidth > 0);
}

export function isHallOfHeroesViewReady() {
  return ready('interior') || ready('interiorLegacy');
}

function hallCoverFit(hall) {
  return computeContentCoverFit(HALL_ART_W, HALL_ART_H, HALL_ART_CONTENT, hall.x, hall.y, hall.w, hall.h);
}

/** Map content-normalized point (0–1 in HALL_ART_CONTENT) → screen coords. */
export function hallArtToScreen(hall, nx, ny) {
  return mapContentNormToScreen(hallCoverFit(hall), nx, ny);
}

/** Layout — full-bleed hall; dossier floats on select. No bottom portrait strip. */
export function computeHallOfHeroesLayout(x, y, w, h, hasFocus = false) {
  const pad = 2;
  const hall = { x: x + pad, y: y + pad, w: w - pad * 2, h: h - pad * 2 };
  let dossier = null;
  if (hasFocus) {
    const dw = Math.min(252, Math.max(200, Math.floor(hall.w * 0.30)));
    const dh = Math.min(hall.h - 20, Math.floor(h * 0.68));
    dossier = {
      x: hall.x + hall.w - dw - 8,
      y: hall.y + 10,
      w: dw,
      h: dh,
    };
  }
  return {
    hall,
    dossier,
    roster: null,
    maxPlinths: HALL_MAX_STATUES,
  };
}

/** Content rect inside outer frame — hall fills almost all inner area. */
export function computeHallImmersiveRect(frameThick, contentTop, contentBot, baseW, useBottomBarSlot = false) {
  const pad = 3;
  const extraH = useBottomBarSlot ? 46 : 0;
  return {
    x: frameThick + pad,
    y: contentTop + pad,
    w: baseW - (frameThick + pad) * 2,
    h: contentBot - contentTop - pad * 2 + extraH - HALL_FRAME_INSET_BOTTOM,
  };
}

/** Top-left guidance + bottom-right back chip — glass overlays on hall plate. */
export function drawHallImmersiveChrome(ctx, rect, layout, chrome, btnsOut = []) {
  const chipPad = 10;

  if (chrome?.guidance) {
    const gw = Math.min(228, Math.max(168, Math.floor(rect.w * 0.34)));
    drawWarCampGlassChip(ctx, rect.x + chipPad, rect.y + chipPad, gw, chrome.guidance.subtitle ? 40 : 28, {
      title: chrome.guidance.title ?? 'WHAT TO DO NOW',
      subtitle: chrome.guidance.subtitle ?? '',
    });
  }

  if (chrome?.showBackToTown) {
    drawImmersiveBackToTownChip(ctx, rect, btnsOut);
  }
}

/** Build compact objective copy for the hall glass card. */
export function getHallObjectiveGuidance(state = {}) {
  if (state.focusId) {
    return { title: 'DOSSIER', subtitle: 'Esc closes · tap statue again to dismiss' };
  }
  const active = getWarCampObjectives(state).find(o => o.active && !o.done);
  if (active) {
    return { title: 'WHAT TO DO NOW', subtitle: active.label };
  }
  if ((state.defenderCount ?? 0) > HALL_MAX_STATUES) {
    return { title: 'HALL OF HEROES', subtitle: 'Scroll the line · tap a statue' };
  }
  if ((state.defenderCount ?? 0) > 0) {
    return { title: 'HALL OF HEROES', subtitle: 'Tap a statue to open dossier' };
  }
  return { title: 'HALL OF HEROES', subtitle: 'Recruit defenders at the Barracks' };
}

/** Pick N slots starting from floor center, then nearest outward. */
export function pickHallStatueSlotIndices(count, total = HALL_PLINTH_NORM.length) {
  const n = Math.max(1, Math.min(count, total));
  if (n >= total) return Array.from({ length: total }, (_, i) => i);

  const center = getHallFloorCenter();
  const ranked = Array.from({ length: total }, (_, i) => {
    const p = HALL_PLINTH_NORM[i];
    const dx = p.nx - center.nx;
    const dy = p.ny - center.ny;
    return { i, d: dx * dx + dy * dy };
  }).sort((a, b) => a.d - b.d || a.i - b.i);

  return ranked.slice(0, n).map((r) => r.i).sort((a, b) => a - b);
}

/** Clamp anchor into the inset walkable floor band. */
export function clampHallFloorNorm(nx, ny) {
  const b = getHallFloorPlacementBounds();
  return {
    nx: Math.max(b.minX, Math.min(b.maxX, nx)),
    ny: Math.max(b.minY, Math.min(b.maxY, ny)),
  };
}

/** Clip rect for statue draws — floor width, full body height above the foot band. */
export function getHallFloorScreenRect(hall) {
  const tl = hallArtToScreen(hall, HALL_FLOOR_BOUNDS.minX, HALL_FLOOR_BOUNDS.minY);
  const br = hallArtToScreen(hall, HALL_FLOOR_BOUNDS.maxX, HALL_FLOOR_BOUNDS.maxY);
  const floorH = Math.max(8, br.y - tl.y);
  const bodyRise = hall.h * 0.42;
  const bottomPad = 14;
  return {
    x: tl.x,
    y: tl.y - bodyRise,
    w: Math.max(8, br.x - tl.x),
    h: floorH + bodyRise + bottomPad,
  };
}

/** Floor statue anchors — scattered rows, up to HALL_MAX_STATUES slots. */
export function computeHallPlinthSlots(count, hall) {
  const indices = pickHallStatueSlotIndices(count, HALL_PLINTH_NORM.length);
  return indices.map((idx) => {
    const a = HALL_PLINTH_NORM[idx];
    const c = clampHallFloorNorm(a.nx, a.ny);
    const p = hallArtToScreen(hall, c.nx, c.ny);
    return { x: p.x, y: p.y, scale: a.scale, z: a.z ?? 0 };
  });
}

/** Shared longhouse interior plate — Hall of Heroes + Treasury immersive views. */
export function drawHallInteriorBackdrop(ctx, hall, { warmGold = false } = {}) {
  const key = ready('interior') ? 'interior' : (ready('interiorLegacy') ? 'interiorLegacy' : null);
  if (!key) return false;
  const img = _images[key];
  const fit = hallCoverFit(hall);
  ctx.save();
  ctx.beginPath();
  ctx.rect(hall.x, hall.y, hall.w, hall.h);
  ctx.clip();
  ctx.fillStyle = '#0a0810';
  ctx.fillRect(hall.x, hall.y, hall.w, hall.h);
  ctx.globalAlpha = 0.98;
  const c = HALL_ART_CONTENT;
  ctx.drawImage(
    img,
    c.sx * img.naturalWidth, c.sy * img.naturalHeight,
    c.sw * img.naturalWidth, c.sh * img.naturalHeight,
    fit.dx, fit.dy, fit.dw, fit.dh,
  );
  const vig = ctx.createLinearGradient(hall.x, hall.y, hall.x, hall.y + hall.h);
  vig.addColorStop(0, 'rgba(8,6,10,0.14)');
  vig.addColorStop(0.55, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(4,3,6,0.32)');
  ctx.fillStyle = vig;
  ctx.globalAlpha = 1;
  ctx.fillRect(hall.x, hall.y, hall.w, hall.h);
  if (warmGold) {
    const glow = ctx.createRadialGradient(
      hall.x + hall.w * 0.5, hall.y + hall.h * 0.62, hall.w * 0.05,
      hall.x + hall.w * 0.5, hall.y + hall.h * 0.62, hall.w * 0.55,
    );
    glow.addColorStop(0, 'rgba(220,160,50,0.10)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(hall.x, hall.y, hall.w, hall.h);
  }
  ctx.restore();
  return true;
}

function drawHallScrollChrome(ctx, hall, scrollOffset, total, btnsOut) {
  const maxVisible = HALL_MAX_STATUES;
  const maxScroll = Math.max(0, total - maxVisible);
  if (maxScroll <= 0) return;
  const arrowY = hall.y + hall.h * 0.42;
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'center';
  if (scrollOffset > 0) {
    ctx.fillStyle = 'rgba(200,170,90,0.72)';
    ctx.fillText('◀', hall.x + 14, arrowY);
    btnsOut.push({ x: hall.x + 2, y: arrowY - 14, w: 24, h: 28, action: 'scrollRoster', dir: -1 });
  }
  if (scrollOffset < maxScroll) {
    ctx.fillStyle = 'rgba(200,170,90,0.72)';
    ctx.fillText('▶', hall.x + hall.w - 14, arrowY);
    btnsOut.push({ x: hall.x + hall.w - 26, y: arrowY - 14, w: 24, h: 28, action: 'scrollRoster', dir: 1 });
  }
  ctx.textAlign = 'left';
}

function statueDisplayHeight(hall, scale, selected, totalCount = 1) {
  const rowFactor = totalCount > 4 ? 0.30 : totalCount > 2 ? 0.34 : 0.38;
  const base = hall.h * rowFactor;
  return base * scale * (selected ? 1.04 : 1);
}

function getCareerXpProgress(xp, lvl) {
  const cur = CAREER_XP[Math.min(lvl, CAREER_XP.length - 1)] ?? 0;
  const nxt = CAREER_XP[Math.min(lvl + 1, CAREER_XP.length - 1)] ?? cur;
  if (nxt <= cur) return 1;
  return Math.max(0, Math.min(1, (xp - cur) / (nxt - cur)));
}

/**
 * Hall view — all defenders as floor statues; dossier on select.
 * @param {'all'|'base'|'overlays'} [opts.phase]
 */
export function drawHallOfHeroesView(ctx, rect, opts = {}) {
  const {
    defenders = [],
    focusId = null,
    drawPortrait,
    renameState = null,
    equipFlash = null,
    slotMetaBuilder = null,
    btnsOut = [],
    scrollOffset = 0,
    phase = 'all',
  } = opts;

  const drawBase = phase === 'all' || phase === 'base';
  const drawOverlays = phase === 'all' || phase === 'overlays';

  const focus = focusId ? defenders.find(d => d.defenderId === focusId) : null;
  const layout = computeHallOfHeroesLayout(rect.x, rect.y, rect.w, rect.h, Boolean(focus));
  const { hall, dossier } = layout;

  const maxVisible = HALL_MAX_STATUES;
  const maxScroll = Math.max(0, defenders.length - maxVisible);
  const scroll = Math.min(Math.max(0, scrollOffset), maxScroll);
  const visibleCount = Math.min(maxVisible, defenders.length);
  const plinthDefs = defenders.slice(scroll, scroll + visibleCount);
  const slots = computeHallPlinthSlots(plinthDefs.length, hall);
  const statueEntries = plinthDefs.map((def, i) => ({ def, slot: slots[i] }));
  statueEntries.sort((a, b) => (a.slot.z ?? 0) - (b.slot.z ?? 0));

  if (drawBase) {
    drawHallInteriorBackdrop(ctx, hall);

    for (const { def, slot } of statueEntries) {
      const selected = focus?.defenderId === def.defenderId;
      const footY = slot.y;
      const statueH = statueDisplayHeight(hall, slot.scale, selected, plinthDefs.length);
      const useStatue = isHallHeroStatueReady(def.type);

      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.beginPath();
      ctx.ellipse(slot.x, footY + 2, statueH * 0.14, statueH * 0.04, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      if (useStatue) {
        if (selected) {
          const g = ctx.createRadialGradient(slot.x, footY - statueH * 0.45, 0, slot.x, footY - statueH * 0.45, statueH * 0.55);
          g.addColorStop(0, 'rgba(200,150,60,0.18)');
          g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(slot.x, footY - statueH * 0.45, statueH * 0.55, 0, Math.PI * 2);
          ctx.fill();
        }
        drawHallHeroStatue(ctx, slot.x, footY, def.type, statueH, { muted: true, selected });
      } else if (drawPortrait) {
        const pr = statueH * 0.14;
        const portraitY = footY - statueH * 0.5;
        drawPortrait(ctx, slot.x, portraitY, def.type, pr, { muted: true, noFrame: true });
      }

      const hasName = Boolean(def.name?.trim());
      const isRenaming = renameState?.defenderId === def.defenderId;
      const displayName = isRenaming
        ? (renameState.draft ?? '') + (Math.floor(performance.now() / 450) % 2 === 0 ? '|' : '')
        : (hasName ? def.name : '—');

      ctx.textAlign = 'center';
      ctx.font = 'bold 6.5px monospace';
      ctx.fillStyle = isRenaming ? '#ffd878' : (hasName ? UI_COLORS.parchment : 'rgba(130,120,100,0.5)');
      ctx.fillText(String(displayName).slice(0, 11), slot.x, footY + 9);

      const hitW = Math.max(52, statueH * 0.22);
      const hitH = statueH + 18;
      btnsOut.push({
        x: slot.x - hitW / 2,
        y: footY - statueH - 4,
        w: hitW,
        h: hitH,
        action: 'focusDefender',
        defenderId: def.defenderId,
      });
      ctx.textAlign = 'left';
    }
  }

  if (drawOverlays) {
    if (!focus && defenders.length > 0) {
      ctx.textAlign = 'center';
      ctx.font = '7px monospace';
      ctx.fillStyle = 'rgba(160,140,100,0.42)';
      ctx.fillText('Select a statue to open dossier', hall.x + hall.w / 2, hall.y + hall.h - 8);
      ctx.textAlign = 'left';
    }

    drawHallScrollChrome(ctx, hall, scroll, defenders.length, btnsOut);

    if (focus && dossier) {
      const dossierAlpha = dossierRevealAlpha(focus.defenderId);
      ctx.save();
      ctx.fillStyle = `rgba(4,2,8,${0.42 * dossierAlpha})`;
      ctx.fillRect(hall.x, hall.y, hall.w, hall.h);
      ctx.globalAlpha = dossierAlpha;
      drawDossierPanel(ctx, dossier, focus, {
        renameState,
        equipFlash,
        slotMetaBuilder,
        btnsOut,
        drawPortrait,
      });
      ctx.restore();
      if (renameState?.defenderId === focus.defenderId) {
        const pulse = 0.55 + Math.sin(performance.now() * 0.008) * 0.35;
        ctx.save();
        ctx.strokeStyle = `rgba(255,200,80,${0.35 + pulse * 0.4})`;
        ctx.lineWidth = 1.6;
        if (typeof ctx.setLineDash === 'function') ctx.setLineDash([5, 3]);
        ctx.beginPath();
        ctx.roundRect(dossier.x - 2, dossier.y - 2, dossier.w + 4, dossier.h + 4, 9);
        ctx.stroke();
        if (typeof ctx.setLineDash === 'function') ctx.setLineDash([]);
        ctx.restore();
      }
    }
  }

  return { layout, focusId: focus?.defenderId ?? null };
}

function drawDossierPanel(ctx, rect, def, opts) {
  const { renameState, equipFlash, slotMetaBuilder, btnsOut, drawPortrait } = opts;
  ctx.save();
  ctx.fillStyle = 'rgba(12,9,14,0.94)';
  ctx.beginPath();
  ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(150,120,70,0.55)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  if (ready('dossier')) {
    ctx.globalAlpha = 0.35;
    ctx.drawImage(_images.dossier, rect.x, rect.y, rect.w, rect.h);
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  const pad = 12;
  const cx = rect.x + rect.w / 2;
  let ly = rect.y + pad + 6;

  const hasName = Boolean(def.name?.trim());
  const isRenaming = renameState?.defenderId === def.defenderId;
  const displayName = isRenaming
    ? (renameState.draft ?? '') + (Math.floor(performance.now() / 450) % 2 === 0 ? '|' : '')
    : (hasName ? def.name : '— unnamed —');

  ctx.textAlign = 'center';
  ctx.font = 'bold 11px monospace';
  ctx.fillStyle = isRenaming ? '#ffd878' : UI_COLORS.gold;
  ctx.fillText(String(displayName).slice(0, 14), cx, ly);
  ly += 13;

  const role = TOWER_DEFS[def.type]?.label ?? def.type;
  ctx.font = '7px monospace';
  ctx.fillStyle = WAR_CAMP_THEME.subtitle;
  ctx.fillText(role, cx, ly);
  ly += 12;

  const heroH = Math.min(108, Math.floor(rect.h * 0.28));
  const heroY = ly + heroH * 0.52;
  const useStatue = isHallHeroStatueReady(def.type);
  if (useStatue) {
    drawHallHeroStatue(ctx, cx, ly + heroH - 6, def.type, heroH - 10, { muted: false, selected: true });
  } else if (drawPortrait) {
    drawPortrait(ctx, cx, heroY, def.type, heroH * 0.22, { muted: false, noFrame: true });
  }
  ly += heroH + 8;

  const kills = def.careerKills ?? 0;
  const battles = def.battlesPlayed ?? 0;
  ctx.font = '6px monospace';
  ctx.fillStyle = 'rgba(160,150,130,0.78)';
  ctx.textAlign = 'center';
  ctx.fillText(`${kills} slain · ${battles} battle${battles !== 1 ? 's' : ''}`, cx, ly);
  ly += 12;
  ctx.textAlign = 'left';

  const lvl = def.careerLevel ?? 1;
  const prog = getCareerXpProgress(def.xp ?? 0, lvl);
  const nextXp = CAREER_XP[Math.min(lvl + 1, CAREER_XP.length - 1)];
  const barX = rect.x + pad;
  const barW = rect.w - pad * 2;

  ctx.font = '6px monospace';
  ctx.fillStyle = 'rgba(160,150,130,0.75)';
  ctx.fillText(`Level ${lvl}`, barX, ly);
  ctx.textAlign = 'right';
  ctx.fillText(lvl >= CAREER_XP.length - 1 ? 'MAX' : `${def.xp ?? 0} / ${nextXp}`, barX + barW, ly);
  ly += 6;
  ctx.fillStyle = WAR_CAMP_THEME.xpTrack;
  ctx.beginPath();
  ctx.roundRect(barX, ly, barW, 4, 2);
  ctx.fill();
  if (prog > 0) {
    ctx.fillStyle = WAR_CAMP_THEME.xpBar;
    ctx.beginPath();
    ctx.roundRect(barX, ly, Math.max(3, barW * prog), 4, 2);
    ctx.fill();
  }
  ly += 16;

  ctx.textAlign = 'left';
  ctx.font = 'bold 6px monospace';
  ctx.fillStyle = 'rgba(140,120,80,0.55)';
  ctx.fillText('EQUIPMENT', barX, ly);
  ly += 10;

  const slotMeta = slotMetaBuilder ? slotMetaBuilder(def) : [null, null];
  const slotW = Math.floor((barW - 6) / 2);
  const slotH = 28;
  for (let si = 0; si < 2; si++) {
    const meta = slotMeta[si];
    const sx = barX + si * (slotW + 6);
    const icon = si === 0 ? '⚔' : '🛡';
    ctx.fillStyle = meta?.itemDef ? (meta.rarityBg ?? 'rgba(40,32,20,0.9)') : 'rgba(18,14,10,0.92)';
    ctx.strokeStyle = meta?.itemDef ? (meta.rarCol ?? 'rgba(120,100,70,0.5)') : 'rgba(150,120,70,0.45)';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.roundRect(sx, ly, slotW, slotH, 3);
    ctx.fill();
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.font = 'bold 8px monospace';
    ctx.fillStyle = meta?.itemDef ? (meta.rarCol ?? '#c0a060') : '#c9a227';
    ctx.fillText(icon, sx + slotW / 2, ly + 12);
    ctx.font = '5px monospace';
    ctx.fillStyle = meta?.itemDef ? 'rgba(210,195,170,0.85)' : 'rgba(180,160,120,0.55)';
    const label = meta?.itemDef ? meta.itemDef.name.slice(0, 8) : 'EQUIP';
    ctx.fillText(label, sx + slotW / 2, ly + 22);
    btnsOut.push({
      x: sx, y: ly, w: slotW, h: slotH,
      action: 'cycleEquip', defenderId: def.defenderId, slotIdx: si,
    });
  }

  if (equipFlash?.defenderId === def.defenderId && equipFlash.timer > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, equipFlash.timer / 28) * 0.5;
    ctx.strokeStyle = equipFlash.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(rect.x + 2, rect.y + 2, rect.w - 4, rect.h - 4, 6);
    ctx.stroke();
    ctx.restore();
  }

  const bioW = 36;
  const bioH = 14;
  const bioX = rect.x + rect.w - pad - bioW;
  const bioY = rect.y + pad;
  ctx.fillStyle = 'rgba(30,20,40,0.8)';
  ctx.strokeStyle = 'rgba(120,100,70,0.4)';
  ctx.beginPath();
  ctx.roundRect(bioX, bioY, bioW, bioH, 2);
  ctx.fill();
  ctx.stroke();
  ctx.font = '6px monospace';
  ctx.fillStyle = 'rgba(160,130,200,0.75)';
  ctx.textAlign = 'center';
  ctx.fillText('📜 BIO', bioX + bioW / 2, bioY + 10);
  btnsOut.push({ x: bioX, y: bioY, w: bioW, h: bioH, action: 'openBio', defenderId: def.defenderId });

  const rnX = rect.x + pad;
  ctx.fillStyle = isRenaming ? 'rgba(80,60,10,0.9)' : 'rgba(40,35,15,0.7)';
  ctx.strokeStyle = isRenaming ? 'rgba(255,200,60,0.7)' : 'rgba(120,100,40,0.35)';
  ctx.beginPath();
  ctx.roundRect(rnX, bioY, bioW, bioH, 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = isRenaming ? '#ffd040' : 'rgba(160,140,60,0.55)';
  ctx.fillText(!hasName ? '✎ NAME' : '✏ RENAME', rnX + bioW / 2, bioY + 10);
  btnsOut.push({ x: rnX, y: bioY, w: bioW, h: bioH, action: 'startRename', defenderId: def.defenderId });

  ctx.textAlign = 'left';
}
