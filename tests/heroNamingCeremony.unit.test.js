import { describe, it, expect } from 'vitest';
import { Roster } from '../src/roster/roster.js';
import { Defender } from '../src/roster/defender.js';
import { createEmptyCampaignProgress } from '../src/campaign/campaignMaps.js';
import {
  shouldOfferHeroNaming,
  applyHeroNaming,
  validateHeroName,
  getUnnamedSagaHero,
} from '../src/campaign/heroNamingCeremony.js';
import { validateSessionState } from '../src/campaign/sessionSave.js';

describe('heroNamingCeremony', () => {
  it('validates hero names like settlement names', () => {
    expect(validateHeroName('Ulfr')).toBe(true);
    expect(validateHeroName('a')).toBe(false);
  });

  it('offers naming after A0 cleared with unnamed hero', () => {
    const roster = new Roster();
    roster.defenders.push(new Defender({ defenderId: 'd1', name: '', type: 'berserk' }));
    const campaign = { campaignProgress: createEmptyCampaignProgress(), chronicle: {} };
    expect(shouldOfferHeroNaming(campaign, roster, 0)).toBe(false);
    campaign.campaignProgress.mapRuns[0] = { nodesCleared: [0], fieldState: null };
    expect(shouldOfferHeroNaming(campaign, roster, 0)).toBe(true);
    expect(getUnnamedSagaHero(roster)?.defenderId).toBe('d1');
  });

  it('applyHeroNaming sets name and heroNamed flag', () => {
    const roster = new Roster();
    roster.defenders.push(new Defender({ defenderId: 'd1', name: '', type: 'berserk' }));
    const campaign = { campaignProgress: createEmptyCampaignProgress(), chronicle: {}, firstSaga: {} };
    expect(applyHeroNaming(campaign, roster, 'd1', 'Gunnar')).toBe(true);
    expect(roster.find('d1').name).toBe('Gunnar');
    expect(campaign.firstSaga.heroNamed).toBe(true);
    expect(shouldOfferHeroNaming(campaign, roster, 0)).toBe(false);
  });

  it('session save accepts heroNamingCeremony phase', () => {
    const s = validateSessionState({
      version: 1,
      gamePhase: 'heroNamingCeremony',
      campaignMapIndex: 0,
      heroNamingCeremony: {
        nameDraft: 'Gu',
        defenderId: 'd1',
        pending: { action: 'nextAssault', nodeIndex: 1 },
      },
    });
    expect(s?.gamePhase).toBe('heroNamingCeremony');
    expect(s?.heroNamingCeremony?.nameDraft).toBe('Gu');
    expect(s?.heroNamingCeremony?.pending?.nodeIndex).toBe(1);
  });
});
