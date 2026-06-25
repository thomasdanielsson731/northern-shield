/**
 * Campaign assault deployment rules — when heroes can be placed or leveled.
 */

/** True during prep before wave 1 of an assault (placement / recall allowed). */
export function isAssaultDeployPhase(campaignNodeMode, waveNumber, waveState) {
  if (!campaignNodeMode) return true;
  return waveNumber === 0 && waveState === 'countdown';
}

/** Hero level upgrades only in War Camp between assaults. */
export function canUpgradeHeroLevelBetweenAssaults(gamePhase, campaignWarCamp) {
  return gamePhase === 'betweenBattles' && campaignWarCamp;
}
