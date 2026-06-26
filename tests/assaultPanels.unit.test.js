import { describe, it, expect } from 'vitest';
import {
  getFieldUnitStatus, getHeroHpFrac, getStructureHpFrac,
  drawPanelHpBar, drawDeployedFieldCard,
} from '../src/ui/assaultPanels.js';
import { mockCtx } from './canvasMock.js';

describe('assaultPanels', () => {
  it('reports hero ready when cooldown is low', () => {
    const s = getFieldUnitStatus({ type: 'military', fireCooldown: 0, fireRate: 10 }, true);
    expect(s.label).toBe('READY');
  });

  it('computes hero HP fraction', () => {
    expect(getHeroHpFrac({ combatHp: 50, combatMaxHp: 100 })).toBe(0.5);
    expect(getHeroHpFrac({ combatMaxHp: 0 })).toBe(1);
    expect(getHeroHpFrac({ combatHp: -5, combatMaxHp: 100 })).toBe(0);
  });

  it('hero status branches', () => {
    expect(getFieldUnitStatus({ combatHp: 0 }, true).label).toBe('FALLEN');
    expect(getFieldUnitStatus({ type: 'hydda', healDone: 12 }, true).label).toMatch(/HEAL/);
    expect(getFieldUnitStatus({ type: 'hydda' }, true).label).toBe('SUPPORT');
    expect(getFieldUnitStatus({ fireCooldown: 5, fireRate: 10 }, true).label).toBe('ENGAGED');
    expect(getFieldUnitStatus({ fireCooldown: 8, fireRate: 10 }, true).label).toBe('RELOAD');
  });

  it('structure status branches', () => {
    expect(getFieldUnitStatus({ fireCooldown: 0, fireRate: 10 }, false).label).toBe('READY');
    expect(getFieldUnitStatus({ fireCooldown: 5, fireRate: 10 }, false).label).toBe('FIRING');
  });

  it('structure HP fraction', () => {
    expect(getStructureHpFrac({ structureHp: 50, structureMaxHp: 100 })).toBe(0.5);
    expect(getStructureHpFrac({ type: 'barracks', level: 1 }, null, () => 200)).toBe(1);
  });

  it('drawPanelHpBar and deployed card', () => {
    const ctx = mockCtx();
    expect(() => drawPanelHpBar(ctx, 0, 0, 80, 6, 0)).not.toThrow();
    expect(() => drawPanelHpBar(ctx, 0, 0, 80, 6, 0.95, '#2E7D32')).not.toThrow();
    expect(() => drawDeployedFieldCard(ctx, 0, 0, 120, 40, { type: 'berserk' }, {
      isHero: true, isSelected: true, label: 'Gunnar Longname', sublabel: 'Gate',
      hpFrac: 0.6, status: { label: 'READY', color: '#2E7D32' },
      drawMiniPortrait: () => {}, rightStat: '12',
    })).not.toThrow();
  });
});
