/**
 * Normalize where a save slot should land after selection.
 * Handles legacy session phases (war camp, bare campaignSelect) from pre-hub builds.
 */

/** @returns {'settlementHub'|string} phase to apply, or same phase when unchanged */
export function resolveSlotLandingPhase(gamePhase, { mapIndex = 0, battleResult = null } = {}) {
  if (
    gamePhase === 'settlementHub'
    || gamePhase === 'nodeMap'
    || gamePhase === 'fortressPrep'
    || gamePhase === 'mapSelect'
    || gamePhase === 'settlementCeremony'
    || gamePhase === 'heroNamingCeremony'
    || gamePhase === 'playing'
  ) {
    return gamePhase;
  }

  if (gamePhase === 'betweenBattles') return 'settlementHub';
  if (gamePhase === 'debrief' && !battleResult) return 'settlementHub';
  if (gamePhase === 'campaignSelect' && mapIndex === 0) return 'settlementHub';

  return gamePhase;
}

/** Defaults when a slot has campaign data but no valid session blob. */
export function defaultSessionForOrphanCampaign() {
  return {
    version: 1,
    gamePhase: 'settlementHub',
    campaignMapIndex: 0,
    campaignNodeIndex: 0,
    campaignRegionActive: true,
    campaignMapPage: 0,
    selectedMapIdx: 0,
    returnToNodeMapAfterDebrief: false,
  };
}
