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

/** Siege post structure types → battle-scale art filenames (Wave 15). */
export const SIEGE_BATTLE_ART_FILES = Object.freeze({
  ballista: 'siege_ballista_battle@96x96.png',
  military: 'siege_ballista_battle@96x96.png',
  catapult: 'siege_catapult_battle@96x96.png',
});

/** Fen wilderness scatter props (Wave 16). */
export const FEN_SCATTER_ART_FILES = Object.freeze({
  pine: 'prop_fen_tree_pine@96x192.png',
  birch: 'prop_fen_birch@96x192.png',
  rock: 'prop_fen_rock_cluster@64x48.png',
});

/** Palisade wall tile variants for rampart ring. */
export const PALISADE_TILE_FILES = Object.freeze({
  segment: 'tile_palisade_segment@28.png',
  damaged: 'tile_palisade_damaged@28.png',
  stone: 'tile_palisade_stone_segment@28.png',
  corner: 'tile_palisade_corner@28.png',
  gateCap: 'tile_palisade_gate_cap@28.png',
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
