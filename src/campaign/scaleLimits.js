/** Campaign save growth limits — prevent localStorage bloat under long play. */

export const MAX_CHRONICLE_BATTLES = 200;
export const MAX_BATTLE_HISTORY = 100;
export const MAX_HALL_ENTRIES = 80;
export const MAX_DEFENDERS = 32;
export const MAX_EQUIPMENT_ITEMS = 60;
export const MAX_BONDS = 24;
export const MAX_ACHIEVEMENTS = 100;

export function trimArrayTail(arr, max) {
  if (!Array.isArray(arr) || arr.length <= max) return arr;
  return arr.slice(-max);
}

export function trimChronicleBattles(battles, max = MAX_CHRONICLE_BATTLES) {
  return trimArrayTail(battles, max);
}

/** Trim unbounded campaign arrays before save/load. */
export function trimCampaignCollections(state) {
  if (!state) return state;
  const s = { ...state };

  if (s.chronicle?.battles) {
    s.chronicle = {
      ...s.chronicle,
      battles: trimChronicleBattles(s.chronicle.battles),
      warbandName: String(s.chronicle.warbandName ?? '').slice(0, 32),
    };
  }

  if (Array.isArray(s.battleHistory)) {
    s.battleHistory = trimArrayTail(s.battleHistory, MAX_BATTLE_HISTORY);
  }
  if (Array.isArray(s.hallOfFallen)) {
    s.hallOfFallen = trimArrayTail(s.hallOfFallen, MAX_HALL_ENTRIES);
  }
  if (Array.isArray(s.hallOfHonored)) {
    s.hallOfHonored = trimArrayTail(s.hallOfHonored, MAX_HALL_ENTRIES);
  }
  if (Array.isArray(s.defenders)) {
    s.defenders = s.defenders.slice(0, MAX_DEFENDERS);
  }
  if (Array.isArray(s.equipmentInventory)) {
    s.equipmentInventory = s.equipmentInventory.slice(0, MAX_EQUIPMENT_ITEMS);
  }
  if (Array.isArray(s.bonds)) {
    s.bonds = s.bonds.slice(0, MAX_BONDS);
  }
  if (Array.isArray(s.achievements)) {
    s.achievements = s.achievements.slice(0, MAX_ACHIEVEMENTS);
  }

  if (s.legacyBonuses && typeof s.legacyBonuses === 'object') {
    const leg = { ...s.legacyBonuses };
    for (const key of Object.keys(leg)) {
      const arr = Array.isArray(leg[key]) ? leg[key] : (leg[key] ? [leg[key]] : []);
      leg[key] = arr.slice(-3);
    }
    s.legacyBonuses = leg;
  }

  return s;
}

export function validateMapBests(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!v || typeof v !== 'object') continue;
    out[String(k).slice(0, 40)] = {
      waves: Math.min(9999, Math.max(0, Math.floor(Number(v.waves) || 0))),
      slain: Math.min(99999, Math.max(0, Math.floor(Number(v.slain) || 0))),
    };
  }
  return out;
}

/** Rough JSON byte size for diagnostics / quota warnings. */
export function estimateSaveBytes(state) {
  try {
    return new TextEncoder().encode(JSON.stringify(state)).length;
  } catch {
    return 0;
  }
}

export const SAVE_SIZE_WARN_BYTES = 4_500_000;
