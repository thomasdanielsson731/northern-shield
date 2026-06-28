/** Equip ceremony flash — ring, banner, and label timing (extracted for tests). */

export const EQUIP_CEREMONY_FRAMES = 72;
export const EQUIP_CEREMONY_RING_CY = 138;
export const EQUIP_CEREMONY_NAME_Y = 134;
export const EQUIP_CEREMONY_SUBTITLE_Y = 146;

export function getEquipCeremonyProgress(timer, total = EQUIP_CEREMONY_FRAMES) {
  return 1 - timer / total;
}

export function getEquipFlashAlpha(timer) {
  if (timer <= 48) return 0;
  return Math.min(0.24, ((timer - 48) / 16) * 0.24);
}

export function getEquipRingAlpha(progress) {
  return Math.max(0, 1 - progress * 1.2) * 0.55;
}

export function getEquipRingRadius(progress, start = 28, expand = 42) {
  return start + progress * expand;
}

export function getEquipLabelAlpha(timer) {
  if (timer <= 24) return 0;
  return Math.min(1, (timer - 24) / 18);
}

export function tickEquipCeremonyTimer(timer) {
  if (timer <= 0) return 0;
  return timer - 1;
}
