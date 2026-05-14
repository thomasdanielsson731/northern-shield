export class Bullet {
  constructor(x, y, target, damage, speed = 7, splashRadius = 0, splashDamage = 0) {
    this.x = x;
    this.y = y;
    this.target = target;
    this.damage = damage;
    this.speed = speed;
    this.splashRadius = splashRadius;
    this.splashDamage = splashDamage;
    this.radius = splashRadius > 0 ? 3.5 : 2.5;
    this.alive = true;
    this.trail = [{ x, y }];
    this.maxTrailPoints = splashRadius > 0 ? 4 : 6;
  }

  update() {
    if (!this.alive) return 0;
    if (!this.target || !this.target.alive || this.target.reached) {
      this.alive = false;
      return 0;
    }

    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const hitDistance = this.radius + (this.target.radius || 0);

    if (dist <= Math.max(this.speed, hitDistance)) {
      this.target.hp -= this.damage;
      this.alive = false;

      if (this.target.hp <= 0) {
        this.target.hp = 0;
        this.target.alive = false;
        return this.target.reward ?? 6;
      }

      return 0;
    }

    this.x += (dx / dist) * this.speed;
    this.y += (dy / dist) * this.speed;

    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > this.maxTrailPoints) this.trail.shift();
    return 0;
  }

  draw(ctx) {
    if (!this.alive) return;

    if (this.splashRadius > 0) {
      // Fireball / missile
      if (this.trail.length > 1) {
        ctx.strokeStyle = 'rgba(255,110,30,0.55)';
        ctx.lineWidth   = 3;
        ctx.lineCap     = 'round';
        ctx.beginPath();
        ctx.moveTo(this.trail[0].x, this.trail[0].y);
        for (let i = 1; i < this.trail.length; i++) ctx.lineTo(this.trail[i].x, this.trail[i].y);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255,80,20,0.35)';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius * 2.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowColor = '#ff6620';
      ctx.shadowBlur  = 14;
      ctx.fillStyle   = '#ffcc44';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.lineCap = 'butt';
    } else {
      // Normal arcane bullet
      if (this.trail.length > 1) {
        ctx.strokeStyle = 'rgba(255, 216, 107, 0.5)';
        ctx.lineWidth   = 1.6;
        ctx.lineCap     = 'round';
        ctx.beginPath();
        ctx.moveTo(this.trail[0].x, this.trail[0].y);
        for (let i = 1; i < this.trail.length; i++) ctx.lineTo(this.trail[i].x, this.trail[i].y);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255, 216, 107, 0.35)';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius * 2.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffd86b';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineCap = 'butt';
    }
  }
}
