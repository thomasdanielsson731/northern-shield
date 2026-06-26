import { describe, it, expect } from 'vitest';
import {
  getSagaDebriefProse,
  getSagaDebriefTitle,
  buildFortressDamageReport,
  formatDebriefCompactStats,
} from '../src/campaign/debriefReport.js';
import {
  getDefenderPromotionTitle,
  getPreferredPostLabel,
  getSkaldPostCounsel,
  formatDefenderPostBadge,
} from '../src/roster/postTitles.js';

describe('debriefReport', () => {
  it('returns saga prose with hero name', () => {
    const p = getSagaDebriefProse(0, true, { gateHeroName: 'Gunnar' });
    expect(p).toContain('Gunnar');
    expect(p).toMatch(/fire still burns/i);
  });

  it('returns defeat teach line for A0', () => {
    expect(getSagaDebriefProse(0, false, {})).toMatch(/gate is the kingdom/i);
  });

  it('prefers chronicle prose when provided', () => {
    expect(getSagaDebriefProse(1, true, { chronicleProse: 'Custom entry.' })).toBe('Custom entry.');
  });

  it('builds west gate damage report with scar', () => {
    const report = buildFortressDamageReport(
      { '19_15': { isGate: true, hp: 40, maxHp: 100 } },
      { westGateScarred: true, westGateRepaired: false, wood: 15 },
      { goal: { col: 24, row: 15 }, ringR: 5, frontId: 'west' },
    );
    expect(report.gateHpPct).toBe(40);
    expect(report.scarred).toBe(true);
    expect(report.lines.some(l => l.label === 'SCAR')).toBe(true);
    expect(report.lines.some(l => l.label === 'TIMBER')).toBe(true);
  });

  it('formats compact debrief stats', () => {
    const s = formatDebriefCompactStats({
      waveNumber: 2, waveTotal: 2, slain: 40, goldEarned: 80, lives: 18, maxLives: 20, mvpName: 'Gunnar',
    });
    expect(s).toContain('2/2 waves');
    expect(s).toContain('MVP Gunnar');
  });

  it('titles assault nodes', () => {
    expect(getSagaDebriefTitle(2)).toBe('Splinter');
  });
});

describe('postTitles', () => {
  it('assigns Gate Captain on west gate', () => {
    const title = getDefenderPromotionTitle('d1', { west_gate: { defenderId: 'd1' } });
    expect(title).toBe('Gate Captain');
  });

  it('suggests preferred post per class', () => {
    expect(getPreferredPostLabel('valkyrie')).toMatch(/Watch Tower/i);
  });

  it('skald praises matching post', () => {
    const line = getSkaldPostCounsel(
      { name: 'Gunnar', type: 'berserk' },
      'west_gate',
    );
    expect(line).toMatch(/belongs at the West Gate/i);
  });

  it('badge shows title when posted', () => {
    const badge = formatDefenderPostBadge(
      { defenderId: 'd1', type: 'berserk', name: 'Gunnar' },
      { west_gate: { defenderId: 'd1' } },
    );
    expect(badge).toBe('Gate Captain');
  });
});
