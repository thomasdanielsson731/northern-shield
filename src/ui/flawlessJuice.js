/** Flawless wave notification — alpha and vertical drift. */

export const FLAWLESS_FADE_IN = 30;
export const FLAWLESS_FADE_OUT_START = 60;
export const FLAWLESS_TOTAL = 180;

export function getFlawlessNotifAlpha(timer) {
  const fadeIn = Math.min(1, timer / FLAWLESS_FADE_IN);
  const fadeOut = timer < FLAWLESS_FADE_OUT_START ? timer / FLAWLESS_FADE_OUT_START : 1;
  return fadeIn * fadeOut;
}

export function getFlawlessNotifY(timer, gridTop, hasBossBar) {
  const t = 1 - timer / FLAWLESS_TOTAL;
  const baseY = hasBossBar ? gridTop + 50 : gridTop + 28;
  return baseY + t * 8;
}

export function tickFlawlessTimer(timer) {
  if (timer <= 0) return 0;
  return timer - 1;
}
