import { describe, it, expect } from 'vitest';
import {
  createNewCampaign,
  saveCampaign,
  loadCampaign,
  migrateLegacySaves,
  CAMPAIGN_KEY,
} from '../src/campaign/save.js';

function makeStorage() {
  const store = {};
  return {
    getItem:    key => Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null,
    setItem:    (key, val) => { store[key] = String(val); },
    removeItem: key => { delete store[key]; },
  };
}

describe('createNewCampaign', () => {
  it('returns a version-2 object', () => {
    expect(createNewCampaign().version).toBe(2);
  });

  it('initializes all required fields', () => {
    const c = createNewCampaign();
    expect(c.battlesCompleted).toBe(0);
    expect(c.goldReserve).toBe(0);
    expect(c.stars).toBe(0);
    expect(Array.isArray(c.defenders)).toBe(true);
    expect(Array.isArray(c.achievements)).toBe(true);
    expect(Array.isArray(c.battleHistory)).toBe(true);
    expect(Array.isArray(c.equipmentInventory)).toBe(true);
    expect(c.fortressUpgrades).toEqual({ barracks: 0, armory: 0, watchtower: 0, wallworks: 0 });
  });

  it('generates a unique campaignId per call', () => {
    const a = createNewCampaign();
    const b = createNewCampaign();
    expect(typeof a.campaignId).toBe('string');
    expect(a.campaignId.length).toBeGreaterThan(0);
    expect(a.campaignId).not.toBe(b.campaignId);
  });
});

describe('saveCampaign / loadCampaign round-trip', () => {
  it('loads back exactly what was saved', () => {
    const storage = makeStorage();
    const c = createNewCampaign();
    c.battlesCompleted = 7;
    c.goldReserve = 350;
    c.achievements = ['firstBoss'];
    saveCampaign(c, storage);
    const loaded = loadCampaign(storage);
    expect(loaded.battlesCompleted).toBe(7);
    expect(loaded.goldReserve).toBe(350);
    expect(loaded.achievements).toContain('firstBoss');
    expect(loaded.version).toBe(2);
  });

  it('returns null when nothing is stored', () => {
    expect(loadCampaign(makeStorage())).toBeNull();
  });

  it('returns null when stored data is not version 2', () => {
    const storage = makeStorage();
    storage.setItem(CAMPAIGN_KEY, JSON.stringify({ version: 1, data: 'old' }));
    expect(loadCampaign(storage)).toBeNull();
  });

  it('returns null on corrupt JSON', () => {
    const storage = makeStorage();
    storage.setItem(CAMPAIGN_KEY, 'not-json{{{');
    expect(loadCampaign(storage)).toBeNull();
  });

  it('persists nested fortressUpgrades', () => {
    const storage = makeStorage();
    const c = createNewCampaign();
    c.fortressUpgrades.barracks = 2;
    saveCampaign(c, storage);
    expect(loadCampaign(storage).fortressUpgrades.barracks).toBe(2);
  });
});

describe('migrateLegacySaves', () => {
  it('returns existing v2 save without modifying it', () => {
    const storage = makeStorage();
    const original = createNewCampaign();
    original.battlesCompleted = 5;
    saveCampaign(original, storage);
    storage.setItem('northern-shield-hs', JSON.stringify([{ waves: 10, slain: 20, gold: 500, name: 'Ulfr' }]));

    const result = migrateLegacySaves(storage);
    expect(result.battlesCompleted).toBe(5);
    // Does not touch legacy keys when v2 already exists
    expect(storage.getItem('northern-shield-hs')).not.toBeNull();
  });

  it('migrates high scores into battleHistory', () => {
    const storage = makeStorage();
    storage.setItem('northern-shield-hs', JSON.stringify([
      { waves: 25, slain: 80, gold: 1200, name: 'Ulfr' },
      { waves: 10, slain: 30, gold: 400,  name: 'Björn' },
    ]));

    const result = migrateLegacySaves(storage);
    expect(result.battleHistory).toHaveLength(2);
    expect(result.battleHistory[0].wavesCleared).toBe(25);
    expect(result.battleHistory[0].enemiesSlain).toBe(80);
    expect(result.battleHistory[1].wavesCleared).toBe(10);
  });

  it('migrates achievements', () => {
    const storage = makeStorage();
    storage.setItem('northern-shield-ach', JSON.stringify(['firstBoss', 'wave25']));

    const result = migrateLegacySaves(storage);
    expect(result.achievements).toContain('firstBoss');
    expect(result.achievements).toContain('wave25');
  });

  it('removes all three legacy keys after migration', () => {
    const storage = makeStorage();
    storage.setItem('northern-shield-hs',      JSON.stringify([]));
    storage.setItem('northern-shield-ach',      JSON.stringify([]));
    storage.setItem('northern-shield-map-best', JSON.stringify({}));

    migrateLegacySaves(storage);
    expect(storage.getItem('northern-shield-hs')).toBeNull();
    expect(storage.getItem('northern-shield-ach')).toBeNull();
    expect(storage.getItem('northern-shield-map-best')).toBeNull();
  });

  it('creates a fresh campaign when no data exists at all', () => {
    const result = migrateLegacySaves(makeStorage());
    expect(result.version).toBe(2);
    expect(result.battlesCompleted).toBe(0);
    expect(result.battleHistory).toHaveLength(0);
    expect(result.achievements).toHaveLength(0);
  });

  it('persists the migrated result so a second call returns the same data', () => {
    const storage = makeStorage();
    storage.setItem('northern-shield-ach', JSON.stringify(['wave50']));
    migrateLegacySaves(storage);

    // Second call should return the saved v2 data (not re-migrate)
    const second = migrateLegacySaves(storage);
    expect(second.achievements).toContain('wave50');
  });

  it('handles missing legacy keys gracefully', () => {
    const storage = makeStorage();
    // No legacy keys set at all
    expect(() => migrateLegacySaves(storage)).not.toThrow();
    const result = migrateLegacySaves(storage);
    expect(result.version).toBe(2);
  });
});
