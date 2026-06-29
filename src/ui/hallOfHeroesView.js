/**
 * Hall of Heroes — mockup-style warband view (plinths + dossier + roster strip).
 * Backdrop has EMPTY plinths only — heroes are engine overlays.
 * @see design/art/BATCH_PROMPTS.md Wave 13
 */

import { UI_COLORS } from './uiTheme.js';
import { CAREER_XP } from '../roster/defender.js';
import { TOWER_DEFS } from '../entities/tower.js';
import { computeCoverFitRect } from '../assets/campaignArt.js';
import { WAR_CAMP_THEME } from './warCampVisual.js';

const HALL_ART_W = 1536;
const HALL_ART_H = 1024;

/** Plinth tops in backdrop art space (0–1) — tune to generated plate. */
export const HALL_PLINTH_NORM = [
  { nx: 0.20, ny: 0.56, scale: 0.90 },
  { nx: 0.35, ny: 0.53, scale: 0.95 },
  { nx: 0.50, ny: 0.51, scale: 1.0 },
  { nx: 0.65, ny: 0.53, scale: 0.95 },
  { nx: 0.80, ny: 0.56, scale: 0.90 },
];

const HALL_ART = {
  interior: '/assets/ui/ui_hall_of_heroes_interior@1536x1024.png',
  rosterSlot: '/assets/ui/ui_hall_roster_slot@56x56.png',
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
    return { title: 'DOSSIER', line: 'Esc closes panel · click plinth again to dismiss' };
  }
  if (state.renameActive) {
    return { title: 'NAMING', line: 'Type a name · Enter saves · Esc cancels' };
  }
  if ((state.defenderCount ?? 0) > 0) {
    return { title: 'HALL OF HEROES', line: 'Select a hero on a plinth to open their dossier' };
  }
  return { title: 'HALL OF HEROES', line: 'Recruit defenders at the Barracks' };
}

function ready(key) {
  const img = _images[key];
  return Boolean(img?.complete && img.naturalWidth > 0);
}

export function isHallOfHeroesViewReady() {
  return ready('interior');
}

function hallCoverFit(hall) {
  return computeCoverFitRect(HALL_ART_W, HALL_ART_H, hall.x, hall.y, hall.w, hall.h);
}

/** Map art-normalized point → screen coords in hall clip rect. */
export function hallArtToScreen(hall, nx, ny) {
  const fit = hallCoverFit(hall);
  return {
    x: fit.dx + nx * fit.dw,
    y: fit.dy + ny * fit.dh,
  };
}

/** Layout — dossier column only after player selects a hero. */
export function computeHallOfHeroesLayout(x, y, w, h, hasFocus = false) {
  const pad = 6;
  const gap = 8;
  const dossierW = hasFocus ? Math.min(268, Math.max(200, Math.floor(w * 0.30))) : 0;
  const hallW = w - dossierW - (hasFocus ? gap : 0) - pad * 2;
  const rosterH = Math.min(62, Math.max(48, Math.floor(h * 0.16)));
  const hallH = h - rosterH - pad * 2 - 4;
  return {
    hall: { x: x + pad, y: y + pad, w: hallW, h: hallH },
    dossier: hasFocus
      ? { x: x + pad + hallW + gap, y: y + pad, w: dossierW, h: h - pad * 2 }
      : null,
    roster: { x: x + pad, y: y + h - rosterH - pad, w: w - pad * 2, h: rosterH },
    maxPlinths: HALL_PLINTH_NORM.length,
  };
}

/** Fixed plinth anchors from backdrop art (up to 5). */
export function computeHallPlinthSlots(count, hall) {
  const n = Math.min(HALL_PLINTH_NORM.length, Math.max(1, count));
  const anchors = HALL_PLINTH_NORM.slice(0, n);
  if (count < HALL_PLINTH_NORM.length && count > 0) {
    const mid = (HALL_PLINTH_NORM.length - count) / 2;
    return HALL_PLINTH_NORM.slice(mid, mid + count).map((a) => {
      const p = hallArtToScreen(hall, a.nx, a.ny);
      return { x: p.x, y: p.y, scale: a.scale };
    });
  }
  return anchors.map((a) => {
    const p = hallArtToScreen(hall, a.nx, a.ny);
    return { x: p.x, y: p.y, scale: a.scale };
  });
}

function drawInterior(ctx, hall) {
  if (!ready('interior')) return false;
  const img = _images.interior;
  const fit = hallCoverFit(hall);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(hall.x, hall.y, hall.w, hall.h, 6);
  ctx.clip();
  ctx.fillStyle = '#0a0810';
  ctx.fillRect(hall.x, hall.y, hall.w, hall.h);
  ctx.globalAlpha = 0.98;
  ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, fit.dx, fit.dy, fit.dw, fit.dh);
  const vig = ctx.createLinearGradient(hall.x, hall.y, hall.x, hall.y + hall.h);
  vig.addColorStop(0, 'rgba(8,6,10,0.20)');
  vig.addColorStop(0.5, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(4,3,6,0.40)');
  ctx.fillStyle = vig;
  ctx.globalAlpha = 1;
  ctx.fillRect(hall.x, hall.y, hall.w, hall.h);
  ctx.restore();
  return true;
}

function drawRosterSlotFrame(ctx, x, y, w, h, selected) {
  if (ready('rosterSlot')) {
    ctx.drawImage(_images.rosterSlot, x, y, w, h);
  } else {
    ctx.fillStyle = 'rgba(10,8,12,0.92)';
    ctx.strokeStyle = selected ? 'rgba(200,170,90,0.85)' : 'rgba(120,100,70,0.45)';
    ctx.lineWidth = selected ? 1.4 : 0.8;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 4);
    ctx.fill();
    ctx.stroke();
  }
  if (selected) {
    ctx.strokeStyle = 'rgba(232,208,96,0.75)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x - 1, y - 1, w + 2, h + 2, 5);
    ctx.stroke();
  }
}

function getCareerXpProgress(xp, lvl) {
  const cur = CAREER_XP[Math.min(lvl, CAREER_XP.length - 1)] ?? 0;
  const nxt = CAREER_XP[Math.min(lvl + 1, CAREER_XP.length - 1)] ?? cur;
  if (nxt <= cur) return 1;
  return Math.max(0, Math.min(1, (xp - cur) / (nxt - cur)));
}

/**
 * Hall view — heroes on backdrop plinths; dossier appears only when focusId is set.
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
  } = opts;

  const focus = focusId ? defenders.find(d => d.defenderId === focusId) : null;
  const layout = computeHallOfHeroesLayout(rect.x, rect.y, rect.w, rect.h, Boolean(focus));
  const { hall, dossier, roster } = layout;

  drawInterior(ctx, hall);

  const plinthCount = Math.min(layout.maxPlinths, defenders.length);
  const emptyPlinths = layout.maxPlinths - plinthCount;
  if (emptyPlinths > 0 && plinthCount < layout.maxPlinths) {
    const ghostSlots = computeHallPlinthSlots(layout.maxPlinths, hall);
    for (let gi = plinthCount; gi < ghostSlots.length; gi++) {
      const g = ghostSlots[gi];
      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.strokeStyle = 'rgba(140,120,80,0.35)';
      ctx.lineWidth = 1;
      if (typeof ctx.setLineDash === 'function') ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.ellipse(g.x, g.y + 4, 18 * g.scale, 6 * g.scale, 0, 0, Math.PI * 2);
      ctx.stroke();
      if (typeof ctx.setLineDash === 'function') ctx.setLineDash([]);
      ctx.restore();
    }
  }

  const plinthStart = Math.min(scrollOffset, Math.max(0, defenders.length - plinthCount));
  const plinthDefs = defenders.slice(plinthStart, plinthStart + plinthCount);
  const slots = computeHallPlinthSlots(plinthDefs.length, hall);

  for (let i = 0; i < plinthDefs.length; i++) {
    const def = plinthDefs[i];
    const slot = slots[i];
    const selected = focus?.defenderId === def.defenderId;
    const scale = slot.scale * (selected ? 1.05 : 1);

    const pr = 26 * scale;
    const portraitY = slot.y - 42 * scale;
    if (drawPortrait) {
      if (selected) {
        const g = ctx.createRadialGradient(slot.x, portraitY, 0, slot.x, portraitY, pr * 2.2);
        g.addColorStop(0, 'rgba(200,150,60,0.18)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(slot.x, portraitY, pr * 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
      drawPortrait(ctx, slot.x, portraitY, def.type, pr, { muted: true });
    }

    if (selected) {
      ctx.strokeStyle = 'rgba(232,208,96,0.55)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(slot.x, portraitY, pr + 3, 0, Math.PI * 2);
      ctx.stroke();
    }

    const hasName = Boolean(def.name?.trim());
    const isRenaming = renameState?.defenderId === def.defenderId;
    const displayName = isRenaming
      ? (renameState.draft ?? '') + (Math.floor(performance.now() / 450) % 2 === 0 ? '|' : '')
      : (hasName ? def.name : '—');

    ctx.textAlign = 'center';
    ctx.font = 'bold 7px monospace';
    ctx.fillStyle = isRenaming ? '#ffd878' : (hasName ? UI_COLORS.parchment : 'rgba(130,120,100,0.5)');
    ctx.fillText(String(displayName).slice(0, 12), slot.x, slot.y + 10);

    const role = TOWER_DEFS[def.type]?.label ?? def.type;
    ctx.font = '5.5px monospace';
    ctx.fillStyle = WAR_CAMP_THEME.subtitle;
    ctx.fillText(role.length > 14 ? `${role.slice(0, 13)}…` : role, slot.x, slot.y + 20);

    const lvl = def.careerLevel ?? 1;
    ctx.font = '5px monospace';
    ctx.fillStyle = 'rgba(180,160,120,0.7)';
    ctx.fillText(`Lv ${lvl}`, slot.x, slot.y + 29);

    const hitW = 56 * scale;
    const hitH = 80 * scale;
    btnsOut.push({
      x: slot.x - hitW / 2,
      y: portraitY - pr - 6,
      w: hitW,
      h: hitH,
      action: 'focusDefender',
      defenderId: def.defenderId,
    });
    ctx.textAlign = 'left';
  }

  if (!focus && defenders.length > 0) {
    ctx.textAlign = 'center';
    ctx.font = '7px monospace';
    ctx.fillStyle = 'rgba(160,140,100,0.45)';
    ctx.fillText('Select a hero on a plinth', hall.x + hall.w / 2, hall.y + hall.h - 10);
    ctx.textAlign = 'left';
  }

  if (focus && dossier) {
    const dossierAlpha = dossierRevealAlpha(focus.defenderId);
    ctx.save();
    ctx.globalAlpha = dossierAlpha;
    drawDossierPanel(ctx, dossier, focus, {
      renameState,
      equipFlash,
      slotMetaBuilder,
      btnsOut,
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

  drawRosterStrip(ctx, roster, defenders, focus?.defenderId, {
    drawPortrait,
    btnsOut,
    scrollOffset,
  });

  return focus?.defenderId ?? null;
}

function drawDossierPanel(ctx, rect, def, opts) {
  const { renameState, equipFlash, slotMetaBuilder, btnsOut } = opts;
  if (ready('dossier')) {
    ctx.drawImage(_images.dossier, rect.x, rect.y, rect.w, rect.h);
  } else {
    ctx.fillStyle = 'rgba(8,6,12,0.94)';
    ctx.strokeStyle = 'rgba(150,120,70,0.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 8);
    ctx.fill();
    ctx.stroke();
  }

  const pad = 12;
  const cx = rect.x + rect.w / 2;
  let ly = rect.y + pad + 8;

  const hasName = Boolean(def.name?.trim());
  const isRenaming = renameState?.defenderId === def.defenderId;
  const displayName = isRenaming
    ? (renameState.draft ?? '') + (Math.floor(performance.now() / 450) % 2 === 0 ? '|' : '')
    : (hasName ? def.name : '— unnamed —');

  ctx.textAlign = 'center';
  ctx.font = 'bold 11px monospace';
  ctx.fillStyle = isRenaming ? '#ffd878' : UI_COLORS.gold;
  ctx.fillText(String(displayName).slice(0, 14), cx, ly);
  ly += 14;

  const role = TOWER_DEFS[def.type]?.label ?? def.type;
  ctx.font = '7px monospace';
  ctx.fillStyle = WAR_CAMP_THEME.subtitle;
  ctx.fillText(role, cx, ly);
  ly += 16;

  const lvl = def.careerLevel ?? 1;
  const prog = getCareerXpProgress(def.xp ?? 0, lvl);
  const nextXp = CAREER_XP[Math.min(lvl + 1, CAREER_XP.length - 1)];
  const barX = rect.x + pad;
  const barW = rect.w - pad * 2;

  ctx.textAlign = 'left';
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
  ly += 18;

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

function drawRosterStrip(ctx, rect, defenders, focusId, opts) {
  const { drawPortrait, btnsOut, scrollOffset = 0 } = opts;
  const slotSize = Math.min(52, Math.floor((rect.w - 8) / Math.min(10, Math.max(1, defenders.length))) - 4);
  const gap = 4;
  const maxVisible = Math.floor((rect.w + gap) / (slotSize + gap));
  const start = Math.min(scrollOffset, Math.max(0, defenders.length - maxVisible));

  ctx.font = 'bold 6px monospace';
  ctx.fillStyle = 'rgba(140,120,80,0.5)';
  ctx.fillText('ALL HEROES', rect.x, rect.y + 8);

  const rowY = rect.y + 14;
  let sx = rect.x;
  for (let i = start; i < Math.min(defenders.length, start + maxVisible); i++) {
    const def = defenders[i];
    const selected = def.defenderId === focusId;
    drawRosterSlotFrame(ctx, sx, rowY, slotSize, slotSize, selected);
    if (drawPortrait) {
      const pr = slotSize * 0.38;
      drawPortrait(ctx, sx + slotSize / 2, rowY + slotSize / 2 - 2, def.type, pr, { muted: true });
    }
    if (selected) {
      ctx.strokeStyle = 'rgba(232,208,96,0.75)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(sx - 1, rowY - 1, slotSize + 2, slotSize + 2, 5);
      ctx.stroke();
    }
    btnsOut.push({
      x: sx, y: rowY, w: slotSize, h: slotSize,
      action: 'focusDefender',
      defenderId: def.defenderId,
    });
    sx += slotSize + gap;
  }
}
