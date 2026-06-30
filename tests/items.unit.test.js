import { describe, it, expect } from 'vitest';
import { getItemBonuses, ITEM_DEFS } from '../src/roster/items.js';

describe('items', () => {
  it('getItemBonuses returns neutral multipliers for empty slots', () => {
    expect(getItemBonuses([null, null])).toEqual({ dm: 1, rm: 1, cm: 1 });
  });

  it('getItemBonuses multiplies across weapon and armor', () => {
    const bonuses = getItemBonuses(['war_torc', 'storm_cloak']);
    expect(bonuses.dm).toBeCloseTo(1.20, 5);
    expect(bonuses.rm).toBeCloseTo(1.18 * 1.08, 5);
    expect(bonuses.cm).toBeCloseTo(0.95 * 0.92, 5);
  });

  it('legendary items expose rune sockets', () => {
    expect(ITEM_DEFS.gungnir_tip.runeSlot).toBe(true);
    expect(ITEM_DEFS.skadi_blade.runeSlot).toBeUndefined();
  });
});
