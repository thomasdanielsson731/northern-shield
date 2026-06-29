import { describe, it, expect } from 'vitest';
import {
  getHubBuildingMilestone,
  hubBuildingToProgressionMode,
  getProgressionBuildingTitle,
} from '../src/settlement/hubMilestones.js';
import { applySettlementComplete } from '../src/campaign/settlementCeremony.js';

describe('hubMilestones', () => {
  it('locks treasury before First Night on First Saga', () => {
    const m = getHubBuildingMilestone('fortress', { simplifiedSaga: true, battlesCompleted: 0 });
    expect(m.available).toBe(false);
    expect(m.reason).toMatch(/First Night/i);
  });

  it('opens treasury with banner after first assault', () => {
    const m = getHubBuildingMilestone('fortress', { simplifiedSaga: true, battlesCompleted: 1 });
    expect(m.available).toBe(true);
    expect(m.banner).toMatch(/TREASURY/i);
  });

  it('locks barracks until settlement ceremony', () => {
    const m = getHubBuildingMilestone('recruit', { simplifiedSaga: true, campaignState: {} });
    expect(m.available).toBe(false);
  });

  it('unlocks barracks after settlement', () => {
    const campaign = {};
    applySettlementComplete(campaign, { recruitType: 'valkyrie', recruitName: 'Saga' });
    const m = getHubBuildingMilestone('recruit', { simplifiedSaga: true, campaignState: campaign });
    expect(m.available).toBe(true);
  });

  it('locks rune smith on First Saga map even with stars', () => {
    const m = getHubBuildingMilestone('runeSmith', { simplifiedSaga: true, mapIndex: 0, stars: 9 });
    expect(m.available).toBe(false);
  });

  it('maps hub buildings to progression modes', () => {
    expect(hubBuildingToProgressionMode('fortress')).toBe('fortress');
    expect(getProgressionBuildingTitle('fortress')).toBe('TREASURY');
  });

  it('chronicle unread milestone pulses NEW ENTRY', () => {
    const m = getHubBuildingMilestone('chronicle', { chronicleCount: 3, chronicleUnread: true });
    expect(m.unread).toBe(true);
    expect(m.banner).toBe('NEW ENTRY');
  });
});
