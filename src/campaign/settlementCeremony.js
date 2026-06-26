/**
 * Settlement Oath ceremony — post-A4 non-combat finale (First Saga).
 * @see design/the_first_saga.md §Finale
 */

import {
  FIRST_SAGA_A4_NODE,
  FIRST_SAGA_MAP_INDEX,
  ensureFirstSagaState,
  getFirstSagaRecruitTypes,
  isFirstSagaMap,
} from './firstSaga.js';

export const SETTLEMENT_STAGE_COUNT = 6;

export const SETTLEMENT_STAGES = [
  {
    id: 'debrief',
    title: 'After the Ash-Warden',
    prose: 'Ash-Warden fell. The west road is quiet — for now.',
    cta: 'Continue',
  },
  {
    id: 'stone',
    title: 'First Stone',
    prose: 'The palisade on the west face becomes stone. Elsewhere, timber still — but the kingdom has a spine.',
    cta: 'Raise the wall',
  },
  {
    id: 'refugees',
    title: 'The Road',
    prose: 'Families on the road. The Longhouse must grow. We are no longer alone.',
    cta: 'Open the gates',
  },
  {
    id: 'recruit_pick',
    title: 'A Second Sword',
    prose: 'Choose who stands watch beside your Berserker.',
    cta: null,
  },
  {
    id: 'recruit_name',
    title: 'Naming',
    prose: 'The wall will remember this name.',
    cta: 'Swear the oath',
  },
  {
    id: 'complete',
    title: 'Saga I — The Settlement',
    prose: 'Refugees came. The west face is stone. The North learned our name.',
    cta: 'Continue',
  },
];

export function getSettlementStage(step) {
  return SETTLEMENT_STAGES[step] ?? null;
}

export function shouldOfferSettlementCeremony(campaignState, mapIndex, clearedNodeIndex) {
  if (!isFirstSagaMap(mapIndex)) return false;
  if (clearedNodeIndex !== FIRST_SAGA_A4_NODE) return false;
  return !ensureFirstSagaState(campaignState).settlementComplete;
}

export function applySettlementComplete(campaignState, { recruitType, recruitName } = {}) {
  const fs = ensureFirstSagaState(campaignState);
  fs.settlementComplete = true;
  fs.stoneWallPlaced = true;
  if (recruitType) fs.recruit2Type = recruitType;
  if (recruitName) fs.recruit2Named = true;

  if (!campaignState.chronicle) campaignState.chronicle = { battles: [], warbandName: '' };
  campaignState.chronicle.sagaChapter = 'Saga I — The Settlement';
  campaignState.chronicle.settlementProse = SETTLEMENT_STAGES[5].prose;

  campaignState.fortressUpgrades = {
    ...(campaignState.fortressUpgrades ?? {}),
    longhouse: Math.max(campaignState.fortressUpgrades?.longhouse ?? 0, 2),
    wallworks: Math.max(campaignState.fortressUpgrades?.wallworks ?? 0, 1),
  };

  return campaignState;
}

export function validateSettlementRecruitType(type) {
  return getFirstSagaRecruitTypes().includes(type);
}

export function validateSettlementName(name) {
  const trimmed = (name ?? '').trim();
  return trimmed.length >= 2 && trimmed.length <= 16;
}
