/** Debrief screen juice — MVP pulse and route emphasis. */

export function getMvpPulseScale(frame, period = 60) {
  return 0.85 + Math.sin((frame / period) * Math.PI * 2) * 0.15;
}

export function getDebriefRouteOpacity(isDefeat, routeIndex) {
  if (!isDefeat) return 1;
  return routeIndex === 1 ? 1 : 0.82;
}

export function getMvpPulseAlpha(frame, holdFrames = 90) {
  if (frame >= holdFrames) return 1;
  return getMvpPulseScale(frame);
}

export function getDebriefContinuePulse(nowMs = 0) {
  return 0.65 + Math.sin(nowMs * 0.004) * 0.35;
}

export function getDebriefOutcomeColor(isVictory) {
  return isVictory ? '#40e880' : '#e84040';
}

/** Header fill + glow used on debrief panels. */
export function getDebriefHeaderColors(isVictory) {
  return isVictory
    ? { fill: '#f0c840', glow: 'rgba(240,180,20,0.6)', shadowBlur: 14 }
    : { fill: '#e04040', glow: 'rgba(220,40,40,0.6)', shadowBlur: 10 };
}

/** Prose/stats fade in after panel lands. */
export function getDebriefContentAlpha(debriefTimer, delayFrames = 12) {
  if (debriefTimer <= delayFrames) return 0;
  return Math.min(1, (debriefTimer - delayFrames) / 18);
}

/** ui_debrief_panel@640x480 — cover-fit math matches drawCampaignArtCover. */
const DEBRIEF_PANEL_ASPECT = 640 / 480;

export function getDebriefPanelDrawRect(x, y, w, h) {
  const dstAspect = w / h;
  if (dstAspect > DEBRIEF_PANEL_ASPECT) {
    const dh = w / DEBRIEF_PANEL_ASPECT;
    return { x, y: y + (h - dh) / 2, w, h: dh };
  }
  const dw = h * DEBRIEF_PANEL_ASPECT;
  return { x: x + (w - dw) / 2, y, w: dw, h };
}

/** Flat parchment interior — fractions measured on the scroll art, not the outer frame. */
const PARCHMENT_INSETS = { top: 0.235, bottom: 0.355, left: 0.29, right: 0.29 };

export function getDebriefParchmentHeight(safe) {
  return Math.max(0, safe.bottom - safe.top);
}

/** Clip ink to the flat parchment band so nothing spills onto the scroll curls. */
export function clipDebriefParchment(ctx, safe) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(safe.left, safe.top, safe.width, getDebriefParchmentHeight(safe));
  ctx.clip();
}

/** Baseline y fits inside parchment (alphabetic baseline + descenders). */
export function debriefLineFits(y, lineStep, safe, descent = 3) {
  return y + descent <= safe.bottom;
}

/**
 * Trim prose / context / fortress rows so body copy stays on the scroll.
 * Reserves space for stats, optional MVP, and boss loot callout.
 */
export function planDebriefBodyLayout(safe, startY, {
  proseLineCount = 0,
  hasMvp = false,
  contextLineCount = 0,
  hasBossLoot = false,
  fortressRowCount = 0,
  isVictory = true,
}) {
  const maxY = safe.bottom - 4;
  let proseMax = Math.min(proseLineCount, isVictory ? 3 : 2);
  let ctxMax = contextLineCount;
  let fortMax = fortressRowCount;

  const measure = (p, c, f) => {
    let y = startY;
    y += p * 12 + 5;
    y += 11;
    if (hasMvp) y += 11;
    if (hasBossLoot) y += 22;
    y += c * 11;
    if (f > 0) y += 13 + f * 11;
    return y;
  };

  while (measure(proseMax, ctxMax, fortMax) > maxY && fortMax > 0) fortMax--;
  while (measure(proseMax, ctxMax, fortMax) > maxY && ctxMax > 1) ctxMax--;
  while (measure(proseMax, ctxMax, fortMax) > maxY && proseMax > 1) proseMax--;
  while (measure(proseMax, ctxMax, fortMax) > maxY && ctxMax > 0) ctxMax--;

  return {
    proseMax: Math.max(0, Math.min(proseMax, proseLineCount)),
    contextMax: ctxMax,
    fortressMax: fortMax,
  };
}

export function getDebriefScrollSafeArea(panX, slideY, panW, panH) {
  const draw = getDebriefPanelDrawRect(panX, slideY, panW, panH);
  const padL = Math.round(draw.w * PARCHMENT_INSETS.left);
  const padR = Math.round(draw.w * PARCHMENT_INSETS.right);
  const padT = Math.round(draw.h * PARCHMENT_INSETS.top);
  const padB = Math.round(draw.h * PARCHMENT_INSETS.bottom);
  return {
    left: draw.x + padL,
    right: draw.x + draw.w - padR,
    top: draw.y + padT,
    bottom: draw.y + draw.h - padB,
    cx: draw.x + draw.w / 2,
    width: draw.w - padL - padR,
    draw,
  };
}

/** Assault codename line for debrief parchment header. */
export function formatDebriefAssaultHeader(assault) {
  if (!assault) return '';
  const front = (assault.frontId ?? 'west').toUpperCase();
  return `${assault.codename.toUpperCase()}  ·  ${assault.tierLabel}  ·  ${front} FRONT`;
}

/**
 * Ink on parchment — thin dark outline for legibility, no flat wash behind text.
 */
export function drawParchmentInk(ctx, text, x, y, opts = {}) {
  const {
    font = 'bold 9px monospace',
    fill = '#1a0e04',
    outline = 'rgba(28,14,2,0.38)',
    outlineWidth = 1.15,
    align = 'center',
    alpha = 1,
    noOutline = false,
  } = opts;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = font;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  if (!noOutline && outlineWidth > 0) {
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    ctx.lineWidth = outlineWidth;
    ctx.strokeStyle = outline;
    ctx.strokeText(text, x, y);
  }
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
  ctx.restore();
}

/** Outcome banner (VICTORY / DEFEATED) — gold/red with dark outline. */
export function drawParchmentOutcomeBanner(ctx, text, x, y, isVictory) {
  const colors = getDebriefHeaderColors(isVictory);
  ctx.save();
  ctx.font = 'bold 17px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = 'rgba(24,12,2,0.92)';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = colors.fill;
  ctx.shadowColor = isVictory ? 'rgba(200,140,0,0.45)' : 'rgba(180,30,30,0.35)';
  ctx.shadowBlur = 6;
  ctx.fillText(text, x, y);
  ctx.restore();
}

/** Context lines below stats on campaign assault parchment. */
export function buildDebriefContextLines({
  isVictory,
  nodeIndex,
  casualties = 0,
  defeatReason = null,
  goldStolen = 0,
}) {
  const lines = [];
  if (isVictory && nodeIndex === 2) {
    lines.push('The gate cracked. Salvage crews gathered timber.');
  }
  if (casualties > 0 && isVictory) {
    lines.push(`${casualties} fallen — rally at next assault`);
  }
  if (!isVictory && defeatReason === 'field_wiped') {
    lines.push('The line broke — retry restores full HP at deploy slots');
  } else if (casualties > 0 && !isVictory) {
    lines.push(`${casualties} fallen — full HP restored on retry`);
  }
  if (!isVictory && defeatReason === 'ramparts') {
    lines.push('Ramparts breached — treasury exposed');
  }
  return lines;
}
