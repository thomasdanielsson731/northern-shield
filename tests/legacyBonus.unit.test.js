import { describe, it, expect } from 'vitest';
import { formatLegacyBonusLine, formatLegacyBadge, hasLegacyBonus } from '../src/roster/legacyBonus.js';

describe('legacyBonus', () => {
  const bonus = { fromName: 'Erik', fromRank: 'Veteran', stat: 'dm', value: 0.08 };

  it('formats roster and badge lines', () => {
    expect(formatLegacyBonusLine(bonus)).toBe("✦ Erik's Legacy: +8% DMG");
    expect(formatLegacyBadge(bonus)).toBe('✦ Erik');
    expect(hasLegacyBonus({ legacyBonus: bonus })).toBe(true);
    expect(formatLegacyBonusLine(null)).toBeNull();
  });

  it('handles range and cooldown stats', () => {
    expect(formatLegacyBonusLine({ fromName: 'Saga', stat: 'rm' })).toMatch(/RNG/);
    expect(formatLegacyBonusLine({ fromName: 'Gunnar', stat: 'cd' })).toMatch(/CD/);
  });
});
