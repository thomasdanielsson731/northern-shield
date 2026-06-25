/**
 * Field structure levels (1–30) — siege/outposts scale below hero ceiling.
 */

import { isHeroTowerType } from '../campaign/campaignRun.js';
import {
  MAX_HERO_LEVEL,
  getHeroLevelStatMultipliers,
  getHeroUpgradeCost,
} from './heroLevel.js';

export const MAX_STRUCTURE_LEVEL = 30;
/** Structures gain ~68% of hero per-level stat growth. */
export const STRUCTURE_STAT_FACTOR = 0.68;

const SIEGE_TYPES = new Set(['ballista', 'catapult', 'piltorn', 'drakship']);
const FOOTPRINT_CELLS = {
  catapult: 4, drakship: 3,
};

export function getMaxLevelForTowerType(type) {
  return isHeroTowerType(type) ? MAX_HERO_LEVEL : MAX_STRUCTURE_LEVEL;
}

export function isTowerLevelMax(type, level) {
  return level >= getMaxLevelForTowerType(type);
}

export function getStructureLevelStatMultipliers(level) {
  const h = getHeroLevelStatMultipliers(level);
  const f = STRUCTURE_STAT_FACTOR;
  return {
    dmgMult:   1 + (h.dmgMult - 1) * f,
    rangeMult: 1 + (h.rangeMult - 1) * f,
    rateMult:  1 - (1 - h.rateMult) * f,
  };
}

export function getStructureUpgradeCost(baseCost, level) {
  if (level >= MAX_STRUCTURE_LEVEL) return 0;
  return Math.max(1, Math.floor(getHeroUpgradeCost(baseCost, level) * 0.82));
}

/** Melee HP for structures targeted by jotunn / einherjar. */
export function getStructureCombatHp(type, level = 1) {
  const cells = FOOTPRINT_CELLS[type] ?? 1;
  const siege = SIEGE_TYPES.has(type);
  const base  = siege ? 130 : 95;
  const perLv = siege ? 38 : 22;
  return base + level * perLv + (cells - 1) * 40;
}

/** Passive output scales +10% per level above 1. */
export function scalePassiveByLevel(baseValue, level) {
  if (!baseValue) return 0;
  return baseValue * (1 + (Math.max(1, level) - 1) * 0.10);
}
