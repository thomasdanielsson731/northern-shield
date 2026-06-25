/**
 * Campaign node run state — field persistence and per-node casualties.
 */

import {
  MAX_FIELD_HEROES,
  MAX_FIELD_STRUCTURES,
  buildNodeWavePlan,
  getCampaignMapMeta,
  getMapRun,
  isMapComplete,
  createEmptyCampaignProgress,
} from './campaignMaps.js';

const HERO_TYPES = new Set([
  'berserk', 'valkyrie', 'military', 'hydda', 'blondie', 'isjatten',
]);

/** Structures = non-hero tower types placed on the field. */
export function isHeroTowerType(type) {
  return HERO_TYPES.has(type);
}

export function countFieldHeroes(towers) {
  return towers.filter(t => isHeroTowerType(t.type)).length;
}

export function countFieldStructures(towers) {
  return towers.filter(t => !isHeroTowerType(t.type)).length;
}

export function canPlaceHero(towers) {
  return countFieldHeroes(towers) < MAX_FIELD_HEROES;
}

export function canPlaceStructure(towers) {
  return countFieldStructures(towers) < MAX_FIELD_STRUCTURES;
}

/** Serialize live combat field for persistence between nodes. */
export function serializeFieldState(towers, wallData, gold) {
  return {
    gold: Math.floor(gold),
    towers: towers.map(t => ({
      type:       t.type,
      col:        t.col,
      row:        t.row,
      level:      t.level ?? 1,
      defenderId: t.defenderId ?? null,
      name:       t.name ?? null,
      rune:       t.rune ?? null,
      itemRune:   t.itemRune ?? null,
    })),
    walls: Object.fromEntries(
      Object.entries(wallData).filter(([, w]) => !w.temporary)
    ),
  };
}

/** Re-add fallen heroes from assault start so they respawn on the next assault. */
export function mergeFallenHeroesIntoFieldState(fieldState, deploySnapshot) {
  if (!deploySnapshot?.towers?.length) return fieldState;
  const livingIds = new Set(
    (fieldState.towers ?? []).filter(t => t.defenderId).map(t => t.defenderId)
  );
  const merged = { ...fieldState, towers: [...(fieldState.towers ?? [])] };
  for (const t of deploySnapshot.towers) {
    if (!t.defenderId || !isHeroTowerType(t.type)) continue;
    if (livingIds.has(t.defenderId)) continue;
    merged.towers.push({ ...t });
    livingIds.add(t.defenderId);
  }
  return merged;
}

/** Persist assault-start layout so the next assault can restore fallen heroes. */
export function attachDeploySnapshot(fieldState, deploySnapshot) {
  if (!fieldState || !deploySnapshot?.towers?.length) return fieldState;
  return { ...fieldState, deploySnapshot };
}

/** Strip combat vitals and restore fallen slots before a fresh assault. */
export function prepareFieldForNewAssault(fieldState) {
  if (!fieldState) return { gold: 0, towers: [], walls: {} };
  let field = fieldState.deploySnapshot
    ? mergeFallenHeroesIntoFieldState(fieldState, fieldState.deploySnapshot)
    : { ...fieldState, towers: [...(fieldState.towers ?? [])] };
  const walls = {};
  for (const [key, w] of Object.entries(field.walls ?? {})) {
    const maxHp = w.maxHp ?? w.hp ?? 100;
    walls[key] = { ...w, hp: maxHp, maxHp };
  }
  const towers = (field.towers ?? []).map(t => {
    const { combatHp, combatMaxHp, structureHp, structureMaxHp, ...rest } = t;
    return rest;
  });
  return { ...field, towers, walls };
}

/**
 * Mark a defender as an assault casualty (dead until this assault ends).
 * @param {Set<string>} casualties defenderId set
 */
export function markNodeCasualty(casualties, defenderId) {
  if (defenderId) casualties.add(defenderId);
}

export function isNodeCasualty(casualties, defenderId) {
  return defenderId ? casualties.has(defenderId) : false;
}

export function clearNodeCasualties(casualties) {
  casualties.clear();
}

/** After node victory — update campaign progress and save field. */
export function completeNode(progress, mapIndex, nodeIndex, fieldState) {
  const prevMapsUnlocked = progress.mapsUnlocked;
  const run = getMapRun(progress, mapIndex);
  if (!run.nodesCleared.includes(nodeIndex)) {
    run.nodesCleared.push(nodeIndex);
    run.nodesCleared.sort((a, b) => a - b);
  }
  run.fieldState = fieldState;

  let mapCompleted = false;
  let newRegionUnlocked = null;
  const meta = getCampaignMapMeta(mapIndex);
  if (meta && isMapComplete(progress, mapIndex)) {
    mapCompleted = true;
    if (!progress.clearedMaps.includes(mapIndex)) {
      progress.clearedMaps.push(mapIndex);
      progress.clearedMaps.sort((a, b) => a - b);
    }
    const nextUnlock = mapIndex + 2;
    if (nextUnlock > prevMapsUnlocked) {
      progress.mapsUnlocked = Math.min(nextUnlock, 100);
      newRegionUnlocked = progress.mapsUnlocked - 1;
    }
  }
  progress.currentMapIndex  = mapIndex;
  progress.currentNodeIndex = null;
  return { progress, mapCompleted, newRegionUnlocked };
}

export function startNodeAttack(progress, mapIndex, nodeIndex) {
  progress.currentMapIndex  = mapIndex;
  progress.currentNodeIndex = nodeIndex;
  return buildNodeWavePlan(mapIndex, nodeIndex);
}

export { createEmptyCampaignProgress, getCampaignMapMeta, getMapRun, MAX_FIELD_HEROES, MAX_FIELD_STRUCTURES };
