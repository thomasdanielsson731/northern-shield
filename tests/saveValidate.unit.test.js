import { describe, it, expect } from 'vitest';
import { validateCampaignState, simpleSaveChecksum } from '../src/campaign/saveValidate.js';
import { createNewCampaign } from '../src/campaign/save.js';

describe('saveValidate', () => {
  it('rejects invalid version', () => {
    expect(validateCampaignState({ version: 1 })).toBeNull();
  });

  it('clamps tampered gold and stars', () => {
    const s = createNewCampaign();
    s.goldReserve = 9999999;
    s.stars = -5;
    s.campaignProgress.mapsUnlocked = 500;
    const v = validateCampaignState(s);
    expect(v.goldReserve).toBe(999999);
    expect(v.stars).toBe(0);
    expect(v.campaignProgress.mapsUnlocked).toBe(100);
  });

  it('produces stable checksum', () => {
    const s = createNewCampaign();
    expect(simpleSaveChecksum(s)).toMatch(/^[0-9a-f]+$/);
    expect(simpleSaveChecksum(s)).toBe(simpleSaveChecksum(s));
  });
});
