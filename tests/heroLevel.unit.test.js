import { describe, it, expect } from 'vitest';
import {
  MAX_HERO_LEVEL,
  getHeroLevelStatMultipliers,
  getHeroUpgradeCost,
  getHyddaHealCount,
  isHeroLevelMax,
  isHeroLevelMilestone,
} from '../src/roster/heroLevel.js';
import {
  isAssaultDeployPhase,
  canUpgradeHeroLevelBetweenAssaults,
} from '../src/campaign/campaignDeploy.js';

describe('heroLevel', () => {
  it('caps at level 100', () => {
    expect(isHeroLevelMax(100)).toBe(true);
    expect(isHeroLevelMax(99)).toBe(false);
    expect(getHeroUpgradeCost(64, 100)).toBe(0);
  });

  it('stats grow with level and slow at high tiers', () => {
    const low  = getHeroLevelStatMultipliers(5);
    const mid  = getHeroLevelStatMultipliers(25);
    const high = getHeroLevelStatMultipliers(100);
    expect(mid.dmgMult).toBeGreaterThan(low.dmgMult);
    expect(high.dmgMult).toBeGreaterThan(mid.dmgMult);
    const jumpEarly = getHeroLevelStatMultipliers(6).dmgMult / low.dmgMult;
    const jumpLate  = getHeroLevelStatMultipliers(60).dmgMult / getHeroLevelStatMultipliers(59).dmgMult;
    expect(jumpLate).toBeLessThan(jumpEarly);
  });

  it('upgrade cost rises with level', () => {
    expect(getHeroUpgradeCost(50, 1)).toBeLessThan(getHeroUpgradeCost(50, 50));
  });

  it('hydda heal count scales at milestones', () => {
    expect(getHyddaHealCount(1)).toBe(1);
    expect(getHyddaHealCount(5)).toBe(2);
    expect(getHyddaHealCount(50)).toBe(3);
  });

  it('marks milestone levels', () => {
    expect(isHeroLevelMilestone(25)).toBe(true);
    expect(isHeroLevelMilestone(24)).toBe(false);
  });
});

describe('campaignDeploy', () => {
  it('campaign assault uses fortressPrep posts only — no grid deploy phase', () => {
    expect(isAssaultDeployPhase(true, 0, 'countdown')).toBe(false);
    expect(isAssaultDeployPhase(true, 0, 'break')).toBe(false);
    expect(isAssaultDeployPhase(true, 1, 'active')).toBe(false);
  });

  it('skirmish allows deploy before wave 1 countdown ends', () => {
    expect(isAssaultDeployPhase(false, 0, 'countdown')).toBe(true);
    expect(isAssaultDeployPhase(false, 0, 'break')).toBe(false);
    expect(isAssaultDeployPhase(false, 5, 'active')).toBe(false);
  });

  it('hero upgrades only in War Camp between assaults', () => {
    expect(canUpgradeHeroLevelBetweenAssaults('betweenBattles', true)).toBe(true);
    expect(canUpgradeHeroLevelBetweenAssaults('playing', true)).toBe(false);
    expect(canUpgradeHeroLevelBetweenAssaults('betweenBattles', false)).toBe(false);
  });
});
