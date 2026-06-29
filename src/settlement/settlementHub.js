/**
 * Settlement Hub — progression home (town map with clickable buildings).
 * Preparation lives in fortressPrep + command map; this is the slow RPG loop.
 */

import { UI_COLORS } from '../ui/uiTheme.js';
import { drawWarCampPanel } from '../ui/warCampVisual.js';
import { getHubBuildingMilestone } from './hubMilestones.js';

/** Normalized building footprints on the hub playfield (0–1). */
export const HUB_BUILDINGS = [
  {
    id: 'command',
    label: 'WAR HORN',
    sublabel: 'Assaults · Command Map',
    kind: 'assault',
    fx: 0.06, fy: 0.38, fw: 0.20, fh: 0.22,
  },
  {
    id: 'warband',
    label: 'HALL OF HEROES',
    sublabel: 'Warband · Equipment',
    kind: 'progression',
    fx: 0.28, fy: 0.48, fw: 0.26, fh: 0.30,
  },
  {
    id: 'fortress',
    label: 'TREASURY',
    sublabel: 'Fortress upgrades',
    kind: 'progression',
    fx: 0.08, fy: 0.62, fw: 0.18, fh: 0.20,
  },
  {
    id: 'recruit',
    label: 'BARRACKS',
    sublabel: 'Recruit defenders',
    kind: 'progression',
    fx: 0.58, fy: 0.44, fw: 0.20, fh: 0.24,
  },
  {
    id: 'runeSmith',
    label: 'RUNE SMITH',
    sublabel: 'Saga II+',
    kind: 'locked',
    fx: 0.72, fy: 0.58, fw: 0.16, fh: 0.20,
  },
  {
    id: 'chronicle',
    label: 'CHRONICLE',
    sublabel: 'Battle history',
    kind: 'progression',
    fx: 0.56, fy: 0.72, fw: 0.16, fh: 0.16,
  },
  {
    id: 'skirmish',
    label: 'ARENA',
    sublabel: 'Classic 100-wave TD',
    kind: 'optional',
    fx: 0.82, fy: 0.30, fw: 0.14, fh: 0.14,
  },
  {
    id: 'slots',
    label: 'SAVE SLOTS',
    sublabel: 'Change campaign',
    kind: 'meta',
    fx: 0.82, fy: 0.08, fw: 0.14, fh: 0.12,
  },
];

export function hubRect(building, layout) {
  const { x, y, w, h } = layout;
  return {
    x: x + building.fx * w,
    y: y + building.fy * h,
    w: building.fw * w,
    h: building.fh * h,
  };
}

export function getHubBuildingAvailability(id, state = {}) {
  return getHubBuildingMilestone(id, state);
}

/** @returns {string|null} action id for hub routing */
export function hubBuildingAction(id) {
  const map = {
    command: 'openCommandMap',
    warband: 'openWarband',
    fortress: 'openFortress',
    recruit: 'openRecruit',
    runeSmith: 'openRuneSmith',
    chronicle: 'openChronicle',
    skirmish: 'openSkirmish',
    slots: 'returnToSlots',
  };
  return map[id] ?? null;
}

function drawHubBuilding(ctx, box, building, avail, pulse) {
  const locked = !avail.available;
  const hot = pulse && avail.pulse;
  const fill = locked
    ? 'rgba(14,12,10,0.88)'
    : hot
      ? 'rgba(32,28,18,0.94)'
      : 'rgba(18,16,22,0.92)';
  const border = locked ? 0.35 : hot ? 0.95 : 0.72;

  drawWarCampPanel(ctx, box.x, box.y, box.w, box.h, { fill, borderAlpha: border, radius: 6 });

  if (hot) {
    const p = 0.55 + Math.sin(performance.now() * 0.006) * 0.35;
    ctx.save();
    ctx.strokeStyle = `rgba(240,200,80,${0.25 + p * 0.45})`;
    ctx.lineWidth = 1.4 + p;
    ctx.beginPath();
    ctx.roundRect(box.x - 1, box.y - 1, box.w + 2, box.h + 2, 7);
    ctx.stroke();
    ctx.restore();
  }

  ctx.textAlign = 'center';
  ctx.font = 'bold 8px monospace';
  ctx.fillStyle = locked ? 'rgba(120,110,90,0.55)' : UI_COLORS.gold;
  ctx.fillText(building.label, box.x + box.w / 2, box.y + box.h * 0.38);
  if (avail.banner && !locked) {
    ctx.font = 'bold 5.5px monospace';
    ctx.fillStyle = 'rgba(240,200,80,0.85)';
    ctx.fillText(avail.banner, box.x + box.w / 2, box.y + box.h * 0.50);
  }
  ctx.font = '6px monospace';
  ctx.fillStyle = locked ? 'rgba(100,90,70,0.45)' : 'rgba(200,180,140,0.72)';
  const sub = locked && avail.reason
    ? (avail.reason.length > 28 ? `${avail.reason.slice(0, 27)}…` : avail.reason)
    : building.sublabel;
  ctx.fillText(sub, box.x + box.w / 2, box.y + box.h * 0.62);

  if (building.kind === 'assault') {
    ctx.font = '14px monospace';
    ctx.fillText('📯', box.x + box.w / 2, box.y + box.h * 0.82);
  } else if (building.id === 'warband') {
    ctx.font = '12px monospace';
    ctx.fillText('🛡', box.x + box.w / 2, box.y + box.h * 0.82);
  } else if (building.id === 'recruit') {
    ctx.font = '12px monospace';
    ctx.fillText('⚔', box.x + box.w / 2, box.y + box.h * 0.82);
  }
  ctx.textAlign = 'left';
}

/**
 * Draw settlement hub town + buildings.
 * @returns {Array<{ id, action, x, y, w, h, available }>}
 */
export function drawSettlementHub(ctx, layout, hubState, btnsOut = []) {
  const { x, y, w, h } = layout;
  const time = performance.now() * 0.001;

  // Sky + ground
  const sky = ctx.createLinearGradient(x, y, x, y + h);
  sky.addColorStop(0, '#0a0814');
  sky.addColorStop(0.45, '#12101a');
  sky.addColorStop(1, '#1a1410');
  ctx.fillStyle = sky;
  ctx.fillRect(x, y, w, h);

  // Distant hills
  ctx.fillStyle = 'rgba(20,28,18,0.55)';
  ctx.beginPath();
  ctx.moveTo(x, y + h * 0.55);
  for (let i = 0; i <= 8; i++) {
    const px = x + (w / 8) * i;
    const py = y + h * (0.52 + Math.sin(i * 1.1 + 0.3) * 0.04);
    ctx.lineTo(px, py);
  }
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
  ctx.fill();

  // Ground plane
  const ground = ctx.createLinearGradient(x, y + h * 0.5, x, y + h);
  ground.addColorStop(0, 'rgba(40,32,22,0.0)');
  ground.addColorStop(1, 'rgba(28,22,14,0.95)');
  ctx.fillStyle = ground;
  ctx.fillRect(x, y + h * 0.5, w, h * 0.5);

  // Ambient hearth glow (settlement center)
  const hx = x + w * 0.42;
  const hy = y + h * 0.62;
  const pulse = 0.6 + Math.sin(time * 1.3) * 0.15;
  const glow = ctx.createRadialGradient(hx, hy, 0, hx, hy, w * 0.35);
  glow.addColorStop(0, `rgba(255,160,60,${0.12 * pulse})`);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x, y, w, h);

  // Title strip
  ctx.textAlign = 'center';
  ctx.font = 'bold 11px monospace';
  ctx.fillStyle = UI_COLORS.parchment;
  ctx.fillText('MIDGARD SETTLEMENT', x + w / 2, y + 18);
  ctx.font = '7px monospace';
  ctx.fillStyle = 'rgba(180,160,120,0.55)';
  ctx.fillText('Click a building — assaults via War Horn · growth via halls', x + w / 2, y + 30);
  ctx.textAlign = 'left';

  const hotspots = [];
  for (const building of HUB_BUILDINGS) {
    const box = hubRect(building, layout);
    const avail = getHubBuildingAvailability(building.id, hubState);
    drawHubBuilding(ctx, box, building, avail, !!avail.pulse);
    const action = hubBuildingAction(building.id);
    const entry = { id: building.id, action, ...box, available: avail.available, reason: avail.reason };
    hotspots.push(entry);
    if (avail.available && btnsOut) {
      btnsOut.push({ x: box.x, y: box.y, w: box.w, h: box.h, action, hubBuilding: building.id });
    }
  }

  return hotspots;
}

export function getHubInstructionHint(hubState) {
  const next = hubState?.nextAssault;
  if (hubState?.battlesCompleted === 0) {
    return { title: 'FIRST STEP', line: 'War Horn → pick First Night → prepare the gate' };
  }
  if (next) {
    return { title: 'NEXT ASSAULT', line: `${next.codename} — War Horn when ready` };
  }
  return { title: 'SETTLEMENT', line: 'Grow your kingdom between assaults' };
}
