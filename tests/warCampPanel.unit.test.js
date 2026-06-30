import { describe, it, expect } from 'vitest';
import {
  drawCampaignWarCampBriefing,
  isSimplifiedWarCamp,
  buildWarCampStatusLines,
  buildWarCampBondLines,
  shouldPulseWarCampTab,
  getWarCampTabHint,
  formatWarCampBondLine,
  getWarCampObjectives,
  getWarCampInstructionHint,
  getWarCampTabGuidance,
  drawWarCampBottomBar,
} from '../src/ui/warCampPanel.js';
import { mockCtx } from './canvasMock.js';

describe('warCampPanel', () => {
  it('simplifies UI on First Saga map 0', () => {
    expect(isSimplifiedWarCamp(0)).toBe(true);
    expect(isSimplifiedWarCamp(1)).toBe(false);
  });

  it('drawCampaignWarCampBriefing renders briefing without embedded CTA', () => {
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
      chronicleCount: 2,
      statusLines: [],
    }, btns)).not.toThrow();
    expect(btns.some(b => b.action === 'openChronicle')).toBe(true);
    expect(btns.some(b => b.action === 'nextAssault')).toBe(false);
  });

  it('drawWarCampBottomBar places prepare fortress CTA bottom right', () => {
    const ctx = mockCtx();
    const btns = [];
    drawWarCampBottomBar(ctx, { baseW: 800, baseH: 600, frameThick: 16 }, {
      tabPulseTarget: null,
      activeTab: 'warband',
      nextAssault: {
        codename: 'Wolf Smoke',
        tierLabel: 'A1',
        nodeIndex: 1,
        isRetry: false,
      },
    }, btns);
    const primary = btns.find(b => b.action === 'nextAssault');
    const map = btns.find(b => b.action === 'commandMap');
    expect(primary).toBeTruthy();
    expect(primary.x).toBeGreaterThan(500);
    expect(map).toBeTruthy();
    expect(map.x).toBeLessThan(200);
  });

  it('drawWarCampBottomBar shows retry assault action', () => {
    const ctx = mockCtx();
    const btns = [];
    drawWarCampBottomBar(ctx, { baseW: 800, baseH: 600, frameThick: 16 }, {
      tabPulseTarget: null,
      activeTab: 'warband',
      nextAssault: {
        codename: 'Ash Gate', tierLabel: 'A0', nodeIndex: 0, isRetry: true,
      },
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

  it('buildWarCampStatusLines covers fortress upgrade hint', () => {
    const lines = buildWarCampStatusLines(
      {},
      { fortressUpgrade: { label: 'Barracks', nextLevel: 2, cost: 40 } },
    );
    expect(lines.some(l => l.text.includes('Barracks'))).toBe(true);
    expect(buildWarCampStatusLines({})).toEqual([]);
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

  it('war camp objectives point to prepare fortress', () => {
    const base = {
      tabPulseTarget: null,
      activeTab: 'warband',
      nextAssault: { codename: 'Wolf Smoke' },
      equipmentCount: 0,
    };
    const steps = getWarCampObjectives(base);
    expect(steps.find(s => s.id === 'prep')?.active).toBe(true);
    expect(getWarCampInstructionHint(base)?.title).toBe('NEXT STEP');
    expect(getWarCampTabGuidance(base).line).toMatch(/PREPARE FORTRESS bottom right/i);
  });

  it('war camp objectives pulse recruit tab', () => {
    const state = { tabPulseTarget: 'recruit', activeTab: 'warband', nextAssault: null };
    expect(getWarCampObjectives(state)[0].id).toBe('recruit');
    expect(getWarCampTabGuidance({ ...state, tabPulseTarget: 'recruit' }).tab).toBe('recruit');
  });

  it('instruction hint prioritizes chronicle unread and victory home copy', () => {
    expect(getWarCampInstructionHint({ chronicleUnread: true })?.urgent).toBe(true);
    const home = getWarCampInstructionHint({
      tabPulseTarget: null,
      activeTab: 'warband',
      nextAssault: { codename: 'Wolf Smoke' },
      isVictory: true,
    });
    expect(home?.title).toBe('WAR CAMP');
    expect(home?.line).toMatch(/Victory/i);
  });

  it('drawWarCampBottomBar buildingOnly shows return to town only', () => {
    const ctx = mockCtx();
    const btns = [];
    const result = drawWarCampBottomBar(ctx, { baseW: 800, baseH: 600, frameThick: 12 }, {
      buildingOnly: true,
    }, btns);
    expect(result.primary?.action).toBe('returnToSettlement');
    expect(btns).toHaveLength(1);
    expect(btns[0].action).toBe('returnToSettlement');
  });
});
