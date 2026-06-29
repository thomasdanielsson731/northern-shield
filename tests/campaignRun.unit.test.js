import { describe, it, expect } from 'vitest';
import {
  repairFieldStateAfterAssault,
  prepareFieldForNewAssault,
  mergeFallenHeroesIntoFieldState,
} from '../src/campaign/campaignRun.js';

describe('campaignRun field repair', () => {
  const deploySnapshot = {
    gold: 50,
    towers: [
      { type: 'berserk', col: 1, row: 2, defenderId: 'h1', level: 1 },
      { type: 'berserk', col: 3, row: 2, defenderId: 'h2', level: 1 },
      { type: 'catapult', col: 5, row: 4, level: 1 },
    ],
    walls: {
      '1_1': { hp: 80, maxHp: 100 },
      '2_1': { hp: 100, maxHp: 100 },
    },
  };

  it('restores fallen heroes, destroyed structures, and wall HP after assault', () => {
    const afterBattle = {
      gold: 120,
      towers: [
        { type: 'berserk', col: 1, row: 2, defenderId: 'h1', level: 1, combatHp: 12, combatMaxHp: 100 },
      ],
      walls: {
        '1_1': { hp: 10, maxHp: 100 },
      },
      deploySnapshot,
    };

    const repaired = repairFieldStateAfterAssault(afterBattle, deploySnapshot);

    expect(repaired.towers).toHaveLength(3);
    expect(repaired.towers.find(t => t.defenderId === 'h2')).toBeTruthy();
    expect(repaired.towers.find(t => t.type === 'catapult')).toBeTruthy();
    expect(repaired.towers.every(t => t.combatHp == null && t.structureHp == null)).toBe(true);
    expect(repaired.walls['1_1'].hp).toBe(100);
    expect(repaired.walls['2_1'].hp).toBe(100);
  });

  it('prepareFieldForNewAssault uses embedded deploy snapshot', () => {
    const field = {
      towers: [{ type: 'berserk', col: 1, row: 2, defenderId: 'h1' }],
      walls: { '1_1': { hp: 5, maxHp: 100 } },
      deploySnapshot,
    };
    const prepped = prepareFieldForNewAssault(field);
    expect(prepped.towers).toHaveLength(3);
    expect(prepped.walls['2_1'].hp).toBe(100);
  });

  it('mergeFallenHeroesIntoFieldState still restores missing heroes', () => {
    const merged = mergeFallenHeroesIntoFieldState(
      { towers: [{ type: 'berserk', col: 1, row: 2, defenderId: 'h1' }], walls: {} },
      deploySnapshot,
    );
    expect(merged.towers).toHaveLength(2);
  });
});
