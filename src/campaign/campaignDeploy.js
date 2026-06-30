/**
 * Campaign assault deployment rules — when heroes can be placed or leveled.
 */

/** True during prep before wave 1 of an assault (placement / recall allowed). */
export function isAssaultDeployPhase(campaignNodeMode, waveNumber, waveState) {
  // Campaign assault uses fortressPrep posts only — no grid deploy between horn and waves.
  if (campaignNodeMode) return false;
  return waveNumber === 0 && waveState === 'countdown';
}

/** Hero level upgrades only in War Camp between assaults. */
export function canUpgradeHeroLevelBetweenAssaults(gamePhase, campaignWarCamp) {
  return gamePhase === 'betweenBattles' && campaignWarCamp;
}
