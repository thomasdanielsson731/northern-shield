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
    };
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
