/**
 * Combat VFX + boss banner promoted art.
 */

const ART = {
  bossBanner: '/assets/bosses/boss_ash_warden_banner@320x80.png',
  equipRing: '/assets/fx/fx_equip_ring_reference@128.png',
  hitSpark: '/assets/fx/fx_hit_spark_melee@32.png',
  gateBreach: '/assets/fx/fx_gate_breach_splinters_sheet@64.png',
  firstNightIntro: '/assets/ui/ui_intro_first_night@960x540.png',
};

const _images = {};

for (const [key, src] of Object.entries(ART)) {
  const img = new Image();
  img.src = src;
  _images[key] = img;
}

function ready(key) {
  const img = _images[key];
  return Boolean(img?.complete && img.naturalWidth > 0);
}

export function drawBossBannerArt(ctx, cx, y, w, h, alpha = 1) {
  if (!ready('bossBanner')) return false;
  const img = _images.bossBanner;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(img, cx - w / 2, y, w, h);
  ctx.restore();
  return true;
}

export function drawEquipRingArt(ctx, cx, cy, radius, alpha = 1) {
  if (!ready('equipRing')) return false;
  const img = _images.equipRing;
  const size = radius * 2.2;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(img, cx - size / 2, cy - size / 2, size, size);
  ctx.restore();
  return true;
}

export function drawHitSparkArt(ctx, x, y, size = 16, alpha = 1) {
  if (!ready('hitSpark')) return false;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(_images.hitSpark, x - size / 2, y - size / 2, size, size);
  ctx.restore();
  return true;
}

/** Full-bleed cold-open backdrop for the very first campaign battle. Cover-fits the rect. */
export function drawFirstNightIntroArt(ctx, x, y, w, h, alpha = 1) {
  if (!ready('firstNightIntro')) return false;
  const img = _images.firstNightIntro;
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  ctx.restore();
  return true;
}

export function drawGateBreachArt(ctx, x, y, frame = 0, scale = 1.2, alpha = 1) {
  if (!ready('gateBreach')) return false;
  const img = _images.gateBreach;
  const fw = img.naturalWidth / 4;
  const fh = img.naturalHeight;
  const f = Math.min(3, Math.max(0, frame));
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(img, f * fw, 0, fw, fh, x - fw * scale / 2, y - fh * scale / 2, fw * scale, fh * scale);
  ctx.restore();
  return true;
}
