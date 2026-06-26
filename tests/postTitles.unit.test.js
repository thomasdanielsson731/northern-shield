import { describe, it, expect } from 'vitest';
import {
  getDefenderPromotionTitle,
  getPreferredPostId,
  getPreferredPostLabel,
  getSkaldPostCounsel,
  formatDefenderPostBadge,
  postIdForDefender,
} from '../src/roster/postTitles.js';

describe('postTitles', () => {
  const posts = { west_gate: { defenderId: 'd1' }, watch_tower: { defenderId: 'd2' } };

  it('maps defender to post', () => {
    expect(postIdForDefender('d1', posts)).toBe('west_gate');
    expect(postIdForDefender('missing', posts)).toBeNull();
  });

  it('promotion title at gate', () => {
    expect(getDefenderPromotionTitle('d1', posts)).toBe('Gate Captain');
    expect(getDefenderPromotionTitle('d2', posts)).toBe('Eagle of the Tower');
  });

  it('preferred post by class', () => {
    expect(getPreferredPostId('valkyrie')).toBe('watch_tower');
    expect(getPreferredPostLabel('berserk')).toBe('West Gate');
  });

  it('skald counsel for match and mismatch', () => {
    const gunnar = { name: 'Gunnar', type: 'berserk' };
    const skadi = { name: 'Skadi', type: 'valkyrie' };
    expect(getSkaldPostCounsel(gunnar, 'west_gate')).toMatch(/belongs/);
    expect(getSkaldPostCounsel(skadi, 'west_gate')).toMatch(/fights best/);
  });

  it('badge shows title or preferred arrow', () => {
    expect(formatDefenderPostBadge({ defenderId: 'd1', type: 'berserk' }, posts)).toBe('Gate Captain');
    expect(formatDefenderPostBadge({ defenderId: 'x', type: 'berserk' }, posts)).toMatch(/^→/);
  });
});
