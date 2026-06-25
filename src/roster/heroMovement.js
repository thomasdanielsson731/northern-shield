/**
 * Warband hero combat movement — melee closes to contact, ranged holds at attack range,
 * healers chase wounded allies then advance with the line.
 */

import { isHeroTowerType } from '../campaign/campaignRun.js';
import { findWoundedWarbandTarget, HYDDA_HEAL_RANGE } from './warbandHeal.js';

const MELEE_TYPES = new Set(['berserk']);
const HEALER_TYPES  = new Set(['hydda']);

const MOVE_SPEED_MELEE  = 1.85;
const MOVE_SPEED_RANGED = 1.45;

export function isHeroMeleeType(type) {
  return MELEE_TYPES.has(type);
}

/** Distance at which the hero stops advancing and attacks. */
export function getHeroStopDistance(tower) {
  if (tower.type === 'hydda') return 52;
  const r = tower.range ?? 0;
  if (isHeroMeleeType(tower.type)) return Math.max(14, r * 0.90);
  if (r <= 0) return 40;
  return Math.max(28, r * 0.92);
}

export function getHeroMoveSpeed(type) {
  if (HEALER_TYPES.has(type)) return MOVE_SPEED_RANGED;
  return isHeroMeleeType(type) ? MOVE_SPEED_MELEE : MOVE_SPEED_RANGED;
}

export function findNearestLivingEnemy(tower, enemies) {
  let best = null;
  let bestD  = Infinity;
  for (const e of enemies) {
    if (!e.alive || e.reached) continue;
    const d = (e.x - tower.x) ** 2 + (e.y - tower.y) ** 2;
    if (d < bestD) { bestD = d; best = e; }
  }
  return best ? { enemy: best, dist: Math.sqrt(bestD) } : null;
}

function advanceToward(tower, tx, ty, stopDist, speed, fieldW, fieldH) {
  const dx = tx - tower.x;
  const dy = ty - tower.y;
  const dist = Math.hypot(dx, dy);
  tower.aimAngle = Math.atan2(dy, dx);
  if (dist <= stopDist) return;

  const step = Math.min(speed, dist - stopDist);
  const len  = dist || 1;
  const margin = 10;
  tower.x = Math.max(margin, Math.min(fieldW - margin, tower.x + (dx / len) * step));
  tower.y = Math.max(margin, Math.min(fieldH - margin, tower.y + (dy / len) * step));
}

function updateHealerMovement(healer, enemies, fieldW, fieldH, { warband = [], isCasualty = () => false } = {}) {
  const wounded = findWoundedWarbandTarget(healer, warband, { isCasualty });
  if (wounded) {
    advanceToward(
      healer, wounded.x, wounded.y,
      HYDDA_HEAL_RANGE * 0.88,
      getHeroMoveSpeed('hydda'),
      fieldW, fieldH,
    );
    return;
  }

  const hit = findNearestLivingEnemy(healer, enemies);
  if (!hit) return;
  advanceToward(
    healer, hit.enemy.x, hit.enemy.y,
    getHeroStopDistance(healer),
    getHeroMoveSpeed('hydda'),
    fieldW, fieldH,
  );
}

/**
 * Advance hero toward the nearest enemy during active combat.
 * Healers prioritize wounded warband allies, then follow the line toward enemies.
 * Updates tower.x/y and aimAngle; does not mutate grid occupancy.
 */
export function updateHeroMovement(tower, enemies, fieldW, fieldH, opts = {}) {
  if (!isHeroTowerType(tower.type)) return;

  if (HEALER_TYPES.has(tower.type)) {
    updateHealerMovement(tower, enemies, fieldW, fieldH, opts);
    return;
  }

  const hit = findNearestLivingEnemy(tower, enemies);
  if (!hit) return;

  advanceToward(
    tower, hit.enemy.x, hit.enemy.y,
    getHeroStopDistance(tower),
    getHeroMoveSpeed(tower.type),
    fieldW, fieldH,
  );
}

/** Reset floating combat position to deploy cell center between waves. */
export function snapHeroToDeployCell(tower, cellSize) {
  if (!isHeroTowerType(tower.type)) return;
  tower.x = tower.col * cellSize + cellSize / 2;
  tower.y = tower.row * cellSize + cellSize / 2;
}

/** Return every deployed hero to their grid cell (between waves). */
export function snapWarbandToDeploy(towers, cellSize) {
  for (const t of towers) snapHeroToDeployCell(t, cellSize);
}
