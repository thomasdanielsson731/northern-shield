import { describe, it, expect } from 'vitest';
import {
  hasLivingFortressGates,
  shouldPrioritizeFortressGates,
  buildAssaultTargetPriority,
  isGateWallTarget,
  isStructureWallTarget,
} from '../src/combat/assaultTargeting.js';

describe('assaultTargeting', () => {
  const wallsWithGate = {
    '10_5': { isGate: true, hp: 80, maxHp: 100 },
    '11_5': { level: 0, hp: 100, maxHp: 100 },
  };

  it('detects living fortress gates', () => {
    expect(hasLivingFortressGates(wallsWithGate)).toBe(true);
    expect(hasLivingFortressGates({ '10_5': { isGate: true, hp: 0 } })).toBe(false);
    expect(hasLivingFortressGates({})).toBe(false);
  });

  it('prioritizes gates on pathless assault until one breaches', () => {
    expect(shouldPrioritizeFortressGates(true, false, wallsWithGate)).toBe(true);
    expect(shouldPrioritizeFortressGates(true, true, wallsWithGate)).toBe(false);
    expect(shouldPrioritizeFortressGates(false, false, wallsWithGate)).toBe(false);
  });

  it('inserts gates before base priority while ports stand', () => {
    const base = ['warband', 'structures', 'goal'];
    expect(buildAssaultTargetPriority(base, {
      pathless: true,
      gateBreached: false,
      wallData: wallsWithGate,
    })).toEqual(['gates', 'warband', 'structures', 'goal']);
  });

  it('drops gate priority after a breach', () => {
    const base = ['structures', 'warband', 'goal'];
    expect(buildAssaultTargetPriority(base, {
      pathless: true,
      gateBreached: true,
      wallData: wallsWithGate,
    })).toEqual(base);
  });

  it('splits gate walls from ring walls for structure targeting', () => {
    expect(isGateWallTarget(wallsWithGate['10_5'], false)).toBe(true);
    expect(isGateWallTarget(wallsWithGate['10_5'], true)).toBe(false);
    expect(isStructureWallTarget(wallsWithGate['10_5'])).toBe(false);
    expect(isStructureWallTarget(wallsWithGate['11_5'])).toBe(true);
  });
});
