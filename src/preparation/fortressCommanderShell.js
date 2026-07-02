/**
 * Fortress Commander Prep shell — Level 1 (First Saga).
 * Clickable schematic, camera zoom, advisor context panel, horn gate.
 * @see design/FORTRESS_AS_UI.md
 */

import { UI_COLORS } from '../ui/uiTheme.js';
import { validateAssignments } from '../fortress/defensivePosts.js';
import { getHeroAdvisorContent, getHeroPanelActions, isHeroPostId } from './prepHeroPicker.js';
import { getSiegeAdvisorContent, getSiegePanelActions, isSiegePostId, getPrepSiegeSidebarActions } from './prepSiegePicker.js';
import {
  canAffordGateRepair,
  getGateRepairBlockReason,
  needsGateRepair,
} from '../fortress/prepScarRepair.js';
import {
  drawAdvisorPortraitArt,
  drawResourceIconArt,
} from '../assets/campaignArt.js';
import { drawFortressPrepSprite, drawFortressPrepBackground, getWestGateArtKey, isFortressPrepArtReady } from './fortressPrepArt.js';
import { PREP_HOTSPOT_LAYOUT, resolvePrepHotspotRect } from './fortressPrepLayout.js';
import { drawHeroMedallionArt } from '../assets/campaignArt.js';

export const PREP_HOTSPOTS = {
  WEST_GATE: 'west_gate',
  WATCH_TOWER: 'watch_tower',
  WALL_SCAR: 'wall_scar',
  LONGHOUSE: 'longhouse',
  TREASURY: 'treasury',
};

export const CAMERA_DURATION_MS = 400;
export const HORN_ANIM_MS = 500;

const ADVISORS = {
  captain: { name: 'Captain', color: '#a8c8e8' },
  scout: { name: 'Scout', color: '#90b890' },
  builder: { name: 'Builder', color: '#c8a878' },
  quartermaster: { name: 'Quartermaster', color: '#d4af37' },
  skald: { name: 'Skald', color: '#e8c8a0' },
};

/** @deprecated use PREP_HOTSPOT_LAYOUT from fortressPrepLayout.js */
const HOTSPOT_LAYOUT = PREP_HOTSPOT_LAYOUT;

export function createPrepShellState() {
  return {
    selectedHotspot: null,
    cameraScale: 1,
    cameraFocusX: 0.5,
    cameraFocusY: 0.5,
    hornAnim: 0,
    panelBtns: [],
    schematicBtns: [],
    hornBtn: null,
    hornHover: false,
    minorSeen: new Set(),
  };
}

export function defaultPrepFieldMeta() {
  return { wood: 0, westGateScarred: false, westGateRepaired: true };
}

/** Prep always opens with a fully restored fortress — no carry-over damage. */
export function normalizePrepFieldMeta(meta) {
  return {
    ...meta,
    wood: 0,
    westGateScarred: false,
    westGateRepaired: true,
  };
}

/** Load persisted prep meta — scars carry over until repaired or victory clears them. */
export function loadPrepFieldMeta(fieldState) {
  if (!fieldState) return defaultPrepFieldMeta();
  return {
    wood: fieldState.wood ?? 0,
    westGateScarred: !!fieldState.westGateScarred,
    westGateRepaired: fieldState.westGateRepaired !== false,
  };
}

/** Prep session uses field meta as-is (no silent scar wipe). */
export function syncPrepMetaForAssault(meta) {
  return loadPrepFieldMeta(meta);
}

export function mergePrepFieldMeta(fieldState, meta) {
  return {
    ...fieldState,
    wood: meta.wood,
    westGateScarred: meta.westGateScarred,
    westGateRepaired: meta.westGateRepaired,
  };
}

/** Clear legacy scar/timber from persisted field state after assault victory. */
export function applyFirstSagaAssaultRewards(fieldState) {
  return mergePrepFieldMeta(fieldState, normalizePrepFieldMeta(defaultPrepFieldMeta()));
}

/** Ordered prep checklist — required steps gate the horn; optional scout is last. */
export function getPrepObjectives(ctx) {
  const {
    pendingAssaultNode,
    postAssignments,
    assault,
  } = ctx;

  const steps = [];

  if (pendingAssaultNode == null) {
    steps.push({
      id: 'pick_assault',
      label: 'Pick an assault on the Command Map',
      required: true,
      done: false,
    });
    return markActivePrepObjective(steps, ctx);
  }

  const gateAssigned = Boolean(postAssignments?.west_gate?.defenderId);
  steps.push({
    id: 'assign_gate',
    label: 'Assign a hero to the West Gate',
    required: true,
    done: gateAssigned,
  });

  steps.push({
    id: 'sound_horn',
    label: assault
      ? `Sound the horn — ${assault.codename}`
      : 'Sound the horn to begin the assault',
    required: true,
    done: false,
  });

  const towerAssigned = Boolean(postAssignments?.watch_tower?.defenderId);
  if (gateAssigned) {
    steps.push({
      id: 'assign_tower',
      label: 'Post a scout on the Watch Tower (optional)',
      required: false,
      done: towerAssigned,
    });
  }

  return markActivePrepObjective(steps, ctx);
}

function markActivePrepObjective(steps, ctx) {
  const hornBlocked = getHornBlockReason(ctx);
  let activeRequired = false;
  for (const step of steps) {
    if (step.done) {
      step.active = false;
      continue;
    }
    if (step.id === 'sound_horn') {
      step.active = !hornBlocked;
      continue;
    }
    if (step.required && !activeRequired) {
      step.active = true;
      activeRequired = true;
    } else {
      step.active = false;
    }
  }
  if (!activeRequired) {
    const optional = steps.find(s => !s.required && !s.done);
    if (optional) optional.active = true;
  }
  return steps;
}

/** Top-banner copy for the current prep step. */
export function getPrepInstructionHint(ctx) {
  const active = getPrepObjectives(ctx).find(s => s.active && !s.done);
  if (!active) return null;

  const titles = {
    pick_assault: 'COMMAND MAP',
    assign_gate: 'ASSIGN GATE',
    assign_tower: 'WATCH TOWER',
    sound_horn: 'SOUND HORN',
  };

  return {
    title: titles[active.id] ?? 'FORTRESS PREP',
    line: active.label,
    urgent: false,
  };
}

export function hotspotRect(playfield, hotspotId) {
  const L = PREP_HOTSPOT_LAYOUT[hotspotId];
  if (!L) return null;
  const r = resolvePrepHotspotRect(L, playfield, {
    useArtSpace: isFortressPrepArtReady('schematicPlate'),
  });
  return {
    x: r.x,
    y: r.y,
    w: r.w,
    h: r.h,
    cx: r.x + r.w / 2,
    cy: r.y + r.h / 2,
  };
}

export function updatePrepCamera(state, dtMs) {
  // HOTSPOT_LAYOUT only covers the legacy 5-hotspot static schematic (west-front
  // positions). Scroll-world posts (east/north/south gates, corner towers, inner
  // keep, siege posts) aren't in it — selecting one used to be impossible (see
  // the click-routing fix), so this crash on `undefined.fx` was never reachable
  // until that bug was fixed. Fall back to centered/no-zoom for those instead of
  // crashing the render loop.
  const layoutTarget = state.selectedHotspot ? HOTSPOT_LAYOUT[state.selectedHotspot] : null;
  const target = layoutTarget ?? { fx: 0.5, fy: 0.5, fw: 0, fh: 0 };
  const targetScale = layoutTarget ? 1.22 : 1;
  const targetFx = target.fx + (target.fw || 0) / 2;
  const targetFy = target.fy + (target.fh || 0) / 2;
  const t = Math.min(1, dtMs / CAMERA_DURATION_MS);
  state.cameraScale += (targetScale - state.cameraScale) * t;
  state.cameraFocusX += (targetFx - state.cameraFocusX) * t;
  state.cameraFocusY += (targetFy - state.cameraFocusY) * t;
  if (state.hornAnim > 0) state.hornAnim = Math.max(0, state.hornAnim - dtMs);
}

function transformPoint(px, py, playfield, cam) {
  const cx = playfield.x + cam.cameraFocusX * playfield.w;
  const cy = playfield.y + cam.cameraFocusY * playfield.h;
  const ox = playfield.x + playfield.w / 2;
  const oy = playfield.y + playfield.h / 2;
  const s = cam.cameraScale;
  return {
    x: ox + (px - cx) * s + (cx - ox),
    y: oy + (py - cy) * s + (cy - oy),
  };
}

function boxFromRect(r, pf, cam) {
  const tl = transformPoint(r.x, r.y, pf, cam);
  const br = transformPoint(r.x + r.w, r.y + r.h, pf, cam);
  return {
    x: Math.min(tl.x, br.x),
    y: Math.min(tl.y, br.y),
    w: Math.abs(br.x - tl.x),
    h: Math.abs(br.y - tl.y),
  };
}

function drawHotspotLabel(ctx, box, title, subtitle, { urgent = false, muted = false } = {}) {
  const lx = box.x + box.w / 2;
  const ly = box.y + box.h + 11;
  ctx.textAlign = 'center';
  ctx.font = 'bold 8px monospace';
  ctx.fillStyle = muted
    ? 'rgba(110,110,120,0.45)'
    : urgent ? '#f0c858' : 'rgba(210,225,240,0.92)';
  ctx.fillText(title, lx, ly);
  if (subtitle) {
    ctx.font = '6.5px monospace';
    ctx.fillStyle = muted ? 'rgba(90,95,105,0.4)' : 'rgba(165,180,195,0.8)';
    ctx.fillText(subtitle, lx, ly + 10);
  }
}

function drawPrepPulse(ctx, box, now) {
  const pulse = 0.5 + Math.sin(now * 0.005) * 0.5;
  const pad = 4 + pulse * 4;
  ctx.strokeStyle = `rgba(240,200,80,${0.3 + pulse * 0.5})`;
  ctx.lineWidth = 2;
  ctx.strokeRect(box.x - pad, box.y - pad, box.w + pad * 2, box.h + pad * 2);
}

function drawWestApproach(ctx, pf, gateBox, now) {
  const fromX = pf.x + 8;
  const toX = gateBox.x + gateBox.w * 0.15;
  const midY = gateBox.y + gateBox.h * 0.62;
  const dash = 5 + Math.sin(now * 0.003) * 2;
  ctx.save();
  ctx.setLineDash([6, 5]);
  ctx.strokeStyle = 'rgba(200,90,70,0.55)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(fromX, midY);
  ctx.lineTo(toX, midY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(220,100,80,0.75)';
  ctx.beginPath();
  ctx.moveTo(toX, midY);
  ctx.lineTo(toX - 10, midY - 5);
  ctx.lineTo(toX - 10, midY + 5);
  ctx.closePath();
  ctx.fill();
  ctx.font = 'bold 7px monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(220,130,100,0.7)';
  ctx.fillText('THREAT → WEST', fromX, midY - 10);
  ctx.restore();
}

function drawCompassRose(ctx, pf) {
  const x = pf.x + pf.w - 44;
  const y = pf.y + 14;
  ctx.fillStyle = 'rgba(8,12,18,0.72)';
  ctx.strokeStyle = 'rgba(120,140,160,0.45)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, 36, 36, 4);
  ctx.fill();
  ctx.stroke();
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(200,210,220,0.85)';
  ctx.fillText('W', x + 18, y + 14);
  ctx.font = '6px monospace';
  ctx.fillStyle = 'rgba(140,155,170,0.55)';
  ctx.fillText('gate', x + 18, y + 26);
  ctx.fillStyle = 'rgba(200,90,70,0.6)';
  ctx.fillRect(x + 4, y + 18, 8, 2);
}

function drawSchematicHint(ctx, pf, text) {
  const pad = 10;
  ctx.font = '7px monospace';
  const tw = Math.min(pf.w - 24, ctx.measureText(text).width + pad * 2);
  const hx = pf.x + (pf.w - tw) / 2;
  const hy = pf.y + 8;
  ctx.fillStyle = 'rgba(12,18,28,0.82)';
  ctx.strokeStyle = 'rgba(232,208,96,0.45)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(hx, hy, tw, 20, 4);
  ctx.fill();
  ctx.stroke();
  ctx.font = '7px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(232,215,181,0.9)';
  ctx.fillText(text, hx + tw / 2, hy + 13);
}

function drawPrepObjectiveLegend(ctx, pf, panelCtx) {
  const objectives = getPrepObjectives(panelCtx);
  const lines = objectives.filter(o => o.required || !o.done).slice(0, 5);
  const lx = pf.x + 10;
  let ly = pf.y + pf.h - 10 - lines.length * 12;
  ctx.textAlign = 'left';
  ctx.font = 'bold 6px monospace';
  ctx.fillStyle = 'rgba(232,208,96,0.55)';
  ctx.fillText('YOUR ORDERS', lx, ly - 8);
  for (const obj of lines) {
    const mark = obj.done ? '✓' : (obj.active ? '▶' : '○');
    ctx.font = obj.active ? 'bold 6.5px monospace' : '6px monospace';
    ctx.fillStyle = obj.done
      ? 'rgba(120,140,100,0.55)'
      : obj.active
        ? 'rgba(232,208,96,0.9)'
        : 'rgba(140,155,170,0.55)';
    ctx.fillText(`${mark} ${obj.label}`, lx, ly);
    ly += 12;
  }
}

function drawLonghouseGraphic(ctx, box) {
  if (drawFortressPrepSprite(ctx, 'longhouse', box)) return;
  ctx.fillStyle = '#2a1808';
  ctx.fillRect(box.x, box.y + box.h * 0.38, box.w, box.h * 0.62);
  ctx.fillStyle = '#4a3020';
  ctx.beginPath();
  ctx.moveTo(box.x - 1, box.y + box.h * 0.4);
  ctx.lineTo(box.x + box.w / 2, box.y + 2);
  ctx.lineTo(box.x + box.w + 1, box.y + box.h * 0.4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#6a4830';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#1a1008';
  ctx.fillRect(box.x + box.w * 0.36, box.y + box.h * 0.58, box.w * 0.28, box.h * 0.34);
  ctx.strokeStyle = '#4a3020';
  ctx.strokeRect(box.x + 0.5, box.y + box.h * 0.38, box.w - 1, box.h * 0.62 - 0.5);
}

function drawWatchTowerGraphic(ctx, box) {
  if (drawFortressPrepSprite(ctx, 'watchTower', box)) return;
  ctx.fillStyle = '#5a4838';
  ctx.fillRect(box.x, box.y + box.h * 0.08, box.w, box.h * 0.22);
  ctx.fillStyle = '#4a3828';
  ctx.fillRect(box.x + box.w * 0.22, box.y + box.h * 0.22, box.w * 0.56, box.h * 0.72);
  ctx.fillStyle = '#6a5848';
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(box.x + box.w * (0.18 + i * 0.22), box.y - 3, box.w * 0.14, 5);
  }
  ctx.strokeStyle = '#90c0e0';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(box.x + box.w / 2, box.y + box.h * 0.48, Math.max(4, box.w * 0.12), 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#90c0e0';
  ctx.beginPath();
  ctx.arc(box.x + box.w / 2, box.y + box.h * 0.48, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(180,50,50,0.55)';
  const flagX = box.x + box.w * 0.72;
  ctx.fillRect(flagX, box.y - 8, 2, 10);
  ctx.beginPath();
  ctx.moveTo(flagX + 2, box.y - 8);
  ctx.lineTo(flagX + 9, box.y - 5);
  ctx.lineTo(flagX + 2, box.y - 2);
  ctx.fill();
}

function drawWestGateGraphic(ctx, box, prepMeta, selected) {
  const gateKey = getWestGateArtKey(prepMeta);
  if (drawFortressPrepSprite(ctx, gateKey, box)) {
    if (selected) {
      ctx.strokeStyle = 'rgba(232,208,96,0.75)';
      ctx.lineWidth = 2;
      ctx.strokeRect(box.x - 2, box.y - 2, box.w + 4, box.h + 4);
    }
    return;
  }
  const fill = prepMeta.westGateRepaired ? '#4a5038' : '#3a2810';
  const stroke = selected ? '#e8d060' : '#6a5030';
  const postW = box.w * 0.17;
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = selected ? 2 : 1.2;
  ctx.fillRect(box.x, box.y, postW, box.h);
  ctx.strokeRect(box.x + 0.5, box.y + 0.5, postW - 1, box.h - 1);
  ctx.fillRect(box.x + box.w - postW, box.y, postW, box.h);
  ctx.strokeRect(box.x + box.w - postW + 0.5, box.y + 0.5, postW - 1, box.h - 1);
  ctx.fillRect(box.x, box.y, box.w, box.h * 0.14);
  ctx.strokeRect(box.x + 0.5, box.y + 0.5, box.w - 1, box.h * 0.14 - 0.5);
  ctx.fillStyle = 'rgba(18,26,36,0.55)';
  ctx.fillRect(box.x + postW, box.y + box.h * 0.14, box.w - postW * 2, box.h * 0.86);
  ctx.strokeStyle = 'rgba(100,80,50,0.45)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(box.x + box.w / 2, box.y + box.h * 0.62, box.w * 0.2, Math.PI, 0);
  ctx.stroke();
  for (let i = 0; i < 4; i++) {
    const px = box.x + postW * 0.35 + i * (postW * 0.45);
    ctx.strokeStyle = 'rgba(80,60,40,0.35)';
    ctx.beginPath();
    ctx.moveTo(px, box.y + box.h * 0.2);
    ctx.lineTo(px, box.y + box.h);
    ctx.stroke();
  }
}

function drawTreasuryGraphic(ctx, box, locked) {
  const alpha = locked ? 0.35 : 1;
  ctx.save();
  ctx.globalAlpha = alpha;
  if (drawFortressPrepSprite(ctx, 'treasury', box)) {
    if (locked) {
      ctx.fillStyle = 'rgba(8,12,18,0.45)';
      ctx.fillRect(box.x, box.y, box.w, box.h);
    }
    ctx.restore();
    return;
  }
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#3a3010';
  ctx.fillRect(box.x, box.y, box.w, box.h);
  ctx.strokeStyle = locked ? '#5a5030' : '#8a7030';
  ctx.strokeRect(box.x + 0.5, box.y + 0.5, box.w - 1, box.h - 1);
  const cx = box.x + box.w * 0.5;
  const cy = box.y + box.h * 0.55;
  const cw = box.w * 0.55;
  const ch = box.h * 0.42;
  ctx.fillStyle = '#6a5020';
  ctx.fillRect(cx - cw / 2, cy - ch / 2, cw, ch);
  ctx.strokeStyle = locked ? '#6a5830' : '#c8a040';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(cx - cw / 2, cy - ch / 2, cw, ch);
  ctx.fillStyle = locked ? '#4a4020' : '#a08030';
  ctx.fillRect(cx - cw / 2, cy - ch / 2 - 4, cw, 6);
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = locked ? 'rgba(120,110,80,0.5)' : '#e8c860';
  ctx.fillText('◆', cx, cy + 4);
  ctx.restore();
}

function drawHeroMedallion(ctx, box, def) {
  const mx = box.x + box.w / 2;
  const my = box.y - 8;
  if (def && drawHeroMedallionArt(ctx, mx, my, def.type, 22)) return;
  ctx.beginPath();
  ctx.arc(mx, my, 11, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(74,111,165,0.9)';
  ctx.fill();
  ctx.strokeStyle = '#e8d7b5';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.font = 'bold 7px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f0e8d0';
  const label = (def?.name || def?.type || '?').slice(0, 2).toUpperCase();
  ctx.fillText(label, mx, my + 3);
}

function hitTestHotspots(mouseX, mouseY, playfield, state) {
  const ids = Object.keys(PREP_HOTSPOT_LAYOUT);
  for (let i = ids.length - 1; i >= 0; i--) {
    const id = ids[i];
    const r = hotspotRect(playfield, id);
    if (!r) continue;
    const tl = transformPoint(r.x, r.y, playfield, state);
    const br = transformPoint(r.x + r.w, r.y + r.h, playfield, state);
    const minX = Math.min(tl.x, br.x);
    const maxX = Math.max(tl.x, br.x);
    const minY = Math.min(tl.y, br.y);
    const maxY = Math.max(tl.y, br.y);
    if (mouseX >= minX && mouseX <= maxX && mouseY >= minY && mouseY <= maxY) {
      return id;
    }
  }
  return null;
}

export function getHornBlockReason(ctx) {
  const {
    pendingAssaultNode,
    postAssignments,
  } = ctx;
  if (pendingAssaultNode == null) {
    return 'Pick an assault on the command map';
  }
  const validation = validateAssignments(postAssignments, { minHeroes: 1 });
  if (!validation.ok) {
    return validation.errors[0] ?? 'Assign a hero to the West Gate';
  }
  return null;
}

function advisorLines(hotspot, ctx) {
  if (isSiegePostId(hotspot)) {
    return getSiegeAdvisorContent(hotspot, ctx);
  }

  const { prepMeta, goldReserve, roster } = ctx;
  if ((hotspot === 'west_gate' || hotspot === PREP_HOTSPOTS.WALL_SCAR) && needsGateRepair(prepMeta)) {
    const afford = canAffordGateRepair(prepMeta, goldReserve);
    return {
      advisor: 'builder',
      title: hotspot === PREP_HOTSPOTS.WALL_SCAR ? 'West Wall' : 'West Gate',
      lines: afford
        ? [
            'The gate splintered in the last fight.',
            'Mend it before the horn — timber or gold.',
          ]
        : [
            'The gate still bears the last assault.',
            getGateRepairBlockReason(prepMeta, goldReserve) ?? 'Gather resources in War Camp.',
          ],
    };
  }

  if (isHeroPostId(hotspot)) {
    return getHeroAdvisorContent(hotspot, ctx);
  }

  switch (hotspot) {
    case PREP_HOTSPOTS.WALL_SCAR:
      return {
        advisor: 'builder',
        title: 'West Wall',
        lines: ['The wall stands.', 'Stone and timber hold the line.'],
      };
    case PREP_HOTSPOTS.LONGHOUSE:
      return {
        advisor: 'skald',
        title: 'Longhouse',
        lines: [
          `${roster?.defenders?.length ?? 0} names by the fire.`,
          'Stories outlive stone.',
        ],
      };
    case PREP_HOTSPOTS.TREASURY:
      return {
        advisor: 'quartermaster',
        title: 'Tiny Treasury',
        lines: goldReserve > 0
          ? [`${goldReserve} gold in the chest stays between fights.`, 'Battle coin spends fast.']
          : ['Coin for the assault stays in your pouch.', 'The chest fills after victory.'],
      };
    default:
      return {
        advisor: 'captain',
        title: 'Fortress Overview',
        lines: [
          'Click a building on the schematic.',
          'Complete your orders, then sound the horn.',
        ],
      };
  }
}

function panelActions(hotspot, ctx) {
  const { prepMeta, goldReserve } = ctx;
  if ((hotspot === 'west_gate' || hotspot === PREP_HOTSPOTS.WALL_SCAR)
      && needsGateRepair(prepMeta) && canAffordGateRepair(prepMeta, goldReserve)) {
    const wood = prepMeta?.wood ?? 0;
    const useWood = wood >= 8;
    return [{
      id: 'repair_gate',
      label: useWood ? 'Mend gate (8 wood)' : 'Mend gate (25g)',
      payWood: useWood,
    }];
  }
  if (isSiegePostId(hotspot)) {
    return getSiegePanelActions(hotspot, ctx).slice(0, 2);
  }
  if (isHeroPostId(hotspot)) {
    return getHeroPanelActions(hotspot, ctx).slice(0, 2);
  }
  return [];
}

export function getPrepAdvisorContent(hotspot, ctx) {
  return advisorLines(hotspot, ctx);
}

export function getPrepPanelActions(hotspot, ctx) {
  return panelActions(hotspot, ctx);
}

export function drawFortressSchematic(ctx, playfield, state, drawCtx) {
  const {
    prepMeta, postAssignments, roster, treasuryUnlocked = true, assault,
  } = drawCtx;
  const pf = playfield;
  const cam = state;
  const now = performance.now();

  ctx.save();
  ctx.beginPath();
  ctx.rect(pf.x, pf.y, pf.w, pf.h);
  ctx.clip();

  const hasPlate = drawFortressPrepBackground(ctx, pf);
  if (!hasPlate) {
    const bgGrad = ctx.createLinearGradient(pf.x, pf.y, pf.x, pf.y + pf.h);
    bgGrad.addColorStop(0, '#1a2838');
    bgGrad.addColorStop(1, '#0e1418');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(pf.x, pf.y, pf.w, pf.h);
  }

  if (!hasPlate) {
    const cx = pf.x + pf.w * 0.5;
    const cy = pf.y + pf.h * 0.48;
    const ringRx = pf.w * 0.34;
    const ringRy = pf.h * 0.28;
    ctx.strokeStyle = 'rgba(80,100,120,0.22)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(cx, cy, ringRx, ringRy, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.font = '6px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(100,120,140,0.35)';
    ctx.fillText('FORTRESS RING', cx, cy + 4);

    ctx.fillStyle = 'rgba(40,55,40,0.35)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + pf.h * 0.06, ringRx * 0.92, ringRy * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const gateBox = boxFromRect(hotspotRect(pf, PREP_HOTSPOTS.WEST_GATE), pf, cam);

  const lhBox = boxFromRect(hotspotRect(pf, PREP_HOTSPOTS.LONGHOUSE), pf, cam);
  if (!hasPlate) drawLonghouseGraphic(ctx, lhBox);
  if (!hasPlate) {
    ctx.fillStyle = 'rgba(255,160,60,0.3)';
    ctx.beginPath();
    ctx.arc(lhBox.x + lhBox.w * 0.5, lhBox.y - 4, 6 + Math.sin(now * 0.003) * 2, 0, Math.PI * 2);
    ctx.fill();
  }

  const trBox = boxFromRect(hotspotRect(pf, PREP_HOTSPOTS.TREASURY), pf, cam);
  if (!hasPlate) drawTreasuryGraphic(ctx, trBox, !treasuryUnlocked);

  const towerBox = boxFromRect(hotspotRect(pf, PREP_HOTSPOTS.WATCH_TOWER), pf, cam);
  if (!hasPlate) drawWatchTowerGraphic(ctx, towerBox);

  if (!hasPlate) {
    drawWestGateGraphic(ctx, gateBox, prepMeta, state.selectedHotspot === PREP_HOTSPOTS.WEST_GATE);
  }

  const gateHero = postAssignments?.west_gate?.defenderId;
  const towerHero = postAssignments?.watch_tower?.defenderId;
  if (gateHero) {
    drawHeroMedallion(ctx, gateBox, roster?.find?.(gateHero));
  }
  if (towerHero) {
    drawHeroMedallion(ctx, towerBox, roster?.find?.(towerHero));
  }

  const gateDef = gateHero ? roster?.find?.(gateHero) : null;
  const towerDef = towerHero ? roster?.find?.(towerHero) : null;
  const gateNeedsHero = !gateHero;
  if (gateNeedsHero) drawPrepPulse(ctx, gateBox, now);

  if (!hasPlate) drawWestApproach(ctx, pf, gateBox, now);
  if (!hasPlate) drawCompassRose(ctx, pf);

  drawHotspotLabel(
    ctx, gateBox, 'WEST GATE',
    gateNeedsHero
      ? 'Palisade gate — assign hero'
      : (gateDef?.name || gateDef?.type || 'Posted'),
    { urgent: gateNeedsHero },
  );
  drawHotspotLabel(
    ctx, towerBox, 'WATCH TOWER',
    towerHero ? (towerDef?.name || 'Scout posted') : 'Optional scout post',
  );
  drawHotspotLabel(
    ctx, lhBox, 'LONGHOUSE',
    `${roster?.defenders?.length ?? 0} defender${(roster?.defenders?.length ?? 0) === 1 ? '' : 's'}`,
  );
  drawHotspotLabel(
    ctx, trBox, 'TREASURY',
    treasuryUnlocked ? 'Gold reserve chest' : 'Unlocks after A0',
    { muted: !treasuryUnlocked },
  );

  for (const id of Object.keys(PREP_HOTSPOT_LAYOUT)) {
    const r = hotspotRect(pf, id);
    const box = boxFromRect(r, pf, cam);
    if (state.selectedHotspot === id) {
      ctx.strokeStyle = 'rgba(232,208,96,0.75)';
      ctx.lineWidth = 2;
      ctx.strokeRect(box.x - 2, box.y - 2, box.w + 4, box.h + 4);
    }
  }

  if (gateNeedsHero && state.selectedHotspot !== PREP_HOTSPOTS.WEST_GATE) {
    drawSchematicHint(ctx, pf, 'Click WEST GATE — assign your fighter before the horn');
  } else if (!state.selectedHotspot && assault) {
    drawSchematicHint(ctx, pf, `${assault.codename} — click a building, then sound the horn`);
  }

  drawPrepObjectiveLegend(ctx, pf, drawCtx);

  ctx.restore();
}

function drawAdvisorPortrait(ctx, x, y, advisorKey) {
  if (drawAdvisorPortraitArt(ctx, x, y, 40)) return;
  const a = ADVISORS[advisorKey] ?? ADVISORS.captain;
  ctx.fillStyle = 'rgba(8,12,20,0.95)';
  ctx.beginPath();
  ctx.arc(x + 20, y + 20, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = a.color;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.font = 'bold 8px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = a.color;
  ctx.fillText(a.name.slice(0, 1), x + 20, y + 24);
}

function drawPrepShellPanel(ctx, x, y, w, h) {
  const radius = 8;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.85)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 4;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fillStyle = 'rgba(10,6,20,0.94)';
  ctx.fill();
  ctx.restore();

  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.strokeStyle = 'rgba(180,110,30,0.7)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.roundRect(x + 2, y + 2, w - 4, h - 4, Math.max(radius - 2, 2));
  ctx.strokeStyle = 'rgba(255,200,80,0.2)';
  ctx.lineWidth = 0.5;
  ctx.stroke();
}

export function drawCommanderContextPanel(ctx, px, py, pw, ph, state, panelCtx) {
  state.panelBtns = [];
  state.hornBtn = null;

  const shellInset = 4;
  const ix = px + shellInset;
  const iy = py + shellInset;
  const iw = pw - shellInset * 2;
  const ih = ph - shellInset * 2;
  drawPrepShellPanel(ctx, ix, iy, iw, ih);

  const pad = 10;
  const contentX = ix + pad;
  const btnW = iw - pad * 2;
  let ly = iy + pad + 8;
  const content = advisorLines(state.selectedHotspot, panelCtx);
  const actions = panelActions(state.selectedHotspot, panelCtx);
  const siegeActions = getPrepSiegeSidebarActions(panelCtx).filter(a => !a.disabled);

  const bottomPad = 10;
  const hornH = 38;
  const navH = 22;
  const stackGap = 8;
  const hornY = iy + ih - bottomPad - hornH;
  const navY = hornY - stackGap - navH;
  const maxActionBottom = navY - 8;

  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = UI_COLORS.gold;
  ctx.fillText(content.title.toUpperCase(), contentX, ly);
  ly += 14;

  const activeStep = getPrepObjectives(panelCtx).find(o => o.active && !o.done);
  if (activeStep) {
    ctx.font = '6.5px monospace';
    ctx.fillStyle = activeStep.id === 'sound_horn'
      ? 'rgba(232,208,96,0.8)'
      : 'rgba(160,190,210,0.75)';
    ctx.fillText(`Next: ${activeStep.label}`, contentX, ly);
    ly += 12;
  }

  drawAdvisorPortrait(ctx, contentX, ly, content.advisor);
  ly += 48;

  ctx.font = '7.5px monospace';
  ctx.fillStyle = 'rgba(232,215,181,0.85)';
  for (const line of content.lines.slice(0, 2)) {
    ctx.fillText(line, contentX, ly);
    ly += 12;
  }
  ly += 8;

  const btnH = 28;
  for (const act of actions) {
    if (ly + btnH > maxActionBottom) break;
    ctx.fillStyle = 'rgba(20,32,48,0.95)';
    ctx.strokeStyle = 'rgba(120,160,200,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(contentX, ly, btnW, btnH, 4);
    ctx.fill();
    ctx.stroke();
    ctx.font = 'bold 8px monospace';
    ctx.fillStyle = '#c8dce8';
    const _labelX = act.id === 'repair_gate' && act.payWood
      && drawResourceIconArt(ctx, 'wood', contentX + 14, ly + 14, 14)
      ? contentX + 26 : contentX + 8;
    ctx.fillText(act.label, _labelX, ly + 18);
    state.panelBtns.push({ ...act, x: contentX, y: ly, w: btnW, h: btnH });
    ly += btnH + 6;
  }

  if (siegeActions.length > 0 && ly + 14 < maxActionBottom) {
    ctx.font = 'bold 7px monospace';
    ctx.fillStyle = 'rgba(200,160,80,0.75)';
    ctx.fillText('SIEGE (optional)', contentX, ly + 8);
    ly += 14;
    for (const act of siegeActions) {
      if (ly + btnH > maxActionBottom) break;
      const highlight = act.siegeHighlight || act.id === 'assign_siege';
      ctx.fillStyle = highlight ? 'rgba(36,28,12,0.95)' : 'rgba(20,32,48,0.95)';
      ctx.strokeStyle = highlight ? 'rgba(220,170,80,0.65)' : 'rgba(120,160,200,0.5)';
      ctx.lineWidth = highlight ? 1.5 : 1;
      ctx.beginPath();
      ctx.roundRect(contentX, ly, btnW, btnH, 4);
      ctx.fill();
      ctx.stroke();
      ctx.font = 'bold 8px monospace';
      ctx.fillStyle = highlight ? '#f0d080' : '#c8dce8';
      ctx.fillText(act.label, contentX + 8, ly + 18);
      if (!act.disabled) {
        state.panelBtns.push({ ...act, x: contentX, y: ly, w: btnW, h: btnH });
      }
      ly += btnH + 6;
    }
  }

  const hornBlock = getHornBlockReason(panelCtx);
  const hornW = btnW;
  const hornEnabled = !hornBlock && state.hornAnim <= 0;
  const hornPulse = hornEnabled ? 0.75 + Math.sin(performance.now() * 0.004) * 0.25 : 0.35;

  state.hornHoverZone = { x: contentX, y: hornY, w: hornW, h: hornH };

  ctx.fillStyle = hornEnabled
    ? `rgba(80,60,12,${0.85 + hornPulse * 0.1})`
    : 'rgba(40,24,16,0.85)';
  ctx.strokeStyle = hornEnabled ? UI_COLORS.gold : 'rgba(120,80,60,0.5)';
  ctx.lineWidth = hornEnabled ? 2 : 1;
  ctx.beginPath();
  ctx.roundRect(contentX, hornY, hornW, hornH, 6);
  ctx.fill();
  ctx.stroke();

  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = hornEnabled ? '#f0e060' : 'rgba(160,120,90,0.55)';
  ctx.fillText(state.hornAnim > 0 ? '…' : '▶ SOUND HORN', contentX + hornW / 2, hornY + 23);
  if (drawFortressPrepSprite(ctx, 'horn', { x: contentX + hornW - 40, y: hornY + 3, w: 34, h: 30 })) {
    // horn art on button
  }

  if (hornEnabled) {
    state.hornBtn = { x: contentX, y: hornY, w: hornW, h: hornH, action: 'horn' };
  } else if (state.hornHover && hornBlock) {
    ctx.font = '6px monospace';
    ctx.fillStyle = 'rgba(232,180,120,0.75)';
    ctx.fillText(hornBlock, contentX + hornW / 2, hornY - 4);
  }

  const halfW = (btnW - 4) / 2;
  ctx.fillStyle = 'rgba(12,8,4,0.85)';
  ctx.strokeStyle = 'rgba(120,90,50,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(contentX, navY, halfW, navH, 3);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(contentX + halfW + 4, navY, halfW, navH, 3);
  ctx.fill();
  ctx.stroke();
  ctx.font = '6.5px monospace';
  ctx.fillStyle = '#a08050';
  ctx.fillText('SETTLEMENT', contentX + halfW / 2, navY + 14);
  ctx.fillText('MAP', contentX + halfW + 4 + halfW / 2, navY + 14);
  state.panelBtns.push(
    { action: 'settlementHub', x: contentX, y: navY, w: halfW, h: navH },
    { action: 'commandMap', x: contentX + halfW + 4, y: navY, w: halfW, h: navH },
  );

  ctx.textAlign = 'left';
}

/**
 * @param schematicMode - true only on the legacy static schematic (MAP) overlay.
 *   hitTestHotspots below targets that overlay's fixed 5-hotspot layout
 *   (PREP_HOTSPOT_LAYOUT, west-front-only positions) — its "anywhere in the
 *   playfield that isn't one of those 5 -> deselect" fallback must not run in
 *   the default scroll-world view, or it swallows every click meant for
 *   hitTestPrepWorldPost's real 9-post hit test (east/north/south gates,
 *   corner towers, inner keep) before that ever gets a chance to run.
 */
export function handlePrepShellPointer(state, mouseX, mouseY, playfield, panelRect, eventType, schematicMode = false) {
  if (eventType === 'move') {
    const hz = state.hornHoverZone;
    state.hornHover = hz
      && mouseX >= hz.x && mouseX <= hz.x + hz.w
      && mouseY >= hz.y && mouseY <= hz.y + hz.h;
    return null;
  }

  if (eventType !== 'click') return null;

  for (const btn of state.panelBtns) {
    if (mouseX >= btn.x && mouseX <= btn.x + btn.w && mouseY >= btn.y && mouseY <= btn.y + btn.h) {
      return { type: 'panel', ...btn };
    }
  }

  if (state.hornBtn
    && mouseX >= state.hornBtn.x && mouseX <= state.hornBtn.x + state.hornBtn.w
    && mouseY >= state.hornBtn.y && mouseY <= state.hornBtn.y + state.hornBtn.h) {
    return { type: 'horn' };
  }

  if (!schematicMode) return null;

  const hit = hitTestHotspots(mouseX, mouseY, playfield, state);
  if (hit) {
    state.selectedHotspot = hit;
    return { type: 'hotspot', hotspot: hit };
  }

  if (mouseX >= playfield.x && mouseX <= playfield.x + playfield.w
    && mouseY >= playfield.y && mouseY <= playfield.y + playfield.h) {
    state.selectedHotspot = null;
    return { type: 'deselect' };
  }

  return null;
}

export function startHornAnimation(state) {
  state.hornAnim = HORN_ANIM_MS;
}
