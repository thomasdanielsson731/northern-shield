/** Transient in-game hint toasts — gold pools, auto-move, etc. */

export function getHintFadeAlpha(timer, holdFrames = 40) {
  if (timer <= 0) return 0;
  return Math.min(1, timer / holdFrames);
}

export function tickHintTimer(timer) {
  if (timer <= 0) return 0;
  return timer - 1;
}

export function shouldDismissAutoMoveHint(waveNumber, heroMoveMode, maxFrames = 360) {
  return waveNumber !== 1 || heroMoveMode || maxFrames <= 0;
}
