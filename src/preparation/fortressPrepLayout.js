/**
 * Fortress prep schematic — hotspot anchors on fort_prep_coordinate_schematic@1254x1254.
 * Coordinates: center (0,0) treasury, ±12 gates, diagonal towers at (±9, ±9).
 */

import { computeContentCoverFit, mapContentNormRect, isGroundAnchored } from '../assets/artAlignment.js';
import { PREP_COORD_HOTSPOTS } from './fortressCoordSystem.js';

export const PREP_ART_W = 1254;
export const PREP_ART_H = 1254;

export const PREP_LAYOUT_INSET_TOP = 4;
export const PREP_LAYOUT_INSET_BOTTOM = 4;

/** Tuned to coordinate schematic — see fortressCoordSystem.js */
export const PREP_HOTSPOT_LAYOUT = { ...PREP_COORD_HOTSPOTS };

export function getPrepArtPlayfield(playfield) {
  const { x, y, w, h } = playfield;
  return {
    x,
    y: y + PREP_LAYOUT_INSET_TOP,
    w,
    h: Math.max(80, h - PREP_LAYOUT_INSET_TOP - PREP_LAYOUT_INSET_BOTTOM),
  };
}

export function resolvePrepHotspotRect(norm, playfield, { useArtSpace = false } = {}) {
  const play = getPrepArtPlayfield(playfield);
  if (useArtSpace) {
    const fit = computeContentCoverFit(PREP_ART_W, PREP_ART_H, { sx: 0, sy: 0, sw: 1, sh: 1 }, play.x, play.y, play.w, play.h);
    return mapContentNormRect(fit, norm.fx, norm.fy, norm.fw, norm.fh);
  }
  return {
    x: play.x + norm.fx * play.w,
    y: play.y + norm.fy * play.h,
    w: norm.fw * play.w,
    h: norm.fh * play.h,
  };
}

export function getPrepBackdropRect(playfield) {
  const play = getPrepArtPlayfield(playfield);
  return computeContentCoverFit(PREP_ART_W, PREP_ART_H, { sx: 0, sy: 0, sw: 1, sh: 1 }, play.x, play.y, play.w, play.h);
}

export function isPrepHotspotGroundAnchored(id) {
  const norm = PREP_HOTSPOT_LAYOUT[id];
  return norm ? isGroundAnchored(norm) : false;
}
