import { describe, it, expect } from 'vitest';
import {
  buildEquipmentBonuses,
  defenderHasRuneSocket,
  syncTowerDefenderGear,
  canAddEquipment,
  MAX_EQUIPMENT_INVENTORY,
} from '../src/roster/defenderGear.js';
import { Defender } from '../src/roster/defender.js';
import { Tower } from '../src/entities/tower.js';

describe('defenderGear', () => {
  it('stacks equipment multipliers', () => {
    const def = new Defender({ defenderId: 'd1', name: 'Test', type: 'berserk' });
    def.equipment = ['frost_crystal', 'iron_mantle'];
    const bonuses = buildEquipmentBonuses(def);
    expect(bonuses.dm).toBeCloseTo(1.12 * 1.10, 5);
    expect(bonuses.cm).toBeCloseTo(0.96, 5);
  });

  it('applies armory damage multiplier to equipment only', () => {
    const def = new Defender({ defenderId: 'd1', name: 'Test', type: 'berserk' });
    def.equipment = ['frost_crystal', null];
    const bonuses = buildEquipmentBonuses(def, 1.1);
    expect(bonuses.dm).toBeCloseTo(1.12 * 1.1, 5);
    expect(bonuses.rm).toBe(1);
  });

  it('detects rune sockets on legendary gear', () => {
    const def = new Defender({ defenderId: 'd1', name: 'Test', type: 'berserk' });
    expect(defenderHasRuneSocket(def)).toBe(false);
    def.equipment = ['mjolnir_shard', null];
    expect(defenderHasRuneSocket(def)).toBe(true);
  });

  it('syncTowerDefenderGear applies equipment and runes', () => {
    const def = new Defender({ defenderId: 'd1', name: 'Björn', type: 'berserk' });
    def.equipment = ['skadi_blade', null];
    const tower = new Tower(32, 32, 1, 1, 'berserk');
    tower.setRune('ironEdge');
    syncTowerDefenderGear(tower, def);
    const withoutRune = new Tower(32, 32, 1, 1, 'berserk');
    syncTowerDefenderGear(withoutRune, def);
    expect(tower.damage).toBeGreaterThan(withoutRune.damage);
    expect(tower.rune).toBe('ironEdge');
  });

  it('returns item rune when socket item is removed', () => {
    const def = new Defender({ defenderId: 'd1', name: 'Test', type: 'berserk' });
    def.equipment = ['mjolnir_shard', null];
    const tower = new Tower(32, 32, 1, 1, 'berserk');
    tower.setItemRune('battleHymn');
    def.equipment = [null, null];
    const { returnedItemRune } = syncTowerDefenderGear(tower, def);
    expect(returnedItemRune).toBe('battleHymn');
    expect(tower.itemRune).toBeNull();
  });

  it('caps equipment inventory size', () => {
    const inv = new Array(MAX_EQUIPMENT_INVENTORY).fill('frost_crystal');
    expect(canAddEquipment(inv)).toBe(false);
    expect(canAddEquipment(inv.slice(0, -1))).toBe(true);
  });
});
