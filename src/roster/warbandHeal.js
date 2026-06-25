/**
 * Hydda warband healing — restores hero combatHp for allies in range.
 */

import { isHeroTowerType } from '../campaign/campaignRun.js';

export const HYDDA_HEAL_RANGE = 96;

/** HP restored per heal pulse (before level scaling). */
export function getHyddaHealAmount(healerLevel = 1) {
  return Math.round(28 + healerLevel * 12);
}

/**
 * Pick up to `count` warband heroes in heal range, lowest HP% first.
 * @returns {{ target: object, amount: number }[]}
 */
export function pickWarbandHealTargets(healer, towers, count, {
  healRange = HYDDA_HEAL_RANGE,
  healAmount = getHyddaHealAmount(healer.level),
  isCasualty = () => false,
} = {}) {
  const rangeSq = healRange * healRange;
  const candidates = [];

  for (const t of towers) {
    if (t === healer) continue;
    if (!isHeroTowerType(t.type)) continue;
    if (isCasualty(t.defenderId)) continue;
    if ((t.combatHp ?? 1) <= 0) continue;
    if (t.combatMaxHp == null || t.combatHp == null) continue;
    if (t.combatHp >= t.combatMaxHp) continue;

    const dx = t.x - healer.x;
    const dy = t.y - healer.y;
    if (dx * dx + dy * dy > rangeSq) continue;

    candidates.push({
      target: t,
      frac: t.combatHp / t.combatMaxHp,
    });
  }

  candidates.sort((a, b) => a.frac - b.frac);

  const out = [];
  for (let i = 0; i < Math.min(count, candidates.length); i++) {
    const t = candidates[i].target;
    const gained = Math.min(healAmount, t.combatMaxHp - t.combatHp);
    if (gained > 0) out.push({ target: t, amount: gained });
  }
  return out;
}
