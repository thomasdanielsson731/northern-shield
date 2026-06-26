import { describe, it, expect } from 'vitest';
import {
  isFirstSagaMap,
  getFirstSagaAssault,
  buildFirstSagaWavePlan,
  getFirstSagaFrontLayout,
  FIRST_SAGA_A4_NODE,
  isFirstSagaSettlementReady,
  isFirstSagaRecruitUnlocked,
  ensureFirstSagaState,
} from '../src/campaign/firstSaga.js';
import {
  shouldOfferSettlementCeremony,
  applySettlementComplete,
  validateSettlementName,
  SETTLEMENT_STAGE_COUNT,
} from '../src/campaign/settlementCeremony.js';
import { getFrontLayout, isAssaultUnlocked, getNextAvailableAssault } from '../src/campaign/campaignFronts.js';
import { getNodeCountForMap, buildNodeWavePlan, getPortalCountForMap } from '../src/campaign/campaignMaps.js';
import { createEmptyCampaignProgress } from '../src/campaign/campaignMaps.js';

describe('firstSaga', () => {
  it('identifies map 0 as first saga', () => {
    expect(isFirstSagaMap(0)).toBe(true);
    expect(isFirstSagaMap(1)).toBe(false);
  });

  it('uses fixed five-assault west chain on map 0', () => {
    expect(getNodeCountForMap(0)).toBe(5);
    expect(getPortalCountForMap(0)).toBe(1);
    const layout = getFrontLayout(0);
    expect(layout.firstSaga).toBe(true);
    expect(layout.fronts.west.assaults).toHaveLength(5);
    expect(layout.fronts.north.assaults).toHaveLength(0);
    expect(layout.nodeToAssault[FIRST_SAGA_A4_NODE].frontId).toBe('west');
    expect(layout.fronts.west.assaults[4].codename).toBe('Ash-Warden');
  });

  it('unlocks assaults linearly on west front', () => {
    const p = createEmptyCampaignProgress();
    expect(isAssaultUnlocked(p, 0, 0)).toBe(true);
    expect(isAssaultUnlocked(p, 0, 1)).toBe(false);
    p.mapRuns[0] = { nodesCleared: [0], fieldState: null };
    expect(isAssaultUnlocked(p, 0, 1)).toBe(true);
    expect(getNextAvailableAssault(p, 0)?.nodeIndex).toBe(1);
  });

  it('builds saga wave plans per assault', () => {
    expect(buildFirstSagaWavePlan(0)?.waveCount).toBe(1);
    expect(buildFirstSagaWavePlan(4)?.waves.at(-1)?.isBoss).toBe(true);
    expect(buildNodeWavePlan(0, 0).waveCount).toBe(1);
    expect(buildNodeWavePlan(0, 4).isLastNode).toBe(true);
  });

  it('settlement ready after A4 cleared', () => {
    const p = createEmptyCampaignProgress();
    expect(isFirstSagaSettlementReady(p, 0)).toBe(false);
    p.mapRuns[0] = { nodesCleared: [0, 1, 2, 3, 4], fieldState: null };
    expect(isFirstSagaSettlementReady(p, 0)).toBe(true);
  });

  it('settlement ceremony and recruit gate', () => {
    const campaign = { chronicle: { battles: [] } };
    expect(shouldOfferSettlementCeremony(campaign, 0, 4)).toBe(true);
    applySettlementComplete(campaign, { recruitType: 'valkyrie', recruitName: 'Sigrid' });
    expect(isFirstSagaRecruitUnlocked(campaign)).toBe(true);
    expect(ensureFirstSagaState(campaign).stoneWallPlaced).toBe(true);
    expect(shouldOfferSettlementCeremony(campaign, 0, 4)).toBe(false);
  });

  it('validates settlement names', () => {
    expect(validateSettlementName('ab')).toBe(true);
    expect(validateSettlementName('a')).toBe(false);
  });

  it('has six settlement stages', () => {
    expect(SETTLEMENT_STAGE_COUNT).toBe(6);
    expect(getFirstSagaAssault(0)?.codename).toBe('First Night');
  });
});
