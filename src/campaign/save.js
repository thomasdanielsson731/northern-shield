import { createEmptyCampaignProgress } from './campaignMaps.js';
import { simpleSaveChecksum, verifySaveChecksum } from './saveValidate.js';
import { trimCampaignCollections, SAVE_SIZE_WARN_BYTES, estimateSaveBytes } from './scaleLimits.js';
import { slotCampaignKey } from './saveSlots.js';

export const CAMPAIGN_KEY = 'ns-campaign-v2';
export const SETTINGS_KEY = 'ns-settings';
const LEGACY_HS_KEY       = 'northern-shield-hs';
const LEGACY_ACH_KEY      = 'northern-shield-ach';
const LEGACY_MAP_BEST_KEY = 'northern-shield-map-best';

export function createNewCampaign() {
  return {
    version:            2,
    campaignId:         generateId(),
    createdAt:          Date.now(),
    battlesCompleted:   0,    goldReserve:        0,
    stars:              0,
    defenders:          [],
    fortressUpgrades:   { barracks: 0, armory: 0, watchtower: 0, wallworks: 0, treasury: 0 },
    equipmentInventory: [],
    achievements:       [],
    battleHistory:      [],
    chronicle:          { battles: [], warbandName: '' },
    hallOfFallen:       [],
    hallOfHonored:      [],
    bonds:              [],
    coDeployments:      {},
    legacyBonuses:      {},
    uiHints:            {},
    campaignProgress:   createEmptyCampaignProgress(),
  };
}

// storage parameter is injectable for testing; defaults to the global localStorage
export function saveCampaign(state, storage = localStorage, slotIndex = null) {
  try {
    const trimmed = trimCampaignCollections(state);
    const payload = { ...trimmed, _ck: simpleSaveChecksum(trimmed) };
    const key = slotIndex != null ? slotCampaignKey(slotIndex) : CAMPAIGN_KEY;
    const json = JSON.stringify(payload);
    if (estimateSaveBytes(trimmed) > SAVE_SIZE_WARN_BYTES) {
      console.warn('[Northern Shield] Save size large — chronicle may need trimming.');
    }
    storage.setItem(key, json);
    return true;
  } catch {
    return false;
  }
}

export function loadCampaign(storage = localStorage, slotIndex = null) {
  try {
    const key = slotIndex != null ? slotCampaignKey(slotIndex) : CAMPAIGN_KEY;
    const raw = JSON.parse(storage.getItem(key));
    return verifySaveChecksum(raw).state;
  } catch {}
  return null;
}
// Reads v1 keys, writes a v2 campaign, deletes v1 keys.
// Returns the v2 campaign (existing or newly created).
export function migrateLegacySaves(storage = localStorage) {
  const existing = loadCampaign(storage);
  if (existing) return existing;

  const campaign = createNewCampaign();

  try {
    const hs = JSON.parse(storage.getItem(LEGACY_HS_KEY)) || [];
    campaign.battleHistory = hs.map((entry, i) => ({
      battleNumber:  i + 1,
      mapName:       'MIDGARD',
      wavesCleared:  entry.waves  || 0,
      enemiesSlain:  entry.slain  || 0,
      goldEarned:    entry.gold   || 0,
      bossesKilled:  [],
      mvpDefenderId: null,
      timestamp:     Date.now(),
    }));
  } catch {}

  try {
    campaign.achievements = JSON.parse(storage.getItem(LEGACY_ACH_KEY)) || [];
  } catch {}

  saveCampaign(campaign, storage);

  try { storage.removeItem(LEGACY_HS_KEY); } catch {}
  try { storage.removeItem(LEGACY_ACH_KEY); } catch {}
  try { storage.removeItem(LEGACY_MAP_BEST_KEY); } catch {}

  return campaign;
}

function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
