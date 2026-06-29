import { describe, it, expect } from 'vitest';
import { resolveSlotLandingPhase, defaultSessionForOrphanCampaign } from '../src/campaign/slotResume.js';
import { validateSessionState } from '../src/campaign/sessionSave.js';

describe('slotResume', () => {
  it('sends legacy war camp and bare campaignSelect to settlement hub', () => {
    expect(resolveSlotLandingPhase('betweenBattles')).toBe('settlementHub');
    expect(resolveSlotLandingPhase('campaignSelect', { mapIndex: 0 })).toBe('settlementHub');
    expect(resolveSlotLandingPhase('debrief', { battleResult: null })).toBe('settlementHub');
  });

  it('keeps in-progress and map screens', () => {
    expect(resolveSlotLandingPhase('nodeMap')).toBe('nodeMap');
    expect(resolveSlotLandingPhase('fortressPrep')).toBe('fortressPrep');
    expect(resolveSlotLandingPhase('playing')).toBe('playing');
    expect(resolveSlotLandingPhase('settlementHub')).toBe('settlementHub');
    expect(resolveSlotLandingPhase('debrief', { battleResult: 'victory' })).toBe('debrief');
    expect(resolveSlotLandingPhase('campaignSelect', { mapIndex: 2 })).toBe('campaignSelect');
  });

  it('maps legacy warCamp session phase to settlementHub', () => {
    const s = validateSessionState({ version: 1, gamePhase: 'warCamp', campaignMapIndex: 0 });
    expect(s?.gamePhase).toBe('settlementHub');
  });

  it('default orphan session opens hub on map 0', () => {
    const s = defaultSessionForOrphanCampaign();
    expect(s.gamePhase).toBe('settlementHub');
    expect(s.campaignRegionActive).toBe(true);
    expect(resolveSlotLandingPhase(s.gamePhase, { mapIndex: s.campaignMapIndex })).toBe('settlementHub');
  });
});
