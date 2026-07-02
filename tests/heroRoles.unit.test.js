import { describe, it, expect } from 'vitest';
import {
  isInGateZone, isInCoreZone, isInWallZone, isNearStructure, isRoleInZone,
  getFortressRoleDamageMult, cycleFortressRole, FORTRESS_ROLE_IDS, FORTRESS_ROLES,
  getDefaultFortressRole, getPortalCells, chebyshevDist, countDeployedRoleBonus,
  isNearStructureOfTypes, isAdjacentToHero, getRoleSynergyDamageMult,
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

  describe('v2 roles (20 total)', () => {
    it('has 20 roles, all defined', () => {
      expect(FORTRESS_ROLE_IDS).toHaveLength(20);
      for (const id of FORTRESS_ROLE_IDS) {
        expect(FORTRESS_ROLES[id]).toBeDefined();
        expect(FORTRESS_ROLES[id].label).toBeTruthy();
      }
    });

    it('citadel_warden and field_surgeon are core-zone roles', () => {
      expect(isRoleInZone('citadel_warden', 24, 15, ctx)).toBe(true);
      expect(isRoleInZone('field_surgeon', 24, 15, ctx)).toBe(true);
      expect(isRoleInZone('citadel_warden', 0, 0, ctx)).toBe(false);
    });

    it('vanguard is only active outside every zone', () => {
      expect(isRoleInZone('vanguard', 1, 15, ctx)).toBe(false); // gate zone
      expect(isRoleInZone('vanguard', 24, 15, ctx)).toBe(false); // core zone
      expect(isRoleInZone('vanguard', 12, 12, ctx)).toBe(true); // no man's land
    });

    it('shield_brother detects an adjacent hero, ignoring self and structures', () => {
      const towers = [
        { type: 'berserk', col: 10, row: 10 },
        { type: 'valkyrie', col: 11, row: 10 },
        { type: 'runeshrine', col: 12, row: 10 },
      ];
      expect(isAdjacentToHero(10, 10, towers)).toBe(true);
      expect(isAdjacentToHero(20, 20, towers)).toBe(false);
    });

    it('siege_captain and miners_mate detect their structure types', () => {
      const towers = [{ type: 'catapult', col: 5, row: 5 }, { type: 'mine', col: 8, row: 8 }];
      expect(isNearStructureOfTypes(5, 6, towers, new Set(['catapult']))).toBe(true);
      expect(isNearStructureOfTypes(8, 9, towers, new Set(['mine']))).toBe(true);
      expect(isNearStructureOfTypes(5, 6, towers, new Set(['mine']))).toBe(false);
    });

    it('new roles grant a damage bonus in their zone', () => {
      expect(getFortressRoleDamageMult({ fortressRole: 'bulwark' }, 23, 15, ctx)).toBeGreaterThan(1);
      expect(getFortressRoleDamageMult({ fortressRole: 'vanguard' }, 12, 12, ctx)).toBeGreaterThan(1);
      expect(getFortressRoleDamageMult({ fortressRole: 'herald_breaker' }, 10, 10, ctx)).toBe(1);
      expect(getFortressRoleDamageMult({ fortressRole: 'herald_breaker' }, 10, 10, { ...ctx, targetIsBoss: true })).toBeGreaterThan(1);
    });

    it('"The Pass" synergy: gatekeeper gains a bonus near a deployed scout', () => {
      const towers = [
        { type: 'berserk', col: 1, row: 15, defenderId: 'gk' },
        { type: 'military', col: 2, row: 15, defenderId: 'sc' },
      ];
      const roster = { find: (id) => ({ gk: { defenderId: 'gk', fortressRole: 'gatekeeper' }, sc: { defenderId: 'sc', fortressRole: 'scout' } })[id] };
      const gate = roster.find('gk');
      expect(getRoleSynergyDamageMult(gate, 1, 15, { towers, roster })).toBeGreaterThan(1);
      expect(getRoleSynergyDamageMult({ fortressRole: 'wallkeeper' }, 23, 15, { towers, roster })).toBe(1);
    });
  });
});
