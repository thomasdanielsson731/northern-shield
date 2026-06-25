import { describe, it, expect } from 'vitest';
import {
  pickWarbandHealTargets,
  getHyddaHealAmount,
  HYDDA_HEAL_RANGE,
} from '../src/roster/warbandHeal.js';

describe('warbandHeal', () => {
  it('scales heal amount with level', () => {
    expect(getHyddaHealAmount(1)).toBe(40);
    expect(getHyddaHealAmount(5)).toBe(88);
  });

  it('heals lowest-HP allies in range first', () => {
    const healer = { type: 'hydda', level: 1, x: 100, y: 100, col: 7, row: 7 };
    const towers = [
      healer,
      { type: 'berserk', x: 110, y: 100, combatHp: 80, combatMaxHp: 100, defenderId: 'a' },
      { type: 'military', x: 120, y: 100, combatHp: 20, combatMaxHp: 100, defenderId: 'b' },
    ];
    const heals = pickWarbandHealTargets(healer, towers, 1);
    expect(heals).toHaveLength(1);
    expect(heals[0].target.defenderId).toBe('b');
    expect(heals[0].amount).toBe(getHyddaHealAmount(1));
  });

  it('ignores full-HP and out-of-range allies', () => {
    const healer = { type: 'hydda', level: 1, x: 0, y: 0, col: 0, row: 0 };
    const far = HYDDA_HEAL_RANGE + 20;
    const towers = [
      healer,
      { type: 'berserk', x: far, y: 0, combatHp: 10, combatMaxHp: 100, defenderId: 'far' },
      { type: 'valkyrie', x: 10, y: 0, combatHp: 100, combatMaxHp: 100, defenderId: 'full' },
    ];
    expect(pickWarbandHealTargets(healer, towers, 2)).toHaveLength(0);
  });

  it('heals up to two allies at high level', () => {
    const healer = { type: 'hydda', level: 5, x: 50, y: 50, col: 3, row: 3 };
    const towers = [
      healer,
      { type: 'berserk', x: 60, y: 50, combatHp: 40, combatMaxHp: 100, defenderId: 'a' },
      { type: 'military', x: 70, y: 50, combatHp: 30, combatMaxHp: 100, defenderId: 'b' },
    ];
    expect(pickWarbandHealTargets(healer, towers, 2)).toHaveLength(2);
  });
});
