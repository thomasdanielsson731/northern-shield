/**
 * Military command map — four fronts, named assaults, per-front progression.
 */

import {
  createRng,
  getMapSeed,
  getNodeCountForMap,
  getWaveCountForNode,
  getMapRun,
} from './campaignMaps.js';

export const FRONT_IDS = ['west', 'north', 'east', 'south'];

export const FRONT_LABELS = {
  west:  'WEST FRONT',
  north: 'NORTH FRONT',
  east:  'EAST FRONT',
  south: 'SOUTH FRONT',
};

const ASSAULT_PREFIXES = [
  'Draugr', 'Iron', 'Jötunn', 'Nidhogg', 'Ash', 'Frost', 'Wolf', 'Rune',
  'Bone', 'Blood', 'Shadow', 'Storm', 'Grim', 'Void', 'Ember', 'Hollow',
];

const ASSAULT_SUFFIXES = [
  'Incursion', 'Horde', 'Assault', 'Cult', 'Raiders', 'March', 'Legion',
  'Swarm', 'Pact', 'Host', 'Wake', 'Tide', 'Omen', 'Fury',
];

const TIER_TYPES = ['Raid', 'Raid', 'Skirmish', 'Siege'];

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

const _layoutCache = new Map();

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

/** Deterministic assault codename e.g. "Draugr Incursion". */
export function getAssaultCodename(mapIndex, nodeIndex) {
  const rng = createRng(getMapSeed(mapIndex) + nodeIndex * 7919 + 17);
  return `${pick(rng, ASSAULT_PREFIXES)} ${pick(rng, ASSAULT_SUFFIXES)}`;
}

/** Display tier: Raid I, Siege III, Boss. */
export function getAssaultTierLabel(assaultIndex, isBoss) {
  if (isBoss) return 'Boss';
  const type = TIER_TYPES[assaultIndex % TIER_TYPES.length];
  const num  = ROMAN[assaultIndex] ?? String(assaultIndex + 1);
  return `${type} ${num}`;
}

/**
 * Build front layout for a map. Boss assault is always the last entry on SOUTH front.
 * Other nodes round-robin across all four fronts (boss node excluded from round-robin).
 */
export function getFrontLayout(mapIndex) {
  const key = String(mapIndex);
  if (_layoutCache.has(key)) return _layoutCache.get(key);

  const nodeCount = getNodeCountForMap(mapIndex);
  const bossIndex   = nodeCount - 1;
  const fronts = Object.fromEntries(FRONT_IDS.map(id => [id, { assaults: [] }]));
  const nodeToAssault = {};

  const nonBoss = [];
  for (let i = 0; i < bossIndex; i++) nonBoss.push(i);

  nonBoss.forEach((nodeIndex, i) => {
    const frontId = FRONT_IDS[i % FRONT_IDS.length];
    const assaultIndex = fronts[frontId].assaults.length;
    const isBoss = false;
    const assault = {
      nodeIndex,
      frontId,
      assaultIndex,
      codename: getAssaultCodename(mapIndex, nodeIndex),
      tierLabel: getAssaultTierLabel(assaultIndex, false),
      waveCount: getWaveCountForNode(mapIndex, nodeIndex),
      isBoss,
    };
    fronts[frontId].assaults.push(assault);
    nodeToAssault[nodeIndex] = { frontId, assaultIndex, isBoss };
  });

  // Boss on south front
  const southIdx = fronts.south.assaults.length;
  const bossAssault = {
    nodeIndex: bossIndex,
    frontId:   'south',
    assaultIndex: southIdx,
    codename:  getAssaultCodename(mapIndex, bossIndex),
    tierLabel: 'Boss',
    waveCount: getWaveCountForNode(mapIndex, bossIndex),
    isBoss:    true,
  };
  fronts.south.assaults.push(bossAssault);
  nodeToAssault[bossIndex] = { frontId: 'south', assaultIndex: southIdx, isBoss: true };

  const layout = { mapIndex, nodeCount, fronts, nodeToAssault, bossIndex };
  _layoutCache.set(key, layout);
  return layout;
}

/** Map must be unlocked in campaign select; assaults use per-front chains. */
export function isAssaultUnlocked(progress, mapIndex, nodeIndex) {
  if (mapIndex >= progress.mapsUnlocked) return false;
  const layout = getFrontLayout(mapIndex);
  const info   = layout.nodeToAssault[nodeIndex];
  if (!info) return false;
  if (info.assaultIndex === 0) return true;

  const run  = getMapRun(progress, mapIndex);
  const front = layout.fronts[info.frontId];
  const prev  = front.assaults[info.assaultIndex - 1];
  return run.nodesCleared.includes(prev.nodeIndex);
}

/** Replace linear node unlock for assault UI (keeps same export name for callers). */
export function isNodeUnlocked(progress, mapIndex, nodeIndex) {
  return isAssaultUnlocked(progress, mapIndex, nodeIndex);
}

export function getAssaultInfo(mapIndex, nodeIndex) {
  const layout = getFrontLayout(mapIndex);
  const meta   = layout.nodeToAssault[nodeIndex];
  if (!meta) return null;
  const front = layout.fronts[meta.frontId];
  return front.assaults[meta.assaultIndex];
}

export function getFrontProgress(front, nodesCleared) {
  const cleared = front.assaults.filter(a => nodesCleared.includes(a.nodeIndex)).length;
  const total   = front.assaults.length;
  return { cleared, total, frac: total > 0 ? cleared / total : 0 };
}

/** Next playable assault anywhere on the map (prefers same front as last cleared). */
export function getNextAvailableAssault(progress, mapIndex, preferFrontId = null) {
  const layout = getFrontLayout(mapIndex);
  const run    = getMapRun(progress, mapIndex);
  const order  = preferFrontId
    ? [preferFrontId, ...FRONT_IDS.filter(f => f !== preferFrontId)]
    : FRONT_IDS;

  for (const frontId of order) {
    const front = layout.fronts[frontId];
    for (const assault of front.assaults) {
      if (run.nodesCleared.includes(assault.nodeIndex)) continue;
      if (!isAssaultUnlocked(progress, mapIndex, assault.nodeIndex)) continue;
      return assault;
    }
  }
  return null;
}

/** Short status line for command map front card. */
export function getFrontStatusLine(front, progress, mapIndex, portalCount) {
  const run = getMapRun(progress, mapIndex);
  const { cleared, total } = getFrontProgress(front, run.nodesCleared);
  if (cleared >= total) return 'SECURED';

  const active = front.assaults.find(
    a => !run.nodesCleared.includes(a.nodeIndex)
      && isAssaultUnlocked(progress, mapIndex, a.nodeIndex)
  );
  if (!active) return 'BLOCKED';

  if (active.isBoss) return active.codename;

  const frontId = front.assaults[0]?.frontId;
  if (frontId === 'west') return active.tierLabel;
  if (frontId === 'north' && portalCount >= 2) return 'Portal 2';
  if (frontId === 'east' && portalCount >= 1) return 'Portal 1';
  if (frontId === 'south' && !active.isBoss) return 'Cult activity';

  return active.codename;
}

export function getFrontSubtitle(front, progress, mapIndex, portalCount) {
  const run = getMapRun(progress, mapIndex);
  const { cleared, total, frac } = getFrontProgress(front, run.nodesCleared);

  if (cleared >= total) return 'SECURED';

  const active = front.assaults.find(
    a => !run.nodesCleared.includes(a.nodeIndex)
      && isAssaultUnlocked(progress, mapIndex, a.nodeIndex)
  );
  if (!active) return 'BLOCKED';

  const frontId = front.assaults[0]?.frontId;
  if (frontId === 'west') return '█'.repeat(Math.max(2, Math.round(frac * 8)));
  if (frontId === 'north') return portalCount >= 2 ? `${portalCount} portals` : active.codename;
  if (frontId === 'east') return active.tierLabel;
  if (frontId === 'south') return active.isBoss ? 'FINAL BOSS' : active.codename;

  return `${cleared}/${total} assaults`;
}
