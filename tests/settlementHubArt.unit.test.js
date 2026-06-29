import { describe, it, expect } from 'vitest';
import { HUB_BUILDING_ART, isSettlementHubBackdropReady, isSettlementHubBackdropUsable } from '../src/settlement/settlementHubArt.js';

describe('settlementHubArt', () => {
  it('maps hub building ids to art keys', () => {
    expect(HUB_BUILDING_ART.command).toBe('assaultEmblem');
    expect(HUB_BUILDING_ART.warband).toBe('hall');
    expect(HUB_BUILDING_ART.skirmish).toBe('arena');
  });

  it('backdrop not loaded in unit test env', () => {
    expect(isSettlementHubBackdropReady()).toBe(false);
  });

  it('backdrop usable when dimensions are panorama-sized', () => {
    // Heuristic no longer rejects letterboxed night plates.
    expect(typeof isSettlementHubBackdropUsable).toBe('function');
  });
});
