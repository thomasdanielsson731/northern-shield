/**
 * Sprite sheet animation — IDLE / WALK / ATTACK / DEATH columns (ART_DIRECTION).
 * Rows: 0=right, 1=down, 2=left, 3=up when rows >= 4; else horizontal flip for left.
 */

export const ANIM = {
  IDLE: 0,
  WALK_A: 0,
  WALK_B: 1,
  ATTACK: 2,
  DEATH: 3,
};

/** Map movement angle to sheet row (right/down/left/up). */
export function angleToRow(angle) {
  const a = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  if (a < Math.PI / 4 || a >= 7 * Math.PI / 4) return 0;
  if (a < 3 * Math.PI / 4) return 1;
  if (a < 5 * Math.PI / 4) return 2;
  return 3;
}

/**
 * Pick sprite column from combat state.
 * @param {object} p
 * @param {boolean} p.dying
 * @param {boolean} p.attacking
 * @param {boolean} p.moving
 * @param {number} p.walkPhase — seconds, used for 2-step walk
 * @param {number} [p.idlePhase]
 */
export function pickAnimColumn({ dying, attacking, moving, walkPhase = 0, gait = 'hold' }) {
  if (dying) return ANIM.DEATH;
  if (attacking) return ANIM.ATTACK;
  if (moving) {
    if (gait === 'twoStep') {
      return Math.floor(walkPhase * 4.6) % 2 === 0 ? ANIM.WALK_B : ANIM.IDLE;
    }
    return ANIM.WALK_B;
  }
  return ANIM.IDLE;
}

/** Subtle bob/squash so duplicate frames still feel like locomotion. */
export function computeWalkBob(moveSpeed, phaseSec, { movingThreshold = 0.2, strideMul = 1 } = {}) {
  if (moveSpeed < movingThreshold) {
    const breathe = Math.sin(phaseSec * 2.4 * strideMul) * 0.35;
    return { yOff: breathe, scaleY: 1 + breathe * 0.003, lean: 0 };
  }
  const strideHz = (9 + Math.min(moveSpeed, 2.5) * 2.2) * strideMul;
  const stride = Math.sin(phaseSec * strideHz) * moveSpeed * 0.32;
  const squash = 1 + Math.abs(Math.sin(phaseSec * strideHz)) * 0.045;
  const lean = Math.sin(phaseSec * strideHz + 0.35) * 0.04 * Math.sign(moveSpeed || 1);
  return { yOff: stride, scaleY: squash, lean };
}

/** Resolve facing from velocity with path fallback. */
export function resolveFacingAngle(velX, velY, fallbackDx, fallbackDy) {
  const vx = velX ?? 0;
  const vy = velY ?? 0;
  if (Math.hypot(vx, vy) > 0.05) return Math.atan2(vy, vx);
  const dx = fallbackDx ?? 1;
  const dy = fallbackDy ?? 0;
  return Math.atan2(dy, dx);
}

/**
 * Draw one sprite frame with direction + walk bob.
 * @returns {boolean} false if sprite not loaded
 */
export function drawSpriteSheetFrame(
  ctx,
  sp,
  { col, row, x, y, aimAngle, dw, flipForLeft = true, lean = 0, rimRgb = null, brighten = 1, outline = true, walkAltRow = 0 },
) {
  if (!sp?.img?.complete || sp.img.naturalWidth === 0) return false;

  const scale = typeof sp._scale === 'number' ? sp._scale : 1;
  const dwS = Math.round(dw * scale);
  const dhS = Math.round(dwS * sp.frameH / sp.frameW);
  const useRows = sp.rows >= 4;
  let sheetRow = 0;
  let mirror = false;
  if (useRows) {
    const facingLeft = flipForLeft && Math.cos(aimAngle) < -0.05;
    const isLocomotion = col === ANIM.IDLE || col === ANIM.WALK_B;
    if (facingLeft && isLocomotion) {
      // Mirror right-facing walk/idle — left-row walk art often has reversed stride.
      sheetRow = 0;
      mirror = true;
    } else if (facingLeft) {
      sheetRow = 2;
      mirror = false;
    } else {
      sheetRow = 0;
      mirror = false;
    }
  } else if (sp.rows >= 2 && walkAltRow > 0) {
    sheetRow = walkAltRow;
    mirror = flipForLeft && Math.cos(aimAngle) < 0;
  } else {
    sheetRow = 0;
    mirror = flipForLeft && Math.cos(aimAngle) < 0;
  }
  const anchorY = -dhS * 0.88;
  const anchorX = -dwS / 2;

  const filter = brighten > 1.001 ? `brightness(${brighten}) contrast(1.08) saturate(1.12)` : 'none';

  const blitFrame = (alpha, filt, ox = 0, oy = 0) => {
    ctx.save();
    ctx.globalAlpha = alpha;
    if (filt !== 'none') ctx.filter = filt;
    ctx.translate(x + ox, y + oy);
    if (mirror) ctx.scale(-1, 1);
    if (lean) ctx.rotate(lean);
    ctx.drawImage(
      sp.img,
      col * sp.frameW,
      sheetRow * sp.frameH,
      sp.frameW,
      sp.frameH,
      anchorX,
      anchorY,
      dwS,
      dhS,
    );
    ctx.restore();
  };

  if (outline) {
    const stroke = Math.max(1, Math.round(dwS * 0.04));
    for (const [ox, oy] of [
      [-stroke, 0], [stroke, 0], [0, -stroke], [0, stroke],
      [-stroke, -stroke], [stroke, stroke], [-stroke, stroke], [stroke, -stroke],
    ]) {
      blitFrame(0.72, 'brightness(0) contrast(1.4)', ox, oy);
    }
  }

  blitFrame(1, filter);
  return true;
}

/** Ground pool + dark backing so dark API sprites stay readable on fen terrain. */
export function drawUnitFooting(ctx, x, y, radius, rgb = '220,180,120') {
  const g = ctx.createRadialGradient(x, y + radius * 0.15, 0, x, y + radius * 0.15, radius * 1.35);
  g.addColorStop(0, `rgba(${rgb},0.28)`);
  g.addColorStop(0.55, `rgba(${rgb},0.10)`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y + radius * 0.55, radius * 1.1, radius * 0.38, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.42)';
  ctx.beginPath();
  ctx.ellipse(x + 1, y + radius * 0.62, radius * 0.95, radius * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
}
