import { describe, it, expect } from 'vitest';
import { TRAIT_DEFS, RARE_TRAITS, LEGENDARY_TRAITS, getRandomTrait, getLegendaryTrait } from '../src/chronicle/chronicle.js';
import { getTraitModifiers } from '../src/roster/traitGameplay.js';

// ── Trait catalogue ───────────────────────────────────────────────────────────

describe('TRAIT_DEFS', () => {
  const ids = Object.keys(TRAIT_DEFS);

  it('has exactly 50 traits', () => expect(ids).toHaveLength(50));

  it('rarity distribution matches spec (18 positive, 12 negative, 14 rare, 6 legendary)', () => {
    const counts = { positive: 0, negative: 0, rare: 0, legendary: 0 };
    for (const t of Object.values(TRAIT_DEFS)) counts[t.rarity]++;
    expect(counts.positive).toBe(18);
    expect(counts.negative).toBe(12);
    expect(counts.rare).toBe(14);
    expect(counts.legendary).toBe(6);
  });

  it('every trait has id, label, desc, and rarity fields', () => {
    for (const [key, t] of Object.entries(TRAIT_DEFS)) {
      expect(t.id,     `${key}.id`).toBe(key);
      expect(t.label,  `${key}.label`).toBeTruthy();
      expect(t.desc,   `${key}.desc`).toBeTruthy();
      expect(['positive','negative','rare','legendary'], `${key}.rarity`).toContain(t.rarity);
    }
  });

  it('RARE_TRAITS array matches rare entries in TRAIT_DEFS', () => {
    const rareDefs = Object.keys(TRAIT_DEFS).filter(k => TRAIT_DEFS[k].rarity === 'rare');
    expect(RARE_TRAITS.sort()).toEqual(rareDefs.sort());
  });

  it('LEGENDARY_TRAITS array matches legendary entries in TRAIT_DEFS', () => {
    const legDefs = Object.keys(TRAIT_DEFS).filter(k => TRAIT_DEFS[k].rarity === 'legendary');
    expect(LEGENDARY_TRAITS.sort()).toEqual(legDefs.sort());
  });
});

// ── Trait selection ───────────────────────────────────────────────────────────

describe('getRandomTrait', () => {
  const CLASSES = ['berserk','valkyrie','military','catapult','drakship','piltorn','blondie','hydda','isjatten'];

  it('always returns a known trait ID', () => {
    for (const cls of CLASSES) {
      for (let i = 0; i < 20; i++) {
        const t = getRandomTrait(cls);
        expect(TRAIT_DEFS[t], `unknown trait "${t}" for class ${cls}`).toBeDefined();
      }
    }
  });

  it('never returns a legendary trait', () => {
    for (let i = 0; i < 200; i++) {
      const t = getRandomTrait('berserk');
      expect(TRAIT_DEFS[t].rarity).not.toBe('legendary');
    }
  });

  it('works for unknown class type (falls back to positive/negative pool)', () => {
    const t = getRandomTrait('unknown_class');
    expect(TRAIT_DEFS[t]).toBeDefined();
    expect(TRAIT_DEFS[t].rarity).not.toBe('legendary');
  });
});

describe('getLegendaryTrait', () => {
  it('returns a legendary trait ID', () => {
    const t = getLegendaryTrait();
    expect(TRAIT_DEFS[t].rarity).toBe('legendary');
  });

  it('returns the requested specific ID', () => {
    expect(getLegendaryTrait('jarlslayer')).toBe('jarlslayer');
  });

  it('falls back to random legendary for unknown specificId', () => {
    const t = getLegendaryTrait('not_real');
    expect(TRAIT_DEFS[t].rarity).toBe('legendary');
  });
});

// ── Trait gameplay modifiers ──────────────────────────────────────────────────

function def(trait, extra = {}) {
  return { trait, careerKills: extra.careerKills ?? 0, scars: extra.scars ?? [], ...extra };
}

describe('getTraitModifiers — output shape', () => {
  it('returns all expected fields with defaults for no-trait defender', () => {
    const out = getTraitModifiers({ trait: null });
    expect(out).toMatchObject({ dmgMult: 1, combatHpMult: 1, cdMult: 1, rangeMult: 1, goldPerWave: 0, fearImmune: false, bossDmgMult: 1 });
  });

  it('unknown trait returns defaults', () => {
    const out = getTraitModifiers(def('nonexistent_trait'));
    expect(out.dmgMult).toBe(1);
    expect(out.combatHpMult).toBe(1);
  });
});

describe('getTraitModifiers — positive traits', () => {
  it('steadfast: dmg bonus in wall zone only', () => {
    expect(getTraitModifiers(def('steadfast'), { inWallZone: true }).dmgMult).toBeGreaterThan(1);
    expect(getTraitModifiers(def('steadfast'), { inWallZone: false }).dmgMult).toBe(1);
  });

  it('hardy: combatHp bonus', () => {
    expect(getTraitModifiers(def('hardy')).combatHpMult).toBe(1.15);
  });

  it('swift: cdMult < 1 (fires faster)', () => {
    expect(getTraitModifiers(def('swift')).cdMult).toBeLessThan(1);
  });

  it('eagle_eyed: rangeMult > 1', () => {
    expect(getTraitModifiers(def('eagle_eyed')).rangeMult).toBeGreaterThan(1);
  });

  it('lucky: goldPerWave > 0', () => {
    expect(getTraitModifiers(def('lucky')).goldPerWave).toBeGreaterThan(0);
  });

  it('patient: dmg higher on wave 2+ than wave 1', () => {
    const w1 = getTraitModifiers(def('patient'), { waveInNode: 1 }).dmgMult;
    const w2 = getTraitModifiers(def('patient'), { waveInNode: 2 }).dmgMult;
    expect(w2).toBeGreaterThan(w1);
  });
});

describe('getTraitModifiers — negative traits', () => {
  it('wasteful: cdMult > 1 (fires slower)', () => {
    expect(getTraitModifiers(def('wasteful')).cdMult).toBeGreaterThan(1);
  });

  it('cowardly: dmg penalty when fortress has taken damage', () => {
    const clean = getTraitModifiers(def('cowardly'), { rampartsLostThisBattle: 0 }).dmgMult;
    const hurt  = getTraitModifiers(def('cowardly'), { rampartsLostThisBattle: 1 }).dmgMult;
    expect(hurt).toBeLessThan(clean);
  });

  it('reckless: higher dmg but lower hp', () => {
    const out = getTraitModifiers(def('reckless'));
    expect(out.dmgMult).toBeGreaterThan(1);
    expect(out.combatHpMult).toBeLessThan(1);
  });
});

describe('getTraitModifiers — rare traits', () => {
  it('veteran_trait: scales with careerKills (capped at +15%)', () => {
    const low  = getTraitModifiers(def('veteran_trait', { careerKills: 0 })).dmgMult;
    const mid  = getTraitModifiers(def('veteran_trait', { careerKills: 500 })).dmgMult;
    const high = getTraitModifiers(def('veteran_trait', { careerKills: 2000 })).dmgMult;
    expect(mid).toBeGreaterThan(low);
    expect(high).toBeLessThanOrEqual(1.15);
  });

  it('scar_bearer: scales with scar count (capped at +20%)', () => {
    const none = getTraitModifiers(def('scar_bearer', { scars: [] })).dmgMult;
    const four = getTraitModifiers(def('scar_bearer', { scars: ['a','b','c','d'] })).dmgMult;
    const many = getTraitModifiers(def('scar_bearer', { scars: ['a','b','c','d','e','f'] })).dmgMult;
    expect(four).toBeGreaterThan(none);
    expect(many).toBeLessThanOrEqual(1.20);
  });

  it('giant_bane: boss damage mult > 1', () => {
    expect(getTraitModifiers(def('giant_bane')).bossDmgMult).toBeGreaterThan(1);
  });

  it('iron_willed: fear immune + hp bonus', () => {
    const out = getTraitModifiers(def('iron_willed'));
    expect(out.fearImmune).toBe(true);
    expect(out.combatHpMult).toBeGreaterThan(1);
  });

  it('rune_touched: dmg + range bonus', () => {
    const out = getTraitModifiers(def('rune_touched'));
    expect(out.dmgMult).toBeGreaterThan(1);
    expect(out.rangeMult).toBeGreaterThan(1);
  });

  it('gate_singer: larger bonus in gate zone', () => {
    const gate = getTraitModifiers(def('gate_singer'), { inGateZone: true }).dmgMult;
    const open = getTraitModifiers(def('gate_singer'), { inGateZone: false }).dmgMult;
    expect(gate).toBeGreaterThan(open);
  });
});

describe('getTraitModifiers — legendary traits', () => {
  it('jarlslayer: bossDmgMult 1.25', () => {
    expect(getTraitModifiers(def('jarlslayer')).bossDmgMult).toBe(1.25);
  });

  it('einherjar: large hp bonus + fear immune', () => {
    const out = getTraitModifiers(def('einherjar'));
    expect(out.combatHpMult).toBe(1.25);
    expect(out.fearImmune).toBe(true);
  });

  it('world_tree_marked: both dmg and range bonus', () => {
    const out = getTraitModifiers(def('world_tree_marked'));
    expect(out.dmgMult).toBeGreaterThan(1);
    expect(out.rangeMult).toBeGreaterThan(1);
  });

  it('positive zone traits', () => {
    expect(getTraitModifiers(def('methodical')).cdMult).toBeLessThan(1);
    expect(getTraitModifiers(def('fearless'), { inGateZone: true }).dmgMult).toBe(1.10);
    expect(getTraitModifiers(def('guardian'), { inCoreZone: true }).combatHpMult).toBe(1.12);
    expect(getTraitModifiers(def('inspiring'), { inCoreZone: true }).dmgMult).toBe(1.08);
    expect(getTraitModifiers(def('builder'), { inWallZone: true }).dmgMult).toBe(1.10);
    expect(getTraitModifiers(def('tactician')).eventPreview).toBe(1);
    expect(getTraitModifiers(def('warmhearted')).goldPerWave).toBeGreaterThan(0);
    expect(getTraitModifiers(def('merciful')).goldPerWave).toBe(0.4);
    expect(getTraitModifiers(def('menders_touch')).combatHpMult).toBe(1.08);
    expect(getTraitModifiers(def('loyal')).dmgMult).toBe(1.08);
  });

  it('rare and legendary trait branches', () => {
    expect(getTraitModifiers(def('wolf_friend'), { inWallZone: true }).dmgMult).toBe(1.12);
    expect(getTraitModifiers(def('draugr_hunter')).dmgMult).toBe(1.10);
    expect(getTraitModifiers(def('frostborn')).combatHpMult).toBe(1.06);
    expect(getTraitModifiers(def('star_seeker')).goldPerWave).toBe(0.8);
    expect(getTraitModifiers(def('bond_forger')).dmgMult).toBe(1.06);
    expect(getTraitModifiers(def('quiet_leader'), { inCoreZone: true }).dmgMult).toBe(1.10);
    expect(getTraitModifiers(def('gate_singer'), { inGateZone: true }).dmgMult).toBe(1.15);
    expect(getTraitModifiers(def('quartermasters_eye')).goldPerWave).toBe(0.5);
    expect(getTraitModifiers(def('stubborn')).combatHpMult).toBe(1.20);
    expect(getTraitModifiers(def('lone_wolf')).dmgMult).toBe(1.06);
  });

  it('negative trait branches', () => {
    expect(getTraitModifiers(def('greedy')).combatHpMult).toBeLessThan(1);
    expect(getTraitModifiers(def('hotheaded')).dmgMult).toBe(1.10);
    expect(getTraitModifiers(def('suspicious')).fearImmune).toBe(true);
    expect(getTraitModifiers(def('lone_wolf')).dmgMult).toBe(1.06);
  });

  it('devout and serene traits', () => {
    expect(getTraitModifiers(def('devout'), { inCoreZone: true }).dmgMult).toBe(1.05);
    const serene = getTraitModifiers(def('serene'));
    expect(serene.fearImmune).toBe(true);
    expect(serene.dmgMult).toBe(0.95);
  });

  it('context-sensitive negative traits', () => {
    expect(getTraitModifiers(def('impulsive'), { waveInNode: 1 }).dmgMult).toBe(1.10);
    expect(getTraitModifiers(def('vengeful'), { vengeanceActive: true }).dmgMult).toBe(1.18);
    expect(getTraitModifiers(def('brooding'), { livesFull: true }).dmgMult).toBe(0.95);
    expect(getTraitModifiers(def('proud'), { rampartsLostThisBattle: 1 }).dmgMult).toBe(0.90);
    expect(getTraitModifiers(def('bitter'), { rampartsLostThisBattle: 2 }).dmgMult).toBe(1.10);
  });

  it('legendary aliases and economy traits', () => {
    expect(getTraitModifiers(def('chieftain_hunter')).bossDmgMult).toBe(1.25);
    const saga = getTraitModifiers(def('saga_bound'));
    expect(saga.goldPerWave).toBe(1.0);
    expect(getTraitModifiers(def('fate_touched')).combatHpMult).toBe(1.15);
  });
});
