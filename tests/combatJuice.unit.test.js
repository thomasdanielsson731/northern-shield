import { describe, it, expect } from 'vitest';
import {
  computeHitFeel,
  applyEnemyHitKnock,
  applyEnemyDeathFlair,
  getEnemyHopOffset,
  tickEnemyHitHop,
  isOnPathlessLane,
  clearPathlessFootDust,
  emitPathlessFootDust,
  emitLaneWearMark,
  tickPathlessFootDust,
  tickLaneWearMarks,
  triggerHeroAttackLunge,
  getHeroLungeOffset,
  tickHeroAttackLunge,
  triggerHeroHitRecoil,
  getHeroHitRecoilOffset,
  getHeroCombatMotionOffset,
  tickHeroHitRecoil,
} from '../src/combat/combatJuice.js';

describe('combatJuice', () => {
  it('scales hit-stop on heavy crit kills', () => {
    const feel = computeHitFeel(88, { isCrit: true, isKill: true });
    expect(feel.shake).toBeGreaterThanOrEqual(7);
    expect(feel.hitStop).toBeGreaterThanOrEqual(2);
  });

  it('uses lower campaign thresholds for saga assault damage', () => {
    const skirmish = computeHitFeel(10, { campaign: false });
    const campaign = computeHitFeel(10, { campaign: true });
    expect(campaign.hitStop).toBeGreaterThan(skirmish.hitStop);
    expect(campaign.shake).toBeGreaterThan(skirmish.shake);
  });

  it('applies hop and stagger on enemy hits', () => {
    const enemy = { alive: true, x: 100, y: 80, path: [{ x: 90, y: 80 }, { x: 110, y: 80 }], pathIndex: 0 };
    applyEnemyHitKnock(enemy, 40, 120, 80);
    expect(enemy.hitHop).toBeGreaterThan(2);
    expect(enemy.staggerTimer).toBeGreaterThan(0);
    tickEnemyHitHop(enemy);
    expect(getEnemyHopOffset(enemy)).toBeLessThan(0);
  });

  it('detects units on pathless lane band', () => {
    const spawn = { col: 1, row: 10 };
    const goal = { col: 18, row: 10 };
    expect(isOnPathlessLane(200, 145, spawn, goal, 14)).toBe(true);
    expect(isOnPathlessLane(200, 60, spawn, goal, 14)).toBe(false);
  });

  it('foot dust and lane wear expire', () => {
    clearPathlessFootDust();
    emitPathlessFootDust(50, 50);
    emitLaneWearMark(50, 50);
    for (let i = 0; i < 30; i++) tickPathlessFootDust();
    for (let i = 0; i < 30; i++) tickLaneWearMarks();
    expect(() => tickPathlessFootDust()).not.toThrow();
    expect(() => tickLaneWearMarks()).not.toThrow();
  });

  it('hero attack lunge peaks mid-animation', () => {
    const tower = { x: 100, y: 100 };
    triggerHeroAttackLunge(tower, 140, 100);
    for (let i = 0; i < 3; i++) tickHeroAttackLunge(tower);
    const mid = getHeroLungeOffset(tower);
    for (let i = 0; i < 4; i++) tickHeroAttackLunge(tower);
    const late = getHeroLungeOffset(tower);
    expect(Math.abs(mid.x)).toBeGreaterThan(Math.abs(late.x));
  });

  it('hero hit recoil pushes away from attacker', () => {
    const tower = { x: 100, y: 100 };
    triggerHeroHitRecoil(tower, 130, 100);
    for (let i = 0; i < 4; i++) tickHeroHitRecoil(tower);
    const mid = getHeroHitRecoilOffset(tower);
    expect(mid.x).toBeLessThan(0);
    const combined = getHeroCombatMotionOffset(tower);
    expect(combined.x).toBeLessThan(0);
  });

  it('death flair returns per-type particles', () => {
    const flair = applyEnemyDeathFlair({ x: 50, y: 50, staggerTimer: 0 }, 'warg');
    expect(flair.particles?.length).toBeGreaterThan(0);
    expect(flair.slide).toBeTruthy();
  });
});
