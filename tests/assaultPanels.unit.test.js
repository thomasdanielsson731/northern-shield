import { describe, it, expect } from 'vitest';
import { getFieldUnitStatus, getHeroHpFrac } from '../src/ui/assaultPanels.js';

describe('assaultPanels', () => {
  it('reports hero ready when cooldown is low', () => {
    const s = getFieldUnitStatus({ type: 'military', fireCooldown: 0, fireRate: 10 }, true);
    expect(s.label).toBe('READY');
  });

  it('computes hero HP fraction', () => {
    expect(getHeroHpFrac({ combatHp: 50, combatMaxHp: 100 })).toBe(0.5);
  });
});
