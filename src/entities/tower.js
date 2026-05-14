import { Bullet } from './bullet.js';

export const TOWER_TYPES = {
  GUN:     'gun',
  SNIPER:  'sniper',
  RAPID:   'rapid',
  MISSILE: 'missile'
};

export const TOWER_DEFS = {
  [TOWER_TYPES.GUN]: {
    label: 'Arcane',
    key: '2',
    color: '#4488ee',
    rangeColor: 'rgba(68,136,238,0.15)',
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
    rangeColor: 'rgba(85,187,102,0.15)',
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
    rangeColor: 'rgba(238,136,51,0.15)',
    cost: 28,
    range: 78,
    fireRate: 9,
    damage: 14,
    radius: 5,
    bulletSpeed: 8
  },
  [TOWER_TYPES.MISSILE]: {
    label: 'Siege',
    key: '5',
    color: '#dd5522',
    rangeColor: 'rgba(220,80,30,0.12)',
    cost: 50,
    range: 110,
    fireRate: 85,
    damage: 60,
    radius: 7,
    bulletSpeed: 4,
    splashRadius: 34,
    splashDamage: 30
  }
};

const MAX_LEVEL = 10;

export class Tower {
  constructor(x, y, col, row, type = TOWER_TYPES.GUN) {
    this.x = x;
    this.y = y;
    this.col = col;
    this.row = row;
    this.type = type;
    this.fireCooldown = 0;
    this.level = 1;

    const def = TOWER_DEFS[this.type] || TOWER_DEFS[TOWER_TYPES.GUN];
    this.baseDamage   = def.damage;
    this.baseRange    = def.range;
    this.baseFireRate = def.fireRate;
    this.radius       = def.radius;
    this.bulletSpeed  = def.bulletSpeed;
    this.color        = def.color;
    this.rangeColor   = def.rangeColor;
    this.aimAngle     = -Math.PI / 2;
    this.fireFlash    = 0;
    this.disabledTimer = 0;
    this.splashRadius  = def.splashRadius ?? 0;
    this.splashDamage  = def.splashDamage ?? 0;

    this._applyLevel();
  }

  _applyLevel() {
    const n = this.level - 1;
    this.damage   = Math.round(this.baseDamage   * (1 + n * 0.25));
    this.range    = Math.round(this.baseRange    * (1 + n * 0.08));
    this.fireRate = Math.max(4, Math.round(this.baseFireRate * (1 - n * 0.05)));
  }

  get upgradeCost() {
    return Math.floor((TOWER_DEFS[this.type]?.cost ?? 20) * this.level * 0.85);
  }

  get sellValue() {
    return Math.floor((TOWER_DEFS[this.type]?.cost ?? 20) * 0.5);
  }

  get maxed() {
    return this.level >= MAX_LEVEL;
  }

  upgrade() {
    if (this.maxed) return false;
    this.level++;
    this._applyLevel();
    return true;
  }

  update(enemies, bullets = null) {
    if (this.disabledTimer > 0) {
      this.disabledTimer--;
      return 0;
    }
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
      bullets.push(new Bullet(this.x, this.y, target, this.damage, this.bulletSpeed, this.splashRadius, this.splashDamage));
      this.fireCooldown = this.fireRate;
      this.fireFlash    = 7;
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
    const t = performance.now() * 0.001;

    // Range ring
    ctx.strokeStyle = this.rangeColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 8]);
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.range, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    if (this.type === TOWER_TYPES.GUN)          this._drawArcane(ctx, t);
    else if (this.type === TOWER_TYPES.SNIPER)  this._drawArcher(ctx, t);
    else if (this.type === TOWER_TYPES.MISSILE) this._drawSiege(ctx, t);
    else                                        this._drawStorm(ctx, t);

    // EMP disabled shimmer
    if (this.disabledTimer > 0) {
      const flicker = 0.45 + Math.sin(t * 28) * 0.3;
      ctx.save();
      ctx.fillStyle   = `rgba(0,220,200,${flicker * 0.4})`;
      ctx.shadowColor = '#00ffee';
      ctx.shadowBlur  = 12;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 5, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 3; i++) {
        const a  = t * 9 + (i * Math.PI * 2 / 3);
        const r1 = this.radius + 3;
        const r2 = this.radius + 8;
        ctx.strokeStyle = `rgba(0,255,220,${0.35 + Math.sin(t * 18 + i) * 0.25})`;
        ctx.lineWidth   = 0.9;
        ctx.beginPath();
        ctx.moveTo(this.x + Math.cos(a) * r1,       this.y + Math.sin(a) * r1);
        ctx.lineTo(this.x + Math.cos(a + 0.5) * r2, this.y + Math.sin(a + 0.5) * r2);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // Muzzle flash ring
    if (this.fireFlash > 0) {
      const alpha = this.fireFlash / 7;
      ctx.save();
      ctx.strokeStyle = `rgba(255,255,200,${alpha * 0.9})`;
      ctx.shadowColor = this.color;
      ctx.shadowBlur  = 14 * alpha;
      ctx.lineWidth   = 2.5 * alpha;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 5 + (7 - this.fireFlash), 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();
      this.fireFlash--;
    }

    // Level badge (hidden at level 1)
    if (this.level > 1) {
      const badge = this.maxed ? 'MAX' : `${this.level}`;
      ctx.save();
      ctx.font      = 'bold 7px monospace';
      ctx.textAlign = 'center';
      const bw = ctx.measureText(badge).width + 5;
      ctx.fillStyle = 'rgba(6,3,14,0.9)';
      ctx.fillRect(this.x - bw / 2, this.y + 5, bw, 8);
      ctx.fillStyle = this.maxed ? '#ff9040' : '#e8c040';
      ctx.fillText(badge, this.x, this.y + 12);
      ctx.restore();
    }
  }

  // ── Arcane: stone pedestal + rotating blue crystal gem ──────────────────────
  _drawArcane(ctx, t) {
    const x = this.x, y = this.y;

    // Stone platform
    ctx.fillStyle = '#24183e';
    ctx.fillRect(x - 6, y + 4, 12, 4);
    ctx.fillStyle = '#14102a';
    ctx.fillRect(x - 6, y + 7, 12, 1);
    ctx.strokeStyle = 'rgba(200,160,40,0.3)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(x - 5.5, y + 4.5, 11, 2);

    // Column
    ctx.fillStyle = '#1c1440';
    ctx.fillRect(x - 2.5, y - 1, 5, 6);
    ctx.fillStyle = '#28204e';
    ctx.fillRect(x - 2.5, y - 1, 2, 6);

    // Rotating diamond crystal
    const spinAngle = t * 1.5;
    ctx.save();
    ctx.translate(x, y - 5);
    ctx.rotate(spinAngle);

    ctx.shadowColor = this.color;
    ctx.shadowBlur  = 16;
    ctx.fillStyle   = this.color;
    const gs = 4.5;
    ctx.beginPath();
    ctx.moveTo(0, -gs);
    ctx.lineTo(gs * 0.7, 0);
    ctx.lineTo(0, gs);
    ctx.lineTo(-gs * 0.7, 0);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    // Crystal facet
    ctx.fillStyle = 'rgba(180,220,255,0.7)';
    ctx.beginPath();
    ctx.moveTo(0, -gs);
    ctx.lineTo(gs * 0.35, -gs * 0.45);
    ctx.lineTo(0, 0);
    ctx.lineTo(-gs * 0.35, -gs * 0.45);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    // Barrel from crystal
    const barrelLen = 9;
    ctx.strokeStyle = '#6ab0f0';
    ctx.lineWidth   = 1.5;
    ctx.lineCap     = 'round';
    ctx.shadowColor = this.color;
    ctx.shadowBlur  = 6;
    ctx.beginPath();
    ctx.moveTo(x, y - 5);
    ctx.lineTo(x + Math.cos(this.aimAngle) * barrelLen, y - 5 + Math.sin(this.aimAngle) * barrelLen);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.lineCap = 'butt';
  }

  // ── Archer: stone battlement tower with emerald orb ─────────────────────────
  _drawArcher(ctx, t) {
    const x = this.x, y = this.y;

    // Base platform
    ctx.fillStyle = '#1e2630';
    ctx.fillRect(x - 6, y + 4, 12, 4);
    ctx.fillStyle = '#131820';
    ctx.fillRect(x - 6, y + 7, 12, 1);

    // Tower body (trapezoid)
    ctx.fillStyle = '#182028';
    ctx.beginPath();
    ctx.moveTo(x - 5,   y + 4);
    ctx.lineTo(x + 5,   y + 4);
    ctx.lineTo(x + 3,   y - 7);
    ctx.lineTo(x - 3,   y - 7);
    ctx.closePath();
    ctx.fill();

    // Left face highlight
    ctx.fillStyle = '#243038';
    ctx.beginPath();
    ctx.moveTo(x - 5,   y + 4);
    ctx.lineTo(x - 3,   y - 7);
    ctx.lineTo(x - 0.5, y - 7);
    ctx.lineTo(x - 2,   y + 4);
    ctx.closePath();
    ctx.fill();

    // Battlements
    ctx.fillStyle = '#182028';
    for (const dx of [-2.5, -0.5, 1.5]) {
      ctx.fillRect(x + dx, y - 10, 1.5, 3);
    }

    // Arrow slit
    ctx.fillStyle = 'rgba(0,5,8,0.8)';
    ctx.fillRect(x - 0.5, y - 1, 1, 3);

    // Emerald orb with pulse
    const glow = 0.85 + Math.sin(t * 2.4 + 1) * 0.15;
    ctx.shadowColor = this.color;
    ctx.shadowBlur  = 12 * glow;
    ctx.fillStyle   = this.color;
    ctx.beginPath();
    ctx.arc(x, y - 7, 2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(180,255,200,0.75)';
    ctx.beginPath();
    ctx.arc(x - 0.9, y - 8, 1.1, 0, Math.PI * 2);
    ctx.fill();

    // Barrel from orb
    const barrelLen = 8;
    ctx.strokeStyle = '#88dd88';
    ctx.lineWidth   = 1.5;
    ctx.lineCap     = 'round';
    ctx.shadowColor = this.color;
    ctx.shadowBlur  = 5;
    ctx.beginPath();
    ctx.moveTo(x, y - 7);
    ctx.lineTo(x + Math.cos(this.aimAngle) * barrelLen, y - 7 + Math.sin(this.aimAngle) * barrelLen);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.lineCap = 'butt';
  }

  // ── Siege: heavy fire cannon with ember core ────────────────────────────────
  _drawSiege(ctx, t) {
    const x = this.x, y = this.y;
    const pulse = 0.7 + Math.sin(t * 4.5) * 0.3;

    // Wide stone base
    ctx.fillStyle = '#2a1008';
    ctx.fillRect(x - 8, y + 3, 16, 5);
    ctx.fillStyle = '#1a0804';
    ctx.fillRect(x - 8, y + 7, 16, 1);

    // Squat reinforced body
    ctx.fillStyle = '#1e0c06';
    ctx.fillRect(x - 6, y - 4, 12, 8);
    ctx.fillStyle = '#2c1a0c';
    ctx.fillRect(x - 6, y - 4, 4, 8);

    // Crenellations
    ctx.fillStyle = '#1e0c06';
    for (const dx of [-5, -2, 1]) ctx.fillRect(x + dx, y - 7, 2.5, 3.5);

    // Thick barrel
    const barrelLen = 10;
    ctx.strokeStyle = '#aa4420';
    ctx.lineWidth   = 4.5;
    ctx.lineCap     = 'round';
    ctx.shadowColor = this.color;
    ctx.shadowBlur  = 8 * pulse;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(this.aimAngle) * barrelLen, y + Math.sin(this.aimAngle) * barrelLen);
    ctx.stroke();

    // Ember core
    ctx.shadowBlur  = 18 * pulse;
    ctx.fillStyle   = '#ff7733';
    ctx.beginPath();
    ctx.arc(x, y, 4.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur  = 0;
    ctx.fillStyle   = '#ffee88';
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineCap = 'butt';
  }

  // ── Storm: squat fortification with spinning energy ring ────────────────────
  _drawStorm(ctx, t) {
    const x = this.x, y = this.y;
    const spin = t * 4;

    // Wide stone base
    ctx.fillStyle = '#281808';
    ctx.fillRect(x - 7, y + 3, 14, 4);
    ctx.fillStyle = '#181008';
    ctx.fillRect(x - 7, y + 6, 14, 1);

    // Squat body
    ctx.fillStyle = '#1c1008';
    ctx.fillRect(x - 5, y - 3, 10, 7);
    ctx.fillStyle = '#281c10';
    ctx.fillRect(x - 5, y - 3, 4, 7);

    // Crenellations
    ctx.fillStyle = '#1c1008';
    for (const dx of [-4, -1.5, 1]) {
      ctx.fillRect(x + dx, y - 6, 2, 3);
    }

    // Spinning energy particles
    for (let i = 0; i < 6; i++) {
      const a     = spin + (i / 6) * Math.PI * 2;
      const rx    = Math.cos(a) * 7;
      const ry    = Math.sin(a) * 3;
      const alpha = 0.35 + Math.abs(Math.sin(a)) * 0.55;
      ctx.fillStyle   = `rgba(238,136,51,${alpha})`;
      ctx.shadowColor = this.color;
      ctx.shadowBlur  = 5;
      ctx.beginPath();
      ctx.arc(x + rx, y + ry, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Central orb
    const pulse = 0.75 + Math.sin(t * 5.5) * 0.25;
    ctx.shadowColor = this.color;
    ctx.shadowBlur  = 16 * pulse;
    ctx.fillStyle   = this.color;
    ctx.beginPath();
    ctx.arc(x, y, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(255,210,170,0.85)';
    ctx.beginPath();
    ctx.arc(x - 1.1, y - 1.1, 1.3, 0, Math.PI * 2);
    ctx.fill();

    // Short thick barrel
    const barrelLen = 9;
    ctx.strokeStyle = '#ffbb55';
    ctx.lineWidth   = 2;
    ctx.lineCap     = 'round';
    ctx.shadowColor = this.color;
    ctx.shadowBlur  = 8;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(this.aimAngle) * barrelLen, y + Math.sin(this.aimAngle) * barrelLen);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.lineCap = 'butt';
  }
}
