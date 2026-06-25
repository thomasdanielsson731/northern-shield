/**
 * Fortress roles — zone-based bonuses for deployed heroes.
 * MVP: six roles assigned in War Camp.
 */

import { isHeroTowerType } from '../campaign/campaignRun.js';

export const FORTRESS_ROLE_IDS = [
  'gatekeeper', 'wallkeeper', 'scout', 'quartermaster', 'rune_keeper', 'chieftain_hunter',
];

export const FORTRESS_ROLES = {
  gatekeeper:       { label: 'Gatekeeper',       short: 'GATE',  color: '#e8a040', desc: '+12% dmg near portals' },
  wallkeeper:       { label: 'Wallkeeper',       short: 'WALL',  color: '#a0a8b0', desc: '+15% dmg on walls' },
  scout:            { label: 'Scout',            short: 'SCOUT', color: '#80c0e8', desc: '+1 event preview' },
  quartermaster:    { label: 'Quartermaster',    short: 'QM',    color: '#c0a030', desc: '+3g per wave' },
  rune_keeper:      { label: 'Rune Keeper',      short: 'RUNE',  color: '#a080e0', desc: 'Faster shrine stars' },
  chieftain_hunter: { label: 'Chieftain Hunter', short: 'HUNT',  color: '#e06040', desc: '+20% boss dmg' },
};

export const DEFAULT_FORTRESS_ROLE_BY_CLASS = {
  berserk:  'gatekeeper',
  valkyrie: 'wallkeeper',
  military: 'scout',
  hydda:    'quartermaster',
  blondie:  'scout',
  isjatten: 'chieftain_hunter',
};

const PASSIVE_STRUCT_TYPES = new Set(['runeshrine', 'barracks', 'mine', 'watchtower']);

export function getDefaultFortressRole(classType) {
  return DEFAULT_FORTRESS_ROLE_BY_CLASS[classType] ?? 'gatekeeper';
}

export function cycleFortressRole(current) {
  const idx = FORTRESS_ROLE_IDS.indexOf(current);
  const next = idx < 0 ? 0 : (idx + 1) % FORTRESS_ROLE_IDS.length;
  return FORTRESS_ROLE_IDS[next];
}

export function chebyshevDist(c1, r1, c2, r2) {
  return Math.max(Math.abs(c1 - c2), Math.abs(r1 - r2));
}

export function getPortalCells(spawn, extraSpawns = []) {
  const cells = [{ col: spawn.col, row: spawn.row }];
  for (const es of extraSpawns) {
    cells.push({ col: es.col, row: es.row });
  }
  return cells;
}

export function isInGateZone(col, row, portalCells, radius = 4) {
  return portalCells.some(p => chebyshevDist(col, row, p.col, p.row) <= radius);
}

export function isInCoreZone(col, row, goal, radius = 3) {
  return chebyshevDist(col, row, goal.col, goal.row) <= radius;
}

export function isAdjacentToWall(col, row, wallData) {
  for (const key of Object.keys(wallData ?? {})) {
    const [wc, wr] = key.split('_').map(Number);
    if (chebyshevDist(col, row, wc, wr) <= 1) return true;
  }
  return false;
}

export function isOnFortressRing(col, row, goal, radius = 5) {
  return chebyshevDist(col, row, goal.col, goal.row) === radius;
}

export function isInWallZone(col, row, wallData, goal) {
  return isAdjacentToWall(col, row, wallData) || isOnFortressRing(col, row, goal);
}

export function isNearStructure(col, row, towers, radius = 2) {
  for (const t of towers ?? []) {
    if (!PASSIVE_STRUCT_TYPES.has(t.type)) continue;
    if (chebyshevDist(col, row, t.col, t.row) <= radius) return true;
  }
  return false;
}

export function isRoleInZone(roleId, col, row, { portalCells, wallData, goal, towers }) {
  switch (roleId) {
    case 'gatekeeper':       return isInGateZone(col, row, portalCells);
    case 'wallkeeper':       return isInWallZone(col, row, wallData, goal);
    case 'scout':            return isNearStructure(col, row, towers) || isInGateZone(col, row, portalCells, 6);
    case 'quartermaster':    return isInCoreZone(col, row, goal) || isNearStructure(col, row, towers, 3);
    case 'rune_keeper':      return isNearStructure(col, row, towers?.filter(t => t.type === 'runeshrine'), 2);
    case 'chieftain_hunter': return true;
    default:                 return false;
  }
}

/** Combat damage multiplier from fortress role when in zone. */
export function getFortressRoleDamageMult(defender, col, row, ctx) {
  const role = defender?.fortressRole;
  if (!role || !FORTRESS_ROLES[role]) return 1;
  if (!isRoleInZone(role, col, row, ctx)) return 1;
  switch (role) {
    case 'gatekeeper':       return 1.12;
    case 'wallkeeper':       return 1.15;
    case 'scout':            return 1.05;
    case 'quartermaster':    return 1.04;
    case 'rune_keeper':      return 1.06;
    case 'chieftain_hunter': return ctx.targetIsBoss ? 1.20 : 1.08;
    default:                 return 1;
  }
}

export function countDeployedRoleBonus(towers, roster, roleId) {
  let n = 0;
  for (const t of towers ?? []) {
    if (!isHeroTowerType(t.type)) continue;
    const def = roster?.find?.(t.defenderId) ?? roster?.defenders?.find(d => d.defenderId === t.defenderId);
    if (def?.fortressRole === roleId) n++;
  }
  return n;
}
