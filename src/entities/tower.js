import { Bullet } from './bullet.js';

const TOWER_STATS = {
  RANGE: 96,
  FIRE_RATE: 24,
  DAMAGE: 35,
  RADIUS: 6,
  BULLET_SPEED: 7
};

export class Tower {
  constructor(x, y, col, row) {
    this.x = x;
    this.y = y;
    this.col = col;
    this.row = row;
    this.range = TOWER_STATS.RANGE;
    this.fireCooldown = 0;
    this.fireRate = TOWER_STATS.FIRE_RATE;
    this.damage = TOWER_STATS.DAMAGE;
    this.radius = TOWER_STATS.RADIUS;
    this.bulletSpeed = TOWER_STATS.BULLET_SPEED;
  }

  update(enemies, bullets = null) {
    if (this.fireCooldown > 0) {
      this.fireCooldown--;
      return 0;
    }

    let target = null;
    let bestProgress = -1;
    let bestDistSq = this.range * this.range;

    for (const enemy of enemies) {
      if (!enemy.alive || enemy.reached) continue;
      const dx = enemy.x - this.x;
      const dy = enemy.y - this.y;
      const distSq = dx * dx + dy * dy;
      const progress = enemy.pathIndex ?? 0;
      if (distSq > this.range * this.range) continue;

      if (progress > bestProgress || (progress === bestProgress && distSq < bestDistSq)) {
        bestProgress = progress;
        bestDistSq = distSq;
        target = enemy;
      }
    }

    if (!target) return 0;

    if (Array.isArray(bullets)) {
      bullets.push(new Bullet(this.x, this.y, target, this.damage, this.bulletSpeed));
      this.fireCooldown = this.fireRate;
      return 0;
    }

    target.hp -= this.damage;
    this.fireCooldown = this.fireRate;

    if (target.hp <= 0) {
      target.hp = 0;
      target.alive = false;
      return 1;
    }

    return 0;
  }

  draw(ctx) {
    ctx.fillStyle = '#49f';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(80, 160, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.range, 0, Math.PI * 2);
    ctx.stroke();
  }
}
