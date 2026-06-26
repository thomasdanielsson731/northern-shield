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
        title: 'Fortress',
        lines: ['Click the gate, tower, or wall.', 'Then sound the horn.'],
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

export function drawFortressSchematic(ctx, playfield, state, drawCtx) {
  const { prepMeta, postAssignments, roster } = drawCtx;
  const pf = playfield;
  const cam = state;

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

  ctx.fillStyle = 'rgba(40,55,40,0.35)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + pf.h * 0.06, ringRx * 0.92, ringRy * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();

  const drawRect = (r, fill, stroke, lw = 1) => {
    const tl = transformPoint(r.x, r.y, pf, cam);
    const br = transformPoint(r.x + r.w, r.y + r.h, pf, cam);
    const x = Math.min(tl.x, br.x);
    const y = Math.min(tl.y, br.y);
    const w = Math.abs(br.x - tl.x);
    const h = Math.abs(br.y - tl.y);
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lw;
      ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    }
    return { x, y, w, h };
  };

  const wallR = hotspotRect(pf, PREP_HOTSPOTS.WALL_SCAR);
  drawRect(wallR, '#3a2818', '#5a4030', 1.5);

  const lh = hotspotRect(pf, PREP_HOTSPOTS.LONGHOUSE);
  const lhBox = drawRect(lh, '#2a1808', '#4a3020');
  ctx.fillStyle = 'rgba(255,160,60,0.25)';
  const smokeX = lhBox.x + lhBox.w * 0.5;
  ctx.beginPath();
  ctx.arc(smokeX, lhBox.y - 4, 6 + Math.sin(performance.now() * 0.003) * 2, 0, Math.PI * 2);
  ctx.fill();

  const tr = hotspotRect(pf, PREP_HOTSPOTS.TREASURY);
  const trBox = drawRect(tr, '#3a3010', '#8a7030');
  ctx.fillStyle = '#6a5020';
  ctx.fillRect(trBox.x + trBox.w * 0.25, trBox.y + trBox.h * 0.35, trBox.w * 0.5, trBox.h * 0.4);
  ctx.strokeStyle = '#c8a040';
  ctx.strokeRect(trBox.x + trBox.w * 0.25, trBox.y + trBox.h * 0.35, trBox.w * 0.5, trBox.h * 0.4);

  const tower = hotspotRect(pf, PREP_HOTSPOTS.WATCH_TOWER);
  const towerBox = drawRect(tower, '#4a3828', '#6a5848', 2);
  ctx.fillStyle = 'rgba(180,50,50,0.55)';
  const flagX = towerBox.x + towerBox.w * 0.7;
  ctx.fillRect(flagX, towerBox.y - 10, 2, 12);
  ctx.beginPath();
  ctx.moveTo(flagX + 2, towerBox.y - 10);
  ctx.lineTo(flagX + 10, towerBox.y - 6);
  ctx.lineTo(flagX + 2, towerBox.y - 2);
  ctx.fill();

  const gate = hotspotRect(pf, PREP_HOTSPOTS.WEST_GATE);
  const gateBox = drawRect(
    gate,
    prepMeta.westGateRepaired ? '#4a5038' : '#3a2810',
    state.selectedHotspot === PREP_HOTSPOTS.WEST_GATE ? '#e8d060' : '#6a5030',
    state.selectedHotspot === PREP_HOTSPOTS.WEST_GATE ? 2.5 : 1.5,
  );
  ctx.strokeStyle = 'rgba(100,80,50,0.45)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(gateBox.x + gateBox.w / 2, gateBox.y + gateBox.h * 0.55, gateBox.w * 0.22, Math.PI, 0);
  ctx.stroke();

  if (prepMeta.westGateScarred && !prepMeta.westGateRepaired) {
    ctx.strokeStyle = 'rgba(180,60,40,0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(gateBox.x + gateBox.w * 0.2, gateBox.y + gateBox.h * 0.3);
    ctx.lineTo(gateBox.x + gateBox.w * 0.55, gateBox.y + gateBox.h * 0.7);
    ctx.lineTo(gateBox.x + gateBox.w * 0.75, gateBox.y + gateBox.h * 0.35);
    ctx.stroke();
  }

  if (state.repairAnim > 0) {
    const a = state.repairAnim / 600;
    ctx.fillStyle = `rgba(200,180,120,${0.35 * a})`;
    ctx.fillRect(gateBox.x, gateBox.y, gateBox.w, gateBox.h);
  }

  const gateHero = postAssignments?.west_gate?.defenderId;
  if (gateHero) {
    const def = roster?.find?.(gateHero);
    const mx = gateBox.x + gateBox.w / 2;
    const my = gateBox.y - 10;
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
    const initials = (def?.name ?? '?').slice(0, 2).toUpperCase();
    ctx.fillText(initials, mx, my + 3);
  }

  for (const [id, layout] of Object.entries(HOTSPOT_LAYOUT)) {
    const r = hotspotRect(pf, id);
    const tl = transformPoint(r.x, r.y, pf, cam);
    const br = transformPoint(r.x + r.w, r.y + r.h, pf, cam);
    if (state.selectedHotspot === id) {
      const x = Math.min(tl.x, br.x);
      const y = Math.min(tl.y, br.y);
      const w = Math.abs(br.x - tl.x);
      const h = Math.abs(br.y - tl.y);
      ctx.strokeStyle = 'rgba(232,208,96,0.75)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 2, y - 2, w + 4, h + 4);
    }
  }

  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(140,160,180,0.45)';
  ctx.fillText('WEST', gateBox.x + gateBox.w / 2, gateBox.y + gateBox.h + 14);

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
