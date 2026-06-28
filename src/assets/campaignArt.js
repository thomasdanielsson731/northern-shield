/**
 * First Saga promoted art — loaders and draw helpers.
 * @see tools/promote_api_art.py
 */

const PORTRAIT_BY_TYPE = {
  berserk: '/assets/portraits/portrait_berserk_default@64x80.png',
  valkyrie: '/assets/portraits/portrait_valkyrie_default@64x80.png',
  military: '/assets/portraits/portrait_military_default@64x80.png',
  archer: '/assets/portraits/portrait_military_default@64x80.png',
};

const ART = {
  warCampBgAge1: '/assets/ui/ui_war_camp_bg_age1@1024x512.png',
  commandMapRegion1: '/assets/ui/ui_command_map_region1@800x600.png',
  ceremonyNaming: '/assets/ui/ui_ceremony_naming@960x540.png',
  ceremonySettlement: '/assets/ui/ui_ceremony_settlement_oath@960x540.png',
  debriefPanel: '/assets/ui/ui_debrief_panel@640x480.png',
  heroCardFrame: '/assets/ui/ui_hero_card_frame@200x320.png',
  berserkMedallion: '/assets/ui/icon_hero_berserk_medallion@24.png',
  advisorPrep: '/assets/portraits/portrait_advisor_prep@96x112.png',
  assaultIcons: [
    '/assets/ui/icons/icon_assault_a0@32.png',
    '/assets/ui/icons/icon_assault_a1@32.png',
    '/assets/ui/icons/icon_assault_a2@32.png',
    '/assets/ui/icons/icon_assault_a3@32.png',
    '/assets/ui/icons/icon_assault_a4@32.png',
    '/assets/ui/icons/icon_assault_a5@32.png',
  ],
};

const _images = {};

function load(key, src) {
  const img = new Image();
  img.src = src;
  _images[key] = img;
}

for (const [key, src] of Object.entries(ART)) {
  if (key === 'assaultIcons') {
    src.forEach((path, i) => load(`assault${i}`, path));
  } else {
    load(key, src);
  }
}

for (const [type, src] of Object.entries(PORTRAIT_BY_TYPE)) {
  load(`portrait_${type}`, src);
}

export function isCampaignArtReady(key) {
  const img = _images[key];
  return Boolean(img?.complete && img.naturalWidth > 0);
}

export function getPortraitArtKey(towerType) {
  const t = (towerType ?? '').toLowerCase();
  if (PORTRAIT_BY_TYPE[t]) return `portrait_${t}`;
  if (t === 'archer' && PORTRAIT_BY_TYPE.military) return 'portrait_military';
  return null;
}

/** Draw image cover-fit in rect; returns false if not loaded. */
export function drawCampaignArtCover(ctx, key, x, y, w, h, alpha = 1) {
  const img = _images[key];
  if (!isCampaignArtReady(key)) return false;
  const srcAspect = img.naturalWidth / img.naturalHeight;
  const dstAspect = w / h;
  let dw = w;
  let dh = h;
  let dx = x;
  let dy = y;
  if (dstAspect > srcAspect) {
    dh = w / srcAspect;
    dy = y + (h - dh) / 2;
  } else {
    dw = h * srcAspect;
    dx = x + (w - dw) / 2;
  }
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
  return true;
}

/** Portrait in circle or rounded rect for War Camp / mini portrait. */
export function drawCampaignPortrait(ctx, towerType, cx, cy, radius) {
  const key = getPortraitArtKey(towerType);
  if (!key || !isCampaignArtReady(key)) return false;
  const img = _images[key];
  const size = radius * 2.1;
  const x = cx - size / 2;
  const y = cy - size * 0.55;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 0.92, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(img, x, y, size, size * 1.25);
  ctx.restore();
  return true;
}

export function drawAssaultNodeIcon(ctx, nodeIndex, nx, ny, size = 20) {
  const key = `assault${nodeIndex}`;
  if (!isCampaignArtReady(key)) return false;
  const img = _images[key];
  ctx.drawImage(img, nx - size / 2, ny - size - 8, size, size);
  return true;
}

export function drawAdvisorPortraitArt(ctx, x, y, size = 40) {
  if (!isCampaignArtReady('advisorPrep')) return false;
  const img = _images.advisorPrep;
  ctx.save();
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(img, x, y, size, size * 1.15);
  ctx.restore();
  return true;
}

/** Hero warband card frame — stretch to rect. */
export function drawHeroCardFrame(ctx, x, y, w, h, alpha = 1) {
  if (!isCampaignArtReady('heroCardFrame')) return false;
  const img = _images.heroCardFrame;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(img, x, y, w, h);
  ctx.restore();
  return true;
}

/** Class medallion for prep gate chip (24px art). */
export function drawHeroMedallionArt(ctx, cx, cy, towerType, size = 22) {
  const t = (towerType ?? '').toLowerCase();
  const key = t === 'berserk' && isCampaignArtReady('berserkMedallion') ? 'berserkMedallion' : null;
  if (!key) return false;
  const img = _images[key];
  ctx.drawImage(img, cx - size / 2, cy - size / 2, size, size);
  return true;
}
