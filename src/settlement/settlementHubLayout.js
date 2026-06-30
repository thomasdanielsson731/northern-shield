/**
 * Settlement hub building positions — semantic layout on the hub playfield (0–1).
 * Importance: west gate (assaults) → hall → fortress hut → barracks yard → periphery.
 */

import { computeContentCoverFit, mapContentNormRect, mapContentNormToScreen } from '../assets/artAlignment.js';

export const HUB_ART_W = 960;
export const HUB_ART_H = 540;

export const HUB_LAYOUT_INSET_TOP = 44;
export const HUB_LAYOUT_INSET_BOTTOM = 28;

/**
 * Painted hamlet band inside ui_settlement_hub_bg_age1@960x540.
 * Full plate — environment-only backdrop; buildings are separate overlay sprites.
 */
export const HUB_ART_CONTENT = {
  sx: 0,
  sy: 0,
  sw: 1.0,
  sh: 1.0,
};

/**
 * fx/fy/fw/fh in content-normalized space (0–1 within HUB_ART_CONTENT).
 * fy = top of hotspot; fy+fh = foot contact on a painted foundation pad.
 * Keep fh compact (~0.12–0.18) so labels sit just above the sprite, not the hill crest.
 */
export const HUB_BUILDING_LAYOUT = {
  /** Assault emblem — crossed swords by the west palisade */
  command:   { fx: 0.05, fy: 0.32, fw: 0.045, fh: 0.08, z: 0, emblem: true, anchor: 'center' },
  /** Hall of Heroes — large oval pad, upper-left slope */
  warband:   { fx: 0.21, fy: 0.36, fw: 0.18, fh: 0.16, z: 1 },
  /** Fortress — back plateau behind the hall */
  fortress:  { fx: 0.355, fy: 0.31, fw: 0.11, fh: 0.13, z: 2 },
  /** Chronicle — central fire-pit hub on the lower path */
  chronicle: { fx: 0.46, fy: 0.68, fw: 0.08, fh: 0.12, z: 3 },
  /** Barracks — mid-right yard pad */
  recruit:   { fx: 0.57, fy: 0.56, fw: 0.12, fh: 0.14, z: 5 },
  /** Rune forge — upper-right hut pad */
  runeSmith: { fx: 0.68, fy: 0.45, fw: 0.10, fh: 0.13, z: 2 },
  /** Arena — fenced yard, foreground right */
  skirmish:  { fx: 0.76, fy: 0.76, fw: 0.12, fh: 0.14, z: 3 },
  /** Meta — save slots (top-right of painted hamlet band) */
  slots:     { fx: 0.76, fy: 0.02, fw: 0.20, fh: 0.10, z: 6 },
};

/** Buildings sorted back → front for painter's algorithm. */
export function getHubBuildingsDrawOrder(buildings) {
  return [...buildings].sort((a, b) => {
    const za = HUB_BUILDING_LAYOUT[a.id]?.z ?? 0;
    const zb = HUB_BUILDING_LAYOUT[b.id]?.z ?? 0;
    return za - zb;
  });
}

export function getHubPlayfield(layout) {
  const { x, y, w, h } = layout;
  return {
    x,
    y: y + HUB_LAYOUT_INSET_TOP,
    w,
    h: Math.max(80, h - HUB_LAYOUT_INSET_TOP - HUB_LAYOUT_INSET_BOTTOM),
  };
}

export function getHubBackdropRect(layout) {
  const play = getHubPlayfield(layout);
  return computeContentCoverFit(HUB_ART_W, HUB_ART_H, HUB_ART_CONTENT, play.x, play.y, play.w, play.h);
}

/** Destination rect for the painted hamlet (content crop, cover-fitted to playfield). */
export function getHubContentDestRect(layout) {
  return getHubBackdropRect(layout);
}

export function resolveHubBuildingRect(norm, layout, { useArtSpace = false } = {}) {
  const play = getHubPlayfield(layout);
  const centerAnchored = norm.anchor === 'center' || norm.emblem;

  if (!useArtSpace) {
    if (centerAnchored) {
      const cx = play.x + (norm.fx + norm.fw * 0.5) * play.w;
      const cy = play.y + (norm.fy + norm.fh * 0.5) * play.h;
      return {
        x: cx - (norm.fw * play.w) / 2,
        y: cy - (norm.fh * play.h) / 2,
        w: norm.fw * play.w,
        h: norm.fh * play.h,
      };
    }
    return {
      x: play.x + norm.fx * play.w,
      y: play.y + norm.fy * play.h,
      w: norm.fw * play.w,
      h: norm.fh * play.h,
    };
  }

  const fit = getHubContentDestRect(layout);
  if (centerAnchored) {
    const c = mapContentNormToScreen(fit, norm.fx + norm.fw * 0.5, norm.fy + norm.fh * 0.5);
    const rect = mapContentNormRect(fit, norm.fx, norm.fy, norm.fw, norm.fh);
    return { x: c.x - rect.w / 2, y: c.y - rect.h / 2, w: rect.w, h: rect.h };
  }
  return mapContentNormRect(fit, norm.fx, norm.fy, norm.fw, norm.fh);
}
