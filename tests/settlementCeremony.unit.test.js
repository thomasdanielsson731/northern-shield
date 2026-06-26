import { describe, it, expect } from 'vitest';
import {
  SETTLEMENT_STAGES,
  SETTLEMENT_STAGE_COUNT,
  getSettlementStage,
  shouldOfferSettlementCeremony,
  applySettlementComplete,
  validateSettlementRecruitType,
  validateSettlementName,
} from '../src/campaign/settlementCeremony.js';

describe('settlementCeremony', () => {
  it('has six stages', () => {
    expect(SETTLEMENT_STAGE_COUNT).toBe(6);
    expect(getSettlementStage(0).id).toBe('debrief');
    expect(getSettlementStage(5).id).toBe('complete');
  });

  it('offers ceremony after A4 once', () => {
    const camp = { chronicle: { battles: [] }, firstSaga: {} };
    expect(shouldOfferSettlementCeremony(camp, 0, 4)).toBe(true);
    applySettlementComplete(camp, { recruitType: 'military', recruitName: 'Erik' });
    expect(shouldOfferSettlementCeremony(camp, 0, 4)).toBe(false);
  });

  it('validates recruit types and names', () => {
    expect(validateSettlementRecruitType('valkyrie')).toBe(true);
    expect(validateSettlementRecruitType('berserk')).toBe(false);
    expect(validateSettlementName('ab')).toBe(true);
    expect(validateSettlementName('a')).toBe(false);
  });

  it('applySettlementComplete upgrades fortress meta', () => {
    const camp = { chronicle: { battles: [] }, firstSaga: {}, fortressUpgrades: {} };
    applySettlementComplete(camp, { recruitType: 'valkyrie', recruitName: 'Sigrid' });
    expect(camp.firstSaga.settlementComplete).toBe(true);
    expect(camp.firstSaga.stoneWallPlaced).toBe(true);
    expect(camp.chronicle.sagaChapter).toMatch(/Settlement/);
    expect(camp.fortressUpgrades.longhouse).toBeGreaterThanOrEqual(2);
  });
});
