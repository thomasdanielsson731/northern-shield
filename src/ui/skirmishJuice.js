/** Skirmish discovery hint — shared pulse for campaign select and command map. */

export function getSkirmishDiscoveryPulseAlpha(nowMs = 0) {
  const pulse = 0.55 + Math.sin(nowMs * 0.006) * 0.35;
  return 0.5 + pulse * 0.4;
}

export const SKIRMISH_DISCOVERY_FRAMES = 420;

export function tickSkirmishDiscoveryTimer(remaining) {
  if (remaining <= 0) return 0;
  return remaining - 1;
}
