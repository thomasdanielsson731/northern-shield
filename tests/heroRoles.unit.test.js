import { describe, it, expect } from 'vitest';
import {
  isInGateZone, getFortressRoleDamageMult, cycleFortressRole, FORTRESS_ROLE_IDS,
} from '../src/roster/heroRoles.js';

describe('heroRoles', () => {
  const portalCells = [{ col: 0, row: 15 }];
  const goal = { col: 24, row: 15 };
  const wallData = { '23_15': { hp: 100, maxHp: 100 } };

  it('detects gate zone', () => {
    expect(isInGateZone(1, 15, portalCells)).toBe(true);
    expect(isInGateZone(10, 15, portalCells)).toBe(false);
  });

  it('gatekeeper bonus in zone', () => {
    const def = { fortressRole: 'gatekeeper' };
    const ctx = { portalCells, wallData, goal, towers: [] };
    expect(getFortressRoleDamageMult(def, 1, 15, ctx)).toBeGreaterThan(1);
    expect(getFortressRoleDamageMult(def, 20, 15, ctx)).toBe(1);
  });

  it('cycles through all roles', () => {
    let r = FORTRESS_ROLE_IDS[0];
    for (let i = 0; i < FORTRESS_ROLE_IDS.length; i++) {
      r = cycleFortressRole(r);
    }
    expect(r).toBe(FORTRESS_ROLE_IDS[0]);
  });
});
