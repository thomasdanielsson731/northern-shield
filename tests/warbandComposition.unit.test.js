import { describe, it, expect } from 'vitest';
import {
  analyzeWarband, getRecommendedDeploy, getCompositionWarnings, applySquadPreset,
} from '../src/roster/warbandComposition.js';
import { getTraitModifiers } from '../src/roster/traitGameplay.js';

describe('warbandComposition', () => {
  it('analyzes role counts', () => {
    const a = analyzeWarband([
      { type: 'berserk' }, { type: 'valkyrie' }, { type: 'hydda' },
    ]);
    expect(a.counts.tank).toBe(1);
    expect(a.counts.st_dps).toBe(1);
    expect(a.counts.support).toBe(1);
  });

  it('recommends deploy count from portals', () => {
    expect(getRecommendedDeploy(1, false, 2)).toBe(4);
    expect(getRecommendedDeploy(3, true, 3)).toBeGreaterThanOrEqual(8);
  });

  it('warns on missing tank for multi-portal', () => {
    const a = analyzeWarband([{ type: 'military' }]);
    const w = getCompositionWarnings(a, 2, 2, false);
    expect(w.some(x => x.includes('tank'))).toBe(true);
  });

  it('applySquadPreset assigns fortress roles', () => {
    const defs = [{ type: 'berserk', fortressRole: null }];
    applySquadPreset('beginner', defs);
    expect(defs[0].fortressRole).toBe('gatekeeper');
  });
});

describe('traitGameplay', () => {
  it('reckless boosts dmg and lowers hp', () => {
    const m = getTraitModifiers({ trait: 'reckless' }, {});
    expect(m.dmgMult).toBeGreaterThan(1);
    expect(m.combatHpMult).toBeLessThan(1);
  });

  it('fearless boosts at gate', () => {
    const m = getTraitModifiers({ trait: 'fearless' }, { inGateZone: true });
    expect(m.dmgMult).toBeGreaterThan(1);
    expect(m.fearImmune).toBe(true);
  });
});
