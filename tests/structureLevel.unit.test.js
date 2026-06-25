import { describe, it, expect } from 'vitest';
import {
  MAX_STRUCTURE_LEVEL,
  getStructureLevelStatMultipliers,
  getStructureUpgradeCost,
  getStructureCombatHp,
  scalePassiveByLevel,
  getMaxLevelForTowerType,
} from '../src/roster/structureLevel.js';
import { getHeroLevelStatMultipliers } from '../src/roster/heroLevel.js';
import {
  getRecommendedStructureCount,
  getStructureWarnings,
} from '../src/roster/warbandComposition.js';

describe('structureLevel', () => {
  it('structures cap at level 30', () => {
    expect(getMaxLevelForTowerType('ballista')).toBe(MAX_STRUCTURE_LEVEL);
    expect(getMaxLevelForTowerType('berserk')).toBe(100);
  });

  it('structure stats grow slower than heroes at same level', () => {
    const s = getStructureLevelStatMultipliers(15);
    const h = getHeroLevelStatMultipliers(15);
    expect(s.dmgMult).toBeLessThan(h.dmgMult);
    expect(s.dmgMult).toBeGreaterThan(1.5);
  });

  it('structure HP scales with level and footprint', () => {
    expect(getStructureCombatHp('ballista', 1)).toBeLessThan(getStructureCombatHp('ballista', 10));
    expect(getStructureCombatHp('catapult', 5)).toBeGreaterThan(getStructureCombatHp('mine', 5));
  });

  it('passive output scales per level', () => {
    expect(scalePassiveByLevel(3, 1)).toBe(3);
    expect(scalePassiveByLevel(3, 5)).toBeCloseTo(3 * 1.4);
  });

  it('structure upgrades cost less than hero upgrades at same level', () => {
    const base = 68;
    expect(getStructureUpgradeCost(base, 5)).toBeLessThan(
      Math.floor((base * (0.65 + 5 * 0.18 + Math.sqrt(5) * 0.55)))
    );
  });
});

describe('structure composition', () => {
  it('recommends more structures on multi-portal boss nodes', () => {
    expect(getRecommendedStructureCount(1, false)).toBe(1);
    expect(getRecommendedStructureCount(2, false)).toBe(2);
    expect(getRecommendedStructureCount(2, true)).toBe(3);
  });

  it('warns when field lacks siege', () => {
    const w = getStructureWarnings([{ type: 'mine', level: 1 }], 1, 10, false);
    expect(w.some(x => x.includes('siege'))).toBe(true);
  });

  it('warns on boss without heavy siege', () => {
    const w = getStructureWarnings([{ type: 'piltorn', level: 1 }], 1, 40, true);
    expect(w.some(x => x.toLowerCase().includes('boss'))).toBe(true);
  });
});
