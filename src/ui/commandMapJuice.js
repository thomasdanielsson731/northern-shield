/** Command map first-visit hint fade. */

export function getCommandMapHintAlpha(timer, holdFrames = 60) {
  if (timer <= 0) return 0;
  return Math.min(1, timer / holdFrames);
}

export function tickCommandMapHintTimer(timer) {
  if (timer <= 0) return 0;
  return timer - 1;
}

/**
 * Next unlocked region index in direction (-1 | 1), skipping locked slices.
 * @param {object} progress — campaign progress
 * @param {number} currentIndex
 * @param {number} direction — -1 or 1
 * @param {(idx: number) => boolean} [isLocked]
 */
export function findAdjacentUnlockedRegion(progress, currentIndex, direction, isLocked = () => false) {
  const max = Math.max(1, progress?.mapsUnlocked ?? 1);
  const step = direction < 0 ? -1 : 1;
  for (let i = currentIndex + step; step < 0 ? i >= 0 : i < max; i += step) {
    if (!isLocked(i)) return i;
  }
  return null;
}
