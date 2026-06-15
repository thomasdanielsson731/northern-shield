import { SPRITES } from '../assets.js';

export const ENEMY_TYPES = {
  DRAUGR: 'draugr',
  MYLING: 'myling',
  JOTUNN: 'jotunn',
  MARA:   'mara'
};

export const ENEMY_DEFS = {
  mara: {
    label:          'Mara',
    speed:          0.65,
    hp:             90,
    radius:         7,
    reward:         14,
    color:          '#5020a0',   // void purple — dream entity
    highlightColor: '#c080ff',
    flying:         false
  },
  draugr: {
    label:          'Draugr',
    speed:          0.9,
    hp:             60,
    radius:         7,
    reward:         6,
    color:          '#506070',   // desaturated blue-grey — corrupted corpse
    highlightColor: '#8ab0d0',
    flying:         false
  },
  myling: {
    label:          'Myling',
    speed:          1.1,
    hp:             75,
    radius:         6,
    reward:         8,
    color:          '#70c860',   // sickly yellow-green — diseased child spirit
    highlightColor: '#c8f0a0',
    flying:         true
  },
  jotunn: {
    label:          'Jötunn',
    speed:          0.35,
    hp:             500,
    radius:         13,
    reward:         20,
    color:          '#2a4060',   // deep cold stone-blue — frost giant
    highlightColor: '#c8e8ff',
    flying:         false
  }
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

    // Boss summon stutter — frozen in place
    if (this.stunTimer > 0) { this.stunTimer--; return; }

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
    if (!this.alive) return;

    // Myling flight shadow — offset ellipse below sprite shows it is airborne
    if (this.type === ENEMY_TYPES.MYLING) {
      const shadowY = this.y + this.radius + 2;
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle   = 'rgba(0,0,0,0.7)';
      ctx.beginPath();
      ctx.ellipse(this.x, shadowY, this.radius * 0.9, this.radius * 0.38, 0, 0, Math.PI * 2);
      ctx.fill();
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
      } else {
        this._drawGraveborn(ctx);
      }
    }

    ctx.filter = 'none';
    ctx.restore();

    // Critical HP — rapid red pulse ring (0-25%)
    if (hpRatio < 0.25 && hpRatio > 0) {
      const pulse = 0.5 + Math.sin(performance.now() * 0.025) * 0.5;
      ctx.strokeStyle = `rgba(255,55,35,${0.22 + pulse * 0.32})`;
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 3, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Hit flash — white ring when damage lands
    if (this.hitFlash > 0) {
      const hfAlpha = this.hitFlashMax > 0 ? (this.hitFlash / this.hitFlashMax) * 0.78 : 0;
      ctx.strokeStyle = `rgba(220,235,255,${hfAlpha})`;
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 2, 0, Math.PI * 2);
      ctx.stroke();
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
          const sr = this.radius + 5;
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
        // Slow: icy blue ring
        ctx.strokeStyle = `rgba(120,210,255,${alpha * 0.6})`;
        ctx.lineWidth   = 2;
        ctx.shadowColor = '#80ddff';
        ctx.shadowBlur  = 8;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius + 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = `rgba(160,230,255,${alpha * 0.12})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius + 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      ctx.restore();
    }

    this._drawHpBar(ctx);
  }

  _drawSprite(ctx) {
    const sp = SPRITES[this.type];
    if (!sp || !sp.img.complete || sp.img.naturalWidth === 0) return false;

    const frame = Math.floor(performance.now() / 180) % 2;  // cycle IDLE/WALK frames only
    const dh    = this.radius * 4.2;
    const dw    = dh * sp.frameW / sp.frameH;

    // Ground shadow
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.beginPath();
    ctx.ellipse(this.x + 1, this.y + this.radius * 0.55, dw * 0.52, dw * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(this.x, this.y);
    // Flip to face movement direction
    const dx = this.path && this.pathIndex + 1 < this.path.length
      ? this.path[this.pathIndex + 1].x - this.x : 1;
    if (dx < 0) ctx.scale(-1, 1);
    ctx.drawImage(sp.img,
      frame * sp.frameW, 0, sp.frameW, sp.frameH,
      -dw / 2, -dh * 0.88, dw, dh);
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
    ctx.shadowColor = 'rgba(40,70,110,0.45)';
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
    ctx.shadowColor = 'rgba(60,90,140,0.65)';
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

    // Outer glow haze — sickly green
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r * 2.8);
    grad.addColorStop(0,   `rgba(100,200,70,${0.22 * pulse})`);
    grad.addColorStop(0.5, `rgba(80,170,50,${0.1 * pulse})`);
    grad.addColorStop(1,   'rgba(80,170,50,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r * 2.8, 0, Math.PI * 2);
    ctx.fill();

    // Rotating energy rings
    ctx.save();
    ctx.translate(x, y);
    for (let ring = 0; ring < 2; ring++) {
      ctx.rotate(ring === 0 ? rot : -rot * 1.4);
      ctx.strokeStyle = `rgba(${ring === 0 ? '120,200,80' : '160,220,100'},${(0.5 - ring * 0.15) * pulse})`;
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
    ctx.shadowColor = 'rgba(100,180,60,0.95)';
    ctx.shadowBlur  = 10 * pulse;
    ctx.fillStyle   = this.color;
    ctx.fillRect(-r * 0.82, -r * 0.82, r * 1.64, r * 1.64);
    ctx.shadowBlur  = 0;
    ctx.fillStyle   = this.highlightColor;
    ctx.fillRect(-r * 0.36, -r * 0.36, r * 0.72, r * 0.72);
    ctx.restore();

    // Sickly pale core
    ctx.fillStyle = '#e8f8d0';
    ctx.beginPath();
    ctx.arc(x, y, r * 0.22, 0, Math.PI * 2);
    ctx.fill();

    // Orbiting sparks
    for (let i = 0; i < 5; i++) {
      const a  = rot * 2.5 + (i / 5) * Math.PI * 2;
      const sr = r * 1.45;
      const alpha = Math.max(0, 0.45 + Math.sin(rot * 4 + i * 1.3) * 0.35);
      ctx.fillStyle   = `rgba(160,220,100,${alpha})`;
      ctx.shadowColor = '#88cc40';
      ctx.shadowBlur  = 6;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * sr, y + Math.sin(a) * sr * 0.5, r * 0.14, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Flying badge: small upward triangle above body
    ctx.save();
    ctx.fillStyle   = 'rgba(180,230,120,0.65)';
    ctx.shadowColor = 'rgba(100,180,60,0.5)';
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

  // ── Golem: frost giant — corrupted ancient stone with ice fractures ──────────
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

    // Dark stone outer shell — cold blue-black
    ctx.shadowColor = 'rgba(30,80,160,0.4)';
    ctx.shadowBlur  = 12;
    ctx.fillStyle   = '#06080e';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Stone body — cold deep blue
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(x, y, r - 2, 0, Math.PI * 2);
    ctx.fill();

    // Stone texture bumps — dark cold tint
    const bumps = [
      [-r * 0.5, -r * 0.45, r * 0.22],
      [ r * 0.48, -r * 0.38, r * 0.18],
      [-r * 0.28,  r * 0.52, r * 0.2 ],
      [ r * 0.42,  r * 0.45, r * 0.16],
      [ 0,        -r * 0.6,  r * 0.14]
    ];
    ctx.fillStyle = 'rgba(8,12,30,0.55)';
    for (const [bx, by, br] of bumps) {
      ctx.beginPath();
      ctx.arc(x + bx, y + by, br, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(80,120,180,0.25)';
    for (const [bx, by, br] of bumps) {
      ctx.beginPath();
      ctx.arc(x + bx - br * 0.35, y + by - br * 0.35, br * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }

    // Frost fracture lines — radiating ice cracks
    ctx.save();
    for (let i = 0; i < 7; i++) {
      const angle = (i / 7) * Math.PI * 2 + 0.4;
      const len   = r * (0.48 + Math.sin(t * 1.8 + i * 1.2) * 0.14);
      const grad  = ctx.createLinearGradient(x, y, x + Math.cos(angle) * len, y + Math.sin(angle) * len);
      grad.addColorStop(0,   `rgba(180,230,255,${0.80 * pulse})`);
      grad.addColorStop(0.6, `rgba(100,180,240,${0.45 * pulse})`);
      grad.addColorStop(1,   'rgba(60,120,200,0)');
      ctx.strokeStyle = grad;
      ctx.lineWidth   = 1.4;
      ctx.beginPath();
      ctx.moveTo(x, y);
      const mx = x + Math.cos(angle + 0.2) * len * 0.5;
      const my = y + Math.sin(angle + 0.2) * len * 0.5;
      ctx.quadraticCurveTo(mx, my, x + Math.cos(angle) * len, y + Math.sin(angle) * len);
      ctx.stroke();
    }
    ctx.restore();

    // Stone rim border — cold dark
    ctx.strokeStyle = '#0c1020';
    ctx.lineWidth   = 2.5;
    ctx.beginPath();
    ctx.arc(x, y, r - 1.5, 0, Math.PI * 2);
    ctx.stroke();

    // Frozen core — ice blue glow
    ctx.shadowColor = 'rgba(140,210,255,0.95)';
    ctx.shadowBlur  = 20 * pulse;
    ctx.fillStyle   = this.highlightColor;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.38, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8f4ff';
    ctx.beginPath();
    ctx.arc(x, y, r * 0.17, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Eyes — cold ice blue
    const eyeY   = y - r * 0.3;
    const eyeOff = r * 0.32;
    ctx.shadowColor = 'rgba(140,210,255,0.95)';
    ctx.shadowBlur  = 12;
    ctx.fillStyle   = '#80d8ff';
    ctx.beginPath(); ctx.arc(x - eyeOff, eyeY, 2.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + eyeOff, eyeY, 2.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c8f0ff';
    ctx.beginPath(); ctx.arc(x - eyeOff, eyeY, 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + eyeOff, eyeY, 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // Frost crown — 3 ice crystal spikes
    ctx.save();
    ctx.shadowColor = 'rgba(180,240,255,0.90)';
    ctx.shadowBlur  = 10 * pulse;
    ctx.fillStyle   = 'rgba(210,245,255,0.68)';
    ctx.strokeStyle = 'rgba(200,245,255,0.85)';
    ctx.lineWidth   = 1.1;
    for (let hi = -1; hi <= 1; hi++) {
      const hbx = x + hi * r * 0.38, hby = y - r - 1;
      const hLen = r * (hi === 0 ? 0.62 : 0.44);
      ctx.beginPath();
      ctx.moveTo(hbx - 2.5, hby); ctx.lineTo(hbx + hi * 1.5, hby - hLen); ctx.lineTo(hbx + 2.5, hby);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.restore();

    // Boss double-ring indicator — cold blue
    ctx.strokeStyle = 'rgba(100,180,255,0.50)';
    ctx.lineWidth   = 1.2;
    ctx.beginPath();
    ctx.arc(x, y, r + 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(140,210,255,0.25)';
    ctx.lineWidth   = 0.7;
    ctx.beginPath();
    ctx.arc(x, y, r + 9, 0, Math.PI * 2);
    ctx.stroke();
  }

  // ── Banshee: electric diamond ghost ──────────────────────────────────────────
  _drawBanshee(ctx) {
    const x = this.x, y = this.y;
    const r = this.radius;
    const t = performance.now() * 0.001;
    const pulse = 0.5 + Math.sin(t * 4.5) * 0.5;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(x + 2, y + r * 0.78, r * 1.1, r * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Rotating void aura rings — dark purple
    ctx.save();
    for (let ring = 0; ring < 3; ring++) {
      const ringR = r * (1.5 + ring * 0.45);
      const alpha = (0.18 - ring * 0.045) * (0.55 + pulse * 0.45);
      ctx.strokeStyle = `rgba(140,60,220,${alpha})`;
      ctx.lineWidth   = 1;
      ctx.setLineDash([2, ring + 3]);
      ctx.lineDashOffset = t * (ring % 2 === 0 ? 22 : -16);
      ctx.beginPath();
      ctx.arc(x, y, ringR, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    // Void tendrils — dim purple wisps
    for (let i = 0; i < 6; i++) {
      const a   = t * (3.5 + i * 0.6) + i * (Math.PI * 2 / 6);
      const len = r * (0.75 + Math.sin(t * 14 + i * 2.5) * 0.45);
      const alpha = Math.max(0, 0.22 + Math.sin(t * 16 + i) * 0.18);
      ctx.strokeStyle = `rgba(180,80,255,${alpha})`;
      ctx.lineWidth   = 0.9;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * r * 0.38, y + Math.sin(a) * r * 0.38);
      const mx = x + Math.cos(a + 0.22) * len * 0.6;
      const my = y + Math.sin(a + 0.22) * len * 0.6;
      ctx.lineTo(mx, my);
      ctx.lineTo(x + Math.cos(a + 0.1) * len, y + Math.sin(a + 0.1) * len);
      ctx.stroke();
    }

    // Diamond body — void purple
    ctx.shadowColor = '#8840dd';
    ctx.shadowBlur  = 18 * pulse;
    ctx.fillStyle   = this.color;
    ctx.beginPath();
    ctx.moveTo(x,            y - r);
    ctx.lineTo(x + r * 0.72, y);
    ctx.lineTo(x,            y + r);
    ctx.lineTo(x - r * 0.72, y);
    ctx.closePath();
    ctx.fill();

    // Facet lines
    ctx.strokeStyle = 'rgba(160,80,240,0.4)';
    ctx.lineWidth   = 0.7;
    ctx.beginPath();
    ctx.moveTo(x, y - r);      ctx.lineTo(x + r * 0.72, y);
    ctx.moveTo(x, y - r);      ctx.lineTo(x - r * 0.72, y);
    ctx.moveTo(x, y + r * 0.1);ctx.lineTo(x + r * 0.38, y - r * 0.5);
    ctx.moveTo(x, y + r * 0.1);ctx.lineTo(x - r * 0.38, y - r * 0.5);
    ctx.stroke();

    // Inner glow diamond
    ctx.shadowBlur = 12 * pulse;
    const hs = r * 0.45;
    ctx.fillStyle = this.highlightColor;
    ctx.beginPath();
    ctx.moveTo(x,             y - hs);
    ctx.lineTo(x + hs * 0.72, y);
    ctx.lineTo(x,             y + hs);
    ctx.lineTo(x - hs * 0.72, y);
    ctx.closePath();
    ctx.fill();

    // Void core — pale purple, not white
    ctx.fillStyle = '#e8d8f8';
    ctx.beginPath();
    ctx.arc(x, y, r * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Nightmare crown — void spike crown at diamond apex
    ctx.save();
    ctx.shadowColor = '#9940ee';
    ctx.shadowBlur  = 9 * pulse;
    ctx.fillStyle   = 'rgba(100,20,160,0.65)';
    ctx.strokeStyle = 'rgba(180,80,255,0.82)';
    ctx.lineWidth   = 1.3;
    { const crowY = y - r - 1;
      for (let si = -2; si <= 2; si++) {
        const sLen = r * (si % 2 === 0 ? 0.44 : 0.28);
        const sxOff = si * r * 0.16;
        ctx.beginPath();
        ctx.moveTo(x + sxOff - 2, crowY); ctx.lineTo(x + sxOff * 0.5, crowY - sLen); ctx.lineTo(x + sxOff + 2, crowY);
        ctx.closePath(); ctx.fill(); ctx.stroke();
      } }
    ctx.restore();

    // Dream-rune badge — top-right of body (replaces EMP bolt)
    ctx.save();
    const bx = x + r * 0.78, by = y - r * 0.78, bs = 5.5;
    ctx.shadowColor = '#9940ee';
    ctx.shadowBlur  = 7;
    ctx.fillStyle   = '#b060ff';
    ctx.beginPath();
    ctx.moveTo(bx + bs * 0.12,  by - bs * 0.52);
    ctx.lineTo(bx - bs * 0.18,  by + bs * 0.05);
    ctx.lineTo(bx + bs * 0.04,  by + bs * 0.05);
    ctx.lineTo(bx - bs * 0.12,  by + bs * 0.52);
    ctx.lineTo(bx + bs * 0.20,  by - bs * 0.05);
    ctx.lineTo(bx - bs * 0.04,  by - bs * 0.05);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  _drawHpBar(ctx) {
    if (this.hp >= this.maxHp) return;

    const barW = this.radius * (this.isBoss ? 4.0 : 2.8);
    const barH = this.isBoss ? 7 : 3;
    const barX = this.x - barW / 2;
    const barY = this.y - this.radius - (this.isBoss ? 18 : 10);

    const pct = this.hp / this.maxHp;

    if (this.isBoss) {
      // Boss: dark border + gold trim + phase-tinted fill
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
      ctx.fillStyle = 'rgba(6,3,14,0.88)';
      ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
      ctx.fillStyle = pct > 0.75 ? '#56e894' : pct > 0.50 ? '#a8e040' : pct > 0.25 ? '#e8c040' : '#e84040';
      ctx.fillRect(barX, barY, barW * pct, barH);
      ctx.strokeStyle = 'rgba(200,160,40,0.32)';
      ctx.lineWidth   = 0.5;
      ctx.strokeRect(barX, barY, barW, barH);
    }
  }
}
