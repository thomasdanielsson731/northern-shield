/**
 * Combat feel — hit-stop, damage knock, pathless dust, lane wear, lunge, death flair.
 */

const _footDust = [];
const MAX_DUST = 72;
const _laneWear = [];
const MAX_WEAR = 48;

export function isOnPathlessLane(x, y, spawn, goal, cellSize) {
  if (!spawn || !goal) return false;
  const laneCy = (spawn.row + 0.5) * cellSize;
  if (Math.abs(y - laneCy) > cellSize * 1.5) return false;
  const col = x / cellSize;
  return col >= spawn.col - 0.15 && col <= goal.col + 1.25;
}

export function emitPathlessFootDust(x, y, strength = 1, { campaign = false } = {}) {
  if (_footDust.length >= MAX_DUST) _footDust.shift();
  const boost = campaign ? 1.35 : 1;
  _footDust.push({
    x: x + (Math.random() - 0.5) * 6,
    y: y + 1,
    vx: (Math.random() - 0.5) * 0.55,
    vy: -0.15 - Math.random() * 0.35,
    life: 14 + Math.random() * 12,
    maxLife: 26,
    r: (1.4 + Math.random() * 2.4 * strength) * boost,
    alpha: (0.28 + strength * 0.18) * boost,
  });
}

export function emitLaneWearMark(x, y, strength = 1) {
  if (_laneWear.length >= MAX_WEAR) _laneWear.shift();
  _laneWear.push({
    x, y,
    r: 2 + strength * 2.5,
    alpha: 0.14 + strength * 0.08,
    life: 420 + Math.random() * 120,
    maxLife: 540,
  });
}

export function tickPathlessFootDust() {
  for (let i = _footDust.length - 1; i >= 0; i--) {
    const p = _footDust[i];
    p.life -= 1;
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.02;
    if (p.life <= 0) _footDust.splice(i, 1);
  }
}

export function tickLaneWearMarks() {
  for (let i = _laneWear.length - 1; i >= 0; i--) {
    _laneWear[i].life -= 1;
    if (_laneWear[i].life <= 0) _laneWear.splice(i, 1);
  }
}

export function drawLaneWearMarks(ctx) {
  for (const w of _laneWear) {
    const t = Math.max(0, w.life / w.maxLife);
    ctx.fillStyle = `rgba(90,68,38,${w.alpha * (0.35 + t * 0.65)})`;
    ctx.beginPath();
    ctx.ellipse(w.x, w.y, w.r * (0.5 + t * 0.5), w.r * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawPathlessFootDust(ctx) {
  for (const p of _footDust) {
    const t = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = `rgba(168,128,78,${p.alpha * t})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * (0.35 + t * 0.65), 0, Math.PI * 2);
    ctx.fill();
  }
}

export function clearPathlessFootDust() {
  _footDust.length = 0;
  _laneWear.length = 0;
}

/** Screen shake + micro hit-stop for a damage event. */
export function computeHitFeel(damage, { isCrit = false, isKill = false, isBossHit = false, campaign = false } = {}) {
  let shake = 0;
  let hitStop = 0;

  if (campaign) {
    if (isCrit && isKill) { shake = 10; hitStop = 3; }
    else if (isCrit) { shake = 8; hitStop = 2; }
    else if (isKill) { shake = 7; hitStop = 2; }
    else if (damage >= 18) { shake = 5; hitStop = 1; }
    else if (damage >= 8) { shake = 3; hitStop = 1; }
    else if (damage >= 4) { shake = 2; }
    if (isBossHit && damage >= 12) {
      shake = Math.max(shake, 8);
      hitStop = Math.max(hitStop, 2);
    }
    return { shake, hitStop };
  }

  if (isCrit && isKill) {
    shake = 9;
    hitStop = 3;
  } else if (isCrit) {
    shake = 7;
    hitStop = 2;
  } else if (isKill && damage >= 35) {
    shake = 5;
    hitStop = 2;
  } else if (damage >= 80) {
    shake = 6;
    hitStop = 2;
  } else if (damage >= 45) {
    shake = 4;
    hitStop = 1;
  } else if (damage >= 22) {
    shake = 2;
  }
  if (isBossHit && damage >= 25) {
    shake = Math.max(shake, 7);
    hitStop = Math.max(hitStop, 2);
  }
  return { shake, hitStop };
}

/** Brief recoil + vertical hop when an enemy takes damage. */
export function applyEnemyHitKnock(enemy, damage, fromX, fromY, { campaign = false } = {}) {
  if (!enemy) return;
  const dying = !enemy.alive && (enemy.deathTimer ?? 0) > 0;
  if (!enemy.alive && !dying) return;

  const hopScale = campaign ? 1.15 : 1;
  const hop = Math.min(10, (2 + damage * 0.08) * hopScale);
  enemy.hitHop = hop;
  enemy.hitHopMax = Math.max(enemy.hitHopMax ?? 0, hop);

  const minDmg = campaign ? 4 : 6;
  if (damage < minDmg || dying) return;

  let dx = enemy.x - fromX;
  let dy = enemy.y - fromY;
  const len = Math.hypot(dx, dy);
  if (len < 0.01) {
    const nxt = enemy.path?.[enemy.pathIndex + 1];
    if (nxt) {
      dx = enemy.x - nxt.x;
      dy = enemy.y - nxt.y;
    } else {
      dx = 1;
      dy = 0;
    }
  }
  const push = Math.min(campaign ? 4 : 3.4, (campaign ? 0.9 : 0.7) + damage * 0.035);
  const dlen = Math.hypot(dx, dy) || 1;
  enemy.staggerVX = (dx / dlen) * push;
  enemy.staggerVY = (dy / dlen) * push * 0.3;
  enemy.staggerTimer = Math.max(enemy.staggerTimer ?? 0, Math.min(8, 2 + Math.floor(damage / (campaign ? 12 : 16))));
}

export function tickEnemyHitHop(enemy) {
  if ((enemy.hitHop ?? 0) > 0) {
    enemy.hitHop = Math.max(0, enemy.hitHop - 0.75);
  }
}

export function getEnemyHopOffset(enemy) {
  const max = enemy.hitHopMax ?? 0;
  const hop = enemy.hitHop ?? 0;
  if (max <= 0 || hop <= 0) return 0;
  const t = 1 - hop / max;
  return -Math.sin(t * Math.PI) * Math.min(8, max * 0.95);
}

/** Hero attack lunge toward target on fire. */
export function triggerHeroAttackLunge(tower, targetX, targetY) {
  if (!tower) return;
  let dx = targetX - tower.x;
  let dy = targetY - tower.y;
  const len = Math.hypot(dx, dy) || 1;
  dx /= len;
  dy /= len;
  tower._lungeMax = 7;
  tower._lunge = 7;
  tower._lungeDx = dx;
  tower._lungeDy = dy;
}

export function tickHeroAttackLunge(tower) {
  if ((tower._lunge ?? 0) > 0) tower._lunge -= 1;
}

export function getHeroLungeOffset(tower) {
  const max = tower._lungeMax ?? 0;
  const rem = tower._lunge ?? 0;
  if (max <= 0 || rem <= 0) return { x: 0, y: 0 };
  const t = 1 - rem / max;
  const mag = Math.sin(t * Math.PI) * 7;
  return {
    x: (tower._lungeDx ?? 0) * mag,
    y: (tower._lungeDy ?? 0) * mag,
  };
}

/** Per-type death flair — returns particle burst specs for game.spawnParticles. */
export function getEnemyDeathFlair(type, x, y, highlightColor = '#c0a060') {
  const base = { x, y };
  switch (type) {
    case 'warg':
      return {
        particles: [
          { ...base, color: '#906838', count: 6, spread: 2.2 },
          { ...base, color: '#604020', count: 4, spread: 1.4 },
        ],
        slide: { dx: 14, dy: 0, life: 6 },
      };
    case 'raider':
      return {
        particles: [
          { ...base, color: highlightColor, count: 5, spread: 1.6 },
          { ...base, color: '#806040', count: 3, spread: 1 },
        ],
        slide: { dx: 10, dy: 2, life: 5 },
      };
    case 'draugr':
      return {
        particles: [
          { ...base, color: '#90603c', count: 7, spread: 1.2 },
          { ...base, color: '#a8c8d8', count: 4, spread: 0.8 },
        ],
      };
    case 'myling':
      return {
        particles: [
          { ...base, color: '#a8d8ff', count: 8, spread: 1.8 },
          { ...base, color: '#ffffff', count: 4, spread: 1 },
        ],
        float: { vy: -0.4, life: 12 },
      };
    case 'jotunn':
      return {
        particles: [
          { ...base, color: '#8a7a68', count: 12, spread: 2.4 },
          { ...base, color: '#ffffff', count: 6, spread: 1.6 },
        ],
        shake: 8,
      };
    case 'mara':
      return {
        particles: [
          { ...base, color: '#8060a0', count: 6, spread: 1.5 },
          { ...base, color: '#402040', count: 4, spread: 1 },
        ],
      };
    default:
      return {
        particles: [{ ...base, color: highlightColor, count: 5, spread: 1.2 }],
      };
  }
}

/** Apply death flair to a dying enemy (slide/float) and return extra particles. */
export function applyEnemyDeathFlair(enemy, type) {
  const flair = getEnemyDeathFlair(type, enemy.x, enemy.y, enemy.highlightColor ?? enemy.color);
  if (flair.slide) {
    enemy.staggerVX = flair.slide.dx * 0.35;
    enemy.staggerVY = flair.slide.dy * 0.35;
    enemy.staggerTimer = flair.slide.life;
  }
  if (flair.float) {
    enemy.staggerVY = flair.float.vy;
    enemy.staggerTimer = flair.float.life;
  }
  return flair;
}
