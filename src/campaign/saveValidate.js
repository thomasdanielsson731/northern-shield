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

  return s;
}
