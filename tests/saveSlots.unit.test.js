import { describe, it, expect, beforeEach } from 'vitest';
import {
  SLOT_COUNT,
  createEmptySlotsMeta,
  loadSlotsMeta,
  slotHasSave,
  deleteSlot,
  createCampaignInSlot,
  migrateLegacyToSlots,
  buildSlotMeta,
  LEGACY_CAMPAIGN_KEY,
  slotCampaignKey,
} from '../src/campaign/saveSlots.js';
import { createNewCampaign, saveCampaign, CAMPAIGN_KEY } from '../src/campaign/save.js';
import { validateSessionState } from '../src/campaign/sessionSave.js';

function mockStorage() {
  const map = new Map();
  return {
    getItem: k => map.get(k) ?? null,
    setItem: (k, v) => map.set(k, v),
    removeItem: k => map.delete(k),
  };
}

describe('saveSlots', () => {
  let storage;

  beforeEach(() => {
    storage = mockStorage();
  });

  it('creates 10 empty slots', () => {
    const meta = createEmptySlotsMeta();
    expect(meta.slots).toHaveLength(SLOT_COUNT);
    expect(meta.slots.every(s => s === null)).toBe(true);
  });

  it('creates and detects campaign in slot', () => {
    const { campaign } = createCampaignInSlot(3, storage);
    expect(slotHasSave(3, storage)).toBe(true);
    expect(campaign.campaignId).toBeTruthy();
    expect(loadSlotsMeta(storage).slots[3]?.label).toContain('Save 4');
  });

  it('deletes a slot', () => {
    createCampaignInSlot(1, storage);
    deleteSlot(1, storage);
    expect(slotHasSave(1, storage)).toBe(false);
    expect(loadSlotsMeta(storage).slots[1]).toBeNull();
  });

  it('migrates legacy save into slot 0', () => {
    const legacy = createNewCampaign();
    saveCampaign(legacy, storage);
    storage.setItem(LEGACY_CAMPAIGN_KEY, storage.getItem(CAMPAIGN_KEY));
    migrateLegacyToSlots(storage);
    expect(slotHasSave(0, storage)).toBe(true);
    expect(storage.getItem(LEGACY_CAMPAIGN_KEY)).toBeNull();
    expect(storage.getItem(slotCampaignKey(0))).toBeTruthy();
  });

  it('builds slot summary from campaign', () => {
    const c = createNewCampaign();
    c.chronicle.warbandName = 'Iron Wolves';
    c.battlesCompleted = 4;
    c.campaignProgress.mapsUnlocked = 3;
    const meta = buildSlotMeta(0, c, { gamePhase: 'betweenBattles' }, storage);
    expect(meta.label).toBe('Iron Wolves');
    expect(meta.summary.battles).toBe(4);
    expect(meta.summary.location).toBe('War Camp');
  });
});

describe('sessionSave', () => {
  it('validates session phases', () => {
    expect(validateSessionState({ version: 1, gamePhase: 'nodeMap', campaignMapIndex: 2 })).toMatchObject({
      gamePhase: 'nodeMap',
      campaignMapIndex: 2,
    });
    expect(validateSessionState({ version: 1, gamePhase: 'bogus' })).toBeNull();
  });

  it('sanitizes combat blob', () => {
    const s = validateSessionState({
      version: 1,
      gamePhase: 'playing',
      combat: {
        mapIndex: 0,
        nodeIndex: 1,
        waveNumber: 2,
        waveState: 'active',
        lives: 5,
        gold: 200,
        casualties: ['abc', 3],
      },
    });
    expect(s.combat.waveNumber).toBe(2);
    expect(s.combat.casualties).toEqual(['abc']);
  });
});
