import { describe, it, expect } from 'vitest';
import { drawCampaignWarCampBriefing, isSimplifiedWarCamp, buildWarCampStatusLines, buildWarCampBondLines, shouldPulseWarCampTab, getWarCampTabHint, formatWarCampBondLine } from '../src/ui/warCampPanel.js';
import { mockCtx } from './canvasMock.js';

describe('warCampPanel', () => {
  it('simplifies UI on First Saga map 0', () => {
    expect(isSimplifiedWarCamp(0)).toBe(true);
    expect(isSimplifiedWarCamp(1)).toBe(false);
  });

  it('drawCampaignWarCampBriefing renders next assault CTA', () => {
    const ctx = mockCtx();
    const btns = [];
    expect(() => drawCampaignWarCampBriefing(ctx, { x: 20, y: 40, w: 280, h: 400 }, {
      defenderNames: ['Sverker'],
      defenderCount: 1,
      nextAssault: {
        codename: 'Wolf Smoke',
        tierLabel: 'A1',
        frontLabel: 'West',
        waveCount: 2,
        nodeIndex: 1,
        isRetry: false,
      },
      goldReserve: 34,
      chronicleProse: 'The warband held the west gate.',
      statusLines: [],
    }, btns)).not.toThrow();
    expect(btns.some(b => b.action === 'nextAssault')).toBe(true);
    expect(btns.some(b => b.action === 'commandMap')).toBe(true);
  });

  it('drawCampaignWarCampBriefing shows retry assault action', () => {
    const ctx = mockCtx();
    const btns = [];
    drawCampaignWarCampBriefing(ctx, { x: 20, y: 40, w: 280, h: 400 }, {
      defenderNames: ['A', 'B', 'C', 'D'],
      defenderCount: 5,
      nextAssault: {
        codename: 'Ash Gate', tierLabel: 'A0', frontLabel: 'West',
        waveCount: 1, nodeIndex: 0, isRetry: true,
      },
      goldReserve: 12,
      chronicleProse: 'A long chronicle line that should wrap across multiple rows when rendered.',
      statusLines: [{ text: 'Scar on west gate', color: '#A93226' }],
    }, btns);
    expect(btns.some(b => b.action === 'retryAssault')).toBe(true);
  });

  it('handles secured region without next assault', () => {
    const ctx = mockCtx();
    const btns = [];
    expect(() => drawCampaignWarCampBriefing(ctx, { x: 0, y: 0, w: 300, h: 400 }, {
      defenderNames: [],
      defenderCount: 0,
      nextAssault: null,
      goldReserve: 0,
      statusLines: [],
    }, btns)).not.toThrow();
  });

  it('buildWarCampStatusLines covers scar, wood, and upgrade', () => {
    const lines = buildWarCampStatusLines(
      { westGateScarred: true, westGateRepaired: false, wood: 15 },
      { fortressUpgrade: { label: 'Barracks', nextLevel: 2, cost: 40 } },
    );
    expect(lines.some(l => l.text.includes('scarred'))).toBe(true);
    expect(lines.some(l => l.text.includes('Repair'))).toBe(true);
    expect(lines.some(l => l.text.includes('Barracks'))).toBe(true);
    expect(buildWarCampStatusLines({ westGateRepaired: true })[0].text).toMatch(/patch/);
  });

  it('tab pulse helpers for simplified War Camp', () => {
    expect(shouldPulseWarCampTab('recruit', 'recruit')).toBe(true);
    expect(shouldPulseWarCampTab('fortress', 'recruit')).toBe(false);
    expect(getWarCampTabHint('recruit')).toMatch(/RECRUIT/);
  });

  it('buildWarCampBondLines formats active bonds', () => {
    const bonds = [
      { name: 'Shield-Brothers', defenderIds: ['a', 'b'] },
      { defenderIds: ['c', 'd'] },
    ];
    const names = { a: 'Erik', b: 'Saga', c: 'Ulfr', d: 'Gunnar' };
    const lines = buildWarCampBondLines(bonds, names);
    expect(lines[0].text).toMatch(/Shield-Brothers/);
    expect(formatWarCampBondLine(bonds[1], names)).toMatch(/Ulfr & Gunnar/);
    expect(buildWarCampBondLines([], names)).toEqual([]);
  });
});
