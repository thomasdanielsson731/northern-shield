import { getMapDisplayName } from './campaignMaps.js';
import { loadCampaign, saveCampaign, createNewCampaign } from './save.js';
import { validateSessionState, verifySessionChecksum, simpleSessionChecksum } from './sessionSave.js';

export const SLOT_COUNT = 10;
export const SLOTS_META_KEY = 'ns-slots-meta-v1';
export const LEGACY_CAMPAIGN_KEY = 'ns-campaign-v2';

export function slotCampaignKey(slotIndex) {
  return `ns-campaign-v2-slot-${slotIndex}`;
}

export function slotSessionKey(slotIndex) {
  return `ns-session-v1-slot-${slotIndex}`;
}

export function createEmptySlotsMeta() {
  return { version: 1, slots: Array.from({ length: SLOT_COUNT }, () => null) };
}

export function loadSlotsMeta(storage = localStorage) {
  try {
    const raw = JSON.parse(storage.getItem(SLOTS_META_KEY));
    if (!raw || raw.version !== 1 || !Array.isArray(raw.slots)) return createEmptySlotsMeta();
    while (raw.slots.length < SLOT_COUNT) raw.slots.push(null);
    raw.slots = raw.slots.slice(0, SLOT_COUNT);
    return raw;
  } catch {
    return createEmptySlotsMeta();
  }
}

export function saveSlotsMeta(meta, storage = localStorage) {
  try {
    storage.setItem(SLOTS_META_KEY, JSON.stringify(meta));
  } catch {}
}

export function loadSession(slotIndex, storage = localStorage) {
  try {
    const raw = JSON.parse(storage.getItem(slotSessionKey(slotIndex)));
    return verifySessionChecksum(raw).state;
  } catch {
    return null;
  }
}

export function saveSession(session, slotIndex, storage = localStorage) {
  try {
    const payload = { ...session, version: 1, _ck: simpleSessionChecksum({ ...session, version: 1 }) };
    storage.setItem(slotSessionKey(slotIndex), JSON.stringify(payload));
  } catch {}
}

export function slotHasSave(slotIndex, storage = localStorage) {
  return !!loadCampaign(storage, slotIndex);
}

export function deleteSlot(slotIndex, storage = localStorage) {
  try { storage.removeItem(slotCampaignKey(slotIndex)); } catch {}
  try { storage.removeItem(slotSessionKey(slotIndex)); } catch {}
  const meta = loadSlotsMeta(storage);
  meta.slots[slotIndex] = null;
  saveSlotsMeta(meta, storage);
}

/** Move legacy single-save into slot 0 when no slot meta exists. */
export function migrateLegacyToSlots(storage = localStorage) {
  const meta = loadSlotsMeta(storage);
  const anySlot = meta.slots.some((_, i) => slotHasSave(i, storage));
  if (anySlot) return meta;

  try {
    const legacy = storage.getItem(LEGACY_CAMPAIGN_KEY);
    if (!legacy) return meta;

    storage.setItem(slotCampaignKey(0), legacy);
    storage.removeItem(LEGACY_CAMPAIGN_KEY);
    const campaign = loadCampaign(storage, 0);
    if (campaign) {
      meta.slots[0] = buildSlotMeta(0, campaign, loadSession(0, storage), storage);
    }
    saveSlotsMeta(meta, storage);
  } catch {}

  return meta;
}

export function buildSlotMeta(slotIndex, campaign, session = null, storage = localStorage) {
  const progress = campaign?.campaignProgress;
  const warbandName = (campaign?.chronicle?.warbandName || '').trim();
  return {
    slotIndex,
    campaignId: campaign?.campaignId ?? null,
    createdAt: campaign?.createdAt ?? Date.now(),
    lastPlayedAt: Date.now(),
    label: warbandName || `Save ${slotIndex + 1}`,
    summary: {
      battles: campaign?.battlesCompleted ?? 0,
      stars: campaign?.stars ?? 0,
      regions: progress?.mapsUnlocked ?? 1,
      cleared: progress?.clearedMaps?.length ?? 0,
      goldReserve: campaign?.goldReserve ?? 0,
      defenders: campaign?.defenders?.length ?? 0,
      location: describeSessionLocation(session),
    },
  };
}

export function describeSessionLocation(session) {
  if (!session) return 'Campaign';
  switch (session.gamePhase) {
    case 'campaignSelect': return 'Region select';
    case 'nodeMap':
      return session.campaignMapIndex != null
        ? getMapDisplayName(session.campaignMapIndex)
        : 'Command map';
    case 'betweenBattles': return 'War Camp';
    case 'debrief': return 'Debrief';
    case 'playing':
      return session.combat
        ? `Assault · wave ${session.combat.waveNumber || 1}`
        : 'In battle';
    case 'mapSelect': return 'Skirmish select';
    default: return 'Campaign';
  }
}

export function touchSlotMeta(slotIndex, campaign, session, storage = localStorage) {
  const meta = loadSlotsMeta(storage);
  meta.slots[slotIndex] = buildSlotMeta(slotIndex, campaign, session, storage);
  saveSlotsMeta(meta, storage);
  return meta;
}

export function createCampaignInSlot(slotIndex, storage = localStorage) {
  const campaign = createNewCampaign();
  campaign.createdAt = Date.now();
  saveCampaign(campaign, storage, slotIndex);
  const session = { version: 1, gamePhase: 'campaignSelect', campaignMapPage: 0 };
  saveSession(session, slotIndex, storage);
  touchSlotMeta(slotIndex, campaign, session, storage);
  return { campaign, session };
}
