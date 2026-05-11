export class Tower {
  constructor(x, y, col, row) {
    this.x = x;
    this.y = y;
    this.col = col;
    this.row = row;
    this.range = 96;
    this.fireCooldown = 0;
    this.fireRate = 24;
    this.damage = 35;
    this.radius = 6;
  }

  update(enemies) {
    if (this.fireCooldown > 0) {
      this.fireCooldown--;
      return 0;
    }

    let target = null;
    let bestDistSq = this.range * this.range;

    for (const enemy of enemies) {
      if (!enemy.alive || enemy.reached) continue;
      const dx = enemy.x - this.x;
      const dy = enemy.y - this.y;
      const distSq = dx * dx + dy * dy;
      if (distSq <= bestDistSq) {
        bestDistSq = distSq;
        target = enemy;
      }
    }

    if (!target) return 0;

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
