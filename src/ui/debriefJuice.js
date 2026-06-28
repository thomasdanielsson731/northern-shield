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
const PARCHMENT_INSETS = { top: 0.26, bottom: 0.28, left: 0.27, right: 0.27 };

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

/** Subtle light wash so ink reads on mottled parchment texture. */
export function drawParchmentTextWash(ctx, safe) {
  const h = safe.bottom - safe.top;
  if (h <= 0) return;
  const g = ctx.createLinearGradient(safe.left, safe.top, safe.left, safe.bottom);
  g.addColorStop(0, 'rgba(255,248,228,0.28)');
  g.addColorStop(0.55, 'rgba(255,248,228,0.18)');
  g.addColorStop(1, 'rgba(255,248,228,0.10)');
  ctx.fillStyle = g;
  ctx.fillRect(safe.left, safe.top, safe.width, h);
}

/**
 * Ink text on parchment — cream halo + dark fill for contrast on tan texture.
 */
export function drawParchmentInk(ctx, text, x, y, opts = {}) {
  const {
    font = 'bold 9px monospace',
    fill = '#1a0e04',
    halo = 'rgba(255,248,228,0.82)',
    haloWidth = 3,
    align = 'center',
    alpha = 1,
  } = opts;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = font;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  ctx.lineWidth = haloWidth;
  ctx.strokeStyle = halo;
  ctx.strokeText(text, x, y);
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
