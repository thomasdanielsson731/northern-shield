import { describe, it, expect } from 'vitest';
import { trimDmgFloaters, MAX_DMG_FLOATERS } from '../src/combat/combatCaps.js';

describe('combatCaps', () => {
  it('trims oldest floaters', () => {
    const f = Array.from({ length: 100 }, (_, i) => ({ id: i }));
    trimDmgFloaters(f);
    expect(f.length).toBe(MAX_DMG_FLOATERS);
    expect(f[0].id).toBe(20);
  });
});
