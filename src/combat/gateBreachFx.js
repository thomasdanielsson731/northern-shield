/**
 * Gate breach splinter VFX — ties banner to sprite state (Wave 6 / Phase E).
 */

const BREACH_SHEET = '/assets/fx/fx_gate_breach_splinters_sheet@64.png';
const FRAME_COUNT = 4;

const _img = new Image();
_img.src = BREACH_SHEET;

function sheetReady() {
  return Boolean(_img.complete && _img.naturalWidth > 0);
}

/** Draw animated splinter burst at gate world position. */
export function drawGateBreachSplinters(ctx, x, y, cellSize, time = 0, { intensity = 1 } = {}) {
  if (!sheetReady() || intensity <= 0) return false;

  const frameW = Math.floor(_img.naturalWidth / FRAME_COUNT);
  const frameH = _img.naturalHeight;
  const frame = Math.floor((time * 14) % FRAME_COUNT);
  const pulse = 0.65 + Math.sin(time * 9) * 0.35;
  const scale = cellSize * 0.95 * (0.85 + pulse * 0.2);
  const dw = scale;
  const dh = scale * (frameH / frameW);

  ctx.save();
  ctx.globalAlpha = Math.min(1, intensity) * (0.55 + pulse * 0.35);
  ctx.drawImage(
    _img,
    frame * frameW, 0, frameW, frameH,
    x - dw / 2, y - dh * 0.72, dw, dh,
  );
  ctx.restore();
  return true;
}

export function isGateBreachFxReady() {
  return sheetReady();
}
