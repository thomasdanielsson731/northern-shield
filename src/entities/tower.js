import { Bullet } from './bullet.js';

export const TOWER_TYPES = {
  VIKING:     'viking',
  CAROLINIAN: 'carolinian',
  MILITARY:   'military',
  BOFORS:     'bofors',
  BLONDIE:    'blondie'
};

export const TOWER_DEFS = {
  [TOWER_TYPES.VIKING]: {
    label:        'Viking',
    key:          '2',
    color:        '#cc7733',
    rangeColor:   'rgba(180,100,40,0.13)',
    cost:         20,
    range:        90,
    fireRate:     22,
    damage:       35,
    radius:       6,
    bulletSpeed:  6
  },
  [TOWER_TYPES.CAROLINIAN]: {
    label:        'Karoliner',
    key:          '3',
    color:        '#4466cc',
    rangeColor:   'rgba(60,90,190,0.13)',
    cost:         35,
    range:        180,
    fireRate:     58,
    damage:       88,
    radius:       6,
    bulletSpeed:  13
  },
  [TOWER_TYPES.MILITARY]: {
    label:        'Militär',
    key:          '4',
    color:        '#778833',
    rangeColor:   'rgba(100,120,40,0.13)',
    cost:         28,
    range:        75,
    fireRate:     8,
    damage:       12,
    radius:       5,
    bulletSpeed:  9
  },
  [TOWER_TYPES.BOFORS]: {
    label:        'Bofors',
    key:          '5',
    color:        '#557722',
    rangeColor:   'rgba(70,110,30,0.13)',
    cost:         50,
    range:        110,
    fireRate:     85,
    damage:       60,
    radius:       7,
    bulletSpeed:  4,
    splashRadius: 34,
    splashDamage: 30
  },
  [TOWER_TYPES.BLONDIE]: {
    label:        'Blondie',
    key:          '6',
    color:        '#ff88cc',
    rangeColor:   'rgba(255,100,190,0.13)',
    cost:         30,
    range:        85,
    fireRate:     35,
    damage:       5,
    radius:       5,
    bulletSpeed:  5,
    slowFactor:   0.4,
    slowDuration: 130
  }
};

const MAX_LEVEL = 10;

export class Tower {
  constructor(x, y, col, row, type = TOWER_TYPES.VIKING) {
    this.x   = x;
    this.y   = y;
    this.col = col;
    this.row = row;
    this.type = type;
    this.fireCooldown  = 0;
    this.level         = 1;

    const def = TOWER_DEFS[this.type] || TOWER_DEFS[TOWER_TYPES.VIKING];
    this.baseDamage    = def.damage;
    this.baseRange     = def.range;
    this.baseFireRate  = def.fireRate;
    this.radius        = def.radius;
    this.bulletSpeed   = def.bulletSpeed;
    this.color         = def.color;
    this.rangeColor    = def.rangeColor;
    this.splashRadius  = def.splashRadius  ?? 0;
    this.splashDamage  = def.splashDamage  ?? 0;
    this.slowFactor    = def.slowFactor    ?? 1;
    this.slowDuration  = def.slowDuration  ?? 0;
    this.aimAngle      = -Math.PI / 2;
    this.fireFlash     = 0;
    this.disabledTimer = 0;

    this._applyLevel();
  }

  _applyLevel() {
    const n = this.level - 1;
    this.damage   = Math.round(this.baseDamage   * (1 + n * 0.25));
    this.range    = Math.round(this.baseRange    * (1 + n * 0.08));
    this.fireRate = Math.max(4, Math.round(this.baseFireRate * (1 - n * 0.05)));
  }

  get upgradeCost() { return Math.floor((TOWER_DEFS[this.type]?.cost ?? 20) * this.level * 0.85); }
  get sellValue()   { return Math.floor((TOWER_DEFS[this.type]?.cost ?? 20) * 0.5); }
  get maxed()       { return this.level >= MAX_LEVEL; }

  upgrade() {
    if (this.maxed) return false;
    this.level++;
    this._applyLevel();
    return true;
  }

  update(enemies, bullets = null) {
    if (this.disabledTimer > 0) { this.disabledTimer--; return 0; }
    if (this.fireCooldown   > 0) { this.fireCooldown--;  return 0; }

    let target = null, bestProgress = -1, bestDistSq = this.range * this.range;
    for (const enemy of enemies) {
      if (!enemy.alive || enemy.reached) continue;
      const dx = enemy.x - this.x, dy = enemy.y - this.y;
      const distSq   = dx * dx + dy * dy;
      const progress = enemy.pathIndex ?? 0;
      if (distSq > this.range * this.range) continue;
      if (progress > bestProgress || (progress === bestProgress && distSq < bestDistSq)) {
        bestProgress = progress; bestDistSq = distSq; target = enemy;
      }
    }

    if (!target) return 0;
    this.aimAngle = Math.atan2(target.y - this.y, target.x - this.x);

    if (Array.isArray(bullets)) {
      bullets.push(new Bullet(
        this.x, this.y, target, this.damage, this.bulletSpeed,
        this.splashRadius, this.splashDamage,
        this.slowFactor, this.slowDuration
      ));
      this.fireCooldown = this.fireRate;
      this.fireFlash    = 7;
      return 0;
    }

    target.hp -= this.damage;
    this.fireCooldown = this.fireRate;
    if (target.hp <= 0) { target.hp = 0; target.alive = false; return 1; }
    return 0;
  }

  draw(ctx) {
    const t = performance.now() * 0.001;

    // Range ring
    ctx.strokeStyle = this.rangeColor;
    ctx.lineWidth   = 1;
    ctx.setLineDash([3, 8]);
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.range, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    if      (this.type === TOWER_TYPES.VIKING)     this._drawViking(ctx, t);
    else if (this.type === TOWER_TYPES.CAROLINIAN) this._drawCarolinian(ctx, t);
    else if (this.type === TOWER_TYPES.MILITARY)   this._drawMilitary(ctx, t);
    else if (this.type === TOWER_TYPES.BOFORS)     this._drawBofors(ctx, t);
    else                                           this._drawBlondie(ctx, t);

    // Muzzle flash
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
        const r1 = this.radius + 3, r2 = this.radius + 8;
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

    // Level badge
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

  // ── Viking: earth mound + spinning iron axe + throwing arm ──────────────────
  _drawViking(ctx, t) {
    const x = this.x, y = this.y;

    // Earth mound base
    ctx.fillStyle = '#4a2e12';
    ctx.fillRect(x - 6, y + 4, 12, 4);
    ctx.fillStyle = '#321e08';
    ctx.fillRect(x - 6, y + 7, 12, 1);
    ctx.fillStyle = 'rgba(255,200,100,0.1)';
    ctx.fillRect(x - 6, y + 4, 12, 1);

    // Log post
    ctx.fillStyle = '#5c3818';
    ctx.fillRect(x - 2, y - 1, 4, 6);
    ctx.fillStyle = '#7a5030';
    ctx.fillRect(x - 2, y - 1, 1.5, 6);

    // Spinning axe
    ctx.save();
    ctx.translate(x, y - 5);
    ctx.rotate(t * 2.8);

    ctx.shadowColor = this.color;
    ctx.shadowBlur  = 10;

    // Axe blade (iron, crescent-ish)
    ctx.fillStyle = '#9a9090';
    ctx.beginPath();
    ctx.moveTo(-4.5, -1.5);
    ctx.lineTo(0,    -5);
    ctx.lineTo(4.5,  -1.5);
    ctx.lineTo(2.5,   2);
    ctx.lineTo(-2.5,  2);
    ctx.closePath();
    ctx.fill();
    // Blade edge highlight
    ctx.fillStyle = '#d0d0c8';
    ctx.beginPath();
    ctx.moveTo(-4.5, -1.5);
    ctx.lineTo(0,    -5);
    ctx.lineTo(1,    -3);
    ctx.lineTo(-2.5,  0);
    ctx.closePath();
    ctx.fill();
    // Handle
    ctx.fillStyle = '#7a5028';
    ctx.fillRect(-0.8, 2, 1.6, 5);
    ctx.shadowBlur = 0;
    ctx.restore();

    // Aim arm (throw direction)
    const barrelLen = 8;
    ctx.strokeStyle = '#cc8840';
    ctx.lineWidth   = 1.5;
    ctx.lineCap     = 'round';
    ctx.shadowColor = this.color;
    ctx.shadowBlur  = 5;
    ctx.beginPath();
    ctx.moveTo(x, y - 5);
    ctx.lineTo(x + Math.cos(this.aimAngle) * barrelLen, y - 5 + Math.sin(this.aimAngle) * barrelLen);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.lineCap = 'butt';
  }

  // ── Karoliner: dark-blue battlement + long sniper barrel ─────────────────────
  _drawCarolinian(ctx, t) {
    const x = this.x, y = this.y;

    ctx.fillStyle = '#18223c';
    ctx.fillRect(x - 6, y + 4, 12, 4);
    ctx.fillStyle = '#0e1628';
    ctx.fillRect(x - 6, y + 7, 12, 1);

    // Trapezoid tower body
    ctx.fillStyle = '#1e2e58';
    ctx.beginPath();
    ctx.moveTo(x - 5, y + 4);
    ctx.lineTo(x + 5, y + 4);
    ctx.lineTo(x + 3, y - 7);
    ctx.lineTo(x - 3, y - 7);
    ctx.closePath();
    ctx.fill();

    // Gold side stripe
    ctx.fillStyle = 'rgba(220,180,50,0.35)';
    ctx.beginPath();
    ctx.moveTo(x - 5, y + 4);
    ctx.lineTo(x - 3, y - 7);
    ctx.lineTo(x - 1.5, y - 7);
    ctx.lineTo(x - 2.5, y + 4);
    ctx.closePath();
    ctx.fill();

    // Battlements
    ctx.fillStyle = '#1e2e58';
    for (const dx of [-2.5, -0.5, 1.5]) ctx.fillRect(x + dx, y - 10, 1.5, 3);

    // Blue sapphire orb
    const glow = 0.85 + Math.sin(t * 2.4 + 1) * 0.15;
    ctx.shadowColor = this.color;
    ctx.shadowBlur  = 12 * glow;
    ctx.fillStyle   = this.color;
    ctx.beginPath();
    ctx.arc(x, y - 7, 2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(160,200,255,0.75)';
    ctx.beginPath();
    ctx.arc(x - 0.9, y - 8, 1.1, 0, Math.PI * 2);
    ctx.fill();

    // Long thin rifle barrel
    const barrelLen = 12;
    ctx.strokeStyle = '#8899dd';
    ctx.lineWidth   = 1;
    ctx.lineCap     = 'round';
    ctx.shadowColor = this.color;
    ctx.shadowBlur  = 4;
    ctx.beginPath();
    ctx.moveTo(x, y - 7);
    ctx.lineTo(x + Math.cos(this.aimAngle) * barrelLen, y - 7 + Math.sin(this.aimAngle) * barrelLen);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.lineCap = 'butt';
  }

  // ── Militär: sandbag bunker + short rapid machine-gun barrel ─────────────────
  _drawMilitary(ctx, t) {
    const x = this.x, y = this.y;
    const spin = t * 5;

    // Sandbag base (stacked bags)
    ctx.fillStyle = '#6a6030';
    ctx.fillRect(x - 7, y + 3, 14, 5);
    ctx.fillStyle = '#7a7040';
    ctx.fillRect(x - 7, y + 3, 14, 1.5);
    ctx.fillStyle = '#555025';
    ctx.fillRect(x - 7, y + 5.5, 14, 0.8);

    // Bunker body
    ctx.fillStyle = '#4a5025';
    ctx.fillRect(x - 5, y - 3, 10, 7);
    ctx.fillStyle = '#5a6030';
    ctx.fillRect(x - 5, y - 3, 3.5, 7);

    // Crenellations
    ctx.fillStyle = '#4a5025';
    for (const dx of [-4, -1.5, 1]) ctx.fillRect(x + dx, y - 6, 2, 3);

    // Spinning brass casings
    for (let i = 0; i < 4; i++) {
      const a     = spin + (i / 4) * Math.PI * 2;
      const alpha = 0.45 + Math.abs(Math.sin(a)) * 0.45;
      ctx.fillStyle   = `rgba(200,170,40,${alpha})`;
      ctx.shadowColor = this.color;
      ctx.shadowBlur  = 3;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * 6, y + Math.sin(a) * 2.5, 1.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Central olive orb
    const pulse = 0.8 + Math.sin(t * 9) * 0.2;
    ctx.shadowColor = this.color;
    ctx.shadowBlur  = 10 * pulse;
    ctx.fillStyle   = this.color;
    ctx.beginPath();
    ctx.arc(x, y, 2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(200,220,120,0.7)';
    ctx.beginPath();
    ctx.arc(x - 0.9, y - 0.9, 1.1, 0, Math.PI * 2);
    ctx.fill();

    // Short thick barrel (machine gun)
    ctx.strokeStyle = '#aabb44';
    ctx.lineWidth   = 2.5;
    ctx.lineCap     = 'round';
    ctx.shadowColor = this.color;
    ctx.shadowBlur  = 6;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(this.aimAngle) * 8, y + Math.sin(this.aimAngle) * 8);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.lineCap = 'butt';
  }

  // ── Bofors: dark-green heavy cannon with splash ───────────────────────────────
  _drawBofors(ctx, t) {
    const x = this.x, y = this.y;
    const pulse = 0.7 + Math.sin(t * 3.5) * 0.3;

    // Heavy fortified base
    ctx.fillStyle = '#1a2c08';
    ctx.fillRect(x - 8, y + 3, 16, 5);
    ctx.fillStyle = '#101a04';
    ctx.fillRect(x - 8, y + 7, 16, 1);
    ctx.fillStyle = 'rgba(180,220,60,0.1)';
    ctx.fillRect(x - 8, y + 3, 16, 1);

    // Reinforced body
    ctx.fillStyle = '#203810';
    ctx.fillRect(x - 6, y - 4, 12, 8);
    ctx.fillStyle = '#2c4c18';
    ctx.fillRect(x - 6, y - 4, 4, 8);

    // Crenellations
    ctx.fillStyle = '#203810';
    for (const dx of [-5, -2, 1]) ctx.fillRect(x + dx, y - 7, 2.5, 3.5);

    // Very thick barrel
    ctx.strokeStyle = '#4a6622';
    ctx.lineWidth   = 5.5;
    ctx.lineCap     = 'round';
    ctx.shadowColor = this.color;
    ctx.shadowBlur  = 8 * pulse;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(this.aimAngle) * 12, y + Math.sin(this.aimAngle) * 12);
    ctx.stroke();
    ctx.strokeStyle = '#88aa33';
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(this.aimAngle) * 12, y + Math.sin(this.aimAngle) * 12);
    ctx.stroke();

    // Yellow-green core
    ctx.shadowBlur  = 18 * pulse;
    ctx.fillStyle   = '#aacc33';
    ctx.beginPath();
    ctx.arc(x, y, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle  = '#eeff88';
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineCap = 'butt';
  }

  // ── Blondie: pink pedestal + spinning hearts + slow aura ─────────────────────
  _drawBlondie(ctx, t) {
    const x = this.x, y = this.y;
    const pulse = 0.6 + Math.sin(t * 2.5) * 0.4;
    const spin  = t * 1.6;

    // Pink marble base
    ctx.fillStyle = '#4a1830';
    ctx.fillRect(x - 6, y + 4, 12, 4);
    ctx.fillStyle = '#300c1e';
    ctx.fillRect(x - 6, y + 7, 12, 1);
    ctx.fillStyle = 'rgba(255,180,220,0.15)';
    ctx.fillRect(x - 6, y + 4, 12, 1);

    // White column
    ctx.fillStyle = '#f4d0e4';
    ctx.fillRect(x - 2.5, y - 1, 5, 6);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - 2.5, y - 1, 2, 6);

    // Sparkle orbit
    for (let i = 0; i < 5; i++) {
      const a     = spin + (i / 5) * Math.PI * 2;
      const alpha = 0.45 + Math.sin(spin * 2.5 + i) * 0.3;
      ctx.fillStyle   = `rgba(255,140,200,${alpha})`;
      ctx.shadowColor = this.color;
      ctx.shadowBlur  = 5;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * 7, y - 3 + Math.sin(a) * 3, 1.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Heart (two circles + downward triangle)
    const hy = y - 8;
    ctx.shadowColor = this.color;
    ctx.shadowBlur  = 16 * pulse;
    ctx.fillStyle   = this.color;
    ctx.beginPath();
    ctx.arc(x - 1.6, hy, 2.6, 0, Math.PI * 2);
    ctx.arc(x + 1.6, hy, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - 3.8, hy + 0.6);
    ctx.lineTo(x,       hy + 4.8);
    ctx.lineTo(x + 3.8, hy + 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    // Heart inner highlight
    ctx.fillStyle = 'rgba(255,220,240,0.85)';
    ctx.beginPath();
    ctx.arc(x - 1.2, hy - 0.6, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
}
