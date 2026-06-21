import { describe, it, expect } from 'vitest';
import { Defender, careerLevelFromXP, careerBonusForLevel, CAREER_XP, XP_PER_KILL, XP_PER_WAVE } from '../src/roster/defender.js';
import { Roster } from '../src/roster/roster.js';

// ── Defender ─────────────────────────────────────────────────────────────────

describe('careerLevelFromXP', () => {
  it('returns 0 for 0 XP', () => {
    expect(careerLevelFromXP(0)).toBe(0);
  });

  it('reaches level 1 at the first threshold', () => {
    expect(careerLevelFromXP(CAREER_XP[1])).toBe(1);
  });

  it('returns max level at or above the last threshold', () => {
    const max = CAREER_XP.length - 1;
    expect(careerLevelFromXP(CAREER_XP[max])).toBe(max);
    expect(careerLevelFromXP(CAREER_XP[max] + 9999)).toBe(max);
  });

  it('does not advance level below threshold', () => {
    expect(careerLevelFromXP(CAREER_XP[1] - 1)).toBe(0);
  });
});

describe('careerBonusForLevel', () => {
  it('returns 1.0 multipliers for level 0', () => {
    const b = careerBonusForLevel(0);
    expect(b.dm).toBe(1.0);
    expect(b.rm).toBe(1.0);
    expect(b.cm).toBe(1.0);
  });

  it('applies the level-3 milestone bonus', () => {
    const b = careerBonusForLevel(3);
    expect(b.dm).toBeGreaterThan(1.0);
  });

  it('level 10 bonus exceeds level 5 bonus', () => {
    expect(careerBonusForLevel(10).dm).toBeGreaterThan(careerBonusForLevel(5).dm);
  });
});

describe('Defender', () => {
  it('constructs with zeroed stats', () => {
    const d = new Defender({ defenderId: 'abc', name: 'Ulfr', type: 'berserk' });
    expect(d.xp).toBe(0);
    expect(d.careerLevel).toBe(0);
    expect(d.careerKills).toBe(0);
    expect(d.battlesPlayed).toBe(0);
    expect(d.deployed).toBe(false);
  });

  it('grants correct XP after a battle', () => {
    const d = new Defender({ defenderId: 'x', name: 'Ragnar', type: 'berserk' });
    const earned = d.grantBattleXP(5, 20);
    expect(earned).toBe(5 * XP_PER_KILL + 20 * XP_PER_WAVE);
    expect(d.xp).toBe(earned);
    expect(d.careerKills).toBe(5);
    expect(d.battlesPlayed).toBe(1);
  });

  it('accumulates XP across multiple battles', () => {
    const d = new Defender({ defenderId: 'y', name: 'Björn', type: 'berserk' });
    d.grantBattleXP(3, 10);
    d.grantBattleXP(4, 15);
    expect(d.battlesPlayed).toBe(2);
    expect(d.careerKills).toBe(7);
  });

  it('career level increases when XP crosses threshold', () => {
    const d = new Defender({ defenderId: 'z', name: 'Ivar', type: 'berserk' });
    // Grant enough XP to exceed level 1 threshold
    d.grantBattleXP(0, CAREER_XP[1] / XP_PER_WAVE);
    expect(d.careerLevel).toBeGreaterThanOrEqual(1);
  });

  it('round-trips through toJSON / fromJSON', () => {
    const d = new Defender({ defenderId: 'r1', name: 'Sigurd', type: 'valkyrie' });
    d.grantBattleXP(10, 30);
    const copy = Defender.fromJSON(d.toJSON());
    expect(copy.defenderId).toBe(d.defenderId);
    expect(copy.name).toBe(d.name);
    expect(copy.xp).toBe(d.xp);
    expect(copy.careerLevel).toBe(d.careerLevel);
    expect(copy.careerKills).toBe(d.careerKills);
    expect(copy.battlesPlayed).toBe(d.battlesPlayed);
  });
});

// ── Roster ────────────────────────────────────────────────────────────────────

describe('Roster', () => {
  it('starts empty', () => {
    const r = new Roster();
    expect(r.defenders).toHaveLength(0);
  });

  it('loads defenders from serialized data', () => {
    const r = new Roster();
    const d = new Defender({ defenderId: 'a1', name: 'Ulfr', type: 'berserk' });
    r.load([d.toJSON()]);
    expect(r.defenders).toHaveLength(1);
    expect(r.defenders[0].name).toBe('Ulfr');
  });

  it('link() creates a new defender when none available', () => {
    const r = new Roster();
    const def = r.link('berserk', 'id-1', 'Gunnar');
    expect(def.type).toBe('berserk');
    expect(def.deployed).toBe(true);
    expect(r.defenders).toHaveLength(1);
  });

  it('link() reuses an undeployed veteran of the same class', () => {
    const r = new Roster();
    const veteran = new Defender({ defenderId: 'vet-1', name: 'Halfdan', type: 'berserk' });
    veteran.xp = CAREER_XP[3];
    veteran.careerLevel = 3;
    r.defenders.push(veteran);

    const def = r.link('berserk', 'new-id', 'Orm');
    expect(def.defenderId).toBe('vet-1');  // reused the veteran
    expect(def.name).toBe('Halfdan');
    expect(def.deployed).toBe(true);
  });

  it('link() creates a new defender when existing one is already deployed', () => {
    const r = new Roster();
    r.link('berserk', 'id-1', 'Ulfr');
    const second = r.link('berserk', 'id-2', 'Björn');
    expect(second.defenderId).toBe('id-2'); // new recruit, not reuse
    expect(r.defenders).toHaveLength(2);
  });

  it('releaseAll() marks all defenders as undeployed', () => {
    const r = new Roster();
    r.link('berserk', 'id-1', 'Ulfr');
    r.link('valkyrie', 'id-2', 'Sigrid');
    r.releaseAll();
    expect(r.defenders.every(d => !d.deployed)).toBe(true);
  });

  it('grantBattleXP() credits towers to matched defenders', () => {
    const r = new Roster();
    const def = r.link('berserk', 'id-x', 'Orm');
    const fakeTower = { defenderId: 'id-x', killCount: 7, damageDealt: 100 };
    r.grantBattleXP([fakeTower], 25);
    expect(def.careerKills).toBe(7);
    expect(def.careerDamage).toBe(100);
    expect(def.battlesPlayed).toBe(1);
  });

  it('grantBattleXP() ignores towers with no matching defender', () => {
    const r = new Roster();
    const fakeTower = { defenderId: 'no-match', killCount: 5, damageDealt: 50 };
    expect(() => r.grantBattleXP([fakeTower], 10)).not.toThrow();
  });

  it('toJSON() round-trips through load()', () => {
    const r1 = new Roster();
    r1.link('military', 'id-m', 'Leif');
    r1.defenders[0].grantBattleXP(12, 40);

    const r2 = new Roster();
    r2.load(r1.toJSON());
    expect(r2.defenders[0].name).toBe('Leif');
    expect(r2.defenders[0].careerKills).toBe(12);
    expect(r2.defenders[0].battlesPlayed).toBe(1);
  });
});
