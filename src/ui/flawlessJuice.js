/** Flawless wave notification — alpha and vertical drift. */

export const FLAWLESS_FADE_IN = 30;
export const FLAWLESS_FADE_OUT_START = 60;
export const FLAWLESS_TOTAL = 180;

/** Boss HP chrome below GRID_TOP (matches drawBossHpBar layout). */
export const BOSS_HUD_BAR_TOP = 6;
export const BOSS_HUD_BAR_H = 14;
export const BOSS_HUD_PHASE_STRIP_H = 5;

export function getBossHudBottomY(gridTop, { hasBoss = false, hasPhaseDesc = false } = {}) {
  if (!hasBoss) return null;
  let bottom = gridTop + BOSS_HUD_BAR_TOP + BOSS_HUD_BAR_H + BOSS_HUD_PHASE_STRIP_H;
  if (hasPhaseDesc) bottom += 14;
  return bottom;
}

export function getFlawlessNotifAlpha(timer) {
  const fadeIn = Math.min(1, timer / FLAWLESS_FADE_IN);
  const fadeOut = timer < FLAWLESS_FADE_OUT_START ? timer / FLAWLESS_FADE_OUT_START : 1;
  return fadeIn * fadeOut;
}

/** @param {number|null} bossHudBottom bottom Y of boss chrome, or null when no boss bar */
export function getFlawlessNotifY(timer, gridTop, bossHudBottom = null) {
  const t = 1 - timer / FLAWLESS_TOTAL;
  const baseY = bossHudBottom != null ? bossHudBottom + 18 : gridTop + 28;
  return baseY + t * 8;
}

export function tickFlawlessTimer(timer) {
  if (timer <= 0) return 0;
  return timer - 1;
}
