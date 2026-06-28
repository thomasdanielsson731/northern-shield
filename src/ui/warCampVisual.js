/**
 * War Camp visual layer — inspired by assets/ui/war_camp_bg.png mockup.
 * Charcoal panels, gold trim, section art crops, cycle footer, defender cards.
 */

import { UI_COLORS } from './uiTheme.js';
import { CAREER_XP } from '../roster/defender.js';
import { TOWER_DEFS } from '../entities/tower.js';

export const WAR_CAMP_HEADER_H = 0;
export const WAR_CAMP_CYCLE_H = 52;
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
_warCampArt.src = '/assets/ui/war_camp_bg.png';

export function isWarCampArtReady() {
  return Boolean(_warCampArt.complete && _warCampArt.naturalWidth > 0);
}

export function drawWarCampArtCrop(ctx, x, y, w, h, cropKey = 'full', alpha = 1) {
  if (!isWarCampArtReady()) return false;
  const c = ART_CROPS[cropKey] ?? ART_CROPS.full;
  const iw = _warCampArt.naturalWidth;
  const ih = _warCampArt.naturalHeight;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(
    _warCampArt,
    c.sx * iw, c.sy * ih, c.sw * iw, c.sh * ih,
    x, y, w, h,
  );
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

/** Footer cycle diagram from mockup. */
export function drawWarCampCycle(ctx, x, y, w, activeTab = 'warband') {
  const tabToStep = { recruit: 0, fortress: 1, warband: 4 };
  const active = tabToStep[activeTab] ?? 2;
  ctx.save();
  drawWarCampPanel(ctx, x, y, w, WAR_CAMP_CYCLE_H, { fill: 'rgba(14,12,18,0.92)', radius: 6 });
  ctx.textAlign = 'left';
  ctx.font = 'bold 7px monospace';
  ctx.fillStyle = 'rgba(140,120,80,0.55)';
  ctx.fillText('THE CYCLE', x + 10, y + 12);

  const stepW = Math.min(72, (w - 120) / CYCLE_STEPS.length);
  let sx = x + 78;
  const cy = y + 30;
  for (let i = 0; i < CYCLE_STEPS.length; i++) {
    const step = CYCLE_STEPS[i];
    const isActive = i === active;
    ctx.font = isActive ? 'bold 7px monospace' : '7px monospace';
    ctx.fillStyle = isActive ? WAR_CAMP_THEME.gold : 'rgba(140,130,110,0.55)';
    ctx.textAlign = 'center';
    ctx.fillText(step.icon, sx + stepW / 2, cy - 2);
    ctx.fillText(step.label, sx + stepW / 2, cy + 10);
    if (i < CYCLE_STEPS.length - 1) {
      ctx.strokeStyle = 'rgba(100,90,70,0.35)';
      ctx.beginPath();
      ctx.moveTo(sx + stepW + 2, cy + 2);
      ctx.lineTo(sx + stepW + 10, cy + 2);
      ctx.stroke();
    }
    sx += stepW + 12;
  }

  ctx.textAlign = 'right';
  ctx.font = '6px monospace';
  ctx.fillStyle = 'rgba(120,100,70,0.45)';
  ctx.fillText('We do not seek glory. We build it.', x + w - 10, y + WAR_CAMP_CYCLE_H - 8);
  ctx.restore();
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

/** Section banner — one art crop per active tab (the only mockup art on screen). */
export function drawWarCampSectionBanner(ctx, x, y, w, h, tabId) {
  drawWarCampPanel(ctx, x, y, w, h, { fill: 'rgba(8,6,12,0.85)', radius: 6 });
  const crop = tabId === 'recruit' ? 'recruit' : tabId === 'fortress' ? 'fortress' : 'warband';
  const drew = drawWarCampArtCrop(ctx, x + 1, y + 1, w - 2, h - 2, crop, 0.92);
  if (!drew) {
    ctx.fillStyle = 'rgba(40,28,18,0.6)';
    ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
  }
  const grad = ctx.createLinearGradient(x, y + h * 0.4, x, y + h);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(8,4,2,0.75)');
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);
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
  drawWarCampPanel(ctx, x, y, w, h, {
    fill: selected ? 'rgba(28,32,20,0.98)' : fill,
    borderAlpha: selected ? 0.95 : 0.7,
    radius: 5,
  });

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
export function drawWarCampFortressRow(ctx, x, y, w, def, lvl, maxed, cost, canBuy, btnsOut, key) {
  ctx.fillStyle = 'rgba(14,12,18,0.85)';
  ctx.strokeStyle = maxed ? 'rgba(200,170,80,0.45)' : 'rgba(100,90,70,0.35)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.roundRect(x, y, w, 36, 4);
  ctx.fill();
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.font = 'bold 9px monospace';
  ctx.fillStyle = maxed ? '#f0d040' : '#d8c890';
  ctx.fillText(`${def.icon} ${def.label}`, x + 8, y + 15);
  ctx.font = '6px monospace';
  ctx.fillStyle = 'rgba(160,145,120,0.65)';
  const desc = maxed ? 'Fully upgraded' : (def.levelDesc?.[lvl] ?? '');
  ctx.fillText(desc.length > 36 ? `${desc.slice(0, 35)}…` : desc, x + 8, y + 27);

  ctx.font = '7px monospace';
  ctx.fillStyle = 'rgba(160,140,100,0.55)';
  ctx.textAlign = 'right';
  ctx.fillText(`Lv ${lvl}/${def.maxLevel}`, x + w - 8, y + 13);

  if (!maxed) {
    const btnW = 72, btnH = 22;
    const btnX = x + w - btnW - 6;
    const btnY = y + 7;
    ctx.fillStyle = canBuy ? 'rgba(12,32,12,0.95)' : 'rgba(28,22,14,0.85)';
    ctx.strokeStyle = canBuy ? 'rgba(100,210,100,0.65)' : 'rgba(80,70,50,0.35)';
    ctx.lineWidth = canBuy ? 1 : 0.7;
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnW, btnH, 3);
    ctx.fill();
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.font = 'bold 7px monospace';
    ctx.fillStyle = canBuy ? '#88ee66' : 'rgba(120,110,70,0.45)';
    ctx.fillText(`UPGRADE ${cost}g`, btnX + btnW / 2, btnY + 14);
    ctx.textAlign = 'left';
    if (canBuy) {
      btnsOut.push({ x: btnX, y: btnY, w: btnW, h: btnH, action: 'upgradeFortress', key });
    }
  }
}

/** @deprecated use drawWarCampPortraitCard */
export function drawWarCampDefenderCard(ctx, x, y, w, h, def, opts = {}) {
  drawWarCampPortraitCard(ctx, x, y, w, h, def, opts);
}
