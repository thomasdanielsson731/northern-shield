/**
 * Unified visual tone — muted parchment / iron / ember. No neon glows.
 */

import { UI_COLORS } from './uiTheme.js';

/** Muted strokes and fills for combat + UI overlays. */
export const TONE = {
  stroke: 'rgba(200,160,100,0.45)',
  strokeStrong: 'rgba(212,175,55,0.55)',
  strokeWarn: 'rgba(169,50,38,0.55)',
  fillMuted: 'rgba(180,150,100,0.22)',
  fillWarn: 'rgba(140,60,40,0.28)',
  textGold: UI_COLORS.gold,
  textParchment: UI_COLORS.parchment,
  elite: 'rgba(200,170,90,0.55)',
  threat: 'rgba(169,50,38,0.50)',
  heal: 'rgba(100,140,110,0.35)',
  synergy: 'rgba(180,150,110,0.40)',
  portal: 'rgba(90,75,60,0.55)',
  portalCore: 'rgba(60,50,42,0.65)',
};

/** Disable colored canvas glow — use flat fills/strokes instead. */
export function noGlow(ctx) {
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';
}

/** Soft black drop shadow only (panels, text depth). */
export function panelShadow(ctx, blur = 4, offsetY = 2) {
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = blur;
  ctx.shadowOffsetY = offsetY;
}

export function clearPanelShadow(ctx) {
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';
  ctx.shadowOffsetY = 0;
}
