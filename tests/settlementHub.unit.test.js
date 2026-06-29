import { describe, it, expect } from 'vitest';
import {
  HUB_BUILDINGS,
  hubRect,
  getHubBuildingAvailability,
  hubBuildingAction,
  getHubInstructionHint,
  drawSettlementHub,
} from '../src/settlement/settlementHub.js';
import { mockCtx } from './canvasMock.js';

describe('settlementHub', () => {
  it('defines hub buildings including war horn and halls', () => {
    const ids = HUB_BUILDINGS.map(b => b.id);
    expect(ids).toContain('command');
    expect(ids).toContain('warband');
    expect(ids).toContain('recruit');
    expect(ids).toContain('runeSmith');
  });

  it('hubRect maps normalized layout to pixels', () => {
    const r = hubRect(HUB_BUILDINGS[0], { x: 10, y: 20, w: 400, h: 300 });
    expect(r.x).toBeGreaterThan(10);
    expect(r.w).toBeGreaterThan(40);
  });

  it('locks barracks until settlement on first saga', () => {
    const avail = getHubBuildingAvailability('recruit', { simplifiedSaga: true, campaignState: {} });
    expect(avail.available).toBe(false);
    expect(avail.reason).toMatch(/Settlement/i);
  });

  it('includes skirmish arena building', () => {
    expect(HUB_BUILDINGS.some(b => b.id === 'skirmish')).toBe(true);
    expect(hubBuildingAction('skirmish')).toBe('openSkirmish');
  });

  it('maps building ids to actions', () => {
    expect(hubBuildingAction('command')).toBe('openCommandMap');
    expect(hubBuildingAction('warband')).toBe('openWarband');
  });

  it('drawSettlementHub registers clickable hotspots', () => {
    const ctx = mockCtx();
    const btns = [];
    drawSettlementHub(ctx, { x: 16, y: 50, w: 600, h: 400 }, {
      campaignState: {},
      chronicleCount: 2,
      battlesCompleted: 1,
      simplifiedSaga: true,
      nextAssault: { codename: 'Wolf Smoke' },
    }, btns);
    expect(btns.some(b => b.action === 'openCommandMap')).toBe(true);
    expect(btns.some(b => b.action === 'openWarband')).toBe(true);
  });

  it('instruction hint points new players to war horn', () => {
    const hint = getHubInstructionHint({ battlesCompleted: 0 });
    expect(hint.line).toMatch(/War Horn/i);
  });
});
