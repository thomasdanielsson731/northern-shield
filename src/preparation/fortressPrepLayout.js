/**
 * Fortress prep schematic — hotspot anchors on fort_prep_schematic_age1@640x360.
 * fx/fy/fw/fh in art-normalized space; fy+fh ≈ ground contact on the plate.
 */

import { computeContentCoverFit, mapContentNormRect, isGroundAnchored } from '../assets/artAlignment.js';

export const PREP_ART_W = 640;
export const PREP_ART_H = 360;

export const PREP_LAYOUT_INSET_TOP = 6;
export const PREP_LAYOUT_INSET_BOTTOM = 6;

/** Tuned to painted pads on fort_prep_schematic_age1 — west gate in palisade opening. */
export const PREP_HOTSPOT_LAYOUT = {
  watch_tower: { fx: 0.39, fy: 0.20, fw: 0.12, fh: 0.24 },
  west_gate:   { fx: 0.08, fy: 0.56, fw: 0.16, fh: 0.24 },
  wall_scar:   { fx: 0.05, fy: 0.48, fw: 0.22, fh: 0.12 },
  longhouse:   { fx: 0.05, fy: 0.70, fw: 0.18, fh: 0.18 },
  treasury:    { fx: 0.73, fy: 0.70, fw: 0.16, fh: 0.16 },
};

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
