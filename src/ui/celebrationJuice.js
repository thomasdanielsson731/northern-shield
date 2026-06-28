/** Map unlock, region clear, and event toast fade timing. */

export function getCelebrationFadeAlpha(timer, holdFrames = 40) {
  if (timer <= 0) return 0;
  return Math.min(1, timer / holdFrames);
}

export function tickFxTimer(timer) {
  if (timer <= 0) return 0;
  return timer - 1;
}

export function getMapUnlockBandY(viewHeight, bandFraction = 0.35) {
  return viewHeight * bandFraction;
}

export function getRegionClearTextY(metaScreenTop, offset = 56) {
  return metaScreenTop + offset;
}

export function getToastFadeAlpha(timer, holdFrames = 20) {
  if (timer <= 0) return 0;
  return Math.min(1, timer / holdFrames);
}
