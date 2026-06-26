import { describe, it, expect } from 'vitest';
import {
  isInGateZone, isInCoreZone, isInWallZone, isNearStructure, isRoleInZone,
  getFortressRoleDamageMult, cycleFortressRole, FORTRESS_ROLE_IDS,
  getDefaultFortressRole, getPortalCells, chebyshevDist, countDeployedRoleBonus,
} from '../src/roster/heroRoles.js';

describe('heroRoles', () => {
  const portalCells = [{ col: 0, row: 15 }];
  const goal = { col: 24, row: 15 };
  const wallData = { '23_15': { hp: 100, maxHp: 100 } };
  const ctx = { portalCells, wallData, goal, towers: [{ type: 'runeshrine', col: 22, row: 15 }] };

  it('detects gate zone', () => {
    expect(isInGateZone(1, 15, portalCells)).toBe(true);
    expect(isInGateZone(10, 15, portalCells)).toBe(false);
  });

  it('detects core and wall zones', () => {
    expect(isInCoreZone(24, 15, goal)).toBe(true);
    expect(isInWallZone(23, 15, wallData, goal)).toBe(true);
    expect(isNearStructure(22, 15, ctx.towers)).toBe(true);
  });

  it('portal cells and chebyshev distance', () => {
    expect(getPortalCells({ col: 0, row: 1 }, [{ col: 5, row: 5 }])).toHaveLength(2);
    expect(chebyshevDist(0, 0, 3, 4)).toBe(4);
  });

  it('default role by class', () => {
    expect(getDefaultFortressRole('valkyrie')).toBe('wallkeeper');
    expect(getDefaultFortressRole('unknown')).toBe('gatekeeper');
  });

  it('role zone checks', () => {
    expect(isRoleInZone('gatekeeper', 1, 15, ctx)).toBe(true);
    expect(isRoleInZone('wallkeeper', 23, 15, ctx)).toBe(true);
    expect(isRoleInZone('scout', 22, 15, ctx)).toBe(true);
    expect(isRoleInZone('quartermaster', 24, 15, ctx)).toBe(true);
    expect(isRoleInZone('rune_keeper', 22, 15, ctx)).toBe(true);
    expect(isRoleInZone('chieftain_hunter', 10, 10, ctx)).toBe(true);
    expect(isRoleInZone('bogus', 0, 0, ctx)).toBe(false);
  });

  it('gatekeeper bonus in zone', () => {
    const def = { fortressRole: 'gatekeeper' };
    expect(getFortressRoleDamageMult(def, 1, 15, ctx)).toBeGreaterThan(1);
    expect(getFortressRoleDamageMult(def, 20, 15, ctx)).toBe(1);
    expect(getFortressRoleDamageMult({ fortressRole: 'chieftain_hunter' }, 10, 10, { ...ctx, targetIsBoss: true })).toBe(1.20);
  });

  it('cycles through all roles', () => {
    let r = FORTRESS_ROLE_IDS[0];
    for (let i = 0; i < FORTRESS_ROLE_IDS.length; i++) {
      r = cycleFortressRole(r);
    }
    expect(r).toBe(FORTRESS_ROLE_IDS[0]);
    expect(cycleFortressRole('invalid')).toBe(FORTRESS_ROLE_IDS[0]);
  });

  it('counts deployed role bonus', () => {
    const towers = [{ type: 'berserk', defenderId: 'd1' }];
    const roster = [{ defenderId: 'd1', fortressRole: 'gatekeeper' }];
    expect(countDeployedRoleBonus(towers, roster, 'gatekeeper')).toBe(1);
    expect(countDeployedRoleBonus(towers, roster, 'scout')).toBe(0);
  });
});
