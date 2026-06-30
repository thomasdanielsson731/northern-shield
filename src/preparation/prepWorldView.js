/**
 * Prep scroll battlefield — same world as assault, calmer grade, post halos.
 * @see design/FORTRESS_PREP_ASSAULT_GRAPHICS.md Proposal A
 */

import { UI_COLORS } from '../ui/uiTheme.js';
import {
  HERO_POST_IDS,
  POST_DEFS,
  SIEGE_POST_IDS,
  getPrimaryGateForFront,
  resolvePostCell,
} from '../fortress/defensivePosts.js';
import { drawFortressLayout } from '../fortress/fortressRenderer.js';
import { isSiegePostUnlocked } from './prepSiegePicker.js';

const PREP_POST_HIT_R = 18;

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
}) {
  if (!goal || !cellSize || !gridScreenX || !gridScreenY) return null;

  const primaryGate = getPrimaryGateForFront(frontId);
  const ids = [...HERO_POST_IDS, ...SIEGE_POST_IDS.filter(id => id !== 'gate_fixture')];
  let best = null;
  let bestD = Infinity;

  for (const postId of ids) {
    const cell = resolvePostCell(postId, goal, ringR);
    const sx = gridScreenX(cell.col * cellSize + cellSize / 2);
    const sy = gridScreenY(cell.row * cellSize + cellSize / 2);
    const d = Math.hypot(mouseX - sx, mouseY - sy);
    const hitR = postId === primaryGate ? PREP_POST_HIT_R + 4 : PREP_POST_HIT_R;
    if (d <= hitR && d < bestD) {
      bestD = d;
      best = postId;
    }
  }
  return best;
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
}) {
  const primaryGate = getPrimaryGateForFront(frontId);
  ctx.save();

  for (const postId of HERO_POST_IDS) {
    const cell = resolvePostCell(postId, goal, ringR);
    const sx = gridScreenX(cell.col * cellSize + cellSize / 2);
    const sy = gridScreenY(cell.row * cellSize + cellSize / 2);
    const assignedId = postAssignments[postId]?.defenderId;
    const isPrimary = postId === primaryGate;
    const isSelected = selectedPostId === postId;
    const r = cellSize * 0.48;

    if (!assignedId && isPrimary) {
      const pulse = 0.45 + Math.sin(now * 0.004) * 0.25;
      ctx.strokeStyle = `rgba(232,208,96,${pulse})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sx, sy, r + 6, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fillStyle = assignedId
      ? (isPrimary ? 'rgba(120,200,80,0.55)' : 'rgba(80,140,220,0.45)')
      : (isPrimary ? 'rgba(200,160,40,0.30)' : 'rgba(100,90,140,0.22)');
    ctx.fill();
    ctx.strokeStyle = isSelected
      ? UI_COLORS.gold
      : (isPrimary ? '#c0e060' : 'rgba(180,160,220,0.55)');
    ctx.lineWidth = isSelected ? 2.5 : (isPrimary ? 2 : 1);
    ctx.stroke();

    const def = assignedId ? roster?.find?.(assignedId) : null;
    if (def) {
      ctx.font = 'bold 7px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#f0e8d0';
      ctx.fillText((def.name ?? def.type ?? '?').slice(0, 2).toUpperCase(), sx, sy + 2);
    }

    ctx.font = 'bold 6px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = isPrimary ? 'rgba(200,230,140,0.85)' : 'rgba(180,170,150,0.65)';
    const label = POST_DEFS[postId]?.label ?? postId;
    ctx.fillText(label.split(' ')[0].toUpperCase(), sx, sy - r - 4);
  }

  for (const postId of SIEGE_POST_IDS) {
    if (postId === 'gate_fixture') continue;
    const a = postAssignments[postId];
    const cell = resolvePostCell(postId, goal, ringR);
    const sx = gridScreenX(cell.col * cellSize + cellSize / 2);
    const sy = gridScreenY(cell.row * cellSize + cellSize / 2);
    const unlocked = isSiegePostUnlocked(postId, fortressUpgrades);
    const isSelected = selectedPostId === postId;

    if (!a?.structureType) {
      if (!unlocked) continue;
      ctx.strokeStyle = isSelected ? UI_COLORS.gold : 'rgba(180,140,80,0.35)';
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(sx - 12, sy - 12, 24, 24);
      ctx.setLineDash([]);
      ctx.font = '5px monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(160,130,80,0.55)';
      ctx.fillText('SIEGE', sx, sy + 2);
      continue;
    }
    ctx.fillStyle = 'rgba(200,160,80,0.35)';
    ctx.strokeStyle = 'rgba(220,180,100,0.65)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.rect(sx - 10, sy - 10, 20, 20);
    ctx.fill();
    ctx.stroke();
    ctx.font = '5px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e8d7b5';
    ctx.fillText(a.structureType.slice(0, 4), sx, sy + 2);
  }

  ctx.restore();
}

export function drawPrepWorldChrome(ctx, playfield, {
  showSchematicHint = false,
  assaultCodename = null,
  schematicOverlay = false,
} = {}) {
  ctx.save();
  ctx.font = 'bold 7px monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(232,208,96,0.55)';
  ctx.fillText('FORTRESS PREP — tap posts to assign', playfield.x + 8, playfield.y + 12);

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

  if (showSchematicHint && !schematicOverlay) {
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
  });
}
