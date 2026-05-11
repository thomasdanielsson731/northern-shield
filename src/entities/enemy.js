export class Enemy {
  constructor(path, speed = 1.5) {
    this.path = path;
    this.pathIndex = 0;
    this.speed = speed;
    this.radius = 7;
    this.hp = 100;
    this.maxHp = 100;
    this.alive = true;
    this.reached = false;

    this.x = path[0].x;
    this.y = path[0].y;
  }

  setPath(path) {
    if (!path || path.length === 0) return;

    // Keep current position as the first waypoint so reroutes do not teleport enemies.
    this.path = [{ x: this.x, y: this.y }, ...path];
    this.pathIndex = 0;
  }

  update() {
    if (!this.alive || this.reached) return;
    if (this.pathIndex >= this.path.length - 1) {
      this.reached = true;
      return;
    }

    const target = this.path[this.pathIndex + 1];
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= this.speed) {
      this.x = target.x;
      this.y = target.y;
      this.pathIndex++;
    } else {
      this.x += (dx / dist) * this.speed;
      this.y += (dy / dist) * this.speed;
    }
  }

  draw(ctx) {
    if (!this.alive) return;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.arc(this.x + 1.5, this.y + 2, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f05f5f';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffd0d0';
    ctx.beginPath();
    ctx.arc(this.x - 2, this.y - 2, this.radius * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // HP bar
    const barW = this.radius * 2.2;
    const barH = 4;
    const barX = this.x - this.radius;
    const barY = this.y - this.radius - 8;
    ctx.fillStyle = 'rgba(12, 18, 28, 0.85)';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = '#56e894';
    ctx.fillRect(barX, barY, barW * (this.hp / this.maxHp), barH);
  }
}
