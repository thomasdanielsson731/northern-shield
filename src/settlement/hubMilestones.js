/**
 * Hub building unlock rules — progression milestones, not assault prep.
 */

import { isFirstSagaRecruitUnlocked, isFirstSagaMap } from '../campaign/firstSaga.js';

/** @typedef {'command'|'warband'|'fortress'|'recruit'|'runeSmith'|'chronicle'|'skirmish'|'slots'} HubBuildingId */

/**
 * Milestone availability for a hub building.
 * @returns {{ available: boolean, reason?: string, pulse?: boolean, banner?: string }}
 */
export function getHubBuildingMilestone(id, state = {}) {
  const {
    campaignState,
    chronicleCount = 0,
    chronicleUnread = false,
    battlesCompleted = 0,
    simplifiedSaga = false,
    mapIndex = 0,
    hubPulseBuilding = null,
    stars = 0,
    skirmishDiscovered = false,
  } = state;

  if (id === hubPulseBuilding) {
    return { available: true, pulse: true, banner: 'NEW' };
  }

  if (id === 'slots') {
    return { available: true };
  }

  if (id === 'command') {
    if (battlesCompleted === 0 && simplifiedSaga) {
      return {
        available: true,
        pulse: true,
        reason: 'Sound the horn — First Night awaits.',
        banner: 'FIRST ASSAULT',
      };
    }
    return { available: true };
  }

  if (id === 'warband') {
    if (battlesCompleted === 0 && simplifiedSaga) {
      return {
        available: true,
        reason: 'Your lone defender awaits naming after First Night.',
      };
    }
    return { available: true, banner: battlesCompleted > 0 ? 'WARBAND' : null };
  }

  if (id === 'fortress') {
    if (simplifiedSaga && battlesCompleted < 1) {
      return {
        available: false,
        reason: 'Fortress opens after First Night.',
      };
    }
    if (simplifiedSaga && battlesCompleted === 1) {
      return {
        available: true,
        pulse: true,
        reason: 'Reserve gold unlocked — upgrade the palisade.',
        banner: 'FORTRESS OPEN',
      };
    }
    return { available: true };
  }

  if (id === 'recruit') {
    if (simplifiedSaga && !isFirstSagaRecruitUnlocked(campaignState)) {
      return {
        available: false,
        reason: 'Barracks open after the Settlement Oath.',
      };
    }
    if (hubPulseBuilding === 'recruit') {
      return { available: true, pulse: true, banner: 'RECRUIT OPEN' };
    }
    return { available: true };
  }

  if (id === 'runeSmith') {
    if (simplifiedSaga && isFirstSagaMap(mapIndex)) {
      return { available: false, reason: 'The forge sleeps until Saga II.' };
    }
    if (stars <= 0) {
      return { available: false, reason: 'Earn stars in battle to forge runes.' };
    }
    return { available: true, banner: 'RUNE SMITH' };
  }

  if (id === 'chronicle') {
    if (chronicleCount <= 0) {
      return { available: false, reason: 'No battles recorded yet.' };
    }
    if (chronicleUnread) {
      return { available: true, pulse: true, unread: true, banner: 'NEW ENTRY' };
    }
    return { available: true, banner: chronicleCount === 1 ? 'FIRST ENTRY' : null };
  }

  if (id === 'skirmish') {
    if (simplifiedSaga && battlesCompleted < 2 && !skirmishDiscovered) {
      return { available: false, reason: 'Classic TD unlocks after your second assault.' };
    }
    return { available: true };
  }

  return { available: true };
}

/** Map hub building id → progression interior tab/mode. */
export function hubBuildingToProgressionMode(id) {
  const map = {
    warband: 'warband',
    fortress: 'fortress',
    recruit: 'recruit',
    runeSmith: 'runeSmith',
    chronicle: 'warband',
  };
  return map[id] ?? null;
}

export function getProgressionBuildingTitle(mode) {
  const titles = {
    warband: 'HALL OF HEROES',
    recruit: 'BARRACKS',
    fortress: 'FORTRESS',
    runeSmith: 'RUNE SMITH',
  };
  return titles[mode] ?? 'SETTLEMENT';
}
