/**
 * Settlement Hub — progression home (town map with clickable buildings).
 * Preparation lives in fortressPrep + command map; this is the slow RPG loop.
 */

import { UI_COLORS } from '../ui/uiTheme.js';
import { drawWarCampPanel } from '../ui/warCampVisual.js';
import { getHubBuildingMilestone } from './hubMilestones.js';
import {
  drawSettlementHubBackdrop,
  drawHubBuildingSprite,
  isSettlementHubBackdropUsable,
} from './settlementHubArt.js';
import {
  HUB_BUILDING_LAYOUT,
  resolveHubBuildingRect,
  getHubBuildingsDrawOrder,
} from './settlementHubLayout.js';

/** Hub buildings — geometry lives in settlementHubLayout (art-normalized). */
export const HUB_BUILDINGS = [
  {
    id: 'command',
    label: 'WAR HORN',
    sublabel: 'Assaults · Command Map',
    kind: 'assault',
  },
  {
    id: 'warband',
    label: 'HALL OF HEROES',
    sublabel: 'Warband · Equipment',
    kind: 'progression',
  },
  {
    id: 'fortress',
    label: 'TREASURY',
    sublabel: 'Fortress upgrades',
    kind: 'progression',
  },
  {
    id: 'recruit',
    label: 'BARRACKS',
    sublabel: 'Recruit defenders',
    kind: 'progression',
  },
  {
    id: 'runeSmith',
    label: 'RUNE SMITH',
    sublabel: 'Saga II+',
    kind: 'locked',
  },
  {
    id: 'chronicle',
    label: 'CHRONICLE',
    sublabel: 'Battle history',
    kind: 'progression',
  },
  {
    id: 'skirmish',
    label: 'ARENA',
    sublabel: 'Classic 100-wave TD',
    kind: 'optional',
  },
  {
    id: 'slots',
    label: 'SAVE SLOTS',
    sublabel: 'Change campaign',
    kind: 'meta',
  },
];

export function hubRect(building, layout) {
  const norm = HUB_BUILDING_LAYOUT[building.id];
  if (!norm) return { x: 0, y: 0, w: 0, h: 0 };
  return resolveHubBuildingRect(norm, layout, {
    useArtSpace: isSettlementHubBackdropUsable(),
  });
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
  const hasSprite = drawHubBuildingSprite(ctx, building.id, box, { locked, alpha: locked ? 0.55 : 1 });

  if (!hasSprite) {
    const fill = locked
      ? 'rgba(14,12,10,0.88)'
      : hot
        ? 'rgba(32,28,18,0.94)'
        : 'rgba(18,16,22,0.92)';
    const border = locked ? 0.35 : hot ? 0.95 : 0.72;
    drawWarCampPanel(ctx, box.x, box.y, box.w, box.h, { fill, borderAlpha: border, radius: 6 });
  } else if (hot) {
    const p = 0.55 + Math.sin(performance.now() * 0.006) * 0.35;
    ctx.save();
    ctx.strokeStyle = `rgba(200,170,100,${0.22 + p * 0.28})`;
    ctx.lineWidth = 1.4 + p;
    ctx.beginPath();
    ctx.roundRect(box.x - 1, box.y - 1, box.w + 2, box.h + 2, 7);
    ctx.stroke();
    ctx.restore();
  }

  ctx.textAlign = 'center';
  ctx.font = 'bold 8px monospace';
  ctx.fillStyle = locked ? 'rgba(120,110,90,0.55)' : UI_COLORS.gold;
  const labelAbove = building.id === 'recruit' || building.id === 'chronicle'
    || building.id === 'fortress' || building.id === 'runeSmith' || building.id === 'skirmish';
  const labelY = hasSprite
    ? (labelAbove ? box.y + 9 : box.y + box.h * 0.12)
    : box.y + box.h * 0.38;
  ctx.fillText(building.label, box.x + box.w / 2, labelY);
  if (building.id === 'command') {
    ctx.font = '6px monospace';
    ctx.fillStyle = locked ? 'rgba(100,90,70,0.45)' : 'rgba(160,140,100,0.55)';
    ctx.fillText('Assaults · Command Map', box.x + box.w / 2, labelY + 11);
    ctx.font = 'bold 8px monospace';
    ctx.fillStyle = locked ? 'rgba(120,110,90,0.55)' : UI_COLORS.gold;
  }
  if (avail.unread && !locked) {
    const dotPulse = 0.75 + 0.25 * Math.sin(performance.now() / 300);
    ctx.fillStyle = `rgba(240,180,60,${dotPulse.toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(box.x + box.w - 5, box.y + 5, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  if (avail.banner && !locked) {
    ctx.font = 'bold 5.5px monospace';
    ctx.fillStyle = avail.unread ? 'rgba(240,200,120,0.85)' : 'rgba(200,170,100,0.75)';
    const bannerY = building.id === 'command' ? labelY + 22 : labelY + 11;
    ctx.fillText(avail.banner, box.x + box.w / 2, bannerY);
  }
  if (!hasSprite) {
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
  } else if (locked && avail.reason) {
    ctx.font = '6px monospace';
    ctx.fillStyle = 'rgba(100,90,70,0.65)';
    const sub = avail.reason.length > 28 ? `${avail.reason.slice(0, 27)}…` : avail.reason;
    ctx.fillText(sub, box.x + box.w / 2, box.y + box.h - 6);
  }
  ctx.textAlign = 'left';
}

/**
 * Draw settlement hub town + buildings.
 * @returns {Array<{ id, action, x, y, w, h, available }>}
 */
export function drawSettlementHub(ctx, layout, hubState, btnsOut = []) {
  const { x, y, w, h } = layout;

  drawSettlementHubBackdrop(ctx, layout);

  const vig = ctx.createRadialGradient(x + w / 2, y + h * 0.55, w * 0.12, x + w / 2, y + h * 0.55, w * 0.75);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = vig;
  ctx.fillRect(x, y, w, h);

  ctx.textAlign = 'center';
  ctx.font = '7px monospace';
  ctx.fillStyle = 'rgba(180,160,120,0.45)';
  ctx.fillText('Tap a building — War Horn for assaults', x + w / 2, y + 16);
  ctx.textAlign = 'left';

  const hotspots = [];
  const drawOrder = getHubBuildingsDrawOrder(HUB_BUILDINGS);
  for (const building of drawOrder) {
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
  if (hubState?.chronicleUnread) {
    return { title: 'NEW SAGA ENTRY', line: 'Chronicle stone has an unread battle record' };
  }
  if (hubState?.battlesCompleted === 0) {
    return { title: 'FIRST STEP', line: 'War Horn → pick First Night → prepare the gate' };
  }
  if (next) {
    return { title: 'NEXT ASSAULT', line: `${next.codename} — War Horn when ready` };
  }
  return { title: 'SETTLEMENT', line: 'Grow your kingdom between assaults' };
}
