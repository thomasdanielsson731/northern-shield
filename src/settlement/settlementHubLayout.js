/**
 * Settlement hub building positions — semantic layout on the hub playfield (0–1).
 * Importance: west gate (assaults) → hall → treasury wall → barracks yard → periphery.
 */

import { computeCoverFitRect } from '../campaign/commandMapLayout.js';

export const HUB_ART_W = 960;
export const HUB_ART_H = 540;

export const HUB_LAYOUT_INSET_TOP = 44;
export const HUB_LAYOUT_INSET_BOTTOM = 28;

/**
 * fx/fy/fw/fh in playfield space; z = draw order (back → front).
 */
export const HUB_BUILDING_LAYOUT = {
  /** War Horn — watch horn tower, far left */
  command:   { fx: 0.03, fy: 0.40, fw: 0.13, fh: 0.30, z: 4 },
  /** Hall of Heroes — central longhouse */
  warband:   { fx: 0.22, fy: 0.26, fw: 0.26, fh: 0.34, z: 1 },
  /** Treasury — south of hall mound */
  fortress:  { fx: 0.13, fy: 0.46, fw: 0.13, fh: 0.20, z: 2 },
  /** Barracks — right lean-to cluster */
  recruit:   { fx: 0.56, fy: 0.30, fw: 0.15, fh: 0.24, z: 5 },
  /** Chronicle — standing stones on path */
  chronicle: { fx: 0.43, fy: 0.46, fw: 0.10, fh: 0.12, z: 3 },
  /** Rune forge — far-right hut */
  runeSmith: { fx: 0.68, fy: 0.34, fw: 0.13, fh: 0.20, z: 2 },
  /** Arena — fenced yard, upper right */
  skirmish:  { fx: 0.74, fy: 0.24, fw: 0.13, fh: 0.16, z: 3 },
  /** Meta — save slots */
  slots:     { fx: 0.82, fy: 0.02, fw: 0.14, fh: 0.10, z: 6 },
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

export function resolveHubBuildingRect(norm, layout, { useArtSpace = false } = {}) {
  const play = getHubPlayfield(layout);
  if (useArtSpace) {
    const rect = computeCoverFitRect(HUB_ART_W, HUB_ART_H, play.x, play.y, play.w, play.h);
    return {
      x: rect.dx + norm.fx * rect.dw,
      y: rect.dy + norm.fy * rect.dh,
      w: norm.fw * rect.dw,
      h: norm.fh * rect.dh,
    };
  }
  return {
    x: play.x + norm.fx * play.w,
    y: play.y + norm.fy * play.h,
    w: norm.fw * play.w,
    h: norm.fh * play.h,
  };
}

export function getHubBackdropRect(layout) {
  const play = getHubPlayfield(layout);
  return computeCoverFitRect(HUB_ART_W, HUB_ART_H, play.x, play.y, play.w, play.h);
}
