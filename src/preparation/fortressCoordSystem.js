/**
 * Fortress schematic coordinate system — matches fort_prep_coordinate_schematic art.
 * Center (0, 0) = treasury · +X east · +Y north · span ±12 units per grid square.
 */

export const FORTRESS_COORD_RANGE = 12;

/** Map fortress coords to normalized art space (0..1, Y down). */
export function fortressCoordToNorm(cx, cy) {
  const span = FORTRESS_COORD_RANGE * 2;
  return {
    fx: (cx + FORTRESS_COORD_RANGE) / span,
    fy: (FORTRESS_COORD_RANGE - cy) / span,
  };
}

/** Hotspot rect at fortress coord; edge structures inset so rects stay inside art. */
export function fortressCoordRect(cx, cy, sizeUnits = 2.4, { anchorX = 'center', anchorY = 'center' } = {}) {
  const { fx, fy } = fortressCoordToNorm(cx, cy);
  const s = sizeUnits / (FORTRESS_COORD_RANGE * 2);
  let x = fx - s / 2;
  let y = fy - s / 2;
  if (anchorX === 'west') x = Math.max(0, fx - s * 0.08);
  if (anchorX === 'east') x = Math.min(1 - s, fx - s + s * 0.08);
  if (anchorY === 'north') y = Math.max(0, fy - s * 0.08);
  if (anchorY === 'south') y = Math.min(1 - s, fy - s + s * 0.08);
  return { fx: x, fy: y, fw: s, fh: s };
}

/** Canonical structure positions from the coordinate schematic. */
export const FORTRESS_STRUCTURE_COORDS = {
  treasury:    { cx: 0, cy: 0 },
  west_gate:   { cx: -12, cy: 0 },
  east_gate:   { cx: 12, cy: 0 },
  north_gate:  { cx: 0, cy: 12 },
  south_gate:  { cx: 0, cy: -12 },
  tower_ne:    { cx: 9, cy: 9 },
  tower_nw:    { cx: -9, cy: 9 },
  tower_se:    { cx: 9, cy: -9 },
  tower_sw:    { cx: -9, cy: -9 },
  longhouse:   { cx: -5, cy: 4 },
  watch_tower: { cx: -9, cy: 9 },
  wall_scar:   { cx: -11, cy: 1.5 },
};

/** Prep hotspot layout derived from schematic coordinates. */
export const PREP_COORD_HOTSPOTS = {
  treasury:    fortressCoordRect(0, 0, 2.4),
  west_gate:   fortressCoordRect(-12, 0, 2.8, { anchorX: 'west' }),
  watch_tower: fortressCoordRect(-9, 9, 2.6, { anchorX: 'west', anchorY: 'north' }),
  longhouse:   fortressCoordRect(-5, 4, 2.8),
  wall_scar:   fortressCoordRect(-11, 1.5, 2.2, { anchorX: 'west' }),
};
