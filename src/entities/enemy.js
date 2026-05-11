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

    ctx.fillStyle = '#f44';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // HP bar
    const barW = this.radius * 2;
    const barH = 3;
    const barX = this.x - this.radius;
    const barY = this.y - this.radius - 6;
    ctx.fillStyle = '#333';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = '#4f4';
    ctx.fillRect(barX, barY, barW * (this.hp / this.maxHp), barH);
  }
}
