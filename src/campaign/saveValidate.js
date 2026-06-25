import { CAMPAIGN_MAP_COUNT } from './campaignMaps.js';

/** Clamp and sanitize campaign save on load (client-side tamper deterrence). */
export function validateCampaignState(state) {
  if (!state || state.version !== 2) return null;

  const s = { ...state };
  s.goldReserve = Math.max(0, Math.min(999999, Math.floor(Number(s.goldReserve) || 0)));
  s.stars       = Math.max(0, Math.min(999, Math.floor(Number(s.stars) || 0)));
  s.battlesCompleted = Math.max(0, Math.floor(Number(s.battlesCompleted) || 0));

  const p = s.campaignProgress ?? {};
  p.mapsUnlocked = Math.max(1, Math.min(CAMPAIGN_MAP_COUNT, Math.floor(Number(p.mapsUnlocked) || 1)));
  if (!Array.isArray(p.clearedMaps)) p.clearedMaps = [];
  p.clearedMaps = p.clearedMaps
    .map(n => Math.floor(Number(n)))
    .filter(n => n >= 0 && n < CAMPAIGN_MAP_COUNT);
  p.clearedMaps = [...new Set(p.clearedMaps)].sort((a, b) => a - b);

  if (!p.mapRuns || typeof p.mapRuns !== 'object') p.mapRuns = {};
  s.campaignProgress = p;

  if (!Array.isArray(s.defenders)) s.defenders = [];
  if (!Array.isArray(s.equipmentInventory)) s.equipmentInventory = [];
  if (!s.uiHints || typeof s.uiHints !== 'object') s.uiHints = {};

  return s;
}

/** Lightweight client checksum — tamper deterrence only. */
export function simpleSaveChecksum(state) {
  const p = state?.campaignProgress;
  const payload = `${state?.goldReserve ?? 0}|${state?.stars ?? 0}|${p?.mapsUnlocked ?? 1}|${(p?.clearedMaps ?? []).length}`;
  let h = 0;
  for (let i = 0; i < payload.length; i++) h = ((h << 5) - h + payload.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16);
}
