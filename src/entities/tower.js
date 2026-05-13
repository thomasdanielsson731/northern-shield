import { Bullet } from './bullet.js';

export const TOWER_TYPES = {
  GUN: 'gun',
  SNIPER: 'sniper',
  RAPID: 'rapid'
};

export const TOWER_DEFS = {
  [TOWER_TYPES.GUN]: {
    label: 'Arcane',
    key: '2',
    color: '#4488ee',
    rangeColor: 'rgba(68,136,238,0.18)',
    cost: 20,
    range: 96,
    fireRate: 24,
    damage: 35,
    radius: 6,
    bulletSpeed: 7
  },
  [TOWER_TYPES.SNIPER]: {
    label: 'Archer',
    key: '3',
    color: '#55bb66',
    rangeColor: 'rgba(85,187,102,0.18)',
    cost: 35,
    range: 180,
    fireRate: 55,
    damage: 85,
    radius: 6,
    bulletSpeed: 11
  },
  [TOWER_TYPES.RAPID]: {
    label: 'Storm',
    key: '4',
    color: '#ee8833',
    rangeColor: 'rgba(238,136,51,0.18)',
    cost: 28,
    range: 78,
    fireRate: 9,
    damage: 14,
    radius: 5,
    bulletSpeed: 8
  }
};

export class Tower {
  constructor(x, y, col, row, type = TOWER_TYPES.GUN) {
    this.x = x;
    this.y = y;
    this.col = col;
    this.row = row;
    this.type = type;
    this.fireCooldown = 0;

    const def = TOWER_DEFS[this.type] || TOWER_DEFS[TOWER_TYPES.GUN];
    this.range      = def.range;
    this.fireRate   = def.fireRate;
    this.damage     = def.damage;
    this.radius     = def.radius;
    this.bulletSpeed = def.bulletSpeed;
    this.color      = def.color;
    this.rangeColor = def.rangeColor;
    this.aimAngle   = -Math.PI / 2;
  }

  update(enemies, bullets = null) {
    if (this.fireCooldown > 0) {
      this.fireCooldown--;
      return 0;
    }

    let target = null;
    let bestProgress = -1;
    let bestDistSq   = this.range * this.range;

    for (const enemy of enemies) {
      if (!enemy.alive || enemy.reached) continue;
      const dx = enemy.x - this.x;
      const dy = enemy.y - this.y;
      const distSq   = dx * dx + dy * dy;
      const progress = enemy.pathIndex ?? 0;
      if (distSq > this.range * this.range) continue;

      if (progress > bestProgress || (progress === bestProgress && distSq < bestDistSq)) {
        bestProgress = progress;
        bestDistSq   = distSq;
        target       = enemy;
      }
    }

    if (!target) return 0;

    this.aimAngle = Math.atan2(target.y - this.y, target.x - this.x);

    if (Array.isArray(bullets)) {
      bullets.push(new Bullet(this.x, this.y, target, this.damage, this.bulletSpeed));
      this.fireCooldown = this.fireRate;
      return 0;
    }

    target.hp -= this.damage;
    this.fireCooldown = this.fireRate;

    if (target.hp <= 0) {
      target.hp    = 0;
      target.alive = false;
      return 1;
    }
    return 0;
  }

  draw(ctx) {
    // range ring
    ctx.strokeStyle = this.rangeColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 6]);
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.range, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // outer magical rune ring
    ctx.strokeStyle = `${this.color}55`;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius + 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // drop shadow
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.arc(this.x + 1.5, this.y + 2, this.radius + 2, 0, Math.PI * 2);
    ctx.fill();

    // body glow
    ctx.shadowColor = this.color;
    ctx.shadowBlur  = 8;
    ctx.fillStyle   = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius + 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // inner bright highlight
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius + 1, 0, Math.PI * 2);
    ctx.stroke();

    // barrel
    const barrelLen = this.radius + 7;
    ctx.strokeStyle = '#f0e8d0';
    ctx.lineWidth   = 2;
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(
      this.x + Math.cos(this.aimAngle) * barrelLen,
      this.y + Math.sin(this.aimAngle) * barrelLen
    );
    ctx.stroke();
    ctx.lineCap = 'butt';
  }
}
