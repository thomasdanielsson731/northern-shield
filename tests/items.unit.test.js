import { describe, it, expect } from 'vitest';
import { ITEM_DEFS, BOSS_DROP_TABLE, RARITY_COLOR, getItemBonuses } from '../src/roster/items.js';

describe('items', () => {
  it('defines equipment with rarity colors', () => {
    expect(Object.keys(ITEM_DEFS).length).toBeGreaterThan(10);
    expect(RARITY_COLOR.legendary).toBe('#ff9020');
  });

  it('stacks item bonuses multiplicatively', () => {
    const b = getItemBonuses(['frost_crystal', 'skadi_blade']);
    expect(b.dm).toBeCloseTo(1.12 * 1.25);
    expect(b.rm).toBe(1);
  });

  it('ignores null and unknown ids', () => {
    const b = getItemBonuses([null, 'missing', 'wolf_pelt']);
    expect(b.rm).toBeCloseTo(1.1);
  });

  it('boss drop table covers milestone waves', () => {
    expect(BOSS_DROP_TABLE[10]).toHaveLength(2);
    expect(BOSS_DROP_TABLE[100]).toContain('surtr_shard');
  });
});
