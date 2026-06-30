/**
 * Fortress layout renderer — prep and assault share anchor-based structure draw.
 */

import { computeStructureAnchors, createFortressLayout } from './fortressLayout.js';
import { getGateArtKeyFromState, STRUCTURE_ART_KEYS } from '../assets/fortressManifest.js';
import { needsGateRepair } from './prepScarRepair.js';
import { resolvePostCell, getPrimaryGateForFront } from './defensivePosts.js';
import {
  drawFortressPrepSprite,
  drawCampaignGateSprite,
  getBattleWestGateArtKey,
  getWestGateArtKey,
  ASSAULT_FORTRESS_STRUCTURE_SCALE,
} from '../preparation/fortressPrepArt.js';
import { PREP_FORTRESS_STRUCTURE_SCALE } from '../combat/assaultField.js';
import { drawSiegeBattleProp } from '../assets/siegeArt.js';
import { drawCampaignPalisadeRing } from '../assets/terrainArt.js';

function cellBox(cell, cellSize, scale, footprint = { w: 1, h: 1 }) {
  const cx = cell.col * cellSize + cellSize / 2;
  const cy = cell.row * cellSize + cellSize / 2;
  const w = cellSize * footprint.w * scale;
  const h = cellSize * footprint.h * scale;
  return {
    x: cx - w / 2,
    y: cy - h / 2,
    w,
    h,
    cx,
    cy,
  };
}

function findGateWallEntry(wallData, goal, ringR, frontId) {
  const gatePost = getPrimaryGateForFront(frontId);
  const gateCell = resolvePostCell(gatePost, goal, ringR);
  const key = `${gateCell.col}_${gateCell.row}`;
  if (wallData?.[key]) return wallData[key];
  for (const w of Object.values(wallData ?? {})) {
    if (w?.isGate) return w;
  }
  return null;
}

function drawGateAtCell(ctx, cell, cellSize, scale, { wallData, prepMeta, frontId, goal, ringR, time, mode = 'assault' }) {
  const gateWall = findGateWallEntry(wallData, goal, ringR, frontId);
  const scarred = prepMeta?.westGateScarred && !prepMeta?.westGateRepaired;
  const artKey = wallData && Object.keys(wallData).length
    ? getBattleWestGateArtKey(gateWall, prepMeta)
    : (getGateArtKeyFromState({ scarred, repaired: !scarred }) === 'westGateCracked'
      ? 'westGateCracked'
      : getWestGateArtKey(prepMeta));
  const gateScale = mode === 'prep' ? scale * 1.08 : scale;
  const box = cellBox(cell, cellSize, gateScale, { w: 3.6, h: 2.35 });
  if (needsGateRepair(prepMeta) && mode === 'prep') {
    const pulse = 0.45 + Math.sin(time * 4.5) * 0.3;
    ctx.save();
    ctx.strokeStyle = `rgba(255,100,40,${pulse})`;
    ctx.lineWidth = Math.max(2, cellSize * 0.12);
    ctx.strokeRect(box.x - 4, box.y - 4, box.w + 8, box.h + 8);
    ctx.restore();
  }
  if (!drawFortressPrepSprite(ctx, artKey, box)) {
    drawCampaignGateSprite(ctx, artKey, box.cx, box.cy, cellSize * scale, time);
  }
}

function drawCourtyardStructure(ctx, kind, cell, cellSize, scale, watchtowerLevel = 0) {
  const footprints = {
    longhouse: { w: 5.2, h: 2.4 },
    watch_tower: { w: 2.0, h: 2.6 },
    treasury: { w: 1.65, h: 1.55 },
  };
  const fp = footprints[kind] ?? { w: 2, h: 2 };
  const towerBoost = kind === 'watch_tower' ? 1 + watchtowerLevel * 0.08 : 1;
  const box = cellBox(cell, cellSize, scale, {
    w: fp.w,
    h: fp.h * towerBoost,
  });
  const artKey = STRUCTURE_ART_KEYS[kind === 'watch_tower' ? 'watch_tower' : kind];
  if (artKey && !drawFortressPrepSprite(ctx, artKey, box)) {
    ctx.fillStyle = 'rgba(40,28,16,0.55)';
    ctx.fillRect(box.x, box.y, box.w, box.h);
  }
}

function drawSiegeProp(ctx, anchor, cellSize, scale) {
  const box = cellBox(anchor.cell, cellSize, scale * 0.95, { w: 1.6, h: 1.6 });
  const drew = drawSiegeBattleProp(
    ctx,
    anchor.structureType,
    box.cx,
    box.cy,
    Math.min(box.w, box.h) * 1.15,
    true,
  );
  if (!drew) {
    ctx.fillStyle = 'rgba(80,60,30,0.55)';
    ctx.fillRect(box.x, box.y, box.w, box.h);
    ctx.font = 'bold 6px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e8d7b5';
    ctx.fillText((anchor.structureType ?? '?').slice(0, 4), box.cx, box.cy + 2);
  }
}

function drawWallScarMarker(ctx, goal, ringR, cellSize, frontId, scale, time) {
  const gatePost = getPrimaryGateForFront(frontId);
  const cell = resolvePostCell(gatePost, goal, ringR);
  const north = { col: cell.col, row: cell.row - 1 };
  const box = cellBox(north, cellSize, scale, { w: 1.2, h: 1.2 });
  if (drawFortressPrepSprite(ctx, 'wallScar', box)) return;
  const pulse = 0.45 + Math.sin(time * 3.2) * 0.25;
  ctx.strokeStyle = `rgba(232,160,60,${pulse})`;
  ctx.lineWidth = 2;
  ctx.strokeRect(box.x, box.y, box.w, box.h);
}

function drawRepairScaffoldMarker(ctx, goal, ringR, cellSize, frontId, scale) {
  const gatePost = getPrimaryGateForFront(frontId);
  const cell = resolvePostCell(gatePost, goal, ringR);
  const south = { col: cell.col, row: cell.row + 1 };
  const box = cellBox(south, cellSize, scale, { w: 1.5, h: 2.0 });
  drawFortressPrepSprite(ctx, 'repairScaffold', box);
}

/**
 * Draw Age I fortress from baked layout anchors.
 */
export function drawFortressLayout(ctx, {
  goal,
  cellSize,
  ringR,
  wallData = {},
  prepMeta = null,
  spawnCol = 0,
  scale = ASSAULT_FORTRESS_STRUCTURE_SCALE,
  time = 0,
  mode = 'assault',
  postAssignments = {},
  fortressUpgrades = {},
  frontId = 'west',
} = {}) {
  if (!goal || !cellSize) return false;

  const layout = createFortressLayout({
    goal,
    ringR,
    frontId,
    posts: postAssignments,
    upgrades: fortressUpgrades,
    scars: {
      westGateScarred: !!prepMeta?.westGateScarred,
      westGateRepaired: prepMeta?.westGateRepaired !== false,
    },
  });
  const anchors = computeStructureAnchors(layout);
  const wallworks = fortressUpgrades?.wallworks ?? 0;
  const watchLv = fortressUpgrades?.watchtower ?? 0;
  const structureScale = mode === 'prep'
    ? PREP_FORTRESS_STRUCTURE_SCALE
    : scale;

  ctx.save();
  if (mode === 'prep') {
    ctx.globalAlpha = 0.98;
    drawCampaignPalisadeRing(ctx, goal, ringR, cellSize, time, {
      spawnCol,
      wallworksLevel: wallworks,
    });
  }

  for (const anchor of anchors) {
    if (anchor.kind === 'gate') {
      drawGateAtCell(ctx, anchor.cell, cellSize, structureScale, {
        wallData, prepMeta, frontId, goal, ringR, time, mode,
      });
    } else if (anchor.kind === 'longhouse') {
      drawCourtyardStructure(ctx, 'longhouse', anchor.cell, cellSize, structureScale);
    } else if (anchor.kind === 'watch_tower') {
      drawCourtyardStructure(ctx, 'watch_tower', anchor.cell, cellSize, structureScale, watchLv);
    } else if (anchor.kind === 'treasury') {
      drawCourtyardStructure(ctx, 'treasury', anchor.cell, cellSize, structureScale);
    } else if (anchor.kind === 'siege') {
      drawSiegeProp(ctx, anchor, cellSize, structureScale);
    }
  }

  if (mode === 'prep' && needsGateRepair(prepMeta)) {
    drawWallScarMarker(ctx, goal, ringR, cellSize, frontId, scale, time);
    drawRepairScaffoldMarker(ctx, goal, ringR, cellSize, frontId, scale);
  }

  ctx.restore();
  return true;
}

export { ASSAULT_FORTRESS_STRUCTURE_SCALE };
