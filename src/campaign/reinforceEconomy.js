/**
 * Late-campaign gold sink — prepaid reinforce walls for skirmish (THRALL-01).
 * @see agents/boards/sessions/2026-06-23-all-agents-board.md
 */

import { FORTRESS_DEFS } from '../fortress/fortress.js';

export const REINFORCE_COST = 30;
export const REINFORCE_BATTLES = 3;
export const REINFORCE_WAVES = 3;
export const MAX_REINFORCE_WALLS = 3;

export function isFortressFullyUpgraded(fortressUpgrades = {}) {
  return Object.keys(FORTRESS_DEFS).every(
    k => (fortressUpgrades[k] ?? 0) >= (FORTRESS_DEFS[k]?.maxLevel ?? 0),
  );
}

/** Show REINFORCE purchase in War Camp when reserve gold needs a sink. */
export function canOfferReinforcePurchase(state) {
  if (!state) return false;
  if ((state.reinforceBattlesLeft ?? 0) > 0) return false;
  if ((state.goldReserve ?? 0) < REINFORCE_COST) return false;
  if ((state.battlesCompleted ?? 0) < 8) return false;
  return isFortressFullyUpgraded(state.fortressUpgrades)
    || (state.goldReserve ?? 0) >= 150;
}

export function purchaseReinforce(state) {
  if (!canOfferReinforcePurchase(state)) return { ok: false, reason: 'unavailable' };
  return {
    ok: true,
    state: {
      ...state,
      goldReserve: (state.goldReserve ?? 0) - REINFORCE_COST,
      reinforceBattlesLeft: REINFORCE_BATTLES,
    },
  };
}

export function tickReinforceAfterBattle(state) {
  const left = state?.reinforceBattlesLeft ?? 0;
  if (left <= 0) return state;
  return { ...state, reinforceBattlesLeft: left - 1 };
}

export function countReinforceWalls(wallData = {}) {
  return Object.values(wallData).filter(w => w.temporary).length;
}

export function canPlaceReinforceWall({ reinforceBattlesLeft, wallData, isSkirmish }) {
  if (!isSkirmish) return false;
  if ((reinforceBattlesLeft ?? 0) <= 0) return false;
  return countReinforceWalls(wallData) < MAX_REINFORCE_WALLS;
}
