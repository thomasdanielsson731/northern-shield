/**
 * The First Saga — Region 1 vertical slice (linear west road, A0–A4 + Settlement).
 * @see design/the_first_saga.md
 */

import { getMapRun } from './campaignMaps.js';

export const FIRST_SAGA_MAP_INDEX = 0;
export const FIRST_SAGA_A2_NODE = 2;
export const FIRST_SAGA_A3_NODE = 3;
export const FIRST_SAGA_A4_NODE = 4;
export const FIRST_SAGA_ASSAULT_COUNT = 5;
export const FIRST_SAGA_SETTLEMENT_NODE = 5;
export const FIRST_SAGA_DISPLAY_NODE_COUNT = 6;

/** Fixed assault chain — west front only. */
export const FIRST_SAGA_ASSAULTS = [
  { nodeIndex: 0, frontId: 'west', assaultIndex: 0, codename: 'First Night',  tierLabel: 'A0',      waveCount: 1, isBoss: false },
  { nodeIndex: 1, frontId: 'west', assaultIndex: 1, codename: 'Wolf Smoke', tierLabel: 'A1',      waveCount: 2, isBoss: false },
  { nodeIndex: 2, frontId: 'west', assaultIndex: 2, codename: 'Splinter',     tierLabel: 'A2',      waveCount: 2, isBoss: false },
  { nodeIndex: 3, frontId: 'west', assaultIndex: 3, codename: 'Mended Wood',  tierLabel: 'A3',      waveCount: 2, isBoss: false },
  { nodeIndex: 4, frontId: 'west', assaultIndex: 4, codename: 'Ash-Warden',   tierLabel: 'Boss',    waveCount: 3, isBoss: true },
];

export const FIRST_SAGA_SETTLEMENT = {
  nodeIndex: FIRST_SAGA_SETTLEMENT_NODE,
  codename: 'Settlement Oath',
  tierLabel: 'Finale',
  isCeremony: true,
};

export function isFirstSagaMap(mapIndex) {
  return mapIndex === FIRST_SAGA_MAP_INDEX;
}

export function isFirstSagaAssaultNode(nodeIndex) {
  return nodeIndex >= 0 && nodeIndex < FIRST_SAGA_ASSAULT_COUNT;
}

export function getFirstSagaAssault(nodeIndex) {
  return FIRST_SAGA_ASSAULTS.find(a => a.nodeIndex === nodeIndex) ?? null;
}

export function getFirstSagaBossConfig() {
  return { name: 'ASH-WARDEN', hp: 900, reward: 120 };
}

/** Design enemy aliases — raiders/wolves/draugr use distinct types with tuned HP. */
const SAGA_RAIDER = 'raider';
const SAGA_WOLF   = 'warg';
const SAGA_DRAUGR = 'draugr';

function sagaPack(type, count, hpScale = 1, speedScale = 1) {
  return Array.from({ length: count }, () => ({ type, hpScale, speedScale }));
}

/**
 * Explicit spawn compositions per assault (design/the_first_saga.md §6).
 * Entries are `{ type, hpScale }` objects; boss waves include `__nodeBoss`.
 */
export function buildFirstSagaSpawnQueue(nodeIndex, waveSpec) {
  const w = waveSpec?.waveInNode ?? 1;
  if (nodeIndex === 0 && w === 1) {
    return sagaPack(SAGA_RAIDER, 6, 0.42);
  }
  if (nodeIndex === 1) {
    // Wargs rush warband — slash speed/HP so one Berserker survives two-wave teach after A0.
    if (w === 1) return sagaPack(SAGA_WOLF, 6, 0.72, 0.50);
    if (w === 2) return [
      ...sagaPack(SAGA_WOLF, 2, 0.66, 0.48),
      ...sagaPack(SAGA_RAIDER, 2, 0.55, 1),
    ];
  }
  if (nodeIndex === 2) {
    // Gate-teach: fewer bodies, slower approach — one Berserker must hold the PORT.
    if (w === 1) return sagaPack(SAGA_RAIDER, 4, 0.55, 0.82);
    if (w === 2) return sagaPack(SAGA_RAIDER, 5, 0.60, 0.85);
  }
  if (nodeIndex === 3) {
    if (w === 1) return sagaPack(SAGA_DRAUGR, 7, 0.88);
    if (w === 2) return sagaPack(SAGA_DRAUGR, 7, 0.96);
  }
  if (nodeIndex === 4) {
    if (w === 1) return sagaPack(SAGA_DRAUGR, 6, 0.88);
    if (w === 2) return [...sagaPack(SAGA_DRAUGR, 4, 1.0), ...sagaPack(SAGA_WOLF, 2, 0.92)];
    if (w === 3 && waveSpec?.isBoss) {
      return [
        ...sagaPack(SAGA_WOLF, 2, 0.90),
        ...sagaPack(SAGA_DRAUGR, 2, 0.90),
        { __nodeBoss: true, mapIndex: FIRST_SAGA_MAP_INDEX },
      ];
    }
  }
  return null;
}

/** Global wave bands for saga assaults — avoids generic campaign difficulty curve. */
export function getFirstSagaWaveBands(nodeIndex, waveInNode = 1) {
  const base = [
    { hp: 0.70, speed: 0.86 },
    { hp: 0.66, speed: 0.76 },
    { hp: 0.86, speed: 0.94 },
    { hp: 0.92, speed: 0.96 },
    { hp: 1.00, speed: 1.00 },
  ][nodeIndex] ?? { hp: 1, speed: 1 };
  const waveBump = nodeIndex <= 1 ? 0 : (waveInNode - 1) * 0.03;
  return {
    hp:    Math.round((base.hp + waveBump) * 100) / 100,
    speed: Math.round((base.speed + waveBump * 0.5) * 100) / 100,
  };
}

/** Slower spawns on early assaults so a lone hero can barely keep up. */
export function getFirstSagaSpawnGap(nodeIndex, waveInNode = 1) {
  if (nodeIndex === 0) return 24;
  if (nodeIndex === 1) return waveInNode >= 2 ? 32 : 26;
  if (nodeIndex === 2) return waveInNode >= 2 ? 36 : 30;
  return 14;
}

/** Breather between waves inside one assault (game ticks @ 30/s). */
export function getFirstSagaWaveBreakFrames(nodeIndex) {
  if (nodeIndex === 1) return 150;
  if (nodeIndex === 2) return 150;
  return 60;
}

/** Between-wave hero refill on early saga assaults (wave-1 attrition teach). */
export function getFirstSagaBetweenWaveHealFraction(nodeIndex) {
  if (nodeIndex === 0) return 0;
  if (nodeIndex === 1) return 0.45;
  if (nodeIndex === 2) return 0.50;
  return 0;
}

/** Tighter rampart pool early — victory still needs ≥1 life. */
export function getFirstSagaStartingLives(nodeIndex) {
  if (nodeIndex === 0) return 5;
  if (nodeIndex === 1) return 7;
  if (nodeIndex === 2) return 8;
  if (nodeIndex === 3) return 7;
  return 8;
}

/** Extra gate HP at assault start — A2 teach survives first raider pile-up. */
export function getFirstSagaGateHpBonus(nodeIndex) {
  if (nodeIndex === 2) return 50;
  return 0;
}

/** Melee damage multiplier on fortress targets during saga assaults. */
export function getFirstSagaMeleeDamageScale(nodeIndex) {
  if (nodeIndex === 2) return 0.62;
  if (nodeIndex === 1) return 0.85;
  return 1;
}

export function buildFirstSagaWavePlan(nodeIndex) {
  const assault = getFirstSagaAssault(nodeIndex);
  if (!assault) return null;
  const waves = [];
  for (let w = 1; w <= assault.waveCount; w++) {
    waves.push({
      waveInNode: w,
      isBoss: assault.isBoss && w === assault.waveCount,
      difficulty: 0.10 + nodeIndex * 0.09 + (w - 1) * 0.05,
      tutorial: nodeIndex === 0 && w === 1,
    });
  }
  return {
    waves,
    nodeCount: FIRST_SAGA_ASSAULT_COUNT,
    isLastNode: nodeIndex === FIRST_SAGA_A4_NODE,
    waveCount: assault.waveCount,
    tutorial: nodeIndex === 0,
  };
}

/** Linear west-front layout — no north/east/south assaults. */
export function getFirstSagaFrontLayout() {
  const fronts = {
    west:  { assaults: [...FIRST_SAGA_ASSAULTS] },
    north: { assaults: [] },
    east:  { assaults: [] },
    south: { assaults: [] },
  };
  const nodeToAssault = {};
  for (const assault of FIRST_SAGA_ASSAULTS) {
    nodeToAssault[assault.nodeIndex] = {
      frontId: 'west',
      assaultIndex: assault.assaultIndex,
      isBoss: assault.isBoss,
    };
  }
  return {
    mapIndex: FIRST_SAGA_MAP_INDEX,
    nodeCount: FIRST_SAGA_ASSAULT_COUNT,
    fronts,
    nodeToAssault,
    bossIndex: FIRST_SAGA_A4_NODE,
    firstSaga: true,
  };
}

export function isFirstSagaSettlementReady(progress, mapIndex = FIRST_SAGA_MAP_INDEX) {
  if (!isFirstSagaMap(mapIndex)) return false;
  const run = getMapRun(progress, mapIndex);
  return run.nodesCleared.includes(FIRST_SAGA_A4_NODE);
}

export function ensureFirstSagaState(campaignState) {
  if (!campaignState) return { settlementComplete: false, stoneWallPlaced: false };
  if (!campaignState.firstSaga) {
    campaignState.firstSaga = {
      settlementComplete: false,
      stoneWallPlaced: false,
      recruit2Named: false,
      heroNamed: false,
    };
  }
  if (campaignState.firstSaga.heroNamed == null) {
    campaignState.firstSaga.heroNamed = false;
  }
  return campaignState.firstSaga;
}

export function isFirstSagaSettlementComplete(campaignState) {
  return !!ensureFirstSagaState(campaignState).settlementComplete;
}

export function isFirstSagaRecruitUnlocked(campaignState) {
  return isFirstSagaSettlementComplete(campaignState);
}

export function getFirstSagaRecruitTypes() {
  return ['valkyrie', 'military'];
}

export function isFirstSagaSliceLockedRegion(mapIndex) {
  return mapIndex > FIRST_SAGA_MAP_INDEX;
}

export function isFirstSagaMapComplete(progress, campaignState) {
  if (!isFirstSagaSettlementComplete(campaignState)) return false;
  const run = getMapRun(progress, FIRST_SAGA_MAP_INDEX);
  return FIRST_SAGA_ASSAULTS.every(a => run.nodesCleared.includes(a.nodeIndex));
}
