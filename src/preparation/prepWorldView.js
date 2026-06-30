/**
 * Prep scroll battlefield — same world as assault, calmer grade, post halos.
 * @see design/FORTRESS_PREP_ASSAULT_GRAPHICS.md Proposal A
 */

import { UI_COLORS } from '../ui/uiTheme.js';
import {
  POST_DEFS,
  getPrimaryGateForFront,
  resolvePostCell,
} from '../fortress/defensivePosts.js';
import { drawFortressLayout } from '../fortress/fortressRenderer.js';
import { isSiegePostUnlocked, getSiegeStructureLabel } from './prepSiegePicker.js';
import { getPrepVisibleHeroPosts, getPrepVisibleSiegePosts, isPrepPostVisible } from './prepField.js';
import { needsGateRepair } from '../fortress/prepScarRepair.js';
import { drawStructureArtIcon } from '../assets/structureArt.js';

const PREP_POST_HIT_R = 28;
const PREP_POST_VISUAL_SCALE = 1.65;

export function shouldDefaultSchematicOverlay(battlesCompleted = 0, assaultNodeIndex = null) {
  return battlesCompleted === 0 && assaultNodeIndex === 0;
}

/** Screen-space hit test for hero/siege posts on the scroll battlefield. */
export function hitTestPrepWorldPost(mouseX, mouseY, {
  goal,
  ringR,
  cellSize,
  gridScreenX,
  gridScreenY,
  frontId = 'west',
  fortressUpgrades = {},
}) {
  if (!goal || !cellSize || !gridScreenX || !gridScreenY) return null;

  const primaryGate = getPrimaryGateForFront(frontId);
  const heroIds = getPrepVisibleHeroPosts(frontId);
  const siegeIds = getPrepVisibleSiegePosts().filter(
    id => isSiegePostUnlocked(id, fortressUpgrades),
  );
  const ids = [...heroIds, ...siegeIds];
  let best = null;
  let bestD = Infinity;

  for (const postId of ids) {
    const cell = resolvePostCell(postId, goal, ringR);
    const sx = gridScreenX(cell.col * cellSize + cellSize / 2);
    const sy = gridScreenY(cell.row * cellSize + cellSize / 2);
    const d = Math.hypot(mouseX - sx, mouseY - sy);
    const hitR = postId === primaryGate ? PREP_POST_HIT_R + 8 : PREP_POST_HIT_R;
    if (d <= hitR && d < bestD) {
      bestD = d;
      best = postId;
    }
  }
  return best;
}

/** Darken wilderness rim so the fortress cluster reads larger. */
export function drawPrepFortressFocusGrade(ctx, playfield, fortressScreenX, fortressScreenY, radius = 140) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(playfield.x, playfield.y, playfield.w, playfield.h);
  ctx.clip();
  const g = ctx.createRadialGradient(
    fortressScreenX, fortressScreenY, radius * 0.15,
    fortressScreenX, fortressScreenY, radius * 1.35,
  );
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.55, 'rgba(0,0,0,0.18)');
  g.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = g;
  ctx.fillRect(playfield.x, playfield.y, playfield.w, playfield.h);
  ctx.restore();
}

export function drawPrepPostOverlays(ctx, {
  goal,
  ringR,
  cellSize,
  postAssignments = {},
  roster,
  gridScreenX,
  gridScreenY,
  frontId = 'west',
  selectedPostId = null,
  now = 0,
  fortressUpgrades = {},
  prepMeta = null,
}) {
  const primaryGate = getPrimaryGateForFront(frontId);
  const vis = PREP_POST_VISUAL_SCALE;
  ctx.save();

  for (const postId of getPrepVisibleHeroPosts(frontId)) {
    const cell = resolvePostCell(postId, goal, ringR);
    const sx = gridScreenX(cell.col * cellSize + cellSize / 2);
    const sy = gridScreenY(cell.row * cellSize + cellSize / 2);
    const assignedId = postAssignments[postId]?.defenderId;
    const isPrimary = postId === primaryGate;
    const isSelected = selectedPostId === postId;
    const r = cellSize * 0.52 * vis;
    const gateNeedsRepair = isPrimary && needsGateRepair(prepMeta);

    if (gateNeedsRepair) {
      const pulse = 0.5 + Math.sin(now * 0.005) * 0.35;
      ctx.strokeStyle = `rgba(255,120,40,${pulse})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(sx, sy, r + 10, 0, Math.PI * 2);
      ctx.stroke();
    } else if (!assignedId && isPrimary) {
      const pulse = 0.45 + Math.sin(now * 0.004) * 0.25;
      ctx.strokeStyle = `rgba(232,208,96,${pulse})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(sx, sy, r + 8, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fillStyle = assignedId
      ? (isPrimary ? 'rgba(120,200,80,0.62)' : 'rgba(80,140,220,0.50)')
      : (isPrimary ? 'rgba(200,160,40,0.38)' : 'rgba(100,90,140,0.28)');
    ctx.fill();
    ctx.strokeStyle = isSelected
      ? UI_COLORS.gold
      : gateNeedsRepair
        ? '#ff9040'
        : (isPrimary ? '#c0e060' : 'rgba(180,160,220,0.65)');
    ctx.lineWidth = isSelected ? 3 : (isPrimary ? 2.5 : 1.5);
    ctx.stroke();

    const def = assignedId ? roster?.find?.(assignedId) : null;
    if (def) {
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#f0e8d0';
      ctx.fillText((def.name ?? def.type ?? '?').slice(0, 2).toUpperCase(), sx, sy + 3);
    }

    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = gateNeedsRepair
      ? '#ffb060'
      : (isPrimary ? 'rgba(200,230,140,0.95)' : 'rgba(180,170,150,0.80)');
    const label = POST_DEFS[postId]?.label ?? postId;
    const short = gateNeedsRepair && isPrimary ? 'GATE — CRACKED' : label.split(' ')[0].toUpperCase();
    ctx.fillText(short, sx, sy - r - 6);
  }

  for (const postId of getPrepVisibleSiegePosts()) {
    const a = postAssignments[postId];
    const cell = resolvePostCell(postId, goal, ringR);
    const sx = gridScreenX(cell.col * cellSize + cellSize / 2);
    const sy = gridScreenY(cell.row * cellSize + cellSize / 2);
    const unlocked = isSiegePostUnlocked(postId, fortressUpgrades);
    const isSelected = selectedPostId === postId;
    const boxR = cellSize * 0.55 * vis;

    if (!unlocked) {
      ctx.fillStyle = 'rgba(40,32,24,0.45)';
      ctx.strokeStyle = 'rgba(100,90,80,0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.rect(sx - boxR, sy - boxR, boxR * 2, boxR * 2);
      ctx.fill();
      ctx.stroke();
      ctx.font = 'bold 7px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(140,120,100,0.55)';
      ctx.fillText('🔒', sx, sy + 3);
      continue;
    }

    if (!a?.structureType) {
      const pulse = 0.4 + Math.sin(now * 0.0045) * 0.2;
      ctx.strokeStyle = isSelected ? UI_COLORS.gold : `rgba(220,170,80,${0.45 + pulse})`;
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(sx - boxR, sy - boxR, boxR * 2, boxR * 2);
      ctx.setLineDash([]);
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(240,200,120,0.90)';
      const opt = POST_DEFS[postId]?.structureDefault;
      const mountLabel = postId === 'ballista_platform' ? 'BALLISTA' : 'SIEGE';
      ctx.fillText(mountLabel, sx, sy + 3);
      ctx.font = '6px monospace';
      ctx.fillStyle = 'rgba(200,170,120,0.70)';
      ctx.fillText('tap to mount', sx, sy - boxR - 5);
      continue;
    }

    const drew = drawStructureArtIcon(ctx, a.structureType, sx, sy, boxR * 1.6, true);
    if (!drew) {
      ctx.fillStyle = 'rgba(200,160,80,0.45)';
      ctx.strokeStyle = 'rgba(220,180,100,0.75)';
      ctx.lineWidth = 2;
      ctx.fillRect(sx - boxR, sy - boxR, boxR * 2, boxR * 2);
      ctx.strokeRect(sx - boxR, sy - boxR, boxR * 2, boxR * 2);
    }
    if (isSelected) {
      ctx.strokeStyle = UI_COLORS.gold;
      ctx.lineWidth = 2.5;
      ctx.strokeRect(sx - boxR - 3, sy - boxR - 3, boxR * 2 + 6, boxR * 2 + 6);
    }
    ctx.font = 'bold 7px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f0e0b0';
    ctx.fillText(getSiegeStructureLabel(a.structureType).toUpperCase(), sx, sy - boxR - 5);
  }

  ctx.restore();
}

export function drawPrepWorldChrome(ctx, playfield, {
  showSchematicHint = false,
  assaultCodename = null,
  schematicOverlay = false,
  siegeHint = false,
} = {}) {
  ctx.save();
  ctx.font = 'bold 8px monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(232,208,96,0.75)';
  ctx.fillText('FORTRESS PREP — tap glowing posts', playfield.x + 8, playfield.y + 14);

  const mapX = playfield.x + playfield.w - 46;
  const mapY = playfield.y + 4;
  ctx.fillStyle = schematicOverlay ? 'rgba(40,32,16,0.92)' : 'rgba(12,18,28,0.82)';
  ctx.strokeStyle = schematicOverlay ? UI_COLORS.gold : 'rgba(120,160,200,0.45)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(mapX, mapY, 40, 16, 3);
  ctx.fill();
  ctx.stroke();
  ctx.font = 'bold 6px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = schematicOverlay ? '#f0e060' : 'rgba(180,200,220,0.75)';
  ctx.fillText('MAP', mapX + 20, mapY + 11);

  if (assaultCodename) {
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(180,150,90,0.65)';
    ctx.font = 'bold 7px monospace';
    ctx.fillText(assaultCodename.toUpperCase(), playfield.x + playfield.w - 52, playfield.y + 12);
  }

  if (siegeHint) {
    ctx.textAlign = 'center';
    ctx.font = 'bold 7px monospace';
    ctx.fillStyle = 'rgba(240,200,120,0.75)';
    ctx.fillText('▣ Dashed box = Ballista platform — tap it or use panel', playfield.x + playfield.w / 2, playfield.y + playfield.h - 8);
  } else if (showSchematicHint && !schematicOverlay) {
    ctx.textAlign = 'center';
    ctx.font = '6px monospace';
    ctx.fillStyle = 'rgba(160,180,200,0.45)';
    ctx.fillText('MAP — commander schematic (onboarding)', playfield.x + playfield.w / 2, playfield.y + playfield.h - 6);
  }
  ctx.restore();
}

export function drawPrepScrollWorldLayer(ctx, opts) {
  const {
    playfield,
    terrainCanvas,
    assaultWorldPadX = 0,
    assaultWorldPadY = 0,
    goal,
    ringR,
    cellSize,
    wallData,
    prepMeta,
    spawnCol,
    time,
    postAssignments,
    roster,
    gridScreenX,
    gridScreenY,
    frontId,
    selectedPostId,
    drawBackdrop,
    fortressUpgrades,
  } = opts;

  if (drawBackdrop) {
    drawBackdrop(ctx, playfield.x, playfield.y, playfield.w, playfield.h, time, { prepMode: true });
  }

  if (terrainCanvas) {
    ctx.drawImage(terrainCanvas, playfield.x - assaultWorldPadX, playfield.y - assaultWorldPadY);
  }

  drawFortressLayout(ctx, {
    goal,
    cellSize,
    ringR,
    wallData,
    prepMeta,
    spawnCol,
    time,
    mode: 'prep',
    postAssignments,
    fortressUpgrades,
    frontId,
  });

  drawPrepPostOverlays(ctx, {
    goal,
    ringR,
    cellSize,
    postAssignments,
    roster,
    gridScreenX,
    gridScreenY,
    frontId,
    selectedPostId,
    now: time * 1000,
    fortressUpgrades,
    prepMeta,
  });
}
