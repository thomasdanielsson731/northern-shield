/**
 * Warband hero combat movement — melee closes to contact, ranged holds at attack range.
 */

import { isHeroTowerType } from '../campaign/campaignRun.js';

const MELEE_TYPES = new Set(['berserk']);

/** Support heroes hold their deploy cell — no advance toward enemies. */
const STATIONARY_TYPES = new Set(['hydda']);

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

/**
 * Advance hero toward the nearest enemy during active combat.
 * Updates tower.x/y and aimAngle; does not mutate grid occupancy.
 */
export function updateHeroMovement(tower, enemies, fieldW, fieldH) {
  if (!isHeroTowerType(tower.type)) return;
  if (STATIONARY_TYPES.has(tower.type)) return;
  const hit = findNearestLivingEnemy(tower, enemies);
  if (!hit) return;

  const { enemy, dist } = hit;
  const stop = getHeroStopDistance(tower);
  const dx = enemy.x - tower.x;
  const dy = enemy.y - tower.y;

  if (dist <= stop) {
    tower.aimAngle = Math.atan2(dy, dx);
    return;
  }

  const step = Math.min(getHeroMoveSpeed(tower.type), dist - stop);
  const len  = dist || 1;
  const margin = 10;
  tower.x = Math.max(margin, Math.min(fieldW - margin, tower.x + (dx / len) * step));
  tower.y = Math.max(margin, Math.min(fieldH - margin, tower.y + (dy / len) * step));
  tower.aimAngle = Math.atan2(dy, dx);
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
