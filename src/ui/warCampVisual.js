/**
 * War Camp visual layer — inspired by assets/ui/war_camp_bg.png mockup.
 * Charcoal panels, gold trim, section art crops, cycle footer, defender cards.
 */

import { UI_COLORS, META_TOP_BAR_COMPACT_H } from './uiTheme.js';
import { CAREER_XP } from '../roster/defender.js';
import { TOWER_DEFS } from '../entities/tower.js';
import { getWarCampWelcomeAlpha, WAR_CAMP_TAB_HINT_LINE } from './warCampJuice.js';
import { drawHeroCardFrame } from '../assets/campaignArt.js';

export const WAR_CAMP_HEADER_H = 0;
export const WAR_CAMP_CYCLE_H = 40;
/** Cycle strip below meta bar — inside top frame band. */
export const WAR_CAMP_FRAME_CYCLE_H = 34;
/** Reserved height above bottom frame for primary CTA row. */
export const WAR_CAMP_BOTTOM_BAR_H = 52;
export const WAR_CAMP_BANNER_H = 48;
export const WAR_CAMP_GRID_COLS = 5;
export const WAR_CAMP_CARD_GAP = 5;
export const WAR_CAMP_CARD_ASPECT = 1.55; // height ÷ width — portrait trading card

export const WAR_CAMP_THEME = {
  bg: '#0c0c10',
  panel: 'rgba(20,18,24,0.94)',
  panelBorder: 'rgba(150,120,70,0.58)',
  title: '#f2ece0',
  gold: '#c9a227',
  subtitle: 'rgba(185,165,135,0.78)',
  xpBar: '#3a8fd8',
  xpTrack: 'rgba(30,40,55,0.85)',
};

/** Crop regions of the reference art (normalized 0–1). */
const ART_CROPS = {
  recruit:  { sx: 0, sy: 0.02, sw: 0.42, sh: 0.62 },
  warband:  { sx: 0.38, sy: 0.02, sw: 0.62, sh: 0.48 },
  fortress: { sx: 0.22, sy: 0.48, sw: 0.78, sh: 0.50 },
  full:     { sx: 0, sy: 0, sw: 1, sh: 1 },
};

const _warCampArt = new Image();
_warCampArt.src = '/assets/ui/ui_war_camp_bg_age1@1024x512.png';
const _warCampArtLegacy = new Image();
_warCampArtLegacy.src = '/assets/ui/war_camp_bg.png';

function _activeWarCampArt() {
  if (_warCampArt.complete && _warCampArt.naturalWidth > 0) return _warCampArt;
  if (_warCampArtLegacy.complete && _warCampArtLegacy.naturalWidth > 0) return _warCampArtLegacy;
  return null;
}

export function isWarCampArtReady() {
  return Boolean(_activeWarCampArt());
}

/** @returns {number} crop width ÷ height */
export function getWarCampArtCropAspect(cropKey = 'full') {
  const c = ART_CROPS[cropKey] ?? ART_CROPS.full;
  return c.sw / c.sh;
}

export function drawWarCampArtCrop(ctx, x, y, w, h, cropKey = 'full', alpha = 1, fit = 'stretch') {
  const art = _activeWarCampArt();
  if (!art) return false;
  const c = ART_CROPS[cropKey] ?? ART_CROPS.full;
  const iw = art.naturalWidth;
  const ih = art.naturalHeight;
  const sx = c.sx * iw;
  const sy = c.sy * ih;
  const sw = c.sw * iw;
  const sh = c.sh * ih;
  ctx.save();
  ctx.globalAlpha = alpha;
  if (fit === 'stretch') {
    ctx.drawImage(art, sx, sy, sw, sh, x, y, w, h);
  } else {
    const srcAspect = sw / sh;
    const dstAspect = w / h;
    let dw = w;
    let dh = h;
    let dx = x;
    let dy = y;
    if (fit === 'cover') {
      if (dstAspect > srcAspect) {
        dh = w / srcAspect;
        dy = y + (h - dh) / 2;
      } else {
        dw = h * srcAspect;
        dx = x + (w - dw) / 2;
      }
    } else {
      if (dstAspect > srcAspect) {
        dw = h * srcAspect;
        dx = x + (w - dw) / 2;
      } else {
        dh = w / srcAspect;
        dy = y + (h - dh) / 2;
      }
    }
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.drawImage(art, sx, sy, sw, sh, dx, dy, dw, dh);
  }
  ctx.restore();
  return true;
}

/** Mockup-style panel — dark fill + gold rim. */
export function drawWarCampPanel(ctx, x, y, w, h, opts = {}) {
  const {
    fill = WAR_CAMP_THEME.panel,
    radius = 8,
    borderAlpha = 0.75,
  } = opts;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fill();
  ctx.strokeStyle = `rgba(150,120,70,${borderAlpha})`;
  ctx.lineWidth = 1;
  ctx.stroke();
}

/** Full-width WARCAMP header + tagline — title lives in meta bar; kept for tests/skirmish reuse. */
export function drawWarCampHeader(ctx, x, y, w) {
  ctx.save();
  ctx.textAlign = 'left';
  ctx.font = 'bold 16px monospace';
  ctx.fillStyle = WAR_CAMP_THEME.title;
  ctx.shadowColor = 'rgba(200,170,80,0.35)';
  ctx.shadowBlur = 6;
  ctx.fillText('WARCAMP', x + 4, y + 18);
  ctx.shadowBlur = 0;
  ctx.font = '8px monospace';
  ctx.fillStyle = WAR_CAMP_THEME.subtitle;
  ctx.fillText('Where heroes are made and legends are forged.', x + 4, y + 32);
  ctx.restore();
}

const CYCLE_STEPS = [
  { icon: '🔥', label: 'RECRUIT' },
  { icon: '🏰', label: 'PREPARE' },
  { icon: '⚔', label: 'BATTLE' },
  { icon: '📜', label: 'DEBRIEF' },
  { icon: '🌲', label: 'GROW' },
];

const TAB_TO_CYCLE_STEP = { recruit: 0, fortress: 1, warband: 4 };

/** Y where War Camp panels start (below meta bar + cycle strip). */
export function getWarCampContentTop(frameThick = 16) {
  return frameThick + META_TOP_BAR_COMPACT_H + WAR_CAMP_FRAME_CYCLE_H + 4;
}

function drawCycleSteps(ctx, x, y, w, h, activeTab, opts = {}) {
  const { labelX = x + 10, stepStartX = x + 72, fontSize = 6.5 } = opts;
  const active = TAB_TO_CYCLE_STEP[activeTab] ?? 2;
  ctx.textAlign = 'left';
  ctx.font = 'bold 7px monospace';
  ctx.fillStyle = 'rgba(140,120,80,0.55)';
  ctx.fillText('THE CYCLE', labelX, y + 11);

  const stepW = Math.max(34, (w - (stepStartX - x) - 12) / CYCLE_STEPS.length);
  let sx = stepStartX;
  const cy = y + Math.round(h * 0.62);
  for (let i = 0; i < CYCLE_STEPS.length; i++) {
    const step = CYCLE_STEPS[i];
    const isActive = i === active;
    ctx.font = isActive ? `bold ${fontSize}px monospace` : `${fontSize}px monospace`;
    ctx.fillStyle = isActive ? WAR_CAMP_THEME.gold : 'rgba(140,130,110,0.55)';
    ctx.textAlign = 'center';
    ctx.fillText(step.icon, sx + stepW / 2, cy - 8);
    ctx.fillText(step.label, sx + stepW / 2, cy + 2);
    if (i < CYCLE_STEPS.length - 1) {
      ctx.strokeStyle = 'rgba(100,90,70,0.35)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(sx + stepW + 2, cy - 2);
      ctx.lineTo(sx + stepW + 7, cy - 2);
      ctx.stroke();
    }
    sx += stepW + 7;
  }
}

/** THE CYCLE in top frame band — below Northern Shield meta bar. */
export function drawWarCampFrameCycle(ctx, baseW, frameThick, activeTab = 'warband') {
  const y = frameThick + META_TOP_BAR_COMPACT_H;
  const x = frameThick;
  const w = baseW - frameThick * 2;
  const h = WAR_CAMP_FRAME_CYCLE_H;
  ctx.save();
  ctx.fillStyle = 'rgba(6,5,10,0.94)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(150,120,70,0.28)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(x, y + h - 0.5);
  ctx.lineTo(x + w, y + h - 0.5);
  ctx.stroke();
  drawCycleSteps(ctx, x, y, w, h, activeTab);
  ctx.restore();
}

/** Footer cycle diagram — legacy panel embed (skirmish / tests). */
export function drawWarCampCycle(ctx, x, y, w, activeTab = 'warband') {
  ctx.save();
  drawWarCampPanel(ctx, x, y, w, WAR_CAMP_CYCLE_H, { fill: 'rgba(14,12,18,0.92)', radius: 6 });
  drawCycleSteps(ctx, x, y, w, WAR_CAMP_CYCLE_H, activeTab);
  ctx.restore();
}

/** Tab guidance card — separates "what this screen is for" from hero cards. */
export function drawWarCampGuidanceCard(ctx, x, y, w, guidance, btnsOut = null) {
  if (!guidance) return 0;
  const h = 36;
  const fills = {
    primary: 'rgba(24,32,16,0.95)',
    action: 'rgba(28,20,36,0.95)',
    optional: 'rgba(18,22,32,0.92)',
    info: 'rgba(14,12,18,0.9)',
  };
  const borders = {
    primary: 0.85,
    action: 0.8,
    optional: 0.55,
    info: 0.45,
  };
  const kind = guidance.kind ?? 'info';
  drawWarCampPanel(ctx, x, y, w, h, {
    fill: fills[kind] ?? fills.info,
    borderAlpha: borders[kind] ?? 0.5,
    radius: 6,
  });
  ctx.textAlign = 'left';
  ctx.font = 'bold 7px monospace';
  ctx.fillStyle = kind === 'primary' ? WAR_CAMP_THEME.gold : 'rgba(160,140,100,0.55)';
  ctx.fillText(guidance.title ?? 'GUIDE', x + 10, y + 12);
  ctx.font = kind === 'primary' ? 'bold 7.5px monospace' : '7px monospace';
  ctx.fillStyle = kind === 'primary' ? 'rgba(232,215,181,0.9)' : 'rgba(180,165,135,0.78)';
  const line = guidance.line ?? '';
  const maxW = w - 20;
  ctx.fillText(line.length > 52 ? `${line.slice(0, 51)}…` : line, x + 10, y + 26);
  if (guidance.tab && btnsOut) {
    const tabW = 56;
    const tabH = 16;
    const tabX = x + w - tabW - 8;
    const tabY = y + 10;
    drawWarCampPanel(ctx, tabX, tabY, tabW, tabH, { fill: 'rgba(32,24,12,0.95)', radius: 3, borderAlpha: 0.7 });
    ctx.textAlign = 'center';
    ctx.font = 'bold 6px monospace';
    ctx.fillStyle = WAR_CAMP_THEME.gold;
    ctx.fillText('OPEN →', tabX + tabW / 2, tabY + 11);
    btnsOut.push({ x: tabX, y: tabY, w: tabW, h: tabH, action: 'switchTab', tab: guidance.tab });
  }
  return h + 8;
}

/** Ambient backdrop — dark gradient + subtle hearth glow only (no full mockup bleed). */
export function drawWarCampAmbientBackdrop(ctx, W, top, H, fortressUpgrades = {}) {
  const tier = Object.values(fortressUpgrades).reduce((s, v) => s + (v ?? 0), 0);
  const h = H - top;

  const g = ctx.createLinearGradient(0, top, 0, H);
  g.addColorStop(0, '#0a0810');
  g.addColorStop(0.5, '#0e0c14');
  g.addColorStop(1, '#08060c');
  ctx.fillStyle = g;
  ctx.fillRect(0, top, W, h);

  const t = performance.now() * 0.001;
  const hearthX = W * 0.28;
  const hearthY = top + h * 0.58;
  const pulse = 0.55 + Math.sin(t * 1.4) * 0.12;
  const warm = Math.min(1, 0.28 + tier * 0.06);
  const glow = ctx.createRadialGradient(hearthX, hearthY, 0, hearthX, hearthY, 140 + tier * 8);
  glow.addColorStop(0, `rgba(200,115,55,${warm * pulse * 0.35})`);
  glow.addColorStop(0.55, `rgba(80,40,20,${0.03 + tier * 0.01})`);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, top, W, h);
}

const SECTION_BANNER_META = {
  recruit:  { crop: 'recruit',  title: 'RECRUIT',  subtitle: 'Hire defenders for the warband' },
  fortress: { crop: 'fortress', title: 'FORTRESS', subtitle: 'Upgrade buildings with reserve gold' },
  warband:  { crop: 'warband',  title: 'WARBAND',  subtitle: 'Manage roster and equipment' },
};

/** Section header — compact art thumb (cover fit) + title; no full-width stretch. */
export function drawWarCampSectionBanner(ctx, x, y, w, h, tabId) {
  const meta = SECTION_BANNER_META[tabId] ?? SECTION_BANNER_META.warband;
  drawWarCampPanel(ctx, x, y, w, h, { fill: 'rgba(8,6,12,0.88)', radius: 6 });

  const pad = 4;
  const thumbH = h - pad * 2;
  const cropAspect = getWarCampArtCropAspect(meta.crop);
  const thumbW = Math.max(28, Math.min(Math.floor(thumbH * cropAspect), Math.floor(w * 0.22)));
  const thumbX = x + pad;
  const thumbY = y + pad;

  ctx.fillStyle = 'rgba(24,18,12,0.92)';
  ctx.beginPath();
  ctx.roundRect(thumbX, thumbY, thumbW, thumbH, 4);
  ctx.fill();

  const drew = drawWarCampArtCrop(ctx, thumbX, thumbY, thumbW, thumbH, meta.crop, 0.96, 'cover');
  if (!drew) {
    ctx.fillStyle = 'rgba(40,28,18,0.75)';
    ctx.fillRect(thumbX, thumbY, thumbW, thumbH);
  }

  ctx.strokeStyle = 'rgba(150,120,70,0.5)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.roundRect(thumbX, thumbY, thumbW, thumbH, 4);
  ctx.stroke();

  const textX = thumbX + thumbW + 10;
  ctx.textAlign = 'left';
  ctx.font = 'bold 11px monospace';
  ctx.fillStyle = WAR_CAMP_THEME.title;
  ctx.fillText(meta.title, textX, y + Math.round(h * 0.40));
  ctx.font = '7px monospace';
  ctx.fillStyle = WAR_CAMP_THEME.subtitle;
  ctx.fillText(meta.subtitle, textX, y + Math.round(h * 0.68));
}

/** First-visit pointer — sits on tab row, not a full-width art strip. */
export function drawWarCampTabWelcomeHint(ctx, tabX, tabY, tabW, tabH, timer) {
  const alpha = getWarCampWelcomeAlpha(timer);
  if (alpha <= 0) return;
  const pulse = 0.55 + Math.sin(performance.now() * 0.007) * 0.35;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = 'center';
  ctx.font = 'bold 7px monospace';
  ctx.fillStyle = `rgba(240,210,120,${0.75 + pulse * 0.2})`;
  ctx.fillText('▼  ' + WAR_CAMP_TAB_HINT_LINE, tabX + tabW / 2, tabY - 6);
  ctx.strokeStyle = `rgba(240,200,80,${0.25 + pulse * 0.35})`;
  ctx.lineWidth = 1 + pulse * 0.6;
  ctx.beginPath();
  ctx.roundRect(tabX + 2, tabY - 2, tabW - 4, tabH + 4, 4);
  ctx.stroke();
  ctx.restore();
}

export function getCareerXpProgress(xp, level) {
  const cur = CAREER_XP[level] ?? 0;
  const next = CAREER_XP[Math.min(level + 1, CAREER_XP.length - 1)] ?? cur + 1;
  if (level >= CAREER_XP.length - 1) return 1;
  return Math.max(0, Math.min(1, (xp - cur) / (next - cur)));
}

/** Grid layout — portrait cards (taller than wide), 4–6 cols by available width. */
export function computeWarCampCardGrid(contentW, contentH, preferredCols = WAR_CAMP_GRID_COLS) {
  const gap = WAR_CAMP_CARD_GAP;
  let best = null;

  for (let cols = 4; cols <= 6; cols++) {
    const cardW = Math.floor((contentW - gap * (cols - 1)) / cols);
    if (cardW < 62) continue;
    const maxH = Math.floor((contentH - gap) / 2);
    let cardH = Math.min(Math.floor(cardW * WAR_CAMP_CARD_ASPECT), maxH);
    if (cardH <= cardW) cardH = Math.floor(cardW * 1.08) + 12;
    const rowsVisible = Math.max(1, Math.floor((contentH + gap) / (cardH + gap)));
    const portrait = cardH > cardW;
    const score = (portrait ? 100 : 0) + rowsVisible * 20 + (cols === preferredCols ? 5 : 0);
    if (!best || score > best.score) {
      best = { cols, gap, cardW, cardH, rowsVisible, cardsPerPage: cols * rowsVisible, score };
    }
  }

  if (!best) {
    const cols = 4;
    const cardW = Math.max(62, Math.floor((contentW - gap * (cols - 1)) / cols));
    const cardH = Math.floor(cardW * WAR_CAMP_CARD_ASPECT);
    const rowsVisible = Math.max(1, Math.floor((contentH + gap) / (cardH + gap)));
    return { cols, gap, cardW, cardH, rowsVisible, cardsPerPage: cols * rowsVisible };
  }

  const { score: _s, ...grid } = best;
  return grid;
}

/** Card index → grid cell origin. */
export function warCampCardOrigin(listX, listY, grid, indexInView) {
  const col = indexInView % grid.cols;
  const row = Math.floor(indexInView / grid.cols);
  const x = listX + col * (grid.cardW + grid.gap);
  const y = listY + row * (grid.cardH + grid.gap);
  return { x, y, col, row };
}

/**
 * Vertical portrait card — mockup warband grid cell.
 * Equip slots are drawn on-card when slotMeta + btnsOut provided.
 */
export function drawWarCampPortraitCard(ctx, x, y, w, h, def, opts = {}) {
  const {
    selected = false,
    bond = false,
    isRenaming = false,
    renameDraft = null,
    drawPortrait = null,
    slotMeta = null,
    btnsOut = null,
  } = opts;

  const glow = TOWER_DEFS?.[def.type]?.glowRgb ?? '180,150,80';
  const fill = bond ? 'rgba(32,24,14,0.96)' : 'rgba(12,10,16,0.96)';
  if (!drawHeroCardFrame(ctx, x, y, w, h, 0.92)) {
    drawWarCampPanel(ctx, x, y, w, h, {
      fill: selected ? 'rgba(28,32,20,0.98)' : fill,
      borderAlpha: selected ? 0.95 : 0.7,
      radius: 5,
    });
  } else if (selected) {
    ctx.strokeStyle = 'rgba(232,208,96,0.75)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x + 1, y + 1, w - 2, h - 2, 4);
    ctx.stroke();
  }

  // Class tint strip at top (mockup card rim)
  ctx.fillStyle = `rgba(${glow},0.22)`;
  ctx.fillRect(x + 1, y + 1, w - 2, 3);

  const pad = 4;
  const equipH = slotMeta ? 22 : 0;
  const footerH = 18;
  const portraitH = h - pad * 2 - equipH - footerH - 28;
  const px = x + pad;
  const py = y + pad + 4;
  const pw = w - pad * 2;
  const cx = x + w / 2;
  const cy = py + portraitH / 2;
  const pr = Math.min(pw, portraitH) * 0.42;

  ctx.fillStyle = 'rgba(4,2,8,0.95)';
  ctx.strokeStyle = `rgba(${glow},0.35)`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(px, py, pw, portraitH, 3);
  ctx.fill();
  ctx.stroke();

  if (drawPortrait) {
    drawPortrait(ctx, cx, cy, pr);
  } else {
    ctx.fillStyle = `rgba(${glow},0.45)`;
    ctx.beginPath();
    ctx.arc(cx, cy, pr * 0.85, 0, Math.PI * 2);
    ctx.fill();
  }

  if (bond) {
    ctx.font = '7px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(220,180,80,0.9)';
    ctx.fillText('⚭', px + 3, py + 10);
  }

  const hasName = Boolean(def.name?.trim());
  const displayName = isRenaming
    ? (renameDraft ?? '') + (Math.floor(performance.now() / 450) % 2 === 0 ? '|' : '')
    : (hasName ? def.name : '— unnamed —');

  ctx.textAlign = 'center';
  ctx.font = 'bold 8px monospace';
  ctx.fillStyle = isRenaming ? '#ffd878' : (hasName ? UI_COLORS.parchment : 'rgba(130,120,100,0.5)');
  const nameY = py + portraitH + 12;
  ctx.fillText(String(displayName).slice(0, 10), cx, nameY);

  const role = TOWER_DEFS[def.type]?.label ?? def.type;
  ctx.font = '6px monospace';
  ctx.fillStyle = WAR_CAMP_THEME.subtitle;
  ctx.fillText(role.length > 12 ? `${role.slice(0, 11)}…` : role, cx, nameY + 10);

  if (slotMeta && btnsOut) {
    const slotY = nameY + 16;
    const slotW = Math.floor((w - pad * 2 - 3) / 2);
    for (let si = 0; si < 2; si++) {
      const meta = slotMeta[si];
      const sx = x + pad + si * (slotW + 3);
      const icon = si === 0 ? '⚔' : '🛡';
      const label = meta?.itemDef ? meta.itemDef.name.slice(0, 7) : 'EQUIP';
      ctx.fillStyle = meta?.itemDef ? (meta.rarityBg ?? 'rgba(40,32,20,0.9)') : 'rgba(24,18,12,0.92)';
      ctx.strokeStyle = meta?.itemDef ? (meta.rarCol ?? 'rgba(120,100,70,0.5)') : 'rgba(200,170,80,0.55)';
      ctx.lineWidth = meta?.itemDef ? 0.9 : 1;
      ctx.beginPath();
      ctx.roundRect(sx, slotY, slotW, equipH, 2);
      ctx.fill();
      ctx.stroke();
      ctx.font = 'bold 7px monospace';
      ctx.fillStyle = meta?.itemDef ? (meta.rarCol ?? '#c0a060') : '#c9a227';
      ctx.textAlign = 'center';
      ctx.fillText(icon, sx + slotW / 2, slotY + 9);
      ctx.font = '5px monospace';
      ctx.fillStyle = meta?.itemDef ? 'rgba(210,195,170,0.85)' : 'rgba(200,170,100,0.65)';
      ctx.fillText(label, sx + slotW / 2, slotY + 17);
      btnsOut.push({
        x: sx, y: slotY, w: slotW, h: equipH,
        action: 'cycleEquip', defenderId: def.defenderId, slotIdx: si,
      });
    }
    ctx.textAlign = 'left';
  }

  const lvl = def.careerLevel ?? 1;
  const prog = getCareerXpProgress(def.xp ?? 0, lvl);
  const nextXp = CAREER_XP[Math.min(lvl + 1, CAREER_XP.length - 1)];
  const barX = x + pad;
  const barW = w - pad * 2;
  const barY = y + h - pad - 4;

  ctx.textAlign = 'left';
  ctx.font = '5px monospace';
  ctx.fillStyle = 'rgba(150,165,185,0.7)';
  ctx.fillText(`Lv${lvl}`, barX, barY - 5);
  ctx.textAlign = 'right';
  ctx.fillText(lvl >= CAREER_XP.length - 1 ? 'MAX' : `${def.xp ?? 0}/${nextXp}`, barX + barW, barY - 5);

  ctx.fillStyle = WAR_CAMP_THEME.xpTrack;
  ctx.beginPath();
  ctx.roundRect(barX, barY, barW, 2, 1);
  ctx.fill();
  if (prog > 0) {
    ctx.fillStyle = lvl >= 10 ? '#e8c040' : WAR_CAMP_THEME.xpBar;
    ctx.beginPath();
    ctx.roundRect(barX, barY, Math.max(2, barW * prog), 2, 1);
    ctx.fill();
  }
  ctx.textAlign = 'left';

  return {
    bioX: x + w - 16, bioY: y + 3, bioW: 14, bioH: 12,
    rnX: x + 3, rnY: y + 3,
  };
}

/** Fortress upgrade row — clear UPGRADE affordance. */
export function drawWarCampFortressRow(ctx, x, y, w, def, lvl, maxed, cost, canBuy, btnsOut, key, goldReserve = 0) {
  const rowH = 44;

  // Row background — greener tint when affordable, golden when maxed
  ctx.fillStyle = maxed ? 'rgba(20,16,8,0.92)' : (canBuy ? 'rgba(6,20,6,0.95)' : 'rgba(14,12,18,0.85)');
  ctx.strokeStyle = maxed ? 'rgba(200,170,80,0.55)' : (canBuy ? 'rgba(60,200,60,0.50)' : 'rgba(70,60,45,0.22)');
  ctx.lineWidth = canBuy && !maxed ? 1.2 : 0.7;
  ctx.beginPath(); ctx.roundRect(x, y, w, rowH, 4); ctx.fill(); ctx.stroke();

  // Left accent bar: green=affordable, gold=maxed, none=locked
  if (!maxed && canBuy) {
    ctx.fillStyle = 'rgba(60,200,60,0.85)';
    ctx.fillRect(x, y + 6, 3, rowH - 12);
  } else if (maxed) {
    ctx.fillStyle = 'rgba(200,160,40,0.70)';
    ctx.fillRect(x, y + 6, 3, rowH - 12);
  }

  // Icon + label
  ctx.textAlign = 'left';
  ctx.font = 'bold 9px monospace';
  ctx.fillStyle = maxed ? '#f0d040' : (canBuy ? '#a8e098' : '#c8b880');
  ctx.fillText(`${def.icon} ${def.label}`, x + 10, y + 15);

  // Description — next-level benefit
  ctx.font = '6px monospace';
  ctx.fillStyle = maxed ? 'rgba(200,170,80,0.58)' : (canBuy ? 'rgba(140,210,130,0.70)' : 'rgba(120,110,90,0.48)');
  const desc = maxed ? 'Fully upgraded' : (def.levelDesc?.[lvl] ?? '');
  ctx.fillText(desc.length > 28 ? `${desc.slice(0, 27)}…` : desc, x + 10, y + 29);

  // Level pips (filled/empty dots)
  const btnZoneW = 88;
  const pipRight = x + w - btnZoneW - 8;
  for (let d = 0; d < def.maxLevel; d++) {
    const filled = d < lvl;
    const px = pipRight - (def.maxLevel - 1 - d) * 9;
    const py = y + 14;
    ctx.beginPath(); ctx.arc(px, py, 3.5, 0, Math.PI * 2);
    if (filled) {
      ctx.fillStyle = maxed ? '#f0d040' : 'rgba(70,200,50,0.90)';
      ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(48,42,34,0.70)'; ctx.fill();
      ctx.strokeStyle = 'rgba(75,65,50,0.40)'; ctx.lineWidth = 0.5; ctx.stroke();
    }
  }

  const costLabel = (goldReserve > 0 && !maxed)
    ? `${cost}g · ${Math.min(99, Math.round((cost / goldReserve) * 100))}%`
    : `${cost}g`;

  if (!maxed) {
    const btnW = 82, btnH = 30;
    const btnX = x + w - btnW - 5;
    const btnY = y + (rowH - btnH) / 2;
    if (canBuy) {
      // Affordable — vivid green border, two-line UPGRADE + Xg
      ctx.fillStyle = 'rgba(10,40,10,0.98)';
      ctx.strokeStyle = 'rgba(60,220,60,0.85)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(btnX, btnY, btnW, btnH, 5); ctx.fill(); ctx.stroke();
      ctx.textAlign = 'center';
      ctx.font = 'bold 7px monospace'; ctx.fillStyle = 'rgba(130,240,90,0.95)';
      ctx.shadowColor = 'rgba(60,220,50,0.3)'; ctx.shadowBlur = 4;
      ctx.fillText('UPGRADE', btnX + btnW / 2, btnY + 12);
      ctx.font = 'bold 10px monospace'; ctx.fillStyle = '#f0e060';
      ctx.fillText(costLabel, btnX + btnW / 2, btnY + 24);
      ctx.shadowBlur = 0;
      btnsOut.push({ x: btnX, y: btnY, w: btnW, h: btnH, action: 'upgradeFortress', key });
    } else {
      // Can't afford — muted gray
      ctx.fillStyle = 'rgba(22,18,14,0.70)';
      ctx.strokeStyle = 'rgba(60,50,38,0.28)';
      ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.roundRect(btnX, btnY, btnW, btnH, 5); ctx.fill(); ctx.stroke();
      ctx.textAlign = 'center';
      ctx.font = '7px monospace'; ctx.fillStyle = 'rgba(95,85,60,0.52)';
      ctx.fillText('UPGRADE', btnX + btnW / 2, btnY + 12);
      ctx.font = '9px monospace'; ctx.fillStyle = 'rgba(115,100,65,0.48)';
      ctx.fillText(costLabel, btnX + btnW / 2, btnY + 24);
    }
    ctx.textAlign = 'left';
  } else {
    // MAX badge
    ctx.textAlign = 'right';
    ctx.font = 'bold 8px monospace'; ctx.fillStyle = '#e8c840';
    ctx.shadowColor = 'rgba(200,150,0,0.3)'; ctx.shadowBlur = 4;
    ctx.fillText('✦ MAX', x + w - 6, y + 19);
    ctx.shadowBlur = 0;
    ctx.font = '6px monospace'; ctx.fillStyle = 'rgba(175,145,65,0.55)';
    ctx.fillText(`lvl ${lvl}`, x + w - 6, y + 31);
    ctx.textAlign = 'left';
  }
}

/** @deprecated use drawWarCampPortraitCard */
export function drawWarCampDefenderCard(ctx, x, y, w, h, def, opts = {}) {
  drawWarCampPortraitCard(ctx, x, y, w, h, def, opts);
}
