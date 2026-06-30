/**
 * Fortress structure manifest — single registry for prep, assault, and hub LOD.
 * @see design/FORTRESS_PREP_ASSAULT_GRAPHICS.md
 */

export const FORTRESS_LAYOUT_VERSION = 1;

/** Age I core structures (expand per upgrade tier). */
export const FORTRESS_STRUCTURE_IDS = Object.freeze([
  'west_gate',
  'longhouse',
  'watch_tower',
  'treasury',
]);

/** Map manifest structure id → fortressPrepArt sprite key. */
export const STRUCTURE_ART_KEYS = Object.freeze({
  west_gate: 'westGateIntact',
  longhouse: 'longhouse',
  watch_tower: 'watchTower',
  treasury: 'treasury',
});

/** Gate damage state → art key suffix in fortressPrepArt. */
export function getGateArtKeyFromState({ hp, maxHp, scarred, repaired }) {
  if (hp != null && maxHp != null) {
    if (hp <= 0) return 'westGateBreached';
    if (hp < maxHp * 0.45) return 'westGateCracked';
  }
  if (scarred && !repaired) return 'westGateCracked';
  return 'westGateIntact';
}

/** Wallworks upgrade level → readable rampart tier label. */
export function getRampartTierLabel(wallworksLevel = 0) {
  const tiers = ['Palisade', 'Reinforced', 'Stone base', 'Hoarding'];
  return tiers[Math.min(wallworksLevel, tiers.length - 1)] ?? 'Palisade';
}
