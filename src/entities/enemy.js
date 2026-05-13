export const ENEMY_TYPES = {
  INFANTRY: 'infantry',
  DRONE: 'drone',
  TANK: 'tank'
};

export const ENEMY_DEFS = {
  infantry: {
    label: 'Graveborn',
    speed: 0.9,
    hp: 60,
    radius: 5,
    reward: 4,
    color: '#6628a8',
    highlightColor: '#bb70ff',
    flying: false
  },
  drone: {
    label: 'Wisp',
    speed: 1.1,
    hp: 75,
    radius: 5,
    reward: 8,
    color: '#88bbff',
    highlightColor: '#e8f4ff',
    flying: true
  },
  tank: {
    label: 'Golem',
    speed: 0.35,
    hp: 500,
    radius: 11,
    reward: 20,
    color: '#5c4030',
    highlightColor: '#c07820',
    flying: false
  }
};

export class Enemy {
  constructor(path, type = ENEMY_TYPES.INFANTRY) {
    const def = ENEMY_DEFS[type] || ENEMY_DEFS[ENEMY_TYPES.INFANTRY];
    this.type           = type;
    this.path           = path;
    this.pathIndex      = 0;
    this.speed          = def.speed;
    this.radius         = def.radius;
    this.hp             = def.hp;
    this.maxHp          = def.hp;
    this.reward         = def.reward;
    this.color          = def.color;
    this.highlightColor = def.highlightColor;
    this.flying         = def.flying;
    this.alive          = true;
    this.reached        = false;

    this.x = path[0].x;
    this.y = path[0].y;
  }

  setPath(path) {
    if (!path || path.length === 0) return;
    this.path      = [{ x: this.x, y: this.y }, ...path];
    this.pathIndex = 0;
  }

  update() {
    if (!this.alive || this.reached) return;
    if (this.pathIndex >= this.path.length - 1) {
      this.reached = true;
      return;
    }

    const target = this.path[this.pathIndex + 1];
    const dx   = target.x - this.x;
    const dy   = target.y - this.y;
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
      this._drawWisp(ctx);
    } else if (this.type === ENEMY_TYPES.TANK) {
      this._drawGolem(ctx);
    } else {
      this._drawGraveborn(ctx);
    }

    this._drawHpBar(ctx);
  }

  _drawGraveborn(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.arc(this.x + 1.5, this.y + 2, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowColor = 'rgba(160,60,255,0.55)';
    ctx.shadowBlur  = 9;
    ctx.fillStyle   = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = this.highlightColor;
    ctx.beginPath();
    ctx.arc(this.x - 2, this.y - 2, this.radius * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawWisp(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(Math.PI / 4);

    const s = this.radius;

    ctx.shadowColor = 'rgba(140,190,255,0.95)';
    ctx.shadowBlur  = 16;
    ctx.fillStyle   = this.color;
    ctx.fillRect(-s, -s, s * 2, s * 2);
    ctx.shadowBlur = 0;

    ctx.fillStyle = this.highlightColor;
    ctx.fillRect(-s * 0.4, -s * 0.4, s * 0.8, s * 0.8);

    ctx.restore();
  }

  _drawGolem(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.arc(this.x + 2.5, this.y + 3, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // stone shell
    ctx.fillStyle = '#1a1220';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    // body
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius - 2.5, 0, Math.PI * 2);
    ctx.fill();

    // armor rim
    ctx.strokeStyle = '#2e1c10';
    ctx.lineWidth   = 2.5;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius - 1, 0, Math.PI * 2);
    ctx.stroke();

    // molten core
    ctx.shadowColor = 'rgba(220,130,20,0.8)';
    ctx.shadowBlur  = 10;
    ctx.fillStyle   = this.highlightColor;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // eyes
    const eyeY = this.y - this.radius * 0.28;
    ctx.shadowColor = 'rgba(240,150,30,0.9)';
    ctx.shadowBlur  = 6;
    ctx.fillStyle   = '#f0a030';
    ctx.beginPath();
    ctx.arc(this.x - this.radius * 0.32, eyeY, 1.6, 0, Math.PI * 2);
    ctx.arc(this.x + this.radius * 0.32, eyeY, 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  _drawHpBar(ctx) {
    const barW = this.radius * 2.4;
    const barH = this.type === ENEMY_TYPES.TANK ? 5 : 4;
    const barX = this.x - barW / 2;
    const barY = this.y - this.radius - 9;

    ctx.fillStyle = 'rgba(6,3,14,0.85)';
    ctx.fillRect(barX, barY, barW, barH);

    const pct = this.hp / this.maxHp;
    ctx.fillStyle = pct > 0.5 ? '#56e894' : pct > 0.25 ? '#e8c040' : '#e84040';
    ctx.fillRect(barX, barY, barW * pct, barH);

    ctx.strokeStyle = 'rgba(200,160,40,0.3)';
    ctx.lineWidth   = 0.5;
    ctx.strokeRect(barX, barY, barW, barH);
  }
}
