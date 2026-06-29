import { describe, it, expect } from 'vitest';
import { HUB_BUILDING_ART, isSettlementHubBackdropReady } from '../src/settlement/settlementHubArt.js';

describe('settlementHubArt', () => {
  it('maps hub building ids to art keys', () => {
    expect(HUB_BUILDING_ART.command).toBe('warHorn');
    expect(HUB_BUILDING_ART.warband).toBe('hall');
    expect(HUB_BUILDING_ART.skirmish).toBe('arena');
  });

  it('backdrop not loaded in unit test env', () => {
    expect(isSettlementHubBackdropReady()).toBe(false);
  });
});
