/**
 * Command map node positions in source-art normalized space (0–1).
 * Tuned to match painted circles on ui_command_map_regionN@800x600 assets.
 */

import { isCampaignArtReady } from '../assets/campaignArt.js';

/** @typedef {{ fx: number, fy: number, r?: number }} NormNode */

/** Region 1 — Ash Fen west road (800×600 art). OATH = castle top-left. */
export const REGION1_COMMAND_MAP_NODES = [
  { fx: 0.300, fy: 0.350, r: 0.028 }, // A0 — first worn mark leaving the fortress
  { fx: 0.400, fy: 0.450, r: 0.028 }, // A1
  { fx: 0.480, fy: 0.530, r: 0.028 }, // A2
  { fx: 0.520, fy: 0.600, r: 0.028 }, // A3
  { fx: 0.580, fy: 0.680, r: 0.030 }, // A4 — fen edge before boss ground
  { fx: 0.200, fy: 0.200, r: 0.034 }, // OATH — castle on the hill
];

/** Region 2 — Bifrost Pass. Path climbs from lowlands to castle top-left. */
const REGION2_COMMAND_MAP_NODES = [
  { fx: 0.550, fy: 0.850, r: 0.028 },
  { fx: 0.400, fy: 0.800, r: 0.028 },
  { fx: 0.450, fy: 0.700, r: 0.028 },
  { fx: 0.350, fy: 0.600, r: 0.028 },
  { fx: 0.250, fy: 0.450, r: 0.028 },
  { fx: 0.150, fy: 0.170, r: 0.034 },
];

/** Region 3 — Nidhogg's Run. Roots bottom-left to castle top-right. */
const REGION3_COMMAND_MAP_NODES = [
  { fx: 0.150, fy: 0.650, r: 0.028 },
  { fx: 0.130, fy: 0.450, r: 0.028 },
  { fx: 0.280, fy: 0.320, r: 0.028 },
  { fx: 0.480, fy: 0.530, r: 0.028 },
  { fx: 0.820, fy: 0.760, r: 0.028 },
  { fx: 0.820, fy: 0.220, r: 0.034 },
];

/** Region 4 — Frost Gate. Castle top-left, forked path. */
const REGION4_COMMAND_MAP_NODES = [
  { fx: 0.350, fy: 0.550, r: 0.028 },
  { fx: 0.430, fy: 0.480, r: 0.028 },
  { fx: 0.540, fy: 0.380, r: 0.028 },
  { fx: 0.780, fy: 0.250, r: 0.028 },
  { fx: 0.540, fy: 0.680, r: 0.028 },
  { fx: 0.190, fy: 0.170, r: 0.034 },
];

/** Region 5 — Iron Fjord. Zig-zag climb to cliff-top castle top-right. */
const REGION5_COMMAND_MAP_NODES = [
  { fx: 0.180, fy: 0.830, r: 0.028 },
  { fx: 0.370, fy: 0.790, r: 0.028 },
  { fx: 0.370, fy: 0.680, r: 0.028 },
  { fx: 0.430, fy: 0.540, r: 0.028 },
  { fx: 0.530, fy: 0.290, r: 0.028 },
  { fx: 0.750, fy: 0.150, r: 0.034 },
];

/** Region 6 — Ash Watch. Tower top-left, forked descent. */
const REGION6_COMMAND_MAP_NODES = [
  { fx: 0.394, fy: 0.567, r: 0.028 },
  { fx: 0.500, fy: 0.717, r: 0.028 },
  { fx: 0.688, fy: 0.433, r: 0.028 },
  { fx: 0.663, fy: 0.783, r: 0.028 },
  { fx: 0.800, fy: 0.833, r: 0.028 },
  { fx: 0.194, fy: 0.167, r: 0.034 },
];

/** Region 7 — Rune Valley. Path from bottom to castle top-right. */
const REGION7_COMMAND_MAP_NODES = [
  { fx: 0.370, fy: 0.800, r: 0.028 },
  { fx: 0.550, fy: 0.750, r: 0.028 },
  { fx: 0.410, fy: 0.650, r: 0.028 },
  { fx: 0.580, fy: 0.550, r: 0.028 },
  { fx: 0.410, fy: 0.380, r: 0.028 },
  { fx: 0.670, fy: 0.250, r: 0.034 },
];

/** Region 8 — Wolf Den. Cave fort top-left, node cluster below. */
const REGION8_COMMAND_MAP_NODES = [
  { fx: 0.430, fy: 0.680, r: 0.028 },
  { fx: 0.200, fy: 0.650, r: 0.028 },
  { fx: 0.380, fy: 0.810, r: 0.028 },
  { fx: 0.580, fy: 0.780, r: 0.028 },
  { fx: 0.780, fy: 0.820, r: 0.028 },
  { fx: 0.250, fy: 0.350, r: 0.034 },
];

/** Region 9 — Dragon Coast. Bottom-left path to cliff castle top-right. */
const REGION9_COMMAND_MAP_NODES = [
  { fx: 0.120, fy: 0.850, r: 0.028 },
  { fx: 0.220, fy: 0.750, r: 0.028 },
  { fx: 0.350, fy: 0.650, r: 0.028 },
  { fx: 0.280, fy: 0.500, r: 0.028 },
  { fx: 0.180, fy: 0.380, r: 0.028 },
  { fx: 0.820, fy: 0.220, r: 0.034 },
];

/** Region 10 — Shield March. Road to palisade fort top-right. */
const REGION10_COMMAND_MAP_NODES = [
  { fx: 0.410, fy: 0.670, r: 0.028 },
  { fx: 0.280, fy: 0.480, r: 0.028 },
  { fx: 0.660, fy: 0.770, r: 0.028 },
  { fx: 0.730, fy: 0.630, r: 0.028 },
  { fx: 0.790, fy: 0.500, r: 0.028 },
  { fx: 0.820, fy: 0.150, r: 0.034 },
];

/** Generic fallback when art exists but nodes are not yet tuned. */
const REGION_FALLBACK_NODES = [
  { fx: 0.14, fy: 0.72, r: 0.028 },
  { fx: 0.28, fy: 0.58, r: 0.028 },
  { fx: 0.44, fy: 0.50, r: 0.028 },
  { fx: 0.58, fy: 0.44, r: 0.028 },
  { fx: 0.72, fy: 0.38, r: 0.028 },
  { fx: 0.86, fy: 0.30, r: 0.032 },
];

const REGION_ART_KEYS = {
  0: 'commandMapRegion1',
  1: 'commandMapRegion2',
  2: 'commandMapRegion3',
  3: 'commandMapRegion4',
  4: 'commandMapRegion5',
  5: 'commandMapRegion6',
  6: 'commandMapRegion7',
  7: 'commandMapRegion8',
  8: 'commandMapRegion9',
  9: 'commandMapRegion10',
};

const REGION_NODE_LAYOUTS = {
  0: REGION1_COMMAND_MAP_NODES,
  1: REGION2_COMMAND_MAP_NODES,
  2: REGION3_COMMAND_MAP_NODES,
  3: REGION4_COMMAND_MAP_NODES,
  4: REGION5_COMMAND_MAP_NODES,
  5: REGION6_COMMAND_MAP_NODES,
  6: REGION7_COMMAND_MAP_NODES,
  7: REGION8_COMMAND_MAP_NODES,
  8: REGION9_COMMAND_MAP_NODES,
  9: REGION10_COMMAND_MAP_NODES,
};

/** Same cover-fit math as drawCampaignArtCover. */
export function computeCoverFitRect(srcW, srcH, x, y, w, h) {
  const srcAspect = srcW / srcH;
  const dstAspect = w / h;
  let dw = w;
  let dh = h;
  let dx = x;
  let dy = y;
  if (dstAspect > srcAspect) {
    dh = w / srcAspect;
    dy = y + (h - dh) / 2;
  } else {
    dw = h * srcAspect;
    dx = x + (w - dw) / 2;
  }
  return { dx, dy, dw, dh, srcW, srcH };
}

export function getCommandMapArtKey(mapIndex) {
  return REGION_ART_KEYS[mapIndex] ?? null;
}

export function getCommandMapNormNodes(mapIndex) {
  return REGION_NODE_LAYOUTS[mapIndex] ?? REGION_FALLBACK_NODES;
}

/**
 * Screen positions for command-map nodes (cover-fit art space).
 * @returns {{ x: number, y: number, r: number }[]|null} null → use legacy linear road
 */
export function resolveCommandMapNodePositions(mapIndex, mapX, mapY, mapW, mapH) {
  const artKey = getCommandMapArtKey(mapIndex);
  if (!artKey || !isCampaignArtReady(artKey)) return null;

  const norms = getCommandMapNormNodes(mapIndex);
  const rect = computeCoverFitRect(800, 600, mapX, mapY, mapW, mapH);
  return norms.map((n) => ({
    x: rect.dx + n.fx * rect.dw,
    y: rect.dy + n.fy * rect.dh,
    r: (n.r ?? 0.028) * rect.dw,
  }));
}
