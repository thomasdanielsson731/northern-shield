export const ENEMY_TYPES = {
  INFANTRY: 'infantry',
  DRONE: 'drone',
  TANK: 'tank'
};

export const ENEMY_DEFS = {
  infantry: {
    label: 'Infantry',
    speed: 0.9,
    hp: 60,
    radius: 5,
    reward: 4,
    color: '#e85555',
    highlightColor: '#ffaaaa',
    flying: false
  },
  drone: {
    label: 'Drone',
    speed: 1.1,
    hp: 75,
    radius: 5,
    reward: 8,
    color: '#9966ff',
    highlightColor: '#ccaaff',
    flying: true
  },
  tank: {
    label: 'Tank',
    speed: 0.35,
    hp: 500,
    radius: 11,
    reward: 20,
    color: '#c87a38',
    highlightColor: '#f0b870',
    flying: false
  }
};

export class Enemy {
  constructor(path, type = ENEMY_TYPES.INFANTRY) {
    const def = ENEMY_DEFS[type] || ENEMY_DEFS[ENEMY_TYPES.INFANTRY];
    this.type = type;
    this.path = path;
    this.pathIndex = 0;
    this.speed = def.speed;
    this.radius = def.radius;
    this.hp = def.hp;
    this.maxHp = def.hp;
    this.reward = def.reward;
    this.color = def.color;
    this.highlightColor = def.highlightColor;
    this.flying = def.flying;
    this.alive = true;
    this.reached = false;

    this.x = path[0].x;
    this.y = path[0].y;
  }

  setPath(path) {
    if (!path || path.length === 0) return;
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

    if (this.type === ENEMY_TYPES.DRONE) {
      this._drawDrone(ctx);
    } else if (this.type === ENEMY_TYPES.TANK) {
      this._drawTank(ctx);
    } else {
      this._drawInfantry(ctx);
    }

    this._drawHpBar(ctx);
  }

  _drawInfantry(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.arc(this.x + 1.5, this.y + 2, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = this.highlightColor;
    ctx.beginPath();
    ctx.arc(this.x - 2, this.y - 2, this.radius * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawDrone(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(Math.PI / 4);

    const s = this.radius;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(1.5 - s, 2 - s, s * 2, s * 2);

    ctx.fillStyle = this.color;
    ctx.fillRect(-s, -s, s * 2, s * 2);

    ctx.fillStyle = this.highlightColor;
    ctx.fillRect(-s * 0.35, -s * 0.35, s * 0.7, s * 0.7);

    ctx.restore();
  }

  _drawTank(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.arc(this.x + 2, this.y + 2.5, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#2a2030';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius - 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = this.highlightColor;
    ctx.beginPath();
    ctx.arc(this.x - 3, this.y - 3, this.radius * 0.28, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawHpBar(ctx) {
    const barW = this.radius * 2.4;
    const barH = this.type === ENEMY_TYPES.TANK ? 5 : 4;
    const barX = this.x - barW / 2;
    const barY = this.y - this.radius - 9;

    ctx.fillStyle = 'rgba(12,18,28,0.85)';
    ctx.fillRect(barX, barY, barW, barH);

    const pct = this.hp / this.maxHp;
    ctx.fillStyle = pct > 0.5 ? '#56e894' : pct > 0.25 ? '#f0c040' : '#e84040';
    ctx.fillRect(barX, barY, barW * pct, barH);
  }
}
