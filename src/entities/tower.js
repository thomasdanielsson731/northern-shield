import { Bullet } from './bullet.js';

export const TOWER_TYPES = {
  BERSERK:  'berserk',
  VALKYRIE: 'valkyrie',
  MILITARY: 'military',
  CATAPULT: 'catapult',
  BLONDIE:  'blondie'
};

export const TOWER_DEFS = {
  [TOWER_TYPES.BERSERK]: {
    label:        'Bärsärkare',
    key:          '2',
    color:        '#cc3300',
    rangeColor:   'rgba(200,60,20,0.15)',
    cost:         20,
    range:        22,
    fireRate:     18,
    damage:       55,
    radius:       8,
    bulletSpeed:  40
  },
  [TOWER_TYPES.VALKYRIE]: {
    label:        'Valkyria',
    key:          '3',
    color:        '#88aaee',
    rangeColor:   'rgba(100,140,220,0.12)',
    cost:         35,
    range:        180,
    fireRate:     58,
    damage:       88,
    radius:       8,
    bulletSpeed:  13,
    bulletShape:  'spear'
  },
  [TOWER_TYPES.MILITARY]: {
    label:        'Militär',
    key:          '4',
    color:        '#667733',
    rangeColor:   'rgba(90,110,40,0.13)',
    cost:         28,
    range:        80,
    fireRate:     8,
    damage:       14,
    radius:       7,
    bulletSpeed:  9
  },
  [TOWER_TYPES.CATAPULT]: {
    label:        'Katapult',
    key:          '5',
    color:        '#8a6030',
    rangeColor:   'rgba(130,90,30,0.13)',
    cost:         50,
    range:        120,
    fireRate:     90,
    damage:       65,
    radius:       9,
    bulletSpeed:  3.5,
    splashRadius: 40,
    splashDamage: 35,
    bulletShape:  'rock'
  },
  [TOWER_TYPES.BLONDIE]: {
    label:        'Blondie',
    key:          '6',
    color:        '#ff88cc',
    rangeColor:   'rgba(255,100,190,0.12)',
    cost:         30,
    range:        90,
    fireRate:     35,
    damage:       8,
    radius:       7,
    bulletSpeed:  5,
    slowFactor:   0.4,
    slowDuration: 130
  }
};

const MAX_LEVEL = 10;

export class Tower {
  constructor(x, y, col, row, type = TOWER_TYPES.BERSERK) {
    this.x   = x;
    this.y   = y;
    this.col = col;
    this.row = row;
    this.type = type;
    this.fireCooldown  = 0;
    this.level         = 1;

    const def = TOWER_DEFS[this.type] || TOWER_DEFS[TOWER_TYPES.BERSERK];
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
    this.bulletShape   = def.bulletShape   ?? 'orb';
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
        this.slowFactor, this.slowDuration,
        this.bulletShape
      ));
      this.fireCooldown = this.fireRate;
      this.fireFlash    = 8;
      return 0;
    }

    target.hp -= this.damage;
    this.fireCooldown = this.fireRate;
    if (target.hp <= 0) { target.hp = 0; target.alive = false; return 1; }
    return 0;
  }

  draw(ctx) {
    const t = performance.now() * 0.001;

    // Range ring (skip for berserk — tiny ring looks bad)
    if (this.type !== TOWER_TYPES.BERSERK) {
      ctx.strokeStyle = this.rangeColor;
      ctx.lineWidth   = 1;
      ctx.setLineDash([3, 8]);
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.range, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if      (this.type === TOWER_TYPES.BERSERK)  this._drawBerserk(ctx, t);
    else if (this.type === TOWER_TYPES.VALKYRIE) this._drawValkyrie(ctx, t);
    else if (this.type === TOWER_TYPES.MILITARY) this._drawMilitary(ctx, t);
    else if (this.type === TOWER_TYPES.CATAPULT) this._drawCatapult(ctx, t);
    else                                         this._drawBlondie(ctx, t);

    // Attack flash
    if (this.fireFlash > 0) {
      const alpha = this.fireFlash / 8;
      ctx.save();
      if (this.type === TOWER_TYPES.BERSERK) {
        // Axe sweep arc
        ctx.shadowColor = '#ff4400';
        ctx.shadowBlur  = 20 * alpha;
        ctx.strokeStyle = `rgba(255,100,30,${alpha * 0.9})`;
        ctx.lineWidth   = 5 * alpha;
        ctx.lineCap     = 'round';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 18, this.aimAngle - 1.1, this.aimAngle + 1.1);
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else {
        ctx.strokeStyle = `rgba(255,255,200,${alpha * 0.85})`;
        ctx.shadowColor = this.color;
        ctx.shadowBlur  = 14 * alpha;
        ctx.lineWidth   = 2.5 * alpha;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius + 4 + (8 - this.fireFlash), 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
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
        const r1 = this.radius + 3, r2 = this.radius + 9;
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
      ctx.fillRect(this.x - bw / 2, this.y + 6, bw, 8);
      ctx.fillStyle = this.maxed ? '#ff9040' : '#e8c040';
      ctx.fillText(badge, this.x, this.y + 13);
      ctx.restore();
    }
  }

  // ── Bärsärkare: huge berserker warrior swinging a battle axe ─────────────────
  _drawBerserk(ctx, t) {
    const x = this.x, y = this.y;
    const axeSpin = t * 3.5;

    // Ground shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(x + 2, y + 9, 9, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Fur-lined boots
    ctx.fillStyle = '#5a3010';
    ctx.fillRect(x - 5, y + 4, 4, 5);
    ctx.fillRect(x + 1, y + 4, 4, 5);
    ctx.fillStyle = '#7a4820';
    ctx.fillRect(x - 5, y + 4, 4, 2);
    ctx.fillRect(x + 1, y + 4, 4, 2);

    // Legs / trousers
    ctx.fillStyle = '#382010';
    ctx.fillRect(x - 4, y - 1, 4, 6);
    ctx.fillRect(x, y - 1, 4, 6);

    // Torso — leather vest + chain-mail
    ctx.fillStyle = '#8a4018';
    ctx.beginPath();
    ctx.moveTo(x - 6, y + 1);
    ctx.lineTo(x + 6, y + 1);
    ctx.lineTo(x + 5, y - 6);
    ctx.lineTo(x - 5, y - 6);
    ctx.closePath();
    ctx.fill();
    // Vest highlight
    ctx.fillStyle = '#b05820';
    ctx.beginPath();
    ctx.moveTo(x - 6, y + 1);
    ctx.lineTo(x - 2, y + 1);
    ctx.lineTo(x - 2, y - 6);
    ctx.lineTo(x - 5, y - 6);
    ctx.closePath();
    ctx.fill();
    // Belt
    ctx.fillStyle = '#1e1008';
    ctx.fillRect(x - 6, y - 1, 12, 2);
    ctx.fillStyle = '#c8a020';
    ctx.fillRect(x - 1, y - 1.5, 2.5, 3);

    // Skull-painted shoulder pads
    ctx.fillStyle = '#6a3810';
    ctx.beginPath();
    ctx.ellipse(x - 6, y - 5, 3.5, 2.5, -0.3, 0, Math.PI * 2);
    ctx.ellipse(x + 6, y - 5, 3.5, 2.5,  0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#eee8d0';
    for (const [sx, sy] of [[x - 6.5, y - 5.8], [x + 5.5, y - 5.8]]) {
      ctx.beginPath();
      ctx.arc(sx, sy, 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#201008';
      ctx.beginPath();
      ctx.ellipse(sx - 0.5, sy, 0.5, 0.4, 0, 0, Math.PI * 2);
      ctx.ellipse(sx + 0.5, sy, 0.5, 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#eee8d0';
    }

    // Head
    ctx.shadowColor = 'rgba(200,60,20,0.5)';
    ctx.shadowBlur  = 6;
    ctx.fillStyle   = '#c8885a';
    ctx.beginPath();
    ctx.arc(x, y - 9, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    // Beard
    ctx.fillStyle = '#8a4418';
    ctx.beginPath();
    ctx.moveTo(x - 4, y - 7);
    ctx.lineTo(x - 4.5, y - 5);
    ctx.lineTo(x - 2, y - 4);
    ctx.lineTo(x, y - 3.5);
    ctx.lineTo(x + 2, y - 4);
    ctx.lineTo(x + 4.5, y - 5);
    ctx.lineTo(x + 4, y - 7);
    ctx.closePath();
    ctx.fill();
    // Beard highlight
    ctx.fillStyle = '#aa5c28';
    ctx.beginPath();
    ctx.moveTo(x - 3, y - 7);
    ctx.lineTo(x - 3.5, y - 5.5);
    ctx.lineTo(x - 0.5, y - 5);
    ctx.lineTo(x - 0.5, y - 7);
    ctx.closePath();
    ctx.fill();

    // Viking helmet
    ctx.fillStyle = '#888880';
    ctx.beginPath();
    ctx.arc(x, y - 12.5, 5, 0, Math.PI, true);
    ctx.fill();
    ctx.fillStyle = '#aaaaaa';
    ctx.fillRect(x - 5, y - 12.5, 10, 2);
    // Horn left
    ctx.fillStyle = '#e8e0c0';
    ctx.beginPath();
    ctx.moveTo(x - 4.5, y - 13);
    ctx.lineTo(x - 8.5, y - 18);
    ctx.lineTo(x - 2.5, y - 13.5);
    ctx.closePath();
    ctx.fill();
    // Horn right
    ctx.beginPath();
    ctx.moveTo(x + 4.5, y - 13);
    ctx.lineTo(x + 8.5, y - 18);
    ctx.lineTo(x + 2.5, y - 13.5);
    ctx.closePath();
    ctx.fill();
    // Nose guard
    ctx.fillStyle = '#888880';
    ctx.fillRect(x - 1, y - 12, 2, 5);

    // Warpaint stripes (red)
    ctx.fillStyle = '#cc2200';
    ctx.fillRect(x - 4, y - 10, 2.5, 1);
    ctx.fillRect(x + 1.5, y - 10, 2.5, 1);

    // Spinning battle axe
    ctx.save();
    ctx.translate(x + 7, y - 4);
    ctx.rotate(axeSpin);
    ctx.shadowColor = '#ff4400';
    ctx.shadowBlur  = 8;
    // Handle
    ctx.strokeStyle = '#6a3810';
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.moveTo(0, -9); ctx.lineTo(0, 6);
    ctx.stroke();
    // Axe head
    ctx.fillStyle = '#b0a898';
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(5, -12);
    ctx.lineTo(6, -6);
    ctx.lineTo(1, -4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#d8d4c8';
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(5, -12);
    ctx.lineTo(3.5, -9);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // ── Valkyria: winged warrior with spear ───────────────────────────────────────
  _drawValkyrie(ctx, t) {
    const x = this.x, y = this.y;
    const glow    = 0.7 + Math.sin(t * 2.2) * 0.3;
    const wingFlap = Math.sin(t * 2.8) * 0.1;

    // Stone pedestal
    ctx.fillStyle = '#c0c8d8';
    ctx.fillRect(x - 8, y + 5, 16, 4);
    ctx.fillStyle = '#8898b8';
    ctx.fillRect(x - 8, y + 8, 16, 1);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(x - 8, y + 5, 16, 1.2);

    // Wings
    ctx.save();
    ctx.shadowColor = 'rgba(160,200,255,0.75)';
    ctx.shadowBlur  = 14 * glow;
    // Left wing
    ctx.fillStyle = '#dce8ff';
    ctx.beginPath();
    ctx.moveTo(x - 3, y - 1);
    ctx.bezierCurveTo(x - 9 - wingFlap * 6, y - 9, x - 17 - wingFlap * 8, y - 5, x - 19 - wingFlap * 10, y + 2);
    ctx.bezierCurveTo(x - 13, y + 6, x - 5, y + 3, x - 2, y + 2);
    ctx.closePath();
    ctx.fill();
    // Right wing
    ctx.beginPath();
    ctx.moveTo(x + 3, y - 1);
    ctx.bezierCurveTo(x + 9 + wingFlap * 6, y - 9, x + 17 + wingFlap * 8, y - 5, x + 19 + wingFlap * 10, y + 2);
    ctx.bezierCurveTo(x + 13, y + 6, x + 5, y + 3, x + 2, y + 2);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    // Feather lines
    ctx.strokeStyle = 'rgba(100,150,255,0.35)';
    ctx.lineWidth   = 0.6;
    for (let i = 0; i < 4; i++) {
      const f = i / 3;
      ctx.beginPath();
      ctx.moveTo(x - 2 - f * 2, y + f);
      ctx.bezierCurveTo(x - 7 - f * 5, y - 5 - f * 2, x - 13 - f * 4, y - 3 + f, x - 17 - f * 2, y + 1 + f * 1.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + 2 + f * 2, y + f);
      ctx.bezierCurveTo(x + 7 + f * 5, y - 5 - f * 2, x + 13 + f * 4, y - 3 + f, x + 17 + f * 2, y + 1 + f * 1.5);
      ctx.stroke();
    }
    ctx.restore();

    // Lower body / skirt-armor
    ctx.fillStyle = '#8098b8';
    ctx.beginPath();
    ctx.moveTo(x - 4, y + 5);
    ctx.lineTo(x + 4, y + 5);
    ctx.lineTo(x + 3, y - 1);
    ctx.lineTo(x - 3, y - 1);
    ctx.closePath();
    ctx.fill();

    // Chest plate
    ctx.fillStyle = '#b8c8e4';
    ctx.beginPath();
    ctx.moveTo(x - 4.5, y - 1);
    ctx.lineTo(x + 4.5, y - 1);
    ctx.lineTo(x + 3.2, y - 7);
    ctx.lineTo(x - 3.2, y - 7);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.moveTo(x - 4.5, y - 1);
    ctx.lineTo(x - 0.5, y - 1);
    ctx.lineTo(x - 0.5, y - 7);
    ctx.lineTo(x - 3.2, y - 7);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(80,120,200,0.4)';
    ctx.lineWidth   = 0.5;
    ctx.beginPath();
    ctx.moveTo(x, y - 1); ctx.lineTo(x, y - 7);
    ctx.stroke();

    // Helmet
    ctx.fillStyle = '#c0d0e8';
    ctx.beginPath();
    ctx.arc(x, y - 9.5, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.arc(x - 1.5, y - 10.5, 1.8, 0, Math.PI * 2);
    ctx.fill();
    // Nose guard
    ctx.fillStyle = '#8098b8';
    ctx.fillRect(x - 0.8, y - 11, 1.6, 3.5);
    // Horns
    ctx.fillStyle = '#d8e4f8';
    ctx.beginPath();
    ctx.moveTo(x - 3.5, y - 11);
    ctx.lineTo(x - 7, y - 16);
    ctx.lineTo(x - 1.8, y - 11.5);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 3.5, y - 11);
    ctx.lineTo(x + 7, y - 16);
    ctx.lineTo(x + 1.8, y - 11.5);
    ctx.closePath();
    ctx.fill();
    // Visor glow eyes
    ctx.shadowColor = '#88aaff';
    ctx.shadowBlur  = 8 * glow;
    ctx.fillStyle   = '#99bbff';
    ctx.beginPath();
    ctx.ellipse(x - 1.8, y - 9.5, 1.3, 0.8, -0.15, 0, Math.PI * 2);
    ctx.ellipse(x + 1.8, y - 9.5, 1.3, 0.8,  0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Spear shaft
    const spearLen  = 18;
    const tipLen    = 6;
    const spearEndX = x + Math.cos(this.aimAngle) * spearLen;
    const spearEndY = y - 3 + Math.sin(this.aimAngle) * spearLen;
    const tipX      = spearEndX + Math.cos(this.aimAngle) * tipLen;
    const tipY      = spearEndY + Math.sin(this.aimAngle) * tipLen;
    const perpA     = this.aimAngle + Math.PI / 2;

    ctx.strokeStyle = '#7a8ec0';
    ctx.lineWidth   = 2;
    ctx.lineCap     = 'round';
    ctx.shadowColor = 'rgba(140,180,255,0.55)';
    ctx.shadowBlur  = 6 * glow;
    ctx.beginPath();
    ctx.moveTo(x, y - 3);
    ctx.lineTo(spearEndX, spearEndY);
    ctx.stroke();
    // Tip
    ctx.fillStyle   = '#ddeeff';
    ctx.shadowColor = 'rgba(180,210,255,0.85)';
    ctx.shadowBlur  = 10 * glow;
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(spearEndX + Math.cos(perpA) * 2.5, spearEndY + Math.sin(perpA) * 2.5);
    ctx.lineTo(spearEndX - Math.cos(perpA) * 2.5, spearEndY - Math.sin(perpA) * 2.5);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineCap = 'butt';
  }

  // ── Militär: sandbag bunker + machine gun ────────────────────────────────────
  _drawMilitary(ctx, t) {
    const x = this.x, y = this.y;
    const spin = t * 5;

    // Sandbag base
    const sandColor = (l) => `hsl(52,40%,${l}%)`;
    for (let i = 0; i < 4; i++) {
      const bx = x - 7 + i * 3.5;
      ctx.fillStyle = sandColor(32 + (i % 2) * 6);
      ctx.beginPath();
      ctx.ellipse(bx + 1.75, y + 5.5, 2, 1.6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 3; i++) {
      const bx = x - 5.5 + i * 3.8;
      ctx.fillStyle = sandColor(36 + (i % 2) * 6);
      ctx.beginPath();
      ctx.ellipse(bx + 1.5, y + 3, 2, 1.6, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Bunker body
    ctx.fillStyle = '#4a5220';
    ctx.fillRect(x - 5, y - 5, 10, 9);
    ctx.fillStyle = '#5a6428';
    ctx.fillRect(x - 5, y - 5, 4, 9);

    // Crenellations
    ctx.fillStyle = '#404818';
    for (const dx of [-4.5, -1.5, 1.5]) ctx.fillRect(x + dx, y - 8, 2.2, 3.5);
    ctx.fillStyle = '#5a6428';
    for (const dx of [-4.5, -1.5, 1.5]) ctx.fillRect(x + dx, y - 8, 0.8, 3.5);

    // Spinning brass casings
    for (let i = 0; i < 5; i++) {
      const a     = spin + (i / 5) * Math.PI * 2;
      const alpha = 0.4 + Math.abs(Math.sin(a)) * 0.5;
      ctx.fillStyle   = `rgba(210,175,40,${alpha})`;
      ctx.shadowColor = this.color;
      ctx.shadowBlur  = 3;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * 7, y + Math.sin(a) * 2.5, 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Olive orb
    const pulse = 0.8 + Math.sin(t * 9) * 0.2;
    ctx.shadowColor = this.color;
    ctx.shadowBlur  = 10 * pulse;
    ctx.fillStyle   = this.color;
    ctx.beginPath();
    ctx.arc(x, y, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(210,230,120,0.7)';
    ctx.beginPath();
    ctx.arc(x - 1.1, y - 1.1, 1.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Machine gun barrel
    ctx.strokeStyle = '#8aaa44';
    ctx.lineWidth   = 2.8;
    ctx.lineCap     = 'round';
    ctx.shadowColor = this.color;
    ctx.shadowBlur  = 5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(this.aimAngle) * 9, y + Math.sin(this.aimAngle) * 9);
    ctx.stroke();
    ctx.strokeStyle = '#aab860';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(this.aimAngle) * 9, y + Math.sin(this.aimAngle) * 9);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.lineCap = 'butt';
  }

  // ── Katapult: medieval trebuchet with swinging arm ───────────────────────────
  _drawCatapult(ctx, t) {
    const x = this.x, y = this.y;
    const pulse  = 0.6 + Math.sin(t * 2.8) * 0.4;
    const armAng = this.aimAngle - Math.PI * 0.5;

    // Wooden base platform
    ctx.fillStyle = '#5a3810';
    ctx.fillRect(x - 9, y + 4, 18, 5);
    ctx.fillStyle = '#6a4820';
    ctx.fillRect(x - 9, y + 4, 18, 1.5);
    ctx.fillStyle = '#3a2008';
    ctx.fillRect(x - 9, y + 8, 18, 1);

    // Wheels
    for (const wx of [x - 7, x + 4]) {
      ctx.fillStyle = '#3a2008';
      ctx.beginPath();
      ctx.arc(wx, y + 9, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#6a4820';
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.arc(wx, y + 9, 3.2, 0, Math.PI * 2);
      ctx.stroke();
      // Spokes
      for (let i = 0; i < 4; i++) {
        const a = t * 2 + (i / 4) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(wx, y + 9);
        ctx.lineTo(wx + Math.cos(a) * 3, y + 9 + Math.sin(a) * 3);
        ctx.stroke();
      }
    }

    // Frame uprights
    ctx.strokeStyle = '#5a3810';
    ctx.lineWidth   = 3;
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.moveTo(x - 4, y + 4); ctx.lineTo(x - 1, y - 5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 4, y + 4); ctx.lineTo(x + 1, y - 5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 1, y - 5); ctx.lineTo(x + 1, y - 5);
    ctx.stroke();
    ctx.lineCap = 'butt';

    // Pivot arm (rotating toward aim)
    ctx.save();
    ctx.translate(x, y - 2);
    ctx.rotate(armAng);
    ctx.strokeStyle = '#6a4010';
    ctx.lineWidth   = 2.5;
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.moveTo(-12, 0); ctx.lineTo(8, 0);
    ctx.stroke();
    // Counterweight
    ctx.fillStyle = '#3a2808';
    ctx.beginPath();
    ctx.arc(-12, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#555030';
    ctx.beginPath();
    ctx.arc(-12, 0, 2.5, 0, Math.PI * 2);
    ctx.fill();
    // Sling cup
    ctx.fillStyle = '#8a6030';
    ctx.beginPath();
    ctx.arc(10, 0, 2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = 'rgba(255,160,40,0.8)';
    ctx.shadowBlur  = 10 * pulse;
    ctx.fillStyle   = '#e8a030';
    ctx.beginPath();
    ctx.arc(10, 0, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineCap = 'butt';
    ctx.restore();
  }

  // ── Blondie: enchantress with floating hearts ─────────────────────────────────
  _drawBlondie(ctx, t) {
    const x = this.x, y = this.y;
    const pulse = 0.55 + Math.sin(t * 2.5) * 0.45;
    const spin  = t * 1.6;

    // Pink marble base
    ctx.fillStyle = '#4a1030';
    ctx.fillRect(x - 7, y + 5, 14, 4);
    ctx.fillStyle = '#2e0820';
    ctx.fillRect(x - 7, y + 8, 14, 1);
    ctx.fillStyle = 'rgba(255,180,220,0.2)';
    ctx.fillRect(x - 7, y + 5, 14, 1.2);

    // White marble column
    ctx.fillStyle = '#f0d8ec';
    ctx.beginPath();
    ctx.moveTo(x - 3.5, y + 5);
    ctx.lineTo(x + 3.5, y + 5);
    ctx.lineTo(x + 2.5, y - 2);
    ctx.lineTo(x - 2.5, y - 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(x - 3.5, y + 5);
    ctx.lineTo(x - 1, y + 5);
    ctx.lineTo(x - 0.5, y - 2);
    ctx.lineTo(x - 2.5, y - 2);
    ctx.closePath();
    ctx.fill();

    // Sparkle orbit
    for (let i = 0; i < 6; i++) {
      const a     = spin + (i / 6) * Math.PI * 2;
      const alpha = 0.4 + Math.sin(spin * 3 + i) * 0.3;
      ctx.fillStyle   = `rgba(255,130,200,${Math.max(0, alpha)})`;
      ctx.shadowColor = this.color;
      ctx.shadowBlur  = 6;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * 8.5, y - 2 + Math.sin(a) * 4, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Hair (big blonde poof)
    ctx.fillStyle = '#f0c030';
    ctx.beginPath();
    ctx.arc(x, y - 8, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f8d850';
    ctx.beginPath();
    ctx.arc(x - 2, y - 9, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Face
    ctx.fillStyle = '#f5c8a0';
    ctx.beginPath();
    ctx.arc(x, y - 8, 4.2, 0, Math.PI * 2);
    ctx.fill();
    // Eyes
    ctx.fillStyle = '#3a1860';
    ctx.beginPath();
    ctx.ellipse(x - 1.8, y - 8.5, 1, 0.9, -0.1, 0, Math.PI * 2);
    ctx.ellipse(x + 1.8, y - 8.5, 1, 0.9,  0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#9050f0';
    ctx.beginPath();
    ctx.arc(x - 1.8, y - 8.5, 0.5, 0, Math.PI * 2);
    ctx.arc(x + 1.8, y - 8.5, 0.5, 0, Math.PI * 2);
    ctx.fill();
    // Smile
    ctx.strokeStyle = '#c87060';
    ctx.lineWidth   = 0.8;
    ctx.beginPath();
    ctx.arc(x, y - 7.2, 1.5, 0.2, Math.PI - 0.2);
    ctx.stroke();
    // Rosy cheeks
    ctx.fillStyle = 'rgba(255,150,150,0.35)';
    ctx.beginPath();
    ctx.ellipse(x - 3, y - 8, 1.5, 0.8, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 3, y - 8, 1.5, 0.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Floating heart above head
    const hy = y - 15 - Math.sin(t * 2.5) * 1.5;
    ctx.shadowColor = this.color;
    ctx.shadowBlur  = 18 * pulse;
    ctx.fillStyle   = this.color;
    ctx.beginPath();
    ctx.arc(x - 1.8, hy, 3, 0, Math.PI * 2);
    ctx.arc(x + 1.8, hy, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - 4.5, hy + 1);
    ctx.lineTo(x,       hy + 6);
    ctx.lineTo(x + 4.5, hy + 1);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,230,245,0.85)';
    ctx.beginPath();
    ctx.arc(x - 1.2, hy - 0.8, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
}
