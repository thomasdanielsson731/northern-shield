/**
 * Fortress roles — zone-based bonuses for deployed heroes.
 * v2: 20 roles (6 MVP + 14 specialist/story) + 4 role synergy pairs.
 * @see design/FORTRESS_ROLES.md
 */

import { isHeroTowerType } from '../campaign/campaignRun.js';

export const FORTRESS_ROLE_IDS = [
  // MVP six
  'gatekeeper', 'wallkeeper', 'scout', 'quartermaster', 'rune_keeper', 'chieftain_hunter',
  // v2 specialists
  'citadel_warden', 'bulwark', 'lane_captain', 'beacon_keeper', 'siege_captain', 'miners_mate',
  // Squad/story
  'rally_master', 'vanguard', 'shield_brother', 'frost_warden', 'field_surgeon',
  'herald_breaker', 'breacher', 'reserve_captain',
];

export const FORTRESS_ROLES = {
  gatekeeper:       { label: 'Gatekeeper',       short: 'GATE',  color: '#e8a040', desc: '+12% dmg near portals' },
  wallkeeper:       { label: 'Wallkeeper',       short: 'WALL',  color: '#a0a8b0', desc: '+15% dmg on walls' },
  scout:            { label: 'Scout',            short: 'SCOUT', color: '#80c0e8', desc: '+1 event preview' },
  quartermaster:    { label: 'Quartermaster',    short: 'QM',    color: '#c0a030', desc: '+3g per wave' },
  rune_keeper:      { label: 'Rune Keeper',      short: 'RUNE',  color: '#a080e0', desc: 'Faster shrine stars' },
  chieftain_hunter: { label: 'Chieftain Hunter', short: 'HUNT',  color: '#e06040', desc: '+20% boss dmg' },
  citadel_warden:   { label: 'Citadel Warden',   short: 'CWRD',  color: '#8090c0', desc: '+12% dmg in the core; +8% more beside a Wallkeeper' },
  bulwark:          { label: 'Bulwark',          short: 'BULW',  color: '#909090', desc: '+14% dmg on the wall' },
  lane_captain:     { label: 'Lane Captain',     short: 'LANE',  color: '#e0b060', desc: '+10% dmg near portals' },
  beacon_keeper:    { label: 'Beacon Keeper',    short: 'BCON',  color: '#70d0d0', desc: '+10% dmg near outposts' },
  siege_captain:    { label: 'Siege Captain',    short: 'SIEG',  color: '#c07040', desc: '+14% dmg near siege engines' },
  miners_mate:      { label: "Miner's Mate",     short: 'MINE',  color: '#b08050', desc: '+10% dmg near mines/shrines' },
  rally_master:     { label: 'Rally Master',     short: 'RALY',  color: '#e8c060', desc: '+6% dmg anywhere in the fortress' },
  vanguard:         { label: 'Vanguard',         short: 'VANG',  color: '#e04040', desc: '+15% dmg outside every zone — leads the charge' },
  shield_brother:   { label: 'Shield-Brother',   short: 'SHLD',  color: '#80a0e0', desc: '+10% dmg beside another hero' },
  frost_warden:     { label: 'Frost Warden',     short: 'FRST',  color: '#90c0e8', desc: '+10% dmg on the wall' },
  field_surgeon:    { label: 'Field Surgeon',    short: 'SURG',  color: '#70c090', desc: '+8% dmg in the core' },
  herald_breaker:   { label: 'Herald Breaker',   short: 'HRLD',  color: '#c86050', desc: '+12% dmg vs bosses; +10% more beside a Chieftain Hunter' },
  breacher:         { label: 'Breacher',         short: 'BRCH',  color: '#d07030', desc: '+14% dmg near portals' },
  reserve_captain:  { label: 'Reserve Captain',  short: 'RSRV',  color: '#a08060', desc: '+10% dmg near outposts' },
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
const SIEGE_STRUCT_TYPES   = new Set(['catapult', 'drakship', 'piltorn']);
const ECONOMY_STRUCT_TYPES = new Set(['mine', 'runeshrine']);

/** Role synergy pairs (design/FORTRESS_ROLES.md "Synergies") — asymmetric:
 * only the listed role gains the bonus when its partner is deployed within range. */
const ROLE_SYNERGY = {
  gatekeeper:     { with: 'scout',            mult: 1.05, name: 'The Pass' },
  scout:          { with: 'gatekeeper',       mult: 1.05, name: 'The Pass' },
  citadel_warden: { with: 'wallkeeper',       mult: 1.08, name: 'Inner Ring' },
  chieftain_hunter: { with: 'herald_breaker', mult: 1.10, name: 'The Hunt' },
  herald_breaker: { with: 'chieftain_hunter', mult: 1.10, name: 'The Hunt' },
};
const ROLE_SYNERGY_RANGE = 4;

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

export function isNearStructureOfTypes(col, row, towers, typeSet, radius = 2) {
  for (const t of towers ?? []) {
    if (!typeSet.has(t.type)) continue;
    if (chebyshevDist(col, row, t.col, t.row) <= radius) return true;
  }
  return false;
}

/** Another deployed hero within range (excludes self by cell match). */
export function isAdjacentToHero(col, row, towers, radius = 1) {
  for (const t of towers ?? []) {
    if (!isHeroTowerType(t.type)) continue;
    if (t.col === col && t.row === row) continue;
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
    case 'citadel_warden':   return isInCoreZone(col, row, goal);
    case 'bulwark':          return isInWallZone(col, row, wallData, goal);
    case 'lane_captain':     return isInGateZone(col, row, portalCells);
    case 'beacon_keeper':    return isNearStructure(col, row, towers);
    case 'siege_captain':    return isNearStructureOfTypes(col, row, towers, SIEGE_STRUCT_TYPES, 3);
    case 'miners_mate':      return isNearStructureOfTypes(col, row, towers, ECONOMY_STRUCT_TYPES, 2);
    case 'rally_master':     return isInCoreZone(col, row, goal, 10);
    case 'vanguard':         return !isInGateZone(col, row, portalCells)
      && !isInWallZone(col, row, wallData, goal)
      && !isInCoreZone(col, row, goal);
    case 'shield_brother':   return isAdjacentToHero(col, row, towers);
    case 'frost_warden':     return isInWallZone(col, row, wallData, goal);
    case 'field_surgeon':    return isInCoreZone(col, row, goal);
    case 'herald_breaker':   return true;
    case 'breacher':         return isInGateZone(col, row, portalCells);
    case 'reserve_captain':  return isNearStructure(col, row, towers);
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
    case 'citadel_warden':   return 1.12;
    case 'bulwark':          return 1.14;
    case 'lane_captain':     return 1.10;
    case 'beacon_keeper':    return 1.10;
    case 'siege_captain':    return 1.14;
    case 'miners_mate':      return 1.10;
    case 'rally_master':     return 1.06;
    case 'vanguard':         return 1.15;
    case 'shield_brother':   return 1.10;
    case 'frost_warden':     return 1.10;
    case 'field_surgeon':    return 1.08;
    case 'herald_breaker':   return ctx.targetIsBoss ? 1.12 : 1.0;
    case 'breacher':         return 1.14;
    case 'reserve_captain':  return 1.10;
    default:                 return 1;
  }
}

/** Role-pair synergy multiplier — partner role deployed within ROLE_SYNERGY_RANGE cells.
 * design/FORTRESS_ROLES.md "Synergies": asymmetric, only the listed role benefits. */
export function getRoleSynergyDamageMult(defender, col, row, { towers, roster }) {
  const role = defender?.fortressRole;
  const syn = role && ROLE_SYNERGY[role];
  if (!syn || !roster) return 1;
  for (const t of towers ?? []) {
    if (!isHeroTowerType(t.type) || !t.defenderId || t.defenderId === defender.defenderId) continue;
    const partner = typeof roster.find === 'function' ? roster.find(t.defenderId) : null;
    if (partner?.fortressRole !== syn.with) continue;
    if (chebyshevDist(col, row, t.col, t.row) <= ROLE_SYNERGY_RANGE) return syn.mult;
  }
  return 1;
}

export function countDeployedRoleBonus(towers, roster, roleId) {
  let n = 0;
  for (const t of towers ?? []) {
    if (!isHeroTowerType(t.type)) continue;
    const def = roster?.find?.(d => d.defenderId === t.defenderId)
      ?? roster?.defenders?.find(d => d.defenderId === t.defenderId);
    if (def?.fortressRole === roleId) n++;
  }
  return n;
}
