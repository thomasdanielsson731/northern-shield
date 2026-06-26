/**
 * Fortress Commander Prep shell — Level 1 (First Saga).
 * Clickable schematic, camera zoom, advisor context panel, horn gate.
 * @see design/FORTRESS_AS_UI.md
 */

import { UI_COLORS } from '../ui/uiTheme.js';
import { validateAssignments } from '../fortress/defensivePosts.js';
import {
  getDefenderPromotionTitle,
  getSkaldPostCounsel,
  getPreferredPostLabel,
} from '../roster/postTitles.js';

export const PREP_HOTSPOTS = {
  WEST_GATE: 'west_gate',
  WATCH_TOWER: 'watch_tower',
  WALL_SCAR: 'wall_scar',
  LONGHOUSE: 'longhouse',
  TREASURY: 'treasury',
};

import {
  FIRST_SAGA_A2_NODE,
  FIRST_SAGA_A3_NODE,
} from '../campaign/firstSaga.js';

export const GATE_REPAIR_WOOD_COST = 10;
export const A2_DEBRIEF_WOOD_BUNDLE = 15;
export { FIRST_SAGA_A2_NODE, FIRST_SAGA_A3_NODE };
export const CAMERA_DURATION_MS = 400;
export const HORN_ANIM_MS = 500;

const ADVISORS = {
  captain: { name: 'Captain', color: '#a8c8e8' },
  scout: { name: 'Scout', color: '#90b890' },
  builder: { name: 'Builder', color: '#c8a878' },
  quartermaster: { name: 'Quartermaster', color: '#d4af37' },
  skald: { name: 'Skald', color: '#e8c8a0' },
};

/** Schematic layout — fractions of playfield [x, y, w, h]. */
const HOTSPOT_LAYOUT = {
  [PREP_HOTSPOTS.WATCH_TOWER]: { fx: 0.48, fy: 0.22, fw: 0.14, fh: 0.16 },
  [PREP_HOTSPOTS.WEST_GATE]:   { fx: 0.38, fy: 0.38, fw: 0.22, fh: 0.20 },
  [PREP_HOTSPOTS.WALL_SCAR]:   { fx: 0.34, fy: 0.36, fw: 0.30, fh: 0.08 },
  [PREP_HOTSPOTS.LONGHOUSE]:   { fx: 0.18, fy: 0.62, fw: 0.22, fh: 0.18 },
  [PREP_HOTSPOTS.TREASURY]:    { fx: 0.52, fy: 0.64, fw: 0.12, fh: 0.12 },
};

export function createPrepShellState() {
  return {
    selectedHotspot: null,
    cameraScale: 1,
    cameraFocusX: 0.5,
    cameraFocusY: 0.5,
    repairAnim: 0,
    hornAnim: 0,
    panelBtns: [],
    schematicBtns: [],
    hornBtn: null,
    hornHover: false,
    minorSeen: new Set(),
  };
}

export function defaultPrepFieldMeta() {
  return { wood: 0, westGateScarred: false, westGateRepaired: false };
}

export function loadPrepFieldMeta(fieldState) {
  const m = defaultPrepFieldMeta();
  if (!fieldState) return m;
  m.wood = fieldState.wood ?? 0;
  m.westGateScarred = !!fieldState.westGateScarred;
  m.westGateRepaired = !!fieldState.westGateRepaired;
  return m;
}

export function mergePrepFieldMeta(fieldState, meta) {
  return {
    ...fieldState,
    wood: meta.wood,
    westGateScarred: meta.westGateScarred,
    westGateRepaired: meta.westGateRepaired,
  };
}

/** Apply First Saga rewards when an assault node is cleared (A2 → scar + timber). */
export function applyFirstSagaAssaultRewards(fieldState, clearedNodeIndex) {
  if (clearedNodeIndex !== FIRST_SAGA_A2_NODE) return fieldState;
  const meta = loadPrepFieldMeta(fieldState);
  meta.westGateScarred = true;
  meta.wood = Math.max(meta.wood, A2_DEBRIEF_WOOD_BUNDLE);
  return mergePrepFieldMeta(fieldState, meta);
}

/** Bootstrap prep meta for saves that predate explicit A2 debrief wiring. */
export function syncPrepMetaForAssault(meta, assaultNodeIndex, battlesCompleted = 0) {
  const next = { ...meta };
  if (
    assaultNodeIndex != null
    && assaultNodeIndex >= FIRST_SAGA_A3_NODE
    && battlesCompleted >= 3
    && !next.westGateRepaired
    && !next.westGateScarred
  ) {
    next.westGateScarred = true;
  }
  if (
    assaultNodeIndex != null
    && assaultNodeIndex >= FIRST_SAGA_A3_NODE
    && next.westGateScarred
    && next.wood === 0
  ) {
    next.wood = A2_DEBRIEF_WOOD_BUNDLE;
  }
  return next;
}

export function getPrepAutoHotspot(prepMeta, { mapIndex, nodeIndex, isFirstSaga } = {}) {
  if (
    isFirstSaga
    && nodeIndex === FIRST_SAGA_A3_NODE
    && prepMeta?.westGateScarred
    && !prepMeta?.westGateRepaired
  ) {
    return PREP_HOTSPOTS.WALL_SCAR;
  }
  return null;
}

export function getPrepRepairTeachHint(prepMeta) {
  if (!prepMeta?.westGateScarred || prepMeta.westGateRepaired) return null;
  if ((prepMeta.wood ?? 0) >= GATE_REPAIR_WOOD_COST) {
    return `Click WEST WALL — Repair (${GATE_REPAIR_WOOD_COST} wood) before the horn`;
  }
  return 'Splintered palisade — gather timber from assault rewards';
}

export function hotspotRect(playfield, hotspotId) {
  const L = HOTSPOT_LAYOUT[hotspotId];
  if (!L) return null;
  return {
    x: playfield.x + L.fx * playfield.w,
    y: playfield.y + L.fy * playfield.h,
    w: L.fw * playfield.w,
    h: L.fh * playfield.h,
    cx: playfield.x + (L.fx + L.fw / 2) * playfield.w,
    cy: playfield.y + (L.fy + L.fh / 2) * playfield.h,
  };
}

export function updatePrepCamera(state, dtMs) {
  const target = state.selectedHotspot
    ? HOTSPOT_LAYOUT[state.selectedHotspot]
    : { fx: 0.5, fy: 0.5, fw: 0, fh: 0 };
  const targetScale = state.selectedHotspot ? 1.22 : 1;
  const targetFx = target.fx + (target.fw || 0) / 2;
  const targetFy = target.fy + (target.fh || 0) / 2;
  const t = Math.min(1, dtMs / CAMERA_DURATION_MS);
  state.cameraScale += (targetScale - state.cameraScale) * t;
  state.cameraFocusX += (targetFx - state.cameraFocusX) * t;
  state.cameraFocusY += (targetFy - state.cameraFocusY) * t;
  if (state.repairAnim > 0) state.repairAnim = Math.max(0, state.repairAnim - dtMs);
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
  const fromX = pf.x + 12;
  const toX = gateBox.x - 6;
  const midY = gateBox.y + gateBox.h * 0.55;
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

function drawSchematicLegend(ctx, pf) {
  const lines = [
    { color: 'rgba(232,208,96,0.75)', text: 'Click a building' },
    { color: 'rgba(74,111,165,0.9)', text: '● Hero posted' },
    { color: 'rgba(200,90,70,0.75)', text: '← Enemy approach' },
  ];
  const lx = pf.x + 10;
  let ly = pf.y + pf.h - 10 - lines.length * 11;
  ctx.textAlign = 'left';
  for (const line of lines) {
    ctx.fillStyle = line.color;
    ctx.font = '6px monospace';
    ctx.fillText(line.text, lx, ly);
    ly += 11;
  }
}

function drawLonghouseGraphic(ctx, box) {
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
  ctx.globalAlpha = 1;
}

function drawHeroMedallion(ctx, box, def) {
  const mx = box.x + box.w / 2;
  const my = box.y - 8;
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
  const ids = Object.keys(HOTSPOT_LAYOUT);
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
    prepMeta,
    assaultNodeIndex,
  } = ctx;
  if (pendingAssaultNode == null) {
    return 'Pick an assault on the command map';
  }
  const validation = validateAssignments(postAssignments, { minHeroes: 1 });
  if (!validation.ok) {
    return validation.errors[0] ?? 'Assign a hero to the West Gate';
  }
  if (prepMeta.westGateScarred && !prepMeta.westGateRepaired && assaultNodeIndex != null && assaultNodeIndex >= 3) {
    return 'Repair the west gate before the horn';
  }
  return null;
}

function advisorLines(hotspot, ctx) {
  const { prepMeta, assault, postAssignments, roster, goldReserve } = ctx;
  const gateHero = postAssignments?.west_gate?.defenderId;
  const towerHero = postAssignments?.watch_tower?.defenderId;
  const def = gateHero ? roster?.find?.(gateHero) : null;
  const towerDef = towerHero ? roster?.find?.(towerHero) : null;
  const heroName = def?.name || def?.type || 'your fighter';

  switch (hotspot) {
    case PREP_HOTSPOTS.WEST_GATE: {
      const gateTitle = gateHero ? getDefenderPromotionTitle(gateHero, postAssignments) : null;
      const skald = def ? getSkaldPostCounsel(def, 'west_gate') : null;
      return {
        advisor: gateHero ? 'skald' : 'captain',
        title: 'West Gate',
        lines: gateHero
          ? [
              gateTitle ? `${heroName} — ${gateTitle}.` : `${heroName} holds the threshold.`,
              skald
                ? skald.replace(/^The skald[^:]+:\s*"?/, '').replace(/"?\.$/, '.')
                : 'The plan starts here.',
            ]
          : [
              'The west road stirs.',
              `Favor a gatekeeper — the ${getPreferredPostLabel('berserk')} first.`,
            ],
      };
    }
    case PREP_HOTSPOTS.WATCH_TOWER: {
      const towerTitle = towerHero ? getDefenderPromotionTitle(towerHero, postAssignments) : null;
      const tSkald = towerDef ? getSkaldPostCounsel(towerDef, 'watch_tower') : null;
      return {
        advisor: towerHero ? 'skald' : 'scout',
        title: 'Watch Tower',
        lines: towerHero
          ? [
              towerTitle ? `${towerDef?.name ?? 'Scout'} — ${towerTitle}.` : 'Eyes on the treeline.',
              tSkald
                ? tSkald.replace(/^The skald[^:]+:\s*"?/, '').replace(/"?\.$/, '.')
                : 'They come from the west.',
            ]
          : assault
            ? [`${assault.codename} — ${assault.tierLabel ?? 'assault'}.`, 'They come from the west.']
            : ['High ground. Clear eyes.', `The skald favors the ${getPreferredPostLabel('valkyrie')}.`],
      };
    }
    case PREP_HOTSPOTS.WALL_SCAR:
      return {
        advisor: 'builder',
        title: 'West Wall',
        lines: prepMeta.westGateScarred && !prepMeta.westGateRepaired
          ? ['The palisade splintered.', `Timber will hold — ${GATE_REPAIR_WOOD_COST} wood.`]
          : ['The wall stands.', prepMeta.westGateRepaired ? 'Patch and prayer.' : 'No breach yet.'],
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
          'West Gate — assign your fighter (required).',
          'Watch Tower — optional scout. Then sound the horn.',
        ],
      };
  }
}

function panelActions(hotspot, ctx) {
  const { prepMeta, postAssignments, roster, nodeCasualties } = ctx;
  const actions = [];
  const available = (roster?.defenders ?? []).filter(
    d => !nodeCasualties?.has?.(d.defenderId),
  );

  if (hotspot === PREP_HOTSPOTS.WEST_GATE) {
    const assigned = postAssignments?.west_gate?.defenderId;
    if (!assigned && available.length > 0) {
      const d = available[0];
      actions.push({
        id: 'assign_gate',
        label: `Assign ${d.name || d.type}`,
        defenderId: d.defenderId,
        postId: 'west_gate',
      });
    } else if (assigned) {
      actions.push({ id: 'clear_gate', label: 'Clear gate', postId: 'west_gate' });
    }
  }

  if (hotspot === PREP_HOTSPOTS.WATCH_TOWER) {
    const assigned = postAssignments?.watch_tower?.defenderId;
    if (!assigned && available.length > 0) {
      const d = available.find(x => x.defenderId !== postAssignments?.west_gate?.defenderId) ?? available[0];
      actions.push({
        id: 'assign_tower',
        label: `Assign ${d.name || d.type}`,
        defenderId: d.defenderId,
        postId: 'watch_tower',
      });
    } else if (assigned) {
      actions.push({ id: 'clear_tower', label: 'Clear tower', postId: 'watch_tower' });
    }
  }

  if (hotspot === PREP_HOTSPOTS.WALL_SCAR || hotspot === PREP_HOTSPOTS.WEST_GATE) {
    if (prepMeta.westGateScarred && !prepMeta.westGateRepaired && prepMeta.wood >= GATE_REPAIR_WOOD_COST) {
      actions.push({ id: 'repair_gate', label: `Repair (${GATE_REPAIR_WOOD_COST} wood)` });
    }
  }

  return actions.slice(0, 2);
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

  const bgGrad = ctx.createLinearGradient(pf.x, pf.y, pf.x, pf.y + pf.h);
  bgGrad.addColorStop(0, '#1a2838');
  bgGrad.addColorStop(1, '#0e1418');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(pf.x, pf.y, pf.w, pf.h);

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

  const wallR = hotspotRect(pf, PREP_HOTSPOTS.WALL_SCAR);
  const wallBox = boxFromRect(wallR, pf, cam);
  ctx.fillStyle = '#3a2818';
  ctx.fillRect(wallBox.x, wallBox.y, wallBox.w, wallBox.h);
  ctx.strokeStyle = '#5a4030';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(wallBox.x + 0.5, wallBox.y + 0.5, wallBox.w - 1, wallBox.h - 1);

  const lhBox = boxFromRect(hotspotRect(pf, PREP_HOTSPOTS.LONGHOUSE), pf, cam);
  drawLonghouseGraphic(ctx, lhBox);
  ctx.fillStyle = 'rgba(255,160,60,0.3)';
  ctx.beginPath();
  ctx.arc(lhBox.x + lhBox.w * 0.5, lhBox.y - 4, 6 + Math.sin(now * 0.003) * 2, 0, Math.PI * 2);
  ctx.fill();

  const trBox = boxFromRect(hotspotRect(pf, PREP_HOTSPOTS.TREASURY), pf, cam);
  drawTreasuryGraphic(ctx, trBox, !treasuryUnlocked);

  const towerBox = boxFromRect(hotspotRect(pf, PREP_HOTSPOTS.WATCH_TOWER), pf, cam);
  drawWatchTowerGraphic(ctx, towerBox);

  const gateBox = boxFromRect(hotspotRect(pf, PREP_HOTSPOTS.WEST_GATE), pf, cam);
  drawWestGateGraphic(ctx, gateBox, prepMeta, state.selectedHotspot === PREP_HOTSPOTS.WEST_GATE);

  if (prepMeta.westGateScarred && !prepMeta.westGateRepaired) {
    ctx.strokeStyle = 'rgba(180,60,40,0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(gateBox.x + gateBox.w * 0.2, gateBox.y + gateBox.h * 0.3);
    ctx.lineTo(gateBox.x + gateBox.w * 0.55, gateBox.y + gateBox.h * 0.7);
    ctx.lineTo(gateBox.x + gateBox.w * 0.75, gateBox.y + gateBox.h * 0.35);
    ctx.stroke();
    drawHotspotLabel(ctx, wallBox, 'WEST WALL', 'Splintered — repair', { urgent: true });
  }

  if (state.repairAnim > 0) {
    const a = state.repairAnim / 600;
    ctx.fillStyle = `rgba(200,180,120,${0.35 * a})`;
    ctx.fillRect(gateBox.x, gateBox.y, gateBox.w, gateBox.h);
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

  drawWestApproach(ctx, pf, gateBox, now);
  drawCompassRose(ctx, pf);

  drawHotspotLabel(
    ctx, gateBox, 'WEST GATE',
    gateNeedsHero ? 'Click — assign hero' : (gateDef?.name || gateDef?.type || 'Posted'),
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
    ctx, trBox, 'TINY TREASURY',
    treasuryUnlocked ? 'Gold reserve chest' : 'Unlocks after A0',
    { muted: !treasuryUnlocked },
  );
  if (!prepMeta.westGateScarred || prepMeta.westGateRepaired) {
    drawHotspotLabel(ctx, wallBox, 'PALISADE', prepMeta.westGateRepaired ? 'Mended' : 'West face');
  }

  for (const id of Object.keys(HOTSPOT_LAYOUT)) {
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
  } else {
    const repairHint = getPrepRepairTeachHint(prepMeta);
    if (repairHint) {
      drawSchematicHint(ctx, pf, repairHint);
    } else if (!state.selectedHotspot && assault) {
      drawSchematicHint(ctx, pf, `${assault.codename} — click a building, then sound the horn`);
    }
  }

  drawSchematicLegend(ctx, pf);

  ctx.restore();
}

function drawAdvisorPortrait(ctx, x, y, advisorKey) {
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

export function drawCommanderContextPanel(ctx, px, py, pw, ph, state, panelCtx) {
  state.panelBtns = [];
  state.hornBtn = null;

  ctx.fillStyle = 'rgba(10,6,20,0.94)';
  ctx.fillRect(px, py, pw, ph);

  const pad = 10;
  let ly = py + pad + 8;
  const content = advisorLines(state.selectedHotspot, panelCtx);
  const actions = panelActions(state.selectedHotspot, panelCtx);

  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = UI_COLORS.gold;
  ctx.fillText(content.title.toUpperCase(), px + pad, ly);
  ly += 14;

  drawAdvisorPortrait(ctx, px + pad, ly, content.advisor);
  ly += 48;

  ctx.font = '7.5px monospace';
  ctx.fillStyle = 'rgba(232,215,181,0.85)';
  for (const line of content.lines.slice(0, 2)) {
    ctx.fillText(line, px + pad, ly);
    ly += 12;
  }
  ly += 8;

  const btnW = pw - pad * 2;
  const btnH = 28;
  for (const act of actions) {
    ctx.fillStyle = 'rgba(20,32,48,0.95)';
    ctx.strokeStyle = 'rgba(120,160,200,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(px + pad, ly, btnW, btnH, 4);
    ctx.fill();
    ctx.stroke();
    ctx.font = 'bold 8px monospace';
    ctx.fillStyle = '#c8dce8';
    ctx.fillText(act.label, px + pad + 8, ly + 18);
    state.panelBtns.push({ ...act, x: px + pad, y: ly, w: btnW, h: btnH });
    ly += btnH + 6;
  }

  const hornBlock = getHornBlockReason(panelCtx);
  const hornY = py + ph - 52;
  const hornW = pw - pad * 2;
  const hornH = 40;
  const hornEnabled = !hornBlock && state.hornAnim <= 0;
  const hornPulse = hornEnabled ? 0.75 + Math.sin(performance.now() * 0.004) * 0.25 : 0.35;

  state.hornHoverZone = { x: px + pad, y: hornY, w: hornW, h: hornH };

  ctx.fillStyle = hornEnabled
    ? `rgba(80,60,12,${0.85 + hornPulse * 0.1})`
    : 'rgba(40,24,16,0.85)';
  ctx.strokeStyle = hornEnabled ? UI_COLORS.gold : 'rgba(120,80,60,0.5)';
  ctx.lineWidth = hornEnabled ? 2 : 1;
  ctx.beginPath();
  ctx.roundRect(px + pad, hornY, hornW, hornH, 6);
  ctx.fill();
  ctx.stroke();

  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = hornEnabled ? '#f0e060' : 'rgba(160,120,90,0.55)';
  ctx.fillText(state.hornAnim > 0 ? '…' : '▶ SOUND HORN', px + pad + hornW / 2, hornY + 24);

  if (hornEnabled) {
    state.hornBtn = { x: px + pad, y: hornY, w: hornW, h: hornH, action: 'horn' };
  } else if (state.hornHover && hornBlock) {
    ctx.font = '6px monospace';
    ctx.fillStyle = 'rgba(232,180,120,0.75)';
    ctx.fillText(hornBlock, px + pad + hornW / 2, hornY - 4);
  }

  ly = py + ph - 96;
  const navH = 22;
  const halfW = (btnW - 4) / 2;
  ctx.fillStyle = 'rgba(12,8,4,0.85)';
  ctx.fillRect(px + pad, ly, halfW, navH);
  ctx.fillRect(px + pad + halfW + 4, ly, halfW, navH);
  ctx.font = '6.5px monospace';
  ctx.fillStyle = '#a08050';
  ctx.fillText('WAR CAMP', px + pad + halfW / 2, ly + 14);
  ctx.fillText('MAP', px + pad + halfW + 4 + halfW / 2, ly + 14);
  state.panelBtns.push(
    { action: 'warCamp', x: px + pad, y: ly, w: halfW, h: navH },
    { action: 'commandMap', x: px + pad + halfW + 4, y: ly, w: halfW, h: navH },
  );

  ctx.textAlign = 'left';
}

export function handlePrepShellPointer(state, mouseX, mouseY, playfield, panelRect, eventType) {
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

export function applyPanelAction(action, prepMeta) {
  const next = { ...prepMeta };
  if (action.id === 'repair_gate') {
    if (next.westGateScarred && !next.westGateRepaired && next.wood >= GATE_REPAIR_WOOD_COST) {
      next.wood -= GATE_REPAIR_WOOD_COST;
      next.westGateRepaired = true;
      return { meta: next, repairAnim: 600 };
    }
  }
  return { meta: next };
}

export function startHornAnimation(state) {
  state.hornAnim = HORN_ANIM_MS;
}
