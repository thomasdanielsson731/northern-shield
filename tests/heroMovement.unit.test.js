import { describe, it, expect } from 'vitest';
import {
  isHeroMeleeType,
  getHeroStopDistance,
  updateHeroMovement,
  snapHeroToDeployCell,
} from '../src/roster/heroMovement.js';

describe('heroMovement', () => {
  it('classifies berserk as melee', () => {
    expect(isHeroMeleeType('berserk')).toBe(true);
    expect(isHeroMeleeType('military')).toBe(false);
  });

  it('melee stops closer than ranged', () => {
    const melee = { type: 'berserk', range: 22 };
    const ranged = { type: 'military', range: 80 };
    expect(getHeroStopDistance(melee)).toBeLessThan(getHeroStopDistance(ranged));
  });

  it('moves melee toward enemy', () => {
    const tower = { type: 'berserk', range: 22, x: 100, y: 100, col: 7, row: 7 };
    const enemies = [{ x: 200, y: 100, alive: true, reached: false }];
    updateHeroMovement(tower, enemies, 672, 420);
    expect(tower.x).toBeGreaterThan(100);
    expect(tower.y).toBe(100);
  });

  it('ranged stops before reaching enemy', () => {
    const tower = { type: 'military', range: 80, x: 50, y: 100, col: 3, row: 7 };
    const enemies = [{ x: 200, y: 100, alive: true, reached: false }];
    for (let i = 0; i < 200; i++) updateHeroMovement(tower, enemies, 672, 420);
    const dist = Math.hypot(enemies[0].x - tower.x, enemies[0].y - tower.y);
    expect(dist).toBeLessThanOrEqual(80 * 0.92 + 2);
    expect(dist).toBeGreaterThan(40);
  });

  it('snapHeroToDeployCell resets pixel position', () => {
    const tower = { type: 'berserk', x: 999, y: 999, col: 5, row: 10 };
    snapHeroToDeployCell(tower, 14);
    expect(tower.x).toBe(5 * 14 + 7);
    expect(tower.y).toBe(10 * 14 + 7);
  });

  it('hydda moves toward wounded warband ally', () => {
    const healer = { type: 'hydda', range: 0, x: 100, y: 100, col: 7, row: 7, level: 1 };
    const ally = {
      type: 'berserk', x: 250, y: 100, col: 17, row: 7,
      combatHp: 30, combatMaxHp: 100, defenderId: 'a',
    };
    const warband = [healer, ally];
    const enemies = [{ x: 400, y: 100, alive: true, reached: false }];
    for (let i = 0; i < 40; i++) {
      updateHeroMovement(healer, enemies, 672, 420, { warband });
    }
    expect(healer.x).toBeGreaterThan(100);
    expect(Math.hypot(ally.x - healer.x, ally.y - healer.y)).toBeLessThan(250 - 100);
  });

  it('hydda advances toward enemies when warband is healthy', () => {
    const healer = { type: 'hydda', range: 0, x: 100, y: 100, col: 7, row: 7, level: 1 };
    const ally = {
      type: 'berserk', x: 120, y: 100, col: 8, row: 7,
      combatHp: 100, combatMaxHp: 100, defenderId: 'a',
    };
    const enemies = [{ x: 300, y: 100, alive: true, reached: false }];
    for (let i = 0; i < 30; i++) {
      updateHeroMovement(healer, enemies, 672, 420, { warband: [healer, ally] });
    }
    expect(healer.x).toBeGreaterThan(100);
  });
});
