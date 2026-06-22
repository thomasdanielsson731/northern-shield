import { SPRITES } from '../assets.js';
import { getSpriteScale } from '../config.js';

// Map an angle (radians) to a direction row: 0=right, 1=down, 2=left, 3=up.
function angleToRow(angle) {
  const a = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  if (a < Math.PI / 4 || a >= 7 * Math.PI / 4) return 0;
  if (a < 3 * Math.PI / 4) return 1;
  if (a < 5 * Math.PI / 4) return 2;
  return 3;
}

export const ENEMY_TYPES = {
  DRAUGR:    'draugr',
  MYLING:    'myling',
  JOTUNN:    'jotunn',
  MARA:      'mara',
  WARG:      'warg',
  EINHERJAR: 'einherjar',
};

export const ENEMY_DEFS = {
  mara: {
    label:          'Mara',
    speed:          0.70,
    hp:             180,
    radius:         7,
    reward:         12,
    color:          '#6018b8',   // vivid deep purple — nightmare spirit
    highlightColor: '#b060e0',   // saturated violet glow
    flying:         false
  },
  draugr: {
    label:          'Draugr',
    speed:          1.0,
    hp:             130,
    radius:         7,
    reward:         9,
    color:          '#3a6888',   // more saturated blue-slate — undead corpse warrior
    highlightColor: '#90c0de',   // brighter ice-blue highlight
    flying:         false
  },
  myling: {
    label:          'Myling',
    speed:          1.2,
    hp:             110,
    radius:         6,
    reward:         12,
    color:          '#2878e0',   // vivid spectral blue — corrupted child spirit
    highlightColor: '#aacfff',   // bright ghostly highlight
    flying:         true
  },
  jotunn: {
    label:          'Jötunn',
    speed:          0.40,
    hp:             700,
    radius:         13,
    reward:         32,
    color:          '#5c4030',   // stone-brown — Norse earth giant
    highlightColor: '#ff9030',   // bright amber-orange volcanic heat
    flying:         false
  },
  warg: {
    label:          'Warg',
    speed:          1.85,
    hp:             95,
    radius:         6,
    reward:         8,
    color:          '#4a3828',   // dark grey-brown — Norse shadow wolf
    highlightColor: '#e08830',   // amber eye-glow highlight
    flying:         false
  },
  einherjar: {
    label:          'Einherjar',
    speed:          0.52,
    hp:             460,
    radius:         9,
    reward:         28,
    color:          '#58506a',   // iron grey with purple tint — armored fallen warrior
    highlightColor: '#d4c090',   // weathered gold highlight
    flying:         false
  },
};

export class Enemy {
  constructor(path, type = ENEMY_TYPES.DRAUGR, hpScale = 1) {
    const def = ENEMY_DEFS[type] || ENEMY_DEFS[ENEMY_TYPES.DRAUGR];
    this.type           = type;
    this.path           = path;
    this.pathIndex      = 0;
    this.baseSpeed      = def.speed;
    this.speed          = def.speed;
    this.slowTimer      = 0;
    this.slowFactor     = 1;
    this.radius         = def.radius;
    this.hp             = Math.round(def.hp * hpScale);
    this.maxHp          = Math.round(def.hp * hpScale);
    this.reward         = def.reward;
    this.color          = def.color;
    this.highlightColor = def.highlightColor;
    this.flying         = def.flying;
    this.alive          = true;
    this.reached        = false;
    this.deathTimer     = 0;    // frames remaining for death fade animation
    this.deathMax       = 0;    // max deathTimer (varies by radius)
    this.isElite        = false;  // set by spawnEnemy elite branch only
    this.isHerald       = false;  // set for boss-wave herald squad enemies

    // Boss fields — set externally by spawnBoss()
    this.isBoss      = false;
    this.bossName    = null;
    this.waveNum     = null;
    this.phase75Done = false;
    this.phase50Done = false;
    this.stunTimer    = 0;    // frames frozen during summon stutter
    this.slowImmune   = false;
    this.hitFlash     = 0;    // frames of hit ring remaining
    this.hitFlashMax  = 0;    // max frames set when hit (for alpha normalization)
    this.empPulseTimer = 0;   // cooldown between EMP shockwave rings
    this.staggerVX     = 0;
    this.staggerVY     = 0;
    this.staggerTimer  = 0;

    this.x = path[0].x;
    this.y = path[0].y;
  }

  setPath(path) {
    if (!path || path.length === 0) return;
    this.path      = [{ x: this.x, y: this.y }, ...path];
    this.pathIndex = 0;
  }

  kill() {
    if (!this.alive) return;
    this.alive      = false;
    this.deathMax   = Math.round(12 * (1 + this.radius / 14));
    this.deathTimer = this.deathMax;
  }

  update() {
    if (!this.alive || this.reached) return;
    if (this.pathIndex >= this.path.length - 1) {
      this.reached = true;
      return;
    }

    // Boss summon stutter — frozen in place
    if (this.stunTimer > 0) { this.stunTimer--; return; }

    // Heavy-hit stagger — brief backward nudge
    if (this.staggerTimer > 0) {
      this.staggerTimer--;
      this.x += this.staggerVX;
      this.y += this.staggerVY;
      if (this.staggerTimer === 0) { this.staggerVX = 0; this.staggerVY = 0; }
    }

    if (this.slowTimer > 0) {
      this.slowTimer--;
      if (this.slowTimer === 0) this.slowFactor = 1;
    }
    const effectiveSpeed = (this.slowTimer > 0 && !this.slowImmune)
      ? (this.slowFactor <= 0 ? 0 : Math.max(this.baseSpeed * this.slowFactor, this.baseSpeed * 0.15))
      : this.baseSpeed;

    const target = this.path[this.pathIndex + 1];
    const dx   = target.x - this.x;
    const dy   = target.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= effectiveSpeed) {
      this.x = target.x;
      this.y = target.y;
      this.pathIndex++;
    } else {
      this.x += (dx / dist) * effectiveSpeed;
      this.y += (dy / dist) * effectiveSpeed;
    }
  }

  draw(ctx) {
    // Death fade animation — briefly show corpse fading out after death
    if (!this.alive) {
      if (this.deathTimer > 0) {
        const t = this.deathMax > 0 ? this.deathTimer / this.deathMax : 1;
        this.deathTimer--;
        ctx.save();
        // White kill-flash on first frame
        if (this.deathTimer >= this.deathMax - 2) {
          ctx.globalAlpha = 0.80;
          ctx.fillStyle   = '#ffffff';
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.radius * 1.4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = t * 0.7;
        ctx.translate(this.x, this.y);
        ctx.scale(1 + (1 - t) * 0.4, 1 + (1 - t) * 0.4);
        ctx.translate(-this.x, -this.y);
        this._drawSprite(ctx);
        ctx.restore();
      }
      return;
    }

    // Drop shadow — stronger ellipse grounds units against the dark terrain
    ctx.save();
    ctx.globalAlpha = this.isBoss ? 0.75 : 0.65;
    ctx.fillStyle   = 'rgba(0,0,0,0.92)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + this.radius * 0.85, this.radius * (this.isBoss ? 2.0 : 1.4), this.radius * (this.isBoss ? 0.65 : 0.48), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Type identity ring — subtle colored outline helps distinguish enemy types at small sizes
    if (!this.isBoss) {
      ctx.save();
      ctx.strokeStyle = this.highlightColor;
      ctx.lineWidth   = 0.8;
      ctx.globalAlpha = 0.28;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 0.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Boss ground aura — pulsing crimson ring that scales with threat
    if (this.isBoss) {
      const bT     = performance.now() * 0.001;
      const bPulse = 0.5 + Math.sin(bT * 1.8) * 0.5;
      const auraR  = this.radius * 3.8;
      const ag = ctx.createRadialGradient(
        this.x, this.y + this.radius * 0.4, 0,
        this.x, this.y + this.radius * 0.4, auraR
      );
      ag.addColorStop(0,    `rgba(180,20,20,${0.40 + bPulse * 0.20})`);
      ag.addColorStop(0.45, `rgba(90,10,10,${0.18 + bPulse * 0.08})`);
      ag.addColorStop(1,    'rgba(0,0,0,0)');
      ctx.save();
      ctx.fillStyle = ag;
      ctx.beginPath();
      ctx.ellipse(this.x, this.y + this.radius * 0.3, auraR, auraR * 0.52, 0, 0, Math.PI * 2);
      ctx.fill();
      const rot = bT * 0.5;
      ctx.translate(this.x, this.y);
      ctx.rotate(rot);
      ctx.strokeStyle = `rgba(200,30,15,${0.22 + bPulse * 0.14})`;
      ctx.lineWidth   = 1.5;
      ctx.setLineDash([4, 7]);
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 2.8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // Myling flight shadow — wider ellipse + dashed drop line for clear altitude read
    if (this.type === ENEMY_TYPES.MYLING) {
      const shadowY = this.y + this.radius + 4;
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle   = 'rgba(0,0,0,0.7)';
      ctx.beginPath();
      ctx.ellipse(this.x, shadowY, this.radius * 1.1, this.radius * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      // Dashed drop-line from feet to shadow
      ctx.globalAlpha = 0.40;
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth   = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(this.x, this.y + this.radius);
      ctx.lineTo(this.x, shadowY - this.radius * 0.45);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // ── Damage state — desaturate sprite based on HP band ───────────────────
    const hpRatio = this.hp / this.maxHp;
    ctx.save();
    if (hpRatio < 0.50) {
      ctx.filter = hpRatio < 0.25 ? 'grayscale(40%) brightness(0.72)' : 'grayscale(18%)';
    }

    if (!this._drawSprite(ctx)) {
      if (this.type === ENEMY_TYPES.MYLING) {
        this._drawWisp(ctx);
      } else if (this.type === ENEMY_TYPES.JOTUNN) {
        this._drawGolem(ctx);
      } else if (this.type === ENEMY_TYPES.MARA) {
        this._drawBanshee(ctx);
      } else if (this.type === ENEMY_TYPES.WARG) {
        this._drawWarg(ctx);
      } else if (this.type === ENEMY_TYPES.EINHERJAR) {
        this._drawEinherjar(ctx);
      } else {
        this._drawGraveborn(ctx);
      }
    }

    if (hpRatio < 0.50) ctx.filter = 'none';  // only reset when filter was applied
    ctx.restore();

    // Wounded shimmer — slow red outline (25-50% HP)
    if (hpRatio >= 0.25 && hpRatio < 0.50) {
      const shimmer = 0.5 + Math.sin(performance.now() * 0.007) * 0.5;
      ctx.strokeStyle = `rgba(220,55,25,${0.10 + shimmer * 0.18})`;
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 3, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Critical HP — rapid red pulse ring (0-25%)
    if (hpRatio < 0.25 && hpRatio > 0) {
      const pulse = 0.5 + Math.sin(performance.now() * 0.025) * 0.5;
      ctx.strokeStyle = `rgba(255,55,35,${0.22 + pulse * 0.32})`;
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 3, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Hit flash — white ring + expanding ring when damage lands
    if (this.hitFlash > 0) {
      const hRatio  = this.hitFlashMax > 0 ? this.hitFlash / this.hitFlashMax : 0;
      const hfAlpha = hRatio * 0.78;
      ctx.strokeStyle = `rgba(${this.hitFlashColor ?? '255,240,200'},${hfAlpha})`;
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 2, 0, Math.PI * 2);
      ctx.stroke();

      // Expanding ring — decrement happens after both draws use hRatio
      const expandR = this.radius + (1 - hRatio) * 14;
      ctx.save();
      ctx.strokeStyle = `rgba(${this.hitFlashColor ?? '255,240,200'},${hRatio * 0.6})`;
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, expandR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      this.hitFlash--;
    }

    // Slow / stun overlay
    if (this.slowTimer > 0) {
      const alpha = Math.min(1, this.slowTimer / 25);
      ctx.save();
      if (this.slowFactor <= 0.05) {
        // Stun: spinning gold stars
        const t   = performance.now() * 0.001;
        const rot = t * 3.5;
        for (let i = 0; i < 3; i++) {
          const a  = rot + (i / 3) * Math.PI * 2;
          const sr = this.radius + 10;
          const sx = this.x + Math.cos(a) * sr;
          const sy = this.y + Math.sin(a) * sr;
          ctx.shadowColor = '#ffdd00';
          ctx.shadowBlur  = 6;
          ctx.fillStyle   = `rgba(255,220,30,${0.65 * alpha})`;
          ctx.beginPath();
          const or = 3, ir = 1.3, pts = 5;
          for (let j = 0; j < pts * 2; j++) {
            const sa = (j * Math.PI / pts) - Math.PI / 2 + rot * 2 + i;
            const rr = j % 2 === 0 ? or : ir;
            if (j === 0) ctx.moveTo(sx + Math.cos(sa) * rr, sy + Math.sin(sa) * rr);
            else         ctx.lineTo(sx + Math.cos(sa) * rr, sy + Math.sin(sa) * rr);
          }
          ctx.closePath();
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      } else {
        // Slow: spec-compliant icy body overlay rgba(100,160,255,0.35) + border ring
        ctx.fillStyle = `rgba(100,160,255,${Math.min(0.35, alpha * 0.35)})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(100,160,255,${Math.min(0.65, alpha * 0.65)})`;
        ctx.lineWidth   = 1.5;
        ctx.shadowColor = 'rgba(100,160,255,0.5)';
        ctx.shadowBlur  = 5;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius + 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
      ctx.restore();
    }

    // Slow immunity indicator — gold diamond when boss is immune
    if (this.slowImmune) {
      ctx.save();
      const ix = this.x, iy = this.y - this.radius - 9;
      const s  = 4;
      ctx.fillStyle   = 'rgba(255,200,60,0.85)';
      ctx.shadowColor = '#ffcc00';
      ctx.shadowBlur  = 5;
      ctx.beginPath();
      ctx.moveTo(ix, iy - s); ctx.lineTo(ix + s, iy);
      ctx.lineTo(ix, iy + s); ctx.lineTo(ix - s, iy);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    // Elite indicator — amber diamond above HP bar for high-HP enemies
    if (this.isElite && !this.isBoss) {
      ctx.save();
      const ix = this.x + this.radius + 4, iy = this.y - this.radius - 6;
      const s  = 3;
      ctx.fillStyle   = 'rgba(230,150,30,0.80)';
      ctx.shadowColor = '#e89020';
      ctx.shadowBlur  = 4;
      ctx.beginPath();
      ctx.moveTo(ix, iy - s); ctx.lineTo(ix + s, iy);
      ctx.lineTo(ix, iy + s); ctx.lineTo(ix - s, iy);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    // Herald ring — orange dashed outline for boss-wave herald enemies
    if (this.isHerald) {
      const t = performance.now() * 0.003;
      ctx.save();
      ctx.strokeStyle = `rgba(255,140,30,${0.55 + Math.sin(t) * 0.25})`;
      ctx.lineWidth   = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    if (!this.isBoss) this._drawHpBar(ctx);
  }

  _drawSprite(ctx) {
    const sp = SPRITES[this.type];
    if (!sp || !sp.img.complete || sp.img.naturalWidth === 0) return false;

    const frame = Math.floor(performance.now() / 180) % 2;  // cycle IDLE/WALK frames only
    const dh    = this.radius * (this.isBoss ? 7.8 : 6.0);
    const dw    = dh * sp.frameW / sp.frameH;
    // Apply experimental sprite scale multiplier
    const scale = getSpriteScale();
    const dhs = Math.round(dh * scale);
    const dws = Math.round(dw * scale);

    // Ground shadow
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.beginPath();
    ctx.ellipse(this.x + 1, this.y + this.radius * 0.55, dws * 0.52, dws * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(this.x, this.y);
    const nextPt = this.path && this.pathIndex + 1 < this.path.length
      ? this.path[this.pathIndex + 1] : null;
    const dx = nextPt ? nextPt.x - this.x : 1;
    const dy = nextPt ? nextPt.y - this.y : 0;
    const row = sp.rows >= 4 ? angleToRow(Math.atan2(dy, dx)) : 0;
    if (sp.rows < 4 && dx < 0) ctx.scale(-1, 1);
    ctx.drawImage(sp.img,
      frame * sp.frameW, row * sp.frameH, sp.frameW, sp.frameH,
      -dws / 2, -dhs * 0.88, dws, dhs);
    ctx.restore();

    // Flying badge for Myling
    if (this.flying) {
      ctx.save();
      ctx.fillStyle = 'rgba(200,230,255,0.65)';
      ctx.beginPath();
      const fty = this.y - this.radius * 1.7;
      ctx.moveTo(this.x,     fty - 3.5);
      ctx.lineTo(this.x - 3, fty + 2.5);
      ctx.lineTo(this.x + 3, fty + 2.5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    return true;
  }

  // ── Graveborn: undead skeleton warrior ───────────────────────────────────────
  _drawGraveborn(ctx) {
    const x = this.x, y = this.y;
    const r = this.radius;
    const t = performance.now() * 0.001;
    const bob = Math.sin(t * 5.5) * 1.0;

    // Ground shadow
    ctx.fillStyle = 'rgba(0,0,0,0.38)';
    ctx.beginPath();
    ctx.ellipse(x + 2, y + r * 0.82, r * 1.15, r * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tattered robe
    ctx.shadowColor = 'rgba(80,30,130,0.45)';
    ctx.shadowBlur  = 10;
    ctx.fillStyle   = '#220e22';
    ctx.beginPath();
    ctx.moveTo(x - r * 0.9,  y + r * 0.75);
    ctx.lineTo(x + r * 0.9,  y + r * 0.75);
    ctx.lineTo(x + r * 0.68, y - r * 0.08);
    ctx.lineTo(x - r * 0.68, y - r * 0.08);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    // Robe highlight strip
    ctx.fillStyle = '#401a40';
    ctx.beginPath();
    ctx.moveTo(x - r * 0.9,  y + r * 0.75);
    ctx.lineTo(x - r * 0.25, y + r * 0.75);
    ctx.lineTo(x - r * 0.18, y - r * 0.08);
    ctx.lineTo(x - r * 0.68, y - r * 0.08);
    ctx.closePath();
    ctx.fill();
    // Hem teeth
    ctx.fillStyle = '#150a15';
    for (let i = -3; i <= 3; i++) {
      if (Math.abs(i) % 2 === 1) {
        ctx.fillRect(x + i * r * 0.22 - r * 0.11, y + r * 0.62, r * 0.24, r * 0.22);
      }
    }

    // Bone arms
    ctx.strokeStyle = '#c8c0b4';
    ctx.lineWidth   = 1.8;
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.moveTo(x - r * 0.55, y + r * 0.1);
    ctx.lineTo(x - r * 1.05, y + r * 0.45);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + r * 0.55, y + r * 0.05);
    ctx.lineTo(x + r * 1.0, y - r * 0.18);
    ctx.stroke();
    // Rusted axe — gripped in right hand
    ctx.save();
    { const ahx = x + r * 0.98, ahy = y - r * 0.15;
      ctx.strokeStyle = '#5a3818'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(ahx, ahy); ctx.lineTo(ahx + r * 0.05, ahy - r * 0.60); ctx.stroke();
      ctx.fillStyle = '#6a5840'; ctx.strokeStyle = '#483c2c'; ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(ahx + r * 0.05, ahy - r * 0.55);
      ctx.lineTo(ahx + r * 0.40, ahy - r * 0.72);
      ctx.lineTo(ahx + r * 0.28, ahy - r * 0.35);
      ctx.closePath(); ctx.fill(); ctx.stroke(); }
    ctx.restore();

    // Skull
    ctx.shadowColor = 'rgba(80,30,140,0.65)';
    ctx.shadowBlur  = 12;
    ctx.fillStyle   = '#d0c8bc';
    ctx.beginPath();
    ctx.arc(x, y - r * 0.52 + bob * 0.28, r * 0.56, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    // Iron helm — dented conical cap over skull top
    { const hY = y - r * 0.52 + bob * 0.28, hR = r * 0.58;
      ctx.fillStyle = '#484440';
      ctx.beginPath(); ctx.arc(x, hY, hR + 0.5, Math.PI, 0, true); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#3a3634'; ctx.fillRect(x - hR, hY - 1.5, hR * 2, 2.8);
      ctx.fillStyle = '#575250'; ctx.fillRect(x - 1.3, hY, 2.4, hR * 0.55); }
    // Jaw
    ctx.fillStyle = '#b8b0a4';
    ctx.beginPath();
    ctx.ellipse(x, y - r * 0.14 + bob * 0.28, r * 0.34, r * 0.2, 0, 0, Math.PI);
    ctx.fill();
    // Teeth
    ctx.fillStyle = '#e0d8cc';
    for (const tx of [-r * 0.22, 0, r * 0.22]) {
      ctx.fillRect(x + tx - r * 0.07, y - r * 0.08 + bob * 0.28, r * 0.12, r * 0.15);
    }
    // Nose cavity
    ctx.fillStyle = '#1a0a1a';
    ctx.beginPath();
    ctx.arc(x, y - r * 0.44 + bob * 0.28, r * 0.1, 0, Math.PI * 2);
    ctx.fill();
    // Eye sockets
    ctx.fillStyle = '#0a040a';
    ctx.beginPath(); ctx.ellipse(x - r * 0.24, y - r * 0.62 + bob * 0.28, r * 0.18, r * 0.14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + r * 0.24, y - r * 0.62 + bob * 0.28, r * 0.18, r * 0.14, 0, 0, Math.PI * 2); ctx.fill();
    // Glowing pupils
    ctx.shadowColor = this.highlightColor;
    ctx.shadowBlur  = 8;
    ctx.fillStyle   = this.highlightColor;
    ctx.beginPath(); ctx.arc(x - r * 0.24, y - r * 0.62 + bob * 0.28, r * 0.09, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + r * 0.24, y - r * 0.62 + bob * 0.28, r * 0.09, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  }

  // ── Wisp: magical energy orb ─────────────────────────────────────────────────
  _drawWisp(ctx) {
    const x = this.x, y = this.y;
    const r = this.radius;
    const t = performance.now() * 0.001;
    const rot   = t * 2.1;
    const pulse = 0.65 + Math.sin(t * 3.5) * 0.35;

    // Outer glow haze — sickly pale green
    ctx.shadowColor = `rgba(120,180,60,${0.30 * pulse})`;
    ctx.shadowBlur  = 8;
    ctx.fillStyle   = `rgba(100,160,40,${0.18 * pulse})`;
    ctx.beginPath();
    ctx.arc(x, y, r * 2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Rotating energy rings
    ctx.save();
    ctx.translate(x, y);
    for (let ring = 0; ring < 2; ring++) {
      ctx.rotate(ring === 0 ? rot : -rot * 1.4);
      ctx.strokeStyle = `rgba(${ring === 0 ? '130,200,60' : '160,220,80'},${(0.5 - ring * 0.15) * pulse})`;
      ctx.lineWidth   = 1.2 - ring * 0.2;
      ctx.setLineDash([3 + ring, 5 - ring]);
      ctx.beginPath();
      ctx.ellipse(0, 0, r * (1.35 - ring * 0.2), r * (0.55 - ring * 0.05), 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();

    // Diamond body
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4);
    ctx.shadowColor = 'rgba(80,180,50,0.90)';
    ctx.shadowBlur  = 10 * pulse;
    ctx.fillStyle   = this.color;
    ctx.fillRect(-r * 0.82, -r * 0.82, r * 1.64, r * 1.64);
    ctx.shadowBlur  = 0;
    ctx.fillStyle   = this.highlightColor;
    ctx.fillRect(-r * 0.36, -r * 0.36, r * 0.72, r * 0.72);
    ctx.restore();

    // Bright ethereal core
    ctx.fillStyle = '#e8f4ff';
    ctx.beginPath();
    ctx.arc(x, y, r * 0.22, 0, Math.PI * 2);
    ctx.fill();

    // Orbiting sparks
    for (let i = 0; i < 5; i++) {
      const a  = rot * 2.5 + (i / 5) * Math.PI * 2;
      const sr = r * 1.45;
      const alpha = Math.max(0, 0.45 + Math.sin(rot * 4 + i * 1.3) * 0.35);
      ctx.fillStyle   = `rgba(100,220,80,${alpha})`;
      ctx.shadowColor = '#50cc30';
      ctx.shadowBlur  = 6;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * sr, y + Math.sin(a) * sr * 0.5, r * 0.14, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Flying badge: small upward triangle above body
    ctx.save();
    ctx.fillStyle   = 'rgba(160,210,255,0.65)';
    ctx.shadowColor = 'rgba(80,160,255,0.5)';
    ctx.shadowBlur  = 5;
    const fty = y - r * 1.7;
    ctx.beginPath();
    ctx.moveTo(x,      fty - 3.5);
    ctx.lineTo(x - 3,  fty + 2.5);
    ctx.lineTo(x + 3,  fty + 2.5);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // ── Golem: stone giant — ancient granite with molten amber fractures ──────────
  _drawGolem(ctx) {
    const x = this.x, y = this.y;
    const r = this.radius;
    const t = performance.now() * 0.001;
    const pulse = 0.5 + Math.sin(t * 2.5) * 0.5;

    // Large shadow
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath();
    ctx.ellipse(x + 4, y + r * 0.72, r * 1.3, r * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();

    // Dark stone outer shell — cold slate shadow
    ctx.shadowColor = 'rgba(20,40,70,0.4)';
    ctx.shadowBlur  = 12;
    ctx.fillStyle   = '#060810';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Stone body — dark warm brown
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(x, y, r - 2, 0, Math.PI * 2);
    ctx.fill();

    // Stone texture bumps — cold dark tint
    const bumps = [
      [-r * 0.5, -r * 0.45, r * 0.22],
      [ r * 0.48, -r * 0.38, r * 0.18],
      [-r * 0.28,  r * 0.52, r * 0.2 ],
      [ r * 0.42,  r * 0.45, r * 0.16],
      [ 0,        -r * 0.6,  r * 0.14]
    ];
    ctx.fillStyle = 'rgba(4,8,16,0.55)';
    for (const [bx, by, br] of bumps) {
      ctx.beginPath();
      ctx.arc(x + bx, y + by, br, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(80,140,200,0.18)';
    for (const [bx, by, br] of bumps) {
      ctx.beginPath();
      ctx.arc(x + bx - br * 0.35, y + by - br * 0.35, br * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }

    // Ice fracture lines — radiating cold blue cracks (solid, no per-frame gradient)
    ctx.save();
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 7; i++) {
      const angle = (i / 7) * Math.PI * 2 + 0.4;
      const len   = r * (0.48 + Math.sin(t * 1.8 + i * 1.2) * 0.14);
      const frac  = i / 6;
      const alpha = (0.55 + frac * 0.25) * pulse;
      ctx.strokeStyle = `rgba(${Math.round(80 + frac * 60)},${Math.round(160 + frac * 40)},255,${alpha})`;
      ctx.beginPath();
      ctx.moveTo(x, y);
      const mx = x + Math.cos(angle + 0.2) * len * 0.5;
      const my = y + Math.sin(angle + 0.2) * len * 0.5;
      ctx.quadraticCurveTo(mx, my, x + Math.cos(angle) * len, y + Math.sin(angle) * len);
      ctx.stroke();
    }
    ctx.restore();

    // Stone rim border — cold dark
    ctx.strokeStyle = '#04080e';
    ctx.lineWidth   = 2.5;
    ctx.beginPath();
    ctx.arc(x, y, r - 1.5, 0, Math.PI * 2);
    ctx.stroke();

    // Ice core — cold blue glow
    ctx.shadowColor = 'rgba(60,140,220,0.95)';
    ctx.shadowBlur  = 20 * pulse;
    ctx.fillStyle   = this.highlightColor;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.38, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d0e8ff';
    ctx.beginPath();
    ctx.arc(x, y, r * 0.17, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Eyes — ice blue
    const eyeY   = y - r * 0.3;
    const eyeOff = r * 0.32;
    ctx.shadowColor = 'rgba(80,180,255,0.95)';
    ctx.shadowBlur  = 12;
    ctx.fillStyle   = '#40b0ff';
    ctx.beginPath(); ctx.arc(x - eyeOff, eyeY, 2.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + eyeOff, eyeY, 2.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c0e8ff';
    ctx.beginPath(); ctx.arc(x - eyeOff, eyeY, 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + eyeOff, eyeY, 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // Amber rune crown — 3 horn/spike spires
    ctx.save();
    ctx.shadowColor = 'rgba(80,180,255,0.90)';
    ctx.shadowBlur  = 10 * pulse;
    ctx.fillStyle   = 'rgba(80,180,255,0.60)';
    ctx.strokeStyle = 'rgba(160,220,255,0.85)';
    ctx.lineWidth   = 1.1;
    for (let hi = -1; hi <= 1; hi++) {
      const hbx = x + hi * r * 0.38, hby = y - r - 1;
      const hLen = r * (hi === 0 ? 0.62 : 0.44);
      ctx.beginPath();
      ctx.moveTo(hbx - 2.5, hby); ctx.lineTo(hbx + hi * 1.5, hby - hLen); ctx.lineTo(hbx + 2.5, hby);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.restore();

    // Boss double-ring indicator — ice blue
    ctx.strokeStyle = 'rgba(80,160,255,0.50)';
    ctx.lineWidth   = 1.2;
    ctx.beginPath();
    ctx.arc(x, y, r + 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(140,200,255,0.25)';
    ctx.lineWidth   = 0.7;
    ctx.beginPath();
    ctx.arc(x, y, r + 9, 0, Math.PI * 2);
    ctx.stroke();
  }

  // ── Banshee: oval ghost with screaming face — cyan spectre ───────────────────
  _drawBanshee(ctx) {
    const x = this.x, y = this.y;
    const r = this.radius;
    const t = performance.now() * 0.001;
    const pulse = 0.5 + Math.sin(t * 4.5) * 0.5;
    const wail  = 0.5 + Math.sin(t * 8.0) * 0.5;

    // Faint floating shadow
    ctx.fillStyle = 'rgba(0,0,0,0.20)';
    ctx.beginPath();
    ctx.ellipse(x + 1, y + r * 0.9, r * 0.85, r * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    // Rotating void-purple aura rings
    ctx.save();
    for (let ring = 0; ring < 3; ring++) {
      const ringR = r * (1.5 + ring * 0.45);
      const alpha = (0.18 - ring * 0.045) * (0.55 + pulse * 0.45);
      ctx.strokeStyle = `rgba(40,20,120,${alpha})`;
      ctx.lineWidth   = 1;
      ctx.setLineDash([2, ring + 3]);
      ctx.lineDashOffset = t * (ring % 2 === 0 ? 22 : -16);
      ctx.beginPath();
      ctx.arc(x, y, ringR, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    // Ghost body — oval head + wispy tail
    const hy = y - r * 0.08;  // head centre
    const bw = r * 0.80;      // half-width
    const bh = r * 0.88;      // half-height (oval)

    ctx.save();
    ctx.shadowColor = this.color;
    ctx.shadowBlur  = 14 * pulse;
    // Path: upper arc + two bezier scallops for wispy tail
    ctx.beginPath();
    ctx.arc(x, hy, bw, Math.PI, 0);                                          // top dome
    ctx.bezierCurveTo(x + bw, hy + bh,    x + bw * 0.4, hy + bh * 1.05, x,             hy + bh * 0.75);
    ctx.bezierCurveTo(x - bw * 0.4, hy + bh * 1.05, x - bw, hy + bh,    x - bw,        hy);
    ctx.closePath();
    const bodyGrad = ctx.createRadialGradient(x, hy - bh * 0.2, 0, x, hy, bw * 1.5);
    bodyGrad.addColorStop(0,   'rgba(130,80,200,0.88)');
    bodyGrad.addColorStop(0.5, 'rgba(90,50,170,0.72)');
    bodyGrad.addColorStop(1,   'rgba(60,30,140,0.40)');
    ctx.fillStyle = bodyGrad;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();

    // Body outline
    ctx.strokeStyle = `rgba(160,100,240,${0.55 + pulse * 0.25})`;
    ctx.lineWidth   = 1.2;
    ctx.beginPath();
    ctx.arc(x, hy, bw, Math.PI, 0);
    ctx.bezierCurveTo(x + bw, hy + bh,    x + bw * 0.4, hy + bh * 1.05, x,             hy + bh * 0.75);
    ctx.bezierCurveTo(x - bw * 0.4, hy + bh * 1.05, x - bw, hy + bh,    x - bw,        hy);
    ctx.closePath();
    ctx.stroke();

    // Screaming face
    const faceY  = hy - r * 0.05;
    const eyeOff = bw * 0.38;
    const eyeW   = bw * 0.22, eyeH = bh * 0.20;

    // Eye sockets — hollow dark
    ctx.fillStyle = 'rgba(0,15,35,0.90)';
    ctx.beginPath();
    ctx.ellipse(x - eyeOff, faceY - bh * 0.12, eyeW, eyeH, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + eyeOff, faceY - bh * 0.12, eyeW, eyeH, 0, 0, Math.PI * 2);
    ctx.fill();
    // Eye socket glow — dream-purple
    ctx.strokeStyle = `rgba(180,80,240,${0.50 + pulse * 0.30})`;
    ctx.lineWidth   = 0.8;
    ctx.beginPath();
    ctx.ellipse(x - eyeOff, faceY - bh * 0.12, eyeW, eyeH, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(x + eyeOff, faceY - bh * 0.12, eyeW, eyeH, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Screaming mouth — wide open ellipse
    const mouthH = bh * (0.20 + wail * 0.10);
    ctx.fillStyle = 'rgba(0,10,30,0.92)';
    ctx.beginPath();
    ctx.ellipse(x, faceY + bh * 0.20, bw * 0.46, mouthH, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(160,70,230,${0.40 + wail * 0.35})`;
    ctx.lineWidth   = 0.9;
    ctx.beginPath();
    ctx.ellipse(x, faceY + bh * 0.20, bw * 0.46, mouthH, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Dream-rune badge — top-right
    ctx.save();
    const bdx = x + bw * 0.80, bdy = y - r * 0.75, bs = 5.5;
    ctx.shadowColor = '#a060e0';
    ctx.shadowBlur  = 7;
    ctx.fillStyle   = '#a060e0';
    ctx.beginPath();
    ctx.moveTo(bdx + bs * 0.12,  bdy - bs * 0.52);
    ctx.lineTo(bdx - bs * 0.18,  bdy + bs * 0.05);
    ctx.lineTo(bdx + bs * 0.04,  bdy + bs * 0.05);
    ctx.lineTo(bdx - bs * 0.12,  bdy + bs * 0.52);
    ctx.lineTo(bdx + bs * 0.20,  bdy - bs * 0.05);
    ctx.lineTo(bdx - bs * 0.04,  bdy - bs * 0.05);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // ── Warg: dark swift wolf ────────────────────────────────────────────────────
  _drawWarg(ctx) {
    const x = this.x, y = this.y;
    const r = this.radius;
    const t = performance.now() * 0.001;
    // Gallop bob — faster than undead
    const bob = Math.sin(t * 9.0) * 0.9;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.beginPath();
    ctx.ellipse(x + 1, y + r * 0.9 - bob, r * 1.4, r * 0.30, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body — low horizontal oval
    ctx.shadowColor = 'rgba(60,30,0,0.55)';
    ctx.shadowBlur  = 7;
    ctx.fillStyle   = '#3a2c1c';
    ctx.beginPath();
    ctx.ellipse(x, y - bob * 0.4, r * 1.15, r * 0.72, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Fur texture ridge along spine
    ctx.fillStyle = '#4e3a22';
    ctx.beginPath();
    ctx.ellipse(x - r * 0.1, y - r * 0.22 - bob * 0.4, r * 0.75, r * 0.28, -0.15, 0, Math.PI * 2);
    ctx.fill();

    // Head (forward — left when moving right, so at x - r * 0.7)
    const hx = x - r * 0.65, hy = y - r * 0.35 - bob * 0.5;
    ctx.fillStyle = '#3a2c1c';
    ctx.beginPath();
    ctx.ellipse(hx, hy, r * 0.62, r * 0.50, -0.25, 0, Math.PI * 2);
    ctx.fill();

    // Snout
    ctx.fillStyle = '#2a1c0e';
    ctx.beginPath();
    ctx.ellipse(hx - r * 0.42, hy + r * 0.05, r * 0.28, r * 0.22, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Amber eyes — glowing pair
    const eyeFlicker = 0.72 + Math.sin(t * 3.4) * 0.18;
    ctx.shadowColor = '#e07010';
    ctx.shadowBlur  = 5 * eyeFlicker;
    ctx.fillStyle   = `rgba(230,110,20,${eyeFlicker})`;
    ctx.beginPath(); ctx.arc(hx - r * 0.12, hy - r * 0.12, r * 0.16, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(hx - r * 0.38, hy - r * 0.10, r * 0.14, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // Ears — two small triangles
    ctx.fillStyle = '#2a1c0e';
    ctx.beginPath();
    ctx.moveTo(hx + r * 0.10, hy - r * 0.40);
    ctx.lineTo(hx + r * 0.28, hy - r * 0.65);
    ctx.lineTo(hx + r * 0.38, hy - r * 0.40);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(hx - r * 0.08, hy - r * 0.42);
    ctx.lineTo(hx + r * 0.04, hy - r * 0.62);
    ctx.lineTo(hx + r * 0.20, hy - r * 0.42);
    ctx.closePath(); ctx.fill();

    // Tail — curved upward
    ctx.strokeStyle = '#3a2c1c';
    ctx.lineWidth   = r * 0.28;
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.moveTo(x + r * 0.90, y - r * 0.10 - bob * 0.3);
    ctx.quadraticCurveTo(x + r * 1.35, y - r * 0.60 - bob * 0.5, x + r * 1.10, y - r * 1.05 - bob * 0.5);
    ctx.stroke();
    ctx.lineCap = 'butt';

    // Running legs — 4 sticks (paired, offset phase)
    const leg1 = Math.sin(t * 9.0) * r * 0.55;
    const leg2 = Math.sin(t * 9.0 + Math.PI) * r * 0.55;
    ctx.strokeStyle = '#2a1c0e';
    ctx.lineWidth   = r * 0.22;
    ctx.lineCap     = 'round';
    // Front pair
    ctx.beginPath(); ctx.moveTo(x - r * 0.35, y + r * 0.30); ctx.lineTo(x - r * 0.35 + leg1 * 0.5, y + r * 0.85 + leg1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - r * 0.10, y + r * 0.30); ctx.lineTo(x - r * 0.10 + leg2 * 0.5, y + r * 0.85 + leg2); ctx.stroke();
    // Back pair
    ctx.beginPath(); ctx.moveTo(x + r * 0.40, y + r * 0.28); ctx.lineTo(x + r * 0.40 - leg1 * 0.4, y + r * 0.85 + leg1); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + r * 0.65, y + r * 0.28); ctx.lineTo(x + r * 0.65 - leg2 * 0.4, y + r * 0.85 + leg2); ctx.stroke();
    ctx.lineCap = 'butt';
  }

  // ── Einherjar: armored fallen Viking warrior ──────────────────────────────────
  _drawEinherjar(ctx) {
    const x = this.x, y = this.y;
    const r = this.radius;
    const t = performance.now() * 0.001;
    const march = Math.sin(t * 4.2) * 0.7; // slow heavy march

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.ellipse(x + 2, y + r * 0.85, r * 1.25, r * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    // Kite shield (left side, slightly forward)
    const shieldX = x - r * 0.65, shieldY = y - r * 0.10;
    ctx.shadowColor = 'rgba(30,50,80,0.55)';
    ctx.shadowBlur  = 6;
    ctx.fillStyle   = '#1e2c48';
    ctx.beginPath();
    ctx.moveTo(shieldX, shieldY - r * 0.88);
    ctx.lineTo(shieldX + r * 0.58, shieldY - r * 0.52);
    ctx.lineTo(shieldX + r * 0.52, shieldY + r * 0.62);
    ctx.lineTo(shieldX, shieldY + r * 0.92);
    ctx.lineTo(shieldX - r * 0.52, shieldY + r * 0.62);
    ctx.lineTo(shieldX - r * 0.58, shieldY - r * 0.52);
    ctx.closePath(); ctx.fill();
    // Shield boss (center stud)
    ctx.fillStyle = '#a09060';
    ctx.beginPath(); ctx.arc(shieldX, shieldY, r * 0.22, 0, Math.PI * 2); ctx.fill();
    // Shield rim highlight
    ctx.strokeStyle = 'rgba(180,150,80,0.45)';
    ctx.lineWidth   = 1.2;
    ctx.beginPath();
    ctx.moveTo(shieldX, shieldY - r * 0.88);
    ctx.lineTo(shieldX + r * 0.58, shieldY - r * 0.52);
    ctx.lineTo(shieldX + r * 0.52, shieldY + r * 0.62);
    ctx.lineTo(shieldX, shieldY + r * 0.92);
    ctx.closePath(); ctx.stroke();
    ctx.shadowBlur = 0;

    // Body — iron plate armor (torso rectangle)
    ctx.fillStyle = '#48445a';
    ctx.fillRect(x - r * 0.40, y - r * 0.78 + march * 0.2, r * 0.85, r * 1.42);
    // Armor highlight edge
    ctx.fillStyle = 'rgba(200,190,160,0.18)';
    ctx.fillRect(x - r * 0.40, y - r * 0.78 + march * 0.2, r * 0.18, r * 1.42);
    // Plate lines (horizontal rivets)
    ctx.strokeStyle = 'rgba(0,0,0,0.38)';
    ctx.lineWidth   = 0.7;
    for (let ri = 0; ri < 3; ri++) {
      const ry = y - r * 0.30 + ri * r * 0.40 + march * 0.2;
      ctx.beginPath(); ctx.moveTo(x - r * 0.38, ry); ctx.lineTo(x + r * 0.43, ry); ctx.stroke();
    }

    // Axe (right side) — handle + blade silhouette
    const axeX = x + r * 0.80, axeY = y - r * 0.55 + march * 0.3;
    ctx.strokeStyle = '#2a1c0c';
    ctx.lineWidth   = r * 0.22;
    ctx.lineCap     = 'round';
    ctx.beginPath(); ctx.moveTo(axeX, axeY + r * 1.0); ctx.lineTo(axeX, axeY - r * 0.55); ctx.stroke();
    ctx.lineCap     = 'butt';
    // Axe blade
    ctx.fillStyle = '#787060';
    ctx.beginPath();
    ctx.moveTo(axeX, axeY - r * 0.55);
    ctx.lineTo(axeX + r * 0.62, axeY - r * 0.20);
    ctx.lineTo(axeX + r * 0.42, axeY + r * 0.30);
    ctx.lineTo(axeX - r * 0.08, axeY + r * 0.10);
    ctx.closePath(); ctx.fill();
    // Axe edge glint
    ctx.strokeStyle = 'rgba(210,200,160,0.55)';
    ctx.lineWidth   = 0.8;
    ctx.beginPath();
    ctx.moveTo(axeX + r * 0.62, axeY - r * 0.20);
    ctx.lineTo(axeX + r * 0.42, axeY + r * 0.30);
    ctx.stroke();

    // Helmet — rounded iron cap with nasal guard
    const hY = y - r * 0.82 + march * 0.15;
    ctx.shadowColor = 'rgba(40,40,60,0.6)';
    ctx.shadowBlur  = 5;
    ctx.fillStyle   = '#585468';
    ctx.beginPath();
    ctx.ellipse(x + r * 0.05, hY, r * 0.52, r * 0.44, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    // Nasal guard
    ctx.fillStyle = '#403e50';
    ctx.fillRect(x - r * 0.06, hY - r * 0.05, r * 0.14, r * 0.42);
    ctx.shadowBlur = 0;
    // Helmet rim
    ctx.strokeStyle = 'rgba(160,150,120,0.50)';
    ctx.lineWidth   = 1.0;
    ctx.beginPath();
    ctx.moveTo(x - r * 0.50, hY);
    ctx.lineTo(x + r * 0.58, hY);
    ctx.stroke();

    // Eyes (narrow battle slits)
    ctx.fillStyle = 'rgba(210,175,60,0.65)';
    ctx.fillRect(x - r * 0.32, hY - r * 0.18, r * 0.20, r * 0.12);
    ctx.fillRect(x + r * 0.14, hY - r * 0.18, r * 0.20, r * 0.12);

    // Legs
    ctx.fillStyle = '#3c3848';
    ctx.fillRect(x - r * 0.32, y + r * 0.65 + march, r * 0.30, r * 0.60);
    ctx.fillRect(x + r * 0.04, y + r * 0.65 - march, r * 0.30, r * 0.60);
  }

  _drawHpBar(ctx) {
    const pctFull = this.hp / this.maxHp;
    // Always draw tray for bosses so their bar is always visible; skip entirely only for
    // non-boss enemies at 100% HP (tray still drawn so position is spatially readable)
    const barW = this.radius * (this.isBoss ? 4.0 : 3.2);
    const barH = this.isBoss ? 7 : 5;
    const barX = this.x - barW / 2;
    const barY = this.y - this.radius - (this.isBoss ? 18 : 10);

    const pct = pctFull;

    if (this.isBoss) {
      // Boss: dark border + gold trim + phase-tinted fill — always visible
      ctx.fillStyle = 'rgba(4,2,8,0.95)';
      ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);
      ctx.strokeStyle = 'rgba(200,150,30,0.6)';
      ctx.lineWidth   = 0.8;
      ctx.strokeRect(barX - 1, barY - 1, barW + 2, barH + 2);

      const fillColor = pct > 0.5 ? '#e84848' : pct > 0.25 ? '#e07020' : '#cc2020';
      ctx.fillStyle = fillColor;
      ctx.fillRect(barX, barY, barW * pct, barH);

      // Phase-50 marker line
      ctx.strokeStyle = 'rgba(255,200,60,0.55)';
      ctx.lineWidth   = 0.7;
      ctx.beginPath();
      ctx.moveTo(barX + barW * 0.5, barY);
      ctx.lineTo(barX + barW * 0.5, barY + barH);
      ctx.stroke();

      // Name plate
      ctx.save();
      ctx.font      = 'bold 7px monospace';
      ctx.fillStyle = 'rgba(255,200,80,0.9)';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(220,100,20,0.9)';
      ctx.shadowBlur  = 6;
      ctx.fillText(this.bossName ?? 'BOSS', this.x, barY - 3);
      ctx.shadowBlur = 0;
      ctx.restore();
    } else {
      // Tray always visible — faint at full HP so first hit depletes a pre-existing resource
      ctx.globalAlpha = pct < 1.0 ? 1 : 0.30;
      ctx.fillStyle = 'rgba(6,3,14,0.88)';
      ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
      ctx.globalAlpha = 1;
      if (pct < 1.0) {
        ctx.fillStyle = pct > 0.50 ? '#48a038' : pct > 0.25 ? '#c8a030' : '#e84040';
        ctx.fillRect(barX, barY, barW * pct, barH);
        // Colorblind-safe: tick marks at 25 / 50 / 75 %
        ctx.strokeStyle = 'rgba(0,0,0,0.50)';
        ctx.lineWidth   = 0.8;
        for (const t of [0.25, 0.5, 0.75]) {
          const tx = barX + barW * t;
          ctx.beginPath(); ctx.moveTo(tx, barY); ctx.lineTo(tx, barY + barH); ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(200,160,40,0.32)';
        ctx.lineWidth   = 0.5;
        ctx.strokeRect(barX, barY, barW, barH);
      }
    }
  }
}
