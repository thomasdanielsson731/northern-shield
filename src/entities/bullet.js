export class Bullet {
  constructor(x, y, target, damage, speed = 7,
              splashRadius = 0, splashDamage = 0,
              slowFactor = 1, slowDuration = 0,
              shape = 'orb') {
    this.x            = x;
    this.y            = y;
    this.target       = target;
    this.damage       = damage;
    this.speed        = speed;
    this.splashRadius = splashRadius;
    this.splashDamage = splashDamage;
    this.slowFactor   = slowFactor;
    this.slowDuration = slowDuration;
    this.shape        = shape;
    this.radius       = splashRadius > 0 ? 4 : 3;
    this.alive        = true;
    this.trail        = [{ x, y }];
    this.maxTrailPoints = shape === 'spear' ? 8 : splashRadius > 0 ? 4 : 6;
    this.angle        = 0;
    this.source       = null;
    this.canPierce    = false;
    this.pierced      = null;     // Set of already-hit enemies (lazy init)
    this.lastKillX    = 0;
    this.lastKillY    = 0;
    this.lastKillIsBoss = false;
  }

  update(enemies = null) {
    if (!this.alive) return 0;
    if (!this.target || !this.target.alive || this.target.reached) {
      this.alive = false;
      return 0;
    }

    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const hitDistance = this.radius + (this.target.radius || 0);

    this.angle = Math.atan2(dy, dx);

    if (dist <= Math.max(this.speed, hitDistance)) {
      const actualDamage = Math.min(this.damage, Math.max(0, this.target.hp));
      this.target.hp = Math.max(0, this.target.hp - this.damage);
      if (this.source) this.source.damageDealt += actualDamage;
      this.target.hitFlash    = this.damage > 80 ? 14 : this.damage > 40 ? 9 : this.damage > 15 ? 5 : 3;
      this.target.hitFlashMax = this.target.hitFlash;

      if (this.slowDuration > 0) {
        this.target.slowTimer  = Math.max(this.target.slowTimer ?? 0, this.slowDuration);
        this.target.slowFactor = Math.min(this.target.slowFactor ?? 1, this.slowFactor);
      }

      const killed = this.target.hp <= 0;
      let reward = 0;
      if (killed) {
        this.target.hp = 0;
        this.lastKillX = this.target.x;
        this.lastKillY = this.target.y;
        this.lastKillIsBoss = this.target.isBoss ?? false;
        if (typeof this.target.kill === 'function') this.target.kill(); else this.target.alive = false;
        reward = this.target.reward ?? 6;
      }

      // Pierce: find next target within 80px and continue
      if (this.canPierce && enemies) {
        if (!this.pierced) this.pierced = new Set();
        this.pierced.add(this.target);
        let nextTarget = null, bestDist = 80;
        for (const e of enemies) {
          if (!e.alive || e.reached || this.pierced.has(e)) continue;
          const ex = e.x - this.x, ey = e.y - this.y;
          const ed = Math.sqrt(ex * ex + ey * ey);
          if (ed < bestDist) { bestDist = ed; nextTarget = e; }
        }
        if (nextTarget) {
          this.target = nextTarget;
          return reward;   // stay alive, pierce continues
        }
      }

      this.alive = false;
      return reward;
    }

    this.x += (dx / dist) * this.speed;
    this.y += (dy / dist) * this.speed;

    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > this.maxTrailPoints) this.trail.shift();
    return 0;
  }

  draw(ctx) {
    if (!this.alive) return;

    if (this.shape === 'spear') {
      this._drawSpear(ctx);
    } else if (this.shape === 'rock') {
      this._drawRock(ctx);
    } else if (this.shape === 'stun') {
      this._drawStun(ctx);
    } else if (this.shape === 'arrow') {
      this._drawArrow(ctx);
    } else if (this.splashRadius > 0) {
      this._drawFireball(ctx);
    } else if (this.slowDuration > 0) {
      this._drawOrb(ctx);
    } else {
      this._drawOrb(ctx);
    }
  }

  // ── Spear (Valkyrie) ─────────────────────────────────────────────────────────
  _drawSpear(ctx) {
    const angle = this.angle;
    const perpA = angle + Math.PI / 2;
    const shaftLen = 14;
    const tipLen   = 6;

    // Trail
    if (this.trail.length > 1) {
      ctx.strokeStyle = 'rgba(160,200,255,0.35)';
      ctx.lineWidth   = 1.5;
      ctx.lineCap     = 'round';
      ctx.beginPath();
      ctx.moveTo(this.trail[0].x, this.trail[0].y);
      for (let i = 1; i < this.trail.length; i++) ctx.lineTo(this.trail[i].x, this.trail[i].y);
      ctx.stroke();
    }

    const tailX = this.x - Math.cos(angle) * shaftLen;
    const tailY = this.y - Math.sin(angle) * shaftLen;
    const tipX  = this.x + Math.cos(angle) * tipLen;
    const tipY  = this.y + Math.sin(angle) * tipLen;

    // Shaft
    ctx.shadowColor = 'rgba(140,180,255,0.7)';
    ctx.shadowBlur  = 8;
    ctx.strokeStyle = '#7a8ec0';
    ctx.lineWidth   = 2.2;
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(this.x, this.y);
    ctx.stroke();

    // Shaft highlight
    ctx.strokeStyle = 'rgba(200,220,255,0.5)';
    ctx.lineWidth   = 0.7;
    ctx.beginPath();
    ctx.moveTo(tailX + Math.cos(perpA) * 0.5, tailY + Math.sin(perpA) * 0.5);
    ctx.lineTo(this.x + Math.cos(perpA) * 0.5, this.y + Math.sin(perpA) * 0.5);
    ctx.stroke();

    // Blade tip
    ctx.fillStyle   = '#ddeeff';
    ctx.shadowColor = 'rgba(200,220,255,0.9)';
    ctx.shadowBlur  = 12;
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(this.x + Math.cos(perpA) * 2.8, this.y + Math.sin(perpA) * 2.8);
    ctx.lineTo(this.x - Math.cos(perpA) * 2.8, this.y - Math.sin(perpA) * 2.8);
    ctx.closePath();
    ctx.fill();
    // Blade edge gleam
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(this.x + Math.cos(perpA) * 0.6, this.y + Math.sin(perpA) * 0.6);
    ctx.lineTo(tipX - Math.cos(angle) * 2, tipY - Math.sin(angle) * 2);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineCap = 'butt';
  }

  // ── Rock (Katapult) ─────────────────────────────────────────────────────────
  _drawRock(ctx) {
    const spin = performance.now() * 0.003;

    // AoE preview ring — expands into view as rock approaches impact
    if (this.target && this.splashRadius > 0) {
      const tdx = this.target.x - this.x;
      const tdy = this.target.y - this.y;
      const tdist = Math.sqrt(tdx * tdx + tdy * tdy);
      if (tdist < 90) {
        const progress = 1 - tdist / 90;
        ctx.strokeStyle = `rgba(255,120,25,${0.18 + progress * 0.52})`;
        ctx.lineWidth   = 1.8;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.arc(this.target.x, this.target.y, this.splashRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Trail
    if (this.trail.length > 1) {
      ctx.strokeStyle = 'rgba(160,120,60,0.35)';
      ctx.lineWidth   = 2.5;
      ctx.lineCap     = 'round';
      ctx.beginPath();
      ctx.moveTo(this.trail[0].x, this.trail[0].y);
      for (let i = 1; i < this.trail.length; i++) ctx.lineTo(this.trail[i].x, this.trail[i].y);
      ctx.stroke();
      ctx.lineCap = 'butt';
    }

    // Outer glow
    ctx.fillStyle = 'rgba(200,130,50,0.25)';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 2.4, 0, Math.PI * 2);
    ctx.fill();

    // Rock body (spinning jagged shape)
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(spin);
    ctx.shadowColor = 'rgba(180,120,40,0.8)';
    ctx.shadowBlur  = 10;
    ctx.fillStyle   = '#7a6048';
    ctx.beginPath();
    const sides = 7;
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2;
      const rv = this.radius * (0.78 + ((i * 37) % 5) * 0.06);
      if (i === 0) ctx.moveTo(Math.cos(a) * rv, Math.sin(a) * rv);
      else         ctx.lineTo(Math.cos(a) * rv, Math.sin(a) * rv);
    }
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    // Rock highlight
    ctx.fillStyle = '#a08060';
    ctx.beginPath();
    ctx.arc(-this.radius * 0.25, -this.radius * 0.28, this.radius * 0.4, 0, Math.PI * 2);
    ctx.fill();
    // Dark crevice
    ctx.fillStyle = 'rgba(20,12,5,0.5)';
    ctx.beginPath();
    ctx.arc(this.radius * 0.2, this.radius * 0.25, this.radius * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ── Fireball (splash legacy / fallback) ──────────────────────────────────────
  _drawFireball(ctx) {
    if (this.trail.length > 1) {
      ctx.strokeStyle = 'rgba(255,110,30,0.55)';
      ctx.lineWidth   = 3;
      ctx.lineCap     = 'round';
      ctx.beginPath();
      ctx.moveTo(this.trail[0].x, this.trail[0].y);
      for (let i = 1; i < this.trail.length; i++) ctx.lineTo(this.trail[i].x, this.trail[i].y);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,80,20,0.32)';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = '#ff6620';
    ctx.shadowBlur  = 14;
    ctx.fillStyle   = '#ffcc44';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineCap = 'butt';
  }

  // ── Stun star (Blondie) ──────────────────────────────────────────────────────
  _drawStun(ctx) {
    const spin = performance.now() * 0.004;

    // Trail
    if (this.trail.length > 1) {
      ctx.strokeStyle = 'rgba(255,220,50,0.5)';
      ctx.lineWidth   = 1.5;
      ctx.lineCap     = 'round';
      ctx.beginPath();
      ctx.moveTo(this.trail[0].x, this.trail[0].y);
      for (let i = 1; i < this.trail.length; i++) ctx.lineTo(this.trail[i].x, this.trail[i].y);
      ctx.stroke();
      ctx.lineCap = 'butt';
    }

    // Halo
    ctx.fillStyle = 'rgba(255,220,30,0.22)';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 2.6, 0, Math.PI * 2);
    ctx.fill();

    // Spinning 5-pointed gold star
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(spin);
    ctx.shadowColor = '#ffdd00';
    ctx.shadowBlur  = 14;
    ctx.fillStyle   = '#ffe840';
    const outerR = this.radius * 1.3, innerR = this.radius * 0.55;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i * Math.PI / 5) - Math.PI / 2;
      const r = i % 2 === 0 ? outerR : innerR;
      if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else         ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
    // Bright core
    ctx.fillStyle  = '#fff8a0';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 0.38, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ── Arrow (Archer) ──────────────────────────────────────────────────────────
  _drawArrow(ctx) {
    const angle = this.angle;
    const perpA = angle + Math.PI / 2;
    const shaftLen = 10;
    const tipLen   = 4;

    const tailX = this.x - Math.cos(angle) * shaftLen;
    const tailY = this.y - Math.sin(angle) * shaftLen;
    const tipX  = this.x + Math.cos(angle) * tipLen;
    const tipY  = this.y + Math.sin(angle) * tipLen;

    // Short trail
    if (this.trail.length > 1) {
      ctx.strokeStyle = 'rgba(220,190,130,0.52)';
      ctx.lineWidth   = 1;
      ctx.lineCap     = 'round';
      ctx.beginPath();
      ctx.moveTo(this.trail[0].x, this.trail[0].y);
      for (let i = 1; i < this.trail.length; i++) ctx.lineTo(this.trail[i].x, this.trail[i].y);
      ctx.stroke();
    }

    // Shaft
    ctx.strokeStyle = '#8a5020';
    ctx.lineWidth   = 1.4;
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(this.x, this.y);
    ctx.stroke();

    // Fletching (red feathers at tail)
    ctx.fillStyle = '#cc3322';
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(tailX + Math.cos(perpA) * 2.2 + Math.cos(angle) * 3, tailY + Math.sin(perpA) * 2.2 + Math.sin(angle) * 3);
    ctx.lineTo(tailX + Math.cos(angle) * 4.5, tailY + Math.sin(angle) * 4.5);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(tailX - Math.cos(perpA) * 2.2 + Math.cos(angle) * 3, tailY - Math.sin(perpA) * 2.2 + Math.sin(angle) * 3);
    ctx.lineTo(tailX + Math.cos(angle) * 4.5, tailY + Math.sin(angle) * 4.5);
    ctx.closePath();
    ctx.fill();

    // Metal arrowhead
    ctx.shadowColor = 'rgba(200,185,150,0.7)';
    ctx.shadowBlur  = 5;
    ctx.fillStyle   = '#c8c0a8';
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(this.x + Math.cos(perpA) * 1.6, this.y + Math.sin(perpA) * 1.6);
    ctx.lineTo(this.x - Math.cos(perpA) * 1.6, this.y - Math.sin(perpA) * 1.6);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineCap = 'butt';
  }

  // ── Arcane orb (default) ─────────────────────────────────────────────────────
  _drawOrb(ctx) {
    if (this.trail.length > 1) {
      ctx.strokeStyle = 'rgba(255,216,107,0.5)';
      ctx.lineWidth   = 1.6;
      ctx.lineCap     = 'round';
      ctx.beginPath();
      ctx.moveTo(this.trail[0].x, this.trail[0].y);
      for (let i = 1; i < this.trail.length; i++) ctx.lineTo(this.trail[i].x, this.trail[i].y);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,216,107,0.32)';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd86b';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineCap = 'butt';
  }
}
