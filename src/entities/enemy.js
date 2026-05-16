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
    color:          '#00bbcc',
    highlightColor: '#aaffff',
    flying:         false
  },
  draugr: {
    label:          'Draugr',
    speed:          0.9,
    hp:             60,
    radius:         7,
    reward:         4,
    color:          '#6628a8',
    highlightColor: '#cc88ff',
    flying:         false
  },
  myling: {
    label:          'Myling',
    speed:          1.1,
    hp:             75,
    radius:         6,
    reward:         8,
    color:          '#88bbff',
    highlightColor: '#e8f8ff',
    flying:         true
  },
  jotunn: {
    label:          'Jötunn',
    speed:          0.35,
    hp:             500,
    radius:         13,
    reward:         20,
    color:          '#5c4030',
    highlightColor: '#d08820',
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

    if (this.slowTimer > 0) {
      this.slowTimer--;
      if (this.slowTimer === 0) this.slowFactor = 1;
    }
    const effectiveSpeed = this.slowTimer > 0 ? this.baseSpeed * this.slowFactor : this.baseSpeed;

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
    ctx.shadowColor = 'rgba(140,50,240,0.45)';
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
    // Claw on right arm
    for (const da of [-0.25, 0, 0.25]) {
      ctx.beginPath();
      ctx.moveTo(x + r * 1.0, y - r * 0.18);
      ctx.lineTo(x + r * 1.0 + Math.cos(-0.4 + da) * r * 0.28, y - r * 0.18 + Math.sin(-0.4 + da) * r * 0.28);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';

    // Skull
    ctx.shadowColor = 'rgba(160,60,255,0.65)';
    ctx.shadowBlur  = 12;
    ctx.fillStyle   = '#d0c8bc';
    ctx.beginPath();
    ctx.arc(x, y - r * 0.52 + bob * 0.28, r * 0.56, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
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
    ctx.beginPath();
    ctx.ellipse(x - r * 0.24, y - r * 0.62 + bob * 0.28, r * 0.18, r * 0.14, 0, 0, Math.PI * 2);
    ctx.ellipse(x + r * 0.24, y - r * 0.62 + bob * 0.28, r * 0.18, r * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();
    // Glowing pupils
    ctx.shadowColor = this.highlightColor;
    ctx.shadowBlur  = 8;
    ctx.fillStyle   = this.highlightColor;
    ctx.beginPath();
    ctx.arc(x - r * 0.24, y - r * 0.62 + bob * 0.28, r * 0.09, 0, Math.PI * 2);
    ctx.arc(x + r * 0.24, y - r * 0.62 + bob * 0.28, r * 0.09, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // ── Wisp: magical energy orb ─────────────────────────────────────────────────
  _drawWisp(ctx) {
    const x = this.x, y = this.y;
    const r = this.radius;
    const t = performance.now() * 0.001;
    const rot   = t * 2.1;
    const pulse = 0.65 + Math.sin(t * 3.5) * 0.35;

    // Outer glow haze
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r * 2.8);
    grad.addColorStop(0,   `rgba(120,180,255,${0.22 * pulse})`);
    grad.addColorStop(0.5, `rgba(100,160,255,${0.1 * pulse})`);
    grad.addColorStop(1,   'rgba(100,160,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r * 2.8, 0, Math.PI * 2);
    ctx.fill();

    // Rotating energy rings
    ctx.save();
    ctx.translate(x, y);
    for (let ring = 0; ring < 2; ring++) {
      ctx.rotate(ring === 0 ? rot : -rot * 1.4);
      ctx.strokeStyle = `rgba(${ring === 0 ? '160,210,255' : '200,230,255'},${(0.5 - ring * 0.15) * pulse})`;
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
    ctx.shadowColor = 'rgba(140,200,255,0.95)';
    ctx.shadowBlur  = 18 * pulse;
    ctx.fillStyle   = this.color;
    ctx.fillRect(-r * 0.82, -r * 0.82, r * 1.64, r * 1.64);
    ctx.shadowBlur  = 0;
    ctx.fillStyle   = this.highlightColor;
    ctx.fillRect(-r * 0.36, -r * 0.36, r * 0.72, r * 0.72);
    ctx.restore();

    // Bright white core
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, r * 0.22, 0, Math.PI * 2);
    ctx.fill();

    // Orbiting sparks
    for (let i = 0; i < 5; i++) {
      const a  = rot * 2.5 + (i / 5) * Math.PI * 2;
      const sr = r * 1.45;
      const alpha = Math.max(0, 0.45 + Math.sin(rot * 4 + i * 1.3) * 0.35);
      ctx.fillStyle   = `rgba(200,230,255,${alpha})`;
      ctx.shadowColor = '#aaddff';
      ctx.shadowBlur  = 6;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * sr, y + Math.sin(a) * sr * 0.5, r * 0.14, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Flying badge: small upward triangle above body
    ctx.save();
    ctx.fillStyle   = 'rgba(200,230,255,0.65)';
    ctx.shadowColor = 'rgba(140,190,255,0.5)';
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

  // ── Golem: massive stone creature with lava cracks ───────────────────────────
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

    // Dark stone outer shell
    ctx.shadowColor = 'rgba(200,120,10,0.4)';
    ctx.shadowBlur  = 12;
    ctx.fillStyle   = '#0e0c08';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Stone body
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(x, y, r - 2, 0, Math.PI * 2);
    ctx.fill();

    // Stone texture bumps
    const bumps = [
      [-r * 0.5, -r * 0.45, r * 0.22],
      [ r * 0.48, -r * 0.38, r * 0.18],
      [-r * 0.28,  r * 0.52, r * 0.2 ],
      [ r * 0.42,  r * 0.45, r * 0.16],
      [ 0,        -r * 0.6,  r * 0.14]
    ];
    ctx.fillStyle = 'rgba(30,18,8,0.55)';
    for (const [bx, by, br] of bumps) {
      ctx.beginPath();
      ctx.arc(x + bx, y + by, br, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(100,65,30,0.35)';
    for (const [bx, by, br] of bumps) {
      ctx.beginPath();
      ctx.arc(x + bx - br * 0.35, y + by - br * 0.35, br * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }

    // Lava crack lines
    ctx.save();
    for (let i = 0; i < 7; i++) {
      const angle = (i / 7) * Math.PI * 2 + 0.4;
      const len   = r * (0.48 + Math.sin(t * 2.8 + i * 1.2) * 0.18);
      const grad  = ctx.createLinearGradient(x, y, x + Math.cos(angle) * len, y + Math.sin(angle) * len);
      grad.addColorStop(0, `rgba(255,170,20,${0.85 * pulse})`);
      grad.addColorStop(0.6, `rgba(255,80,10,${0.5 * pulse})`);
      grad.addColorStop(1, 'rgba(200,50,0,0)');
      ctx.strokeStyle = grad;
      ctx.lineWidth   = 1.8;
      ctx.beginPath();
      ctx.moveTo(x, y);
      const mx = x + Math.cos(angle + 0.2) * len * 0.5;
      const my = y + Math.sin(angle + 0.2) * len * 0.5;
      ctx.quadraticCurveTo(mx, my, x + Math.cos(angle) * len, y + Math.sin(angle) * len);
      ctx.stroke();
    }
    ctx.restore();

    // Stone rim border
    ctx.strokeStyle = '#1e1008';
    ctx.lineWidth   = 2.5;
    ctx.beginPath();
    ctx.arc(x, y, r - 1.5, 0, Math.PI * 2);
    ctx.stroke();

    // Molten core
    ctx.shadowColor = 'rgba(255,140,10,0.95)';
    ctx.shadowBlur  = 20 * pulse;
    ctx.fillStyle   = this.highlightColor;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.38, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff080';
    ctx.beginPath();
    ctx.arc(x, y, r * 0.17, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Eyes
    const eyeY   = y - r * 0.3;
    const eyeOff = r * 0.32;
    ctx.shadowColor = 'rgba(255,170,30,0.95)';
    ctx.shadowBlur  = 12;
    ctx.fillStyle   = '#ff9020';
    ctx.beginPath();
    ctx.arc(x - eyeOff, eyeY, 2.4, 0, Math.PI * 2);
    ctx.arc(x + eyeOff, eyeY, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe060';
    ctx.beginPath();
    ctx.arc(x - eyeOff, eyeY, 1.2, 0, Math.PI * 2);
    ctx.arc(x + eyeOff, eyeY, 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Boss double-ring indicator
    ctx.strokeStyle = 'rgba(255,140,20,0.50)';
    ctx.lineWidth   = 1.2;
    ctx.beginPath();
    ctx.arc(x, y, r + 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,180,40,0.25)';
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

    // Rotating aura rings
    for (let ring = 0; ring < 3; ring++) {
      const ringR = r * (1.5 + ring * 0.45);
      const alpha = (0.18 - ring * 0.045) * (0.55 + pulse * 0.45);
      ctx.strokeStyle = `rgba(0,255,220,${alpha})`;
      ctx.lineWidth   = 1;
      ctx.setLineDash([2, ring + 3]);
      ctx.lineDashOffset = t * (ring % 2 === 0 ? 22 : -16);
      ctx.beginPath();
      ctx.arc(x, y, ringR, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Electric arcs
    for (let i = 0; i < 6; i++) {
      const a   = t * (3.5 + i * 0.6) + i * (Math.PI * 2 / 6);
      const len = r * (0.75 + Math.sin(t * 14 + i * 2.5) * 0.45);
      const alpha = Math.max(0, 0.28 + Math.sin(t * 16 + i) * 0.22);
      ctx.strokeStyle = `rgba(0,255,220,${alpha})`;
      ctx.lineWidth   = 0.9;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * r * 0.38, y + Math.sin(a) * r * 0.38);
      const mx = x + Math.cos(a + 0.22) * len * 0.6;
      const my = y + Math.sin(a + 0.22) * len * 0.6;
      ctx.lineTo(mx, my);
      ctx.lineTo(x + Math.cos(a + 0.1) * len, y + Math.sin(a + 0.1) * len);
      ctx.stroke();
    }

    // Diamond body
    ctx.shadowColor = '#00ffee';
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
    ctx.strokeStyle = 'rgba(0,230,210,0.4)';
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
    ctx.moveTo(x,           y - hs);
    ctx.lineTo(x + hs * 0.72, y);
    ctx.lineTo(x,           y + hs);
    ctx.lineTo(x - hs * 0.72, y);
    ctx.closePath();
    ctx.fill();

    // Bright core
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, r * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // EMP lightning-bolt badge — top-right of body
    ctx.save();
    const bx = x + r * 0.78, by = y - r * 0.78, bs = 5.5;
    ctx.shadowColor = '#00ffcc';
    ctx.shadowBlur  = 7;
    ctx.fillStyle   = '#00ffdd';
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

    const isBoss = this.type === ENEMY_TYPES.JOTUNN;
    const barW = this.radius * (isBoss ? 3.2 : 2.8);
    const barH = isBoss ? 5 : 3;
    const barX = this.x - barW / 2;
    const barY = this.y - this.radius - (isBoss ? 14 : 10);

    // Background
    ctx.fillStyle = 'rgba(6,3,14,0.88)';
    ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

    const pct = this.hp / this.maxHp;
    ctx.fillStyle = pct > 0.5 ? '#56e894' : pct > 0.25 ? '#e8c040' : '#e84040';
    ctx.fillRect(barX, barY, barW * pct, barH);

    ctx.strokeStyle = 'rgba(200,160,40,0.32)';
    ctx.lineWidth   = 0.5;
    ctx.strokeRect(barX, barY, barW, barH);
  }
}
