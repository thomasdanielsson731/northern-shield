/**
 * War Camp visual layer — inspired by assets/ui/war_camp_bg.png mockup.
 * Charcoal panels, gold trim, section art crops, cycle footer, defender cards.
 */

import { UI_COLORS } from './uiTheme.js';
import { CAREER_XP } from '../roster/defender.js';
import { FORTRESS_DEFS } from '../fortress/fortress.js';
import { TOWER_DEFS } from '../entities/tower.js';

export const WAR_CAMP_HEADER_H = 40;
export const WAR_CAMP_CYCLE_H = 52;

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

/** Full-width WARCAMP header + tagline. */
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

/** Ambient backdrop — dark base + hearth glow + pine silhouettes. */
export function drawWarCampAmbientBackdrop(ctx, W, top, H, fortressUpgrades = {}) {
  const tier = Object.values(fortressUpgrades).reduce((s, v) => s + (v ?? 0), 0);
  const h = H - top;

  const g = ctx.createLinearGradient(0, top, 0, H);
  g.addColorStop(0, '#0a0810');
  g.addColorStop(0.5, '#0e0c14');
  g.addColorStop(1, '#08060c');
  ctx.fillStyle = g;
  ctx.fillRect(0, top, W, h);

  if (isWarCampArtReady()) {
    drawWarCampArtCrop(ctx, 0, top, W, h, 'full', 0.38);
  }

  // Pine ridge silhouettes (fortress mockup horizon)
  ctx.save();
  ctx.fillStyle = 'rgba(12,18,10,0.55)';
  for (let i = 0; i < 9; i++) {
    const bx = W * (0.08 + i * 0.11);
    const by = top + h * 0.62;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + 18, by - 28 - (i % 3) * 6);
    ctx.lineTo(bx + 36, by);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  const t = performance.now() * 0.001;
  const hearthX = W * 0.22;
  const hearthY = top + h * 0.55;
  const pulse = 0.55 + Math.sin(t * 1.4) * 0.12;
  const warm = Math.min(1, 0.35 + tier * 0.08);
  const glow = ctx.createRadialGradient(hearthX, hearthY, 0, hearthX, hearthY, 160 + tier * 10);
  glow.addColorStop(0, `rgba(220,130,60,${warm * pulse * 0.5})`);
  glow.addColorStop(0.5, `rgba(100,50,25,${0.04 + tier * 0.015})`);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, top, W, h);
}

/** Section labels matching the reference mockup. */
export const WAR_CAMP_SECTIONS = {
  recruit:  { num: '1.', title: 'RECRUIT',  subtitle: 'At the Longhouse Fire.' },
  warband:  { num: '2.', title: 'WARBAND',  subtitle: 'Your heroes. Your story.' },
  fortress: { num: '3.', title: 'FORTRESS', subtitle: 'Your home. Your legacy.' },
};

export function drawWarCampSectionTitle(ctx, x, y, tabId) {
  const sec = WAR_CAMP_SECTIONS[tabId] ?? WAR_CAMP_SECTIONS.warband;
  ctx.save();
  ctx.textAlign = 'left';
  ctx.font = 'bold 12px monospace';
  ctx.fillStyle = WAR_CAMP_THEME.gold;
  ctx.fillText(`${sec.num} ${sec.title}`, x, y + 12);
  ctx.font = '8px monospace';
  ctx.fillStyle = WAR_CAMP_THEME.subtitle;
  ctx.fillText(sec.subtitle, x, y + 26);
  ctx.restore();
}

/** Section banner using reference art crop. */
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

/** Fortress panorama with labeled nodes (mockup bottom-right). */
export function drawWarCampFortressMap(ctx, x, y, w, h, upgrades = {}, btnsOut = null) {
  drawWarCampSectionBanner(ctx, x, y, w, h, 'fortress');

  const nodes = [
    { key: 'watchtower', label: 'Watch Tower', sub: 'Intel & scouts', nx: 0.78, ny: 0.22 },
    { key: 'barracks', label: 'Barracks', sub: 'Warband training', nx: 0.62, ny: 0.38 },
    { key: 'treasury', label: 'Treasury', sub: 'Resources', nx: 0.82, ny: 0.52 },
    { key: 'wallworks', label: 'West Gate', sub: 'Defenders & horn', nx: 0.28, ny: 0.58 },
    { key: 'armory', label: 'Longhouse', sub: 'Chronicle & gear', nx: 0.48, ny: 0.42 },
  ];

  ctx.save();
  ctx.textAlign = 'left';
  for (const node of nodes) {
    const def = FORTRESS_DEFS[node.key];
    if (!def) continue;
    const lvl = upgrades[node.key] ?? 0;
    const px = x + w * node.nx;
    const py = y + h * node.ny;
    const dotR = 4 + lvl * 0.8;

    ctx.fillStyle = lvl > 0 ? 'rgba(200,170,80,0.95)' : 'rgba(180,160,140,0.65)';
    ctx.beginPath();
    ctx.arc(px, py, dotR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,240,200,0.45)';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    ctx.font = 'bold 7px monospace';
    ctx.fillStyle = '#f0e8d8';
    ctx.fillText(node.label.toUpperCase(), px + 8, py + 3);
    ctx.font = '6px monospace';
    ctx.fillStyle = 'rgba(180,165,140,0.65)';
    ctx.fillText(node.sub, px + 8, py + 12);
    if (lvl > 0) {
      ctx.fillStyle = WAR_CAMP_THEME.gold;
      ctx.fillText(`Lv ${lvl}`, px + 8, py + 21);
    }
    if (btnsOut) {
      btnsOut.push({ x: px - 12, y: py - 12, w: 24, h: 24, action: 'focusFortressNode', key: node.key });
    }
  }
  ctx.restore();
}

export function getCareerXpProgress(xp, level) {
  const cur = CAREER_XP[level] ?? 0;
  const next = CAREER_XP[Math.min(level + 1, CAREER_XP.length - 1)] ?? cur + 1;
  if (level >= CAREER_XP.length - 1) return 1;
  return Math.max(0, Math.min(1, (xp - cur) / (next - cur)));
}

/** Mockup-style defender card chrome + XP bar. */
export function drawWarCampDefenderCard(ctx, x, y, w, h, def, { selected = false, bond = false } = {}) {
  const fill = bond ? 'rgba(32,24,14,0.92)' : 'rgba(18,16,22,0.92)';
  drawWarCampPanel(ctx, x, y, w, h, {
    fill: selected ? 'rgba(28,32,20,0.95)' : fill,
    borderAlpha: selected ? 0.9 : 0.55,
  });

  const portrait = 36;
  ctx.fillStyle = 'rgba(8,6,12,0.85)';
  ctx.strokeStyle = 'rgba(120,100,70,0.45)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.roundRect(x + 6, y + 6, portrait, portrait, 4);
  ctx.fill();
  ctx.stroke();

  const glow = TOWER_DEFS?.[def.type]?.glowRgb ?? '180,150,80';
  ctx.fillStyle = `rgba(${glow},0.35)`;
  ctx.beginPath();
  ctx.arc(x + 6 + portrait / 2, y + 6 + portrait / 2, 10, 0, Math.PI * 2);
  ctx.fill();

  const tx = x + portrait + 14;
  ctx.textAlign = 'left';
  ctx.font = 'bold 10px monospace';
  ctx.fillStyle = UI_COLORS.parchment;
  ctx.fillText((def.name?.trim() || '— unnamed —').slice(0, 14), tx, y + 18);
  ctx.font = '7px monospace';
  ctx.fillStyle = WAR_CAMP_THEME.subtitle;
  const role = TOWER_DEFS[def.type]?.label ?? def.type;
  ctx.fillText(`${role}  ·  Lvl ${def.careerLevel ?? 1}`, tx, y + 30);

  const barX = tx;
  const barY = y + h - 14;
  const barW = w - portrait - 22;
  const prog = getCareerXpProgress(def.xp ?? 0, def.careerLevel ?? 1);
  ctx.fillStyle = WAR_CAMP_THEME.xpTrack;
  ctx.beginPath();
  ctx.roundRect(barX, barY, barW, 5, 2);
  ctx.fill();
  if (prog > 0) {
    ctx.fillStyle = WAR_CAMP_THEME.xpBar;
    ctx.beginPath();
    ctx.roundRect(barX, barY, Math.max(4, barW * prog), 5, 2);
    ctx.fill();
  }
  ctx.font = '6px monospace';
  ctx.fillStyle = 'rgba(140,160,180,0.55)';
  const nextXp = CAREER_XP[Math.min((def.careerLevel ?? 1) + 1, CAREER_XP.length - 1)];
  ctx.fillText(`${def.xp ?? 0} / ${nextXp} XP`, barX, barY - 3);
}
