/**
 * Hero field level (1–100) — stats and upgrade costs for deployed warband towers.
 */

export const MAX_HERO_LEVEL = 100;

const LEVEL_MILESTONES = new Set([5, 10, 25, 50, 75, 100]);

export function isHeroLevelMax(level) {
  return level >= MAX_HERO_LEVEL;
}

export function isHeroLevelMilestone(level) {
  return LEVEL_MILESTONES.has(level);
}

/** Per-level increment applied when crossing from level → level+1. */
function stepMult(level) {
  if (level < 5)  return { dmg: 1.25,  rng: 1.08,  rate: 0.95 };
  if (level < 10) return { dmg: 1.15,  rng: 1.05,  rate: 0.97 };
  if (level < 25) return { dmg: 1.08,  rng: 1.03,  rate: 0.985 };
  if (level < 50) return { dmg: 1.04,  rng: 1.015, rate: 0.992 };
  if (level < 75) return { dmg: 1.025, rng: 1.010, rate: 0.994 };
  return { dmg: 1.015, rng: 1.006, rate: 0.996 };
}

/** Cumulative multipliers for a given hero level (level 1 = base stats). */
export function getHeroLevelStatMultipliers(level) {
  let dmgMult = 1;
  let rangeMult = 1;
  let rateMult = 1;
  for (let i = 1; i < level; i++) {
    const s = stepMult(i);
    dmgMult   *= s.dmg;
    rangeMult *= s.rng;
    rateMult  *= s.rate;
  }
  return { dmgMult, rangeMult, rateMult };
}

export function getHeroUpgradeCost(baseCost, level) {
  const base = baseCost ?? 20;
  if (level >= MAX_HERO_LEVEL) return 0;
  const scaled = base * (0.65 + level * 0.18 + Math.sqrt(level) * 0.55);
  return Math.max(base, Math.floor(scaled));
}

/** Hydda allies healed per pulse scales at high level. */
export function getHyddaHealCount(level) {
  if (level >= 50) return 3;
  if (level >= 5) return 2;
  return 1;
}
