/**
 * Post-A0 hero naming ceremony — First Saga vertical slice.
 * @see design/the_first_saga.md · design/FORTRESS_AS_UI.md §Ceremony
 */

import { getMapRun } from './campaignMaps.js';
import {
  ensureFirstSagaState,
  isFirstSagaMap,
} from './firstSaga.js';
import { validateSettlementName } from './settlementCeremony.js';

export const HERO_NAMING_TITLE = 'First Night Survived';
export const HERO_NAMING_SKALD = 'He held the west gate alone. The fire still burns.';
export const HERO_NAMING_PROMPT = 'The wall will remember this name.';
export const HERO_NAMING_CTA = 'Swear the name';

export function validateHeroName(name) {
  return validateSettlementName(name);
}

export function getUnnamedSagaHero(roster) {
  if (!roster?.defenders?.length) return null;
  return roster.defenders.find(d => !d.name?.trim()) ?? null;
}

/** True when A0 is cleared but the starter hero still has no name. */
export function shouldOfferHeroNaming(campaignState, roster, mapIndex) {
  if (!isFirstSagaMap(mapIndex)) return false;
  if (ensureFirstSagaState(campaignState).heroNamed) return false;
  if (!getUnnamedSagaHero(roster)) return false;
  const progress = campaignState?.campaignProgress;
  if (!progress) return false;
  const run = getMapRun(progress, mapIndex);
  return run?.nodesCleared?.includes(0) ?? false;
}

export function applyHeroNaming(campaignState, roster, defenderId, name) {
  const trimmed = (name ?? '').trim();
  if (!validateHeroName(trimmed)) return false;
  const def = roster?.find?.(defenderId) ?? roster?.defenders?.find(d => d.defenderId === defenderId);
  if (!def) return false;
  def.name = trimmed.slice(0, 16);
  ensureFirstSagaState(campaignState).heroNamed = true;
  if (campaignState.chronicle && !campaignState.chronicle.warbandName) {
    campaignState.chronicle.warbandName = def.name;
  }
  campaignState.defenders = roster.toJSON?.() ?? roster.defenders;
  return true;
}
