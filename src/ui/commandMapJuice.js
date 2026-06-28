/** Command map first-visit hint fade. */

export function getCommandMapHintAlpha(timer, holdFrames = 60) {
  if (timer <= 0) return 0;
  return Math.min(1, timer / holdFrames);
}

export function tickCommandMapHintTimer(timer) {
  if (timer <= 0) return 0;
  return timer - 1;
}
