/** Save slot delete confirm modal — sizing and pulse. */

export const SLOT_DELETE_MODAL = { w: 320, h: 118 };

export function getDeleteConfirmBackdropAlpha() {
  return 0.72;
}

export function getDeleteConfirmPulse(nowMs = 0) {
  return 0.55 + Math.sin(nowMs * 0.008) * 0.25;
}
