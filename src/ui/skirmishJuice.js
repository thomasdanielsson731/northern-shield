/** Skirmish discovery hint — shared pulse for campaign select and command map. */

export const SKIRMISH_DISCOVERY_FRAMES = 420;
export const SKIRMISH_CTA_W = 228;
export const SKIRMISH_CTA_H = 44;

export function getSkirmishDiscoveryPulseAlpha(nowMs = 0) {
  const pulse = 0.55 + Math.sin(nowMs * 0.006) * 0.35;
  return 0.5 + pulse * 0.4;
}

export function getSkirmishCtaRect(screenW, screenH) {
  const w = SKIRMISH_CTA_W;
  const h = SKIRMISH_CTA_H;
  return {
    x: Math.round(screenW / 2 - w / 2),
    y: screenH - 72,
    w,
    h,
  };
}

/** Compact skirmish link on command map footer. */
export function getSkirmishLinkRect(screenW, footerY) {
  return { x: Math.round(screenW / 2 - 112), y: footerY, w: 124, h: 26 };
}

export function tickSkirmishDiscoveryTimer(remaining) {
  if (remaining <= 0) return 0;
  return remaining - 1;
}
