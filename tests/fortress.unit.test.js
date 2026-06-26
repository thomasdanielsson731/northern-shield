import { describe, it, expect } from 'vitest';
import { FORTRESS_DEFS, getFortressBonuses, getNextFortressUpgradeOffer } from '../src/fortress/fortress.js';

describe('fortress upgrades', () => {
  it('accumulates bonuses across nodes', () => {
    const b = getFortressBonuses({ barracks: 2, armory: 1, treasury: 1 });
    expect(b.recruitCostReduction).toBe(10);
    expect(b.startingGoldBonus).toBe(40);
    expect(b.equipDmMult).toBeCloseTo(1.08);
    expect(b.marchSuppliesBonus).toBe(8);
    expect(b.warChestDiscount).toBe(10);
  });

  it('returns cheapest affordable upgrade offer', () => {
    const offer = getNextFortressUpgradeOffer({}, 50);
    expect(offer).not.toBeNull();
    expect(offer.cost).toBeLessThanOrEqual(50);
  });

  it('returns null when broke or maxed', () => {
    expect(getNextFortressUpgradeOffer({}, 0)).toBeNull();
    const maxed = Object.fromEntries(Object.keys(FORTRESS_DEFS).map(k => [k, 3]));
    expect(getNextFortressUpgradeOffer(maxed, 9999)).toBeNull();
  });

  it('each node has three upgrade levels', () => {
    for (const def of Object.values(FORTRESS_DEFS)) {
      expect(def.maxLevel).toBe(3);
      expect(def.cost).toHaveLength(3);
      expect(def.bonuses).toHaveLength(4);
    }
  });
});
