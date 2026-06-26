/**
 * Defensive posts — Fortress Preparation assignments map to grid cells for combat.
 * See design/DEFENSIVE_POSTS.md in outer repo.
 */

import { isHeroTowerType } from '../campaign/campaignRun.js';
import { chebyshevDist } from '../roster/heroRoles.js';

export const FORTRESS_RING_R_DEFAULT = 5;
export const MAX_HERO_POSTS_FILLED = 6;
export const MAX_SIEGE_POSTS_FILLED = 4;

export const HERO_POST_IDS = [
  'west_gate', 'east_gate', 'north_gate', 'south_gate',
  'north_wall', 'south_wall', 'watch_tower', 'inner_keep',
];

export const SIEGE_POST_IDS = [
  'ballista_platform', 'catapult_platform', 'gate_fixture',
];

export const ALL_POST_IDS = [...HERO_POST_IDS, ...SIEGE_POST_IDS];

export const POST_DEFS = {
  west_gate:          { label: 'West Gate',       kind: 'hero',  roleHint: 'gatekeeper' },
  east_gate:          { label: 'East Gate',       kind: 'hero',  roleHint: 'gatekeeper' },
  north_gate:         { label: 'North Gate',      kind: 'hero',  roleHint: 'gatekeeper' },
  south_gate:         { label: 'South Gate',      kind: 'hero',  roleHint: 'gatekeeper' },
  north_wall:         { label: 'North Wall',      kind: 'hero',  roleHint: 'wallkeeper' },
  south_wall:         { label: 'South Wall',      kind: 'hero',  roleHint: 'wallkeeper' },
  watch_tower:        { label: 'Watch Tower',     kind: 'hero',  roleHint: 'scout' },
  inner_keep:         { label: 'Inner Keep',      kind: 'hero',  roleHint: 'quartermaster' },
  ballista_platform:  { label: 'Ballista Platform', kind: 'siege', structureDefault: 'military' },
  catapult_platform:  { label: 'Catapult Platform', kind: 'siege', structureDefault: 'catapult' },
  gate_fixture:       { label: 'Port / Gate',     kind: 'siege', structureDefault: 'gate' },
};

const FRONT_TO_GATE = {
  west:  'west_gate',
  east:  'east_gate',
  north: 'north_gate',
  south: 'south_gate',
};

export function getPrimaryGateForFront(frontId) {
  return FRONT_TO_GATE[frontId] ?? 'west_gate';
}

/** Grid cell for a post relative to fortress goal and ring radius. */
export function resolvePostCell(postId, goal, ringR = FORTRESS_RING_R_DEFAULT) {
  const gc = goal.col;
  const gr = goal.row;
  switch (postId) {
    case 'west_gate':         return { col: gc - ringR, row: gr };
    case 'east_gate':         return { col: gc + ringR, row: gr };
    case 'north_gate':        return { col: gc, row: gr - ringR };
    case 'south_gate':        return { col: gc, row: gr + ringR };
    case 'north_wall':        return { col: gc - 2, row: gr - ringR };
    case 'south_wall':        return { col: gc + 2, row: gr + ringR };
    case 'watch_tower':       return { col: gc + ringR - 1, row: gr - ringR + 1 };
    case 'inner_keep':        return { col: gc, row: gr - 1 };
    case 'ballista_platform': return { col: gc - ringR, row: gr - 2 };
    case 'catapult_platform': return { col: gc + ringR, row: gr + 2 };
    case 'gate_fixture':      return { col: gc - ringR, row: gr };
    default:                  return { col: gc, row: gr };
  }
}

export function resolvePostCellForFront(postId, goal, frontId, ringR = FORTRESS_RING_R_DEFAULT) {
  if (postId === 'gate_fixture') {
    return resolvePostCell(getPrimaryGateForFront(frontId), goal, ringR);
  }
  return resolvePostCell(postId, goal, ringR);
}

export function assignDefender(assignments, postId, defenderId) {
  const next = { ...assignments };
  if (!HERO_POST_IDS.includes(postId)) return next;
  for (const pid of HERO_POST_IDS) {
    if (next[pid]?.defenderId === defenderId) delete next[pid];
  }
  if (defenderId == null) delete next[postId];
  else next[postId] = { defenderId };
  return next;
}

export function assignStructure(assignments, postId, structureType, level = 1) {
  const next = { ...assignments };
  if (!SIEGE_POST_IDS.includes(postId)) return next;
  if (!structureType) delete next[postId];
  else next[postId] = { structureType, level };
  return next;
}

export function clearPost(assignments, postId) {
  const next = { ...assignments };
  delete next[postId];
  return next;
}

export function validateAssignments(assignments, options = {}) {
  const {
    requireGate = false,
    minHeroes = 1,
    maxHeroes = MAX_HERO_POSTS_FILLED,
    maxSiege = MAX_SIEGE_POSTS_FILLED,
  } = options;
  const errors = [];
  let heroCount = 0;
  let siegeCount = 0;
  const usedDefenders = new Set();

  for (const postId of HERO_POST_IDS) {
    const a = assignments?.[postId];
    if (!a?.defenderId) continue;
    heroCount++;
    if (usedDefenders.has(a.defenderId)) {
      errors.push('Each defender can hold only one post');
    }
    usedDefenders.add(a.defenderId);
  }
  if (heroCount < minHeroes) errors.push('Assign at least one hero to a post');
  if (heroCount > maxHeroes) errors.push(`Maximum ${maxHeroes} heroes on posts`);

  for (const postId of SIEGE_POST_IDS) {
    if (assignments?.[postId]?.structureType) siegeCount++;
  }
  if (siegeCount > maxSiege) errors.push(`Maximum ${maxSiege} siege placements`);

  if (requireGate && !assignments?.gate_fixture?.structureType) {
    errors.push('Place a gate before assault');
  }

  return { ok: errors.length === 0, errors, heroCount, siegeCount };
}

function rosterDefenders(roster) {
  if (!roster) return [];
  return Array.isArray(roster) ? roster : (roster.defenders ?? []);
}

/** Plain tower objects for restoreCampaignField / serializeFieldState. */
export function buildTowerPlacements(assignments, roster, goal, options = {}) {
  const { frontId = 'west', ringR = FORTRESS_RING_R_DEFAULT } = options;
  const byId = new Map(rosterDefenders(roster).map(d => [d.defenderId, d]));
  const towers = [];

  for (const postId of HERO_POST_IDS) {
    const a = assignments?.[postId];
    if (!a?.defenderId) continue;
    const def = byId.get(a.defenderId);
    if (!def) continue;
    const cell = resolvePostCell(postId, goal, ringR);
    towers.push({
      type:       def.type,
      col:        cell.col,
      row:        cell.row,
      level:      def.careerLevel ?? 1,
      defenderId: def.defenderId,
      name:       def.name ?? null,
      rune:       null,
      itemRune:   null,
    });
  }

  for (const postId of SIEGE_POST_IDS) {
    const a = assignments?.[postId];
    if (!a?.structureType || postId === 'gate_fixture') continue;
    const cell = resolvePostCell(postId, goal, ringR);
    towers.push({
      type:       a.structureType,
      col:        cell.col,
      row:        cell.row,
      level:      a.level ?? 1,
      defenderId: null,
      name:       null,
      rune:       null,
      itemRune:   null,
    });
  }

  return towers;
}

/** Nearest post for legacy tower positions (save migration). */
export function inferPostAssignmentsFromTowers(fieldState, goal, ringR = FORTRESS_RING_R_DEFAULT) {
  const assignments = {};
  const towers = fieldState?.towers ?? [];
  const usedPosts = new Set();

  for (const t of towers) {
    if (!isHeroTowerType(t.type) || !t.defenderId) continue;
    let bestId = null;
    let bestDist = Infinity;
    for (const postId of HERO_POST_IDS) {
      if (usedPosts.has(postId)) continue;
      const cell = resolvePostCell(postId, goal, ringR);
      const d = chebyshevDist(t.col, t.row, cell.col, cell.row);
      if (d < bestDist) { bestDist = d; bestId = postId; }
    }
    if (bestId != null && bestDist <= 3) {
      assignments[bestId] = { defenderId: t.defenderId };
      usedPosts.add(bestId);
    }
  }

  for (const t of towers) {
    if (isHeroTowerType(t.type)) continue;
    let bestId = null;
    let bestDist = Infinity;
    for (const postId of SIEGE_POST_IDS) {
      if (postId === 'gate_fixture' || usedPosts.has(postId)) continue;
      const cell = resolvePostCell(postId, goal, ringR);
      const d = chebyshevDist(t.col, t.row, cell.col, cell.row);
      if (d < bestDist) { bestDist = d; bestId = postId; }
    }
    if (bestId != null && bestDist <= 3) {
      assignments[bestId] = { structureType: t.type, level: t.level ?? 1 };
      usedPosts.add(bestId);
    }
  }

  return assignments;
}

export function countAssignedHeroes(assignments) {
  return HERO_POST_IDS.filter(id => assignments?.[id]?.defenderId).length;
}

export function getAssignedDefenderId(assignments, postId) {
  return assignments?.[postId]?.defenderId ?? null;
}
