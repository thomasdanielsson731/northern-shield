import { describe, it, expect } from 'vitest';
import {
  HUB_BUILDINGS,
  hubRect,
  getHubBuildingAvailability,
  hubBuildingAction,
  getHubInstructionHint,
  drawSettlementHub,
} from '../src/settlement/settlementHub.js';
import { getHubBuildingMilestone } from '../src/settlement/hubMilestones.js';
import { mockCtx } from './canvasMock.js';

describe('settlementHub', () => {
  it('defines hub buildings including assaults emblem and halls', () => {
    const ids = HUB_BUILDINGS.map(b => b.id);
    expect(ids).toContain('command');
    expect(ids).toContain('warband');
    expect(ids).toContain('recruit');
    expect(ids).toContain('runeSmith');
  });

  it('hubRect maps assault emblem into left wilds', () => {
    const command = HUB_BUILDINGS.find(b => b.id === 'command');
    const r = hubRect(command, { x: 10, y: 20, w: 400, h: 300 });
    expect(r.x).toBeLessThan(30);
    expect(r.w).toBeGreaterThanOrEqual(35);
    const hall = hubRect(HUB_BUILDINGS.find(b => b.id === 'warband'), { x: 10, y: 20, w: 400, h: 300 });
    expect(r.x + r.w).toBeLessThan(hall.x + hall.w * 0.35);
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

  it('instruction hint points new players to assaults emblem', () => {
    const hint = getHubInstructionHint({ battlesCompleted: 0 });
    expect(hint.line).toMatch(/Assaults emblem/i);
  });

  it('getHubInstructionHint prioritizes chronicle unread', () => {
    const hint = getHubInstructionHint({ chronicleUnread: true, battlesCompleted: 3 });
    expect(hint.title).toBe('NEW SAGA ENTRY');
    expect(hint.line).toMatch(/Chronicle/i);
  });

  it('chronicle milestone pulses when unread', () => {
    const m = getHubBuildingMilestone('chronicle', { chronicleCount: 2, chronicleUnread: true });
    expect(m.available).toBe(true);
    expect(m.pulse).toBe(true);
    expect(m.unread).toBe(true);
    expect(m.banner).toBe('NEW ENTRY');
  });

  it('chronicle locked when no entries', () => {
    const m = getHubBuildingMilestone('chronicle', { chronicleCount: 0 });
    expect(m.available).toBe(false);
  });
});
