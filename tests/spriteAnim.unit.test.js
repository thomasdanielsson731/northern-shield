import { describe, it, expect } from 'vitest';
import {
  angleToRow,
  pickAnimColumn,
  computeWalkBob,
  resolveFacingAngle,
  ANIM,
} from '../src/combat/spriteAnim.js';

describe('spriteAnim', () => {
  it('maps angles to direction rows', () => {
    expect(angleToRow(0)).toBe(0);
    expect(angleToRow(Math.PI / 2)).toBe(1);
    expect(angleToRow(Math.PI)).toBe(2);
  });

  it('picks walk column when moving', () => {
    expect(pickAnimColumn({ dying: false, attacking: false, moving: true, walkPhase: 0, gait: 'twoStep' })).toBe(ANIM.WALK_B);
    expect(pickAnimColumn({ dying: false, attacking: false, moving: true, walkPhase: 0.25, gait: 'twoStep' })).toBe(ANIM.IDLE);
    expect(pickAnimColumn({ dying: false, attacking: false, moving: false })).toBe(ANIM.IDLE);
    expect(pickAnimColumn({ dying: false, attacking: true, moving: true })).toBe(ANIM.ATTACK);
    expect(pickAnimColumn({ dying: true, attacking: false, moving: false })).toBe(ANIM.DEATH);
  });

  it('bob scales with movement speed', () => {
    const still = computeWalkBob(0, 0);
    const run = computeWalkBob(1.5, 1);
    expect(Math.abs(run.yOff)).toBeGreaterThan(Math.abs(still.yOff));
  });

  it('prefers velocity for facing', () => {
    expect(resolveFacingAngle(1, 0, 0, 1)).toBeCloseTo(0, 2);
    expect(resolveFacingAngle(0, 0, -1, 0)).toBeCloseTo(Math.PI, 2);
  });
});
