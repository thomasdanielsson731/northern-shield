/**
 * Hall of Heroes — full-body bronze statue overlays per defender class.
 * @see design/art/BATCH_PROMPTS.md Wave 13.5
 */

const STATUE_SRC = {
  berserk: '/assets/ui/ui_hall_statue_berserk@128x192.png',
  valkyrie: '/assets/ui/ui_hall_statue_valkyrie@128x192.png',
  military: '/assets/ui/ui_hall_statue_military@128x192.png',
  archer: '/assets/ui/ui_hall_statue_military@128x192.png',
  catapult: '/assets/ui/ui_hall_statue_catapult@128x192.png',
  blondie: '/assets/ui/ui_hall_statue_blondie@128x192.png',
  piltorn: '/assets/ui/ui_hall_statue_piltorn@128x192.png',
  hydda: '/assets/ui/ui_hall_statue_hydda@128x192.png',
  isjatten: '/assets/ui/ui_hall_statue_isjatten@128x192.png',
  drakship: '/assets/ui/ui_hall_statue_drakship@128x192.png',
};

const STATUE_W = 128;
const STATUE_H = 192;

const _images = {};
for (const [type, src] of Object.entries(STATUE_SRC)) {
  if (_images[type]) continue;
  const img = new Image();
  img.src = src;
  _images[type] = img;
}

function resolveType(towerType) {
  const t = (towerType ?? '').toLowerCase();
  if (STATUE_SRC[t]) return t;
  if (t === 'archer') return 'military';
  return null;
}

function ready(type) {
  const key = resolveType(type);
  if (!key) return false;
  const img = _images[key];
  return Boolean(img?.complete && img.naturalWidth > 0);
}

export function isHallHeroStatueReady(towerType) {
  return ready(towerType);
}

export function anyHallHeroStatueReady() {
  return Object.keys(STATUE_SRC).some((t) => ready(t));
}

/**
 * Draw full-body statue with feet anchored at (footX, footY).
 * @param {number} displayH — rendered height in screen pixels
 */
export function drawHallHeroStatue(ctx, footX, footY, towerType, displayH, opts = {}) {
  const key = resolveType(towerType);
  if (!key) return false;
  const img = _images[key];
  if (!img?.complete || img.naturalWidth <= 0) return false;

  const { muted = false, alpha = 1, selected = false } = opts;
  const aspect = STATUE_W / STATUE_H;
  const h = displayH;
  const w = h * aspect;

  ctx.save();
  ctx.globalAlpha = alpha * (muted ? 0.92 : 1);
  if (selected) {
    ctx.shadowColor = 'rgba(200,150,60,0.25)';
    ctx.shadowBlur = 8;
  }
  ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight, footX - w / 2, footY - h, w, h);
  ctx.restore();
  return true;
}

export { STATUE_SRC, STATUE_H };
