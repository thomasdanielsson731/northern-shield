/** Settlement ceremony feel — stone flash and step glow (extracted for tests). */

export const STONE_FLASH_FRAMES = 520;
export const STONE_FLASH_DECAY = 18;

export function tickStoneFlash(framesRemaining, decay = STONE_FLASH_DECAY) {
  if (framesRemaining <= 0) return 0;
  return Math.max(0, framesRemaining - decay);
}

export function getStoneFlashAlpha(framesRemaining, maxFrames = STONE_FLASH_FRAMES) {
  if (framesRemaining <= 0) return 0;
  const t = framesRemaining / maxFrames;
  return 0.62 * t * t;
}

export function getSettlementStepGlow(nowMs = 0) {
  return 0.06 + Math.sin(nowMs * 0.004) * 0.03;
}

export function getHeroNamingGlow(nowMs = 0) {
  return 0.05 + Math.sin(nowMs * 0.003) * 0.025;
}
