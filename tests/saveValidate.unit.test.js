import { describe, it, expect } from 'vitest';
import { validateCampaignState, simpleSaveChecksum, verifySaveChecksum } from '../src/campaign/saveValidate.js';
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

  it('verifySaveChecksum clamps tampered saves', () => {
    const s = createNewCampaign();
    s.goldReserve = 9000;
    s.stars = 200;
    const ck = simpleSaveChecksum(s);
    const tampered = { ...s, goldReserve: 50000, stars: 500, _ck: ck };
    const { ok, state } = verifySaveChecksum(tampered);
    expect(ok).toBe(false);
    expect(state.goldReserve).toBe(400);
    expect(state.stars).toBe(40);
  });

  it('migrates missing fortress upgrade keys on load', () => {
    const s = createNewCampaign();
    delete s.fortressUpgrades.treasury;
    const v = validateCampaignState(s);
    expect(v.fortressUpgrades.treasury).toBe(0);
    expect(v.fortressUpgrades.barracks).toBe(0);
  });

  it('trims chronicle on validate load', () => {
    const s = createNewCampaign();
    s.chronicle.battles = Array.from({ length: 250 }, (_, i) => ({ battleNumber: i }));
    const v = validateCampaignState(s);
    expect(v.chronicle.battles.length).toBe(200);
  });
});
