/**
 * War Camp UI — campaign briefing panel (screen law: one question per screen).
 * War Camp answers "Who fights?" — not battle recap (that lives on debrief).
 */

import { UI_COLORS } from './uiTheme.js';
import {
  drawWarCampPanel,
  drawWarCampGuidanceCard,
  WAR_CAMP_THEME,
  WAR_CAMP_BOTTOM_BAR_H,
} from './warCampVisual.js';

function drawPanel(ctx, x, y, w, h, fill, borderA = 0.75, r = 8) {
  drawWarCampPanel(ctx, x, y, w, h, { fill, borderAlpha: borderA, radius: r });
}

/** Ordered checklist — what the player should do from War Camp. */
export function getWarCampObjectives(state) {
  const steps = [];

  if (state.tabPulseTarget === 'recruit') {
    steps.push({
      id: 'recruit',
      label: 'Hire a defender — open RECRUIT tab',
      required: true,
      done: false,
    });
    return markActiveWarCampSteps(steps);
  }

  if (state.tabPulseTarget === 'fortress') {
    steps.push({
      id: 'fortress',
      label: state.fortressUpgrade
        ? `Upgrade ${state.fortressUpgrade.label} — FORTRESS tab`
        : 'Spend reserve gold — open FORTRESS tab',
      required: true,
      done: false,
    });
    return markActiveWarCampSteps(steps);
  }

  if (!state.nextAssault) {
    steps.push({
      id: 'map',
      label: 'Pick the next assault on the Command Map',
      required: true,
      done: false,
    });
    return markActiveWarCampSteps(steps);
  }

  if ((state.equipmentCount ?? 0) > 0 && state.activeTab === 'warband') {
    steps.push({
      id: 'equip',
      label: 'Equip stash gear on hero cards (optional)',
      required: false,
      done: false,
    });
  }

  steps.push({
    id: 'prep',
    label: `Prepare fortress — ${state.nextAssault.codename}`,
    required: true,
    done: false,
  });
  steps.push({
    id: 'assign',
    label: 'Assign West Gate · sound the horn',
    required: true,
    done: false,
  });

  return markActiveWarCampSteps(steps);
}

function markActiveWarCampSteps(steps) {
  let activeRequired = false;
  for (const step of steps) {
    if (step.done) {
      step.active = false;
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

/** Top meta-bar / banner copy for War Camp. */
export function getWarCampInstructionHint(state) {
  if (state.chronicleUnread) {
    return { title: 'CHRONICLE', line: 'Unread saga entry — open Chronicle', urgent: true };
  }
  const active = getWarCampObjectives(state).find(s => s.active && !s.done);
  if (!active) {
    if (state.isVictory) {
      return {
        title: 'WAR CAMP',
        line: 'The hall is yours — review the warband, then prepare the next assault',
      };
    }
    if (state.isDefeat) {
      return { title: 'WAR CAMP', line: 'Regroup — mend scars and try again' };
    }
    return null;
  }

  const titles = {
    recruit: 'RECRUIT',
    fortress: 'FORTRESS',
    map: 'COMMAND MAP',
    equip: 'GEAR UP',
    prep: state.isVictory ? 'WAR CAMP' : 'NEXT STEP',
    assign: 'FORTRESS PREP',
  };

  return {
    title: titles[active.id] ?? 'WAR CAMP',
    line: state.isVictory && active.id === 'prep'
      ? 'Victory — review the warband, then prepare the next assault'
      : active.label,
    urgent: active.id === 'recruit',
  };
}

/** Right-panel guidance for the active tab. */
export function getWarCampTabGuidance(state) {
  const {
    activeTab,
    tabPulseTarget,
    nextAssault,
    equipmentCount = 0,
    fortressUpgrade,
    goldReserve = 0,
  } = state;

  if (tabPulseTarget === 'recruit') {
    return {
      kind: 'action',
      title: 'RECRUIT',
      line: 'Hire defenders — OPEN RECRUIT bottom right',
      tab: 'recruit',
    };
  }
  if (tabPulseTarget === 'fortress') {
    return {
      kind: 'action',
      title: 'FORTRESS',
      line: fortressUpgrade
        ? `Upgrade ${fortressUpgrade.label} — OPEN FORTRESS bottom right`
        : `Spend ${goldReserve}g — OPEN FORTRESS bottom right`,
      tab: 'fortress',
    };
  }

  if (activeTab === 'recruit') {
    return {
      kind: 'info',
      title: 'THIS TAB',
      line: 'Hire defenders · costs campaign gold each',
    };
  }
  if (activeTab === 'fortress') {
    return {
      kind: 'info',
      title: 'THIS TAB',
      line: goldReserve > 0
        ? 'Tap green UPGRADE on affordable rows'
        : 'Earn reserve gold in battle, then upgrade here',
    };
  }

  if (equipmentCount > 0) {
    return {
      kind: 'optional',
      title: 'OPTIONAL',
      line: 'Tap ⚔ or 🛡 on a card to equip stash gear',
    };
  }
  if (nextAssault) {
    return {
      kind: 'primary',
      title: 'WHEN READY',
      line: `Sound the horn after ${nextAssault.codename} — PREPARE FORTRESS bottom right`,
    };
  }
  return {
    kind: 'info',
    title: 'WARBAND',
    line: 'Review heroes · then pick an assault on the Command Map',
  };
}

/**
 * Bottom frame bar — primary CTA bottom-right, Command Map bottom-left.
 * @returns {{ primary: object|null, secondary: object|null }}
 */
export function drawWarCampBottomBar(ctx, layout, state, btnsOut) {
  const { baseW, baseH, frameThick } = layout;
  const barH = WAR_CAMP_BOTTOM_BAR_H - 8;
  const barY = baseH - frameThick - barH - 6;
  const pad = 12;
  const primaryW = 172;
  const secondaryW = 132;
  const primaryX = baseW - frameThick - pad - primaryW;
  const secondaryX = frameThick + pad;

  let primary = null;
  let secondary = null;

  const drawCta = (x, y, w, h, { title, sub, fill, border, textColor, action, extra = {} }) => {
    drawWarCampPanel(ctx, x, y, w, h, { fill, borderAlpha: border, radius: 6 });
    ctx.textAlign = 'center';
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = textColor;
    ctx.fillText(title, x + w / 2, y + 16);
    if (sub) {
      ctx.font = '6.5px monospace';
      ctx.fillStyle = 'rgba(180,200,160,0.75)';
      ctx.fillText(sub, x + w / 2, y + 28);
    }
    btnsOut.push({ x, y, w, h, action, ...extra });
  };

  if (state.buildingOnly) {
    drawCta(primaryX, barY, primaryW, barH, {
      title: '← BACK TO TOWN',
      sub: 'Return to settlement',
      fill: 'rgba(12,8,4,0.97)',
      border: 0.7,
      textColor: '#c0a060',
      action: 'returnToSettlement',
    });
    ctx.textAlign = 'left';
    return { primary: { action: 'returnToSettlement' }, secondary: null };
  }

  if (state.showReturnToHub) {
    drawCta(secondaryX, barY, secondaryW, barH, {
      title: '← SETTLEMENT',
      sub: 'Return to town',
      fill: 'rgba(12,8,4,0.97)',
      border: 0.65,
      textColor: '#c0a060',
      action: 'returnToSettlement',
    });
    secondary = { action: 'returnToSettlement' };
    ctx.textAlign = 'left';
    return { primary: null, secondary };
  }

  if (state.tabPulseTarget === 'recruit') {
    drawCta(primaryX, barY, primaryW, barH, {
      title: 'OPEN RECRUIT TAB →',
      sub: 'Hire defenders before the next assault',
      fill: 'rgba(28,20,36,0.98)',
      border: 0.85,
      textColor: '#d8b0f0',
      action: 'switchTab',
      extra: { tab: 'recruit' },
    });
    primary = { action: 'switchTab', tab: 'recruit' };
  } else if (state.tabPulseTarget === 'fortress') {
    drawCta(primaryX, barY, primaryW, barH, {
      title: 'OPEN FORTRESS TAB →',
      sub: state.fortressUpgrade
        ? `Upgrade ${state.fortressUpgrade.label}`
        : 'Spend reserve gold on buildings',
      fill: 'rgba(20,36,14,0.98)',
      border: 0.85,
      textColor: '#a8e070',
      action: 'switchTab',
      extra: { tab: 'fortress' },
    });
    primary = { action: 'switchTab', tab: 'fortress' };
  } else if (state.nextAssault) {
    const isRetry = state.nextAssault.isRetry;
    drawCta(primaryX, barY, primaryW, barH, {
      title: isRetry ? 'RETRY ASSAULT →' : 'PREPARE FORTRESS →',
      sub: `${state.nextAssault.codename} · ${state.nextAssault.tierLabel}`,
      fill: isRetry ? 'rgba(36,14,14,0.98)' : 'rgba(20,36,14,0.98)',
      border: 0.9,
      textColor: isRetry ? '#f0a080' : '#a8e070',
      action: isRetry ? 'retryAssault' : 'nextAssault',
      extra: { nodeIndex: state.nextAssault.nodeIndex },
    });
    primary = { action: isRetry ? 'retryAssault' : 'nextAssault' };
  } else {
    drawCta(primaryX, barY, primaryW, barH, {
      title: 'COMMAND MAP →',
      sub: 'Pick the next assault',
      fill: 'rgba(12,8,4,0.97)',
      border: 0.7,
      textColor: '#c0a060',
      action: 'commandMap',
    });
    primary = { action: 'commandMap' };
    ctx.textAlign = 'left';
    return { primary, secondary: null };
  }

  drawCta(secondaryX, barY, secondaryW, barH, {
    title: 'COMMAND MAP',
    sub: null,
    fill: 'rgba(12,8,4,0.97)',
    border: 0.55,
    textColor: '#c0a060',
    action: 'commandMap',
  });
  secondary = { action: 'commandMap' };

  ctx.textAlign = 'left';
  return { primary, secondary };
}

/**
 * Left panel for campaign War Camp — commander briefing, not battle recap.
 * @returns {{ chronicleBtn: { x, y, w, h } | null }}
 */
export function drawCampaignWarCampBriefing(ctx, panel, state, btnsOut) {
  const { x, y, w, h } = panel;
  const cx = x + w / 2;
  const pad = 14;
  const snapX = x + pad + 10;
  const innerW = w - pad * 2;

  const hasChronicle = (state.chronicleCount ?? 0) > 0;
  const chronicleBtnH = 24;
  const contentBottom = y + h - (hasChronicle ? chronicleBtnH + 14 : 10);

  ctx.save();
  ctx.textAlign = 'center';

  let hy = y + 20;

  // ── Zone 1: What to do now ────────────────────────────────
  ctx.font = 'bold 10px monospace';
  ctx.fillStyle = WAR_CAMP_THEME.gold;
  ctx.fillText('WHAT TO DO NOW', cx, hy);
  hy += 16;

  const objectives = getWarCampObjectives(state);
  ctx.textAlign = 'left';
  for (const obj of objectives.filter(o => o.required || o.active).slice(0, 4)) {
    const mark = obj.done ? '✓' : (obj.active ? '▶' : '○');
    ctx.font = obj.active ? 'bold 7.5px monospace' : '7px monospace';
    ctx.fillStyle = obj.done
      ? 'rgba(120,140,100,0.5)'
      : obj.active
        ? 'rgba(232,208,96,0.9)'
        : 'rgba(140,155,170,0.55)';
    ctx.fillText(`${mark} ${obj.label}`, snapX, hy);
    hy += 12;
  }
  hy += 8;

  // ── Sitrep (compact status) ───────────────────────────────
  const sitrepTop = hy;
  const sitrepH = Math.min(108, Math.max(56, contentBottom - sitrepTop));
  if (sitrepH >= 52) {
    drawPanel(ctx, x + pad, sitrepTop, innerW, sitrepH, 'rgba(12,10,20,0.92)', 0.5, 6);
    let sy = sitrepTop + 14;
    ctx.textAlign = 'left';
    ctx.font = 'bold 7px monospace';
    ctx.fillStyle = 'rgba(160,140,100,0.5)';
    ctx.fillText('SITREP', snapX, sy);
    sy += 12;
    ctx.font = '8px monospace';
    ctx.fillStyle = UI_COLORS.parchment;
    const names = (state.defenderNames ?? []).slice(0, 3);
    if (names.length === 0) {
      ctx.fillStyle = 'rgba(140,120,90,0.5)';
      ctx.fillText('Warband: empty', snapX, sy);
    } else {
      ctx.fillText(`Warband: ${names.join(' · ')}`, snapX, sy);
      if ((state.defenderCount ?? 0) > 3) {
        sy += 11;
        ctx.font = '7px monospace';
        ctx.fillStyle = 'rgba(140,120,80,0.45)';
        ctx.fillText(`+${state.defenderCount - 3} more`, snapX, sy);
      }
    }
    sy += 12;
    const statusLines = state.statusLines ?? [];
    for (const { text, color } of statusLines.slice(0, 3)) {
      ctx.font = '7px monospace';
      ctx.fillStyle = color ?? 'rgba(180,160,120,0.7)';
      ctx.fillText(text, snapX, sy);
      sy += 11;
    }
    if (state.goldReserve > 0 && sy < sitrepTop + sitrepH - 4) {
      ctx.font = '7px monospace';
      ctx.fillStyle = UI_COLORS.gold;
      ctx.fillText(`◆ ${state.goldReserve}g war reserve`, snapX, sy);
    }
  }

  // ── Chronicle ─────────────────────────────────────────────
  let chronicleBtn = null;
  if (hasChronicle) {
    const chronicleY = contentBottom;
    const chronicleBtnW = innerW;
    const cbX = x + pad;
    const unread = Boolean(state.chronicleUnread);
    if (unread) {
      const pulse = 0.55 + Math.sin(performance.now() * 0.006) * 0.35;
      ctx.save();
      ctx.strokeStyle = `rgba(240,180,60,${0.28 + pulse * 0.45})`;
      ctx.lineWidth = 1.4 + pulse * 0.6;
      ctx.beginPath();
      ctx.roundRect(cbX - 1, chronicleY - 1, chronicleBtnW + 2, chronicleBtnH + 2, 5);
      ctx.stroke();
      ctx.restore();
    }
    drawWarCampPanel(ctx, cbX, chronicleY, chronicleBtnW, chronicleBtnH, {
      radius: 4,
      borderAlpha: unread ? 0.82 : 0.55,
    });
    ctx.textAlign = 'center';
    ctx.font = '8px monospace';
    ctx.fillStyle = unread ? 'rgba(240,200,120,0.95)' : 'rgba(180,140,220,0.85)';
    ctx.fillText(
      unread ? `📜 Chronicle — NEW ENTRY (${state.chronicleCount})` : `📜 Chronicle (${state.chronicleCount})`,
      cx,
      chronicleY + 15,
    );
    btnsOut.push({ x: cbX, y: chronicleY, w: chronicleBtnW, h: chronicleBtnH, action: 'openChronicle' });
    chronicleBtn = { x: cbX, y: chronicleY, w: chronicleBtnW, h: chronicleBtnH };
  }

  ctx.restore();
  return { chronicleBtn };
}

/** First Saga slice — hide skirmish-era clutter (presets, rune shop). */
export function isSimplifiedWarCamp(mapIndex) {
  return mapIndex === 0;
}

/** Tab pulse when simplified War Camp needs roster/fortress discovery. */
export function shouldPulseWarCampTab(tabId, pulseTarget) {
  return !!pulseTarget && tabId === pulseTarget;
}

export function getWarCampTabHint(pulseTarget) {
  if (pulseTarget === 'recruit') return 'Hire defenders in RECRUIT tab →';
  if (pulseTarget === 'fortress') return 'Upgrade buildings in FORTRESS tab →';
  return 'Manage roster in tabs →';
}

/** War Camp status lines from prep meta + optional fortress upgrade hint. */
export function buildWarCampStatusLines(prepMeta, { fortressUpgrade = null } = {}) {
  const lines = [];
  if (fortressUpgrade) {
    lines.push({
      text: `Fortress: ${fortressUpgrade.label} → L${fortressUpgrade.nextLevel} (${fortressUpgrade.cost}g)`,
      color: 'rgba(140,200,140,0.75)',
    });
  }
  return lines;
}

/** Single bond line for commander briefing. */
export function formatWarCampBondLine(bond, nameById = {}) {
  if (!bond?.defenderIds?.length) return null;
  const names = bond.defenderIds.map((id) => nameById[id] ?? '?');
  if (names.length < 2) return null;
  const title = bond.name ? `∞ ${bond.name}` : '∞ Bond';
  return `${title}: ${names[0]} & ${names[1]}`;
}

/** Bond status lines for War Camp briefing (max 2 shown). */
export function buildWarCampBondLines(bonds = [], nameById = {}, maxLines = 2) {
  const lines = [];
  for (const bond of bonds.slice(0, maxLines)) {
    const text = formatWarCampBondLine(bond, nameById);
    if (text) lines.push({ text, color: 'rgba(200,160,220,0.75)' });
  }
  const extra = bonds.length - maxLines;
  if (extra > 0) {
    lines.push({
      text: `+${extra} more bond${extra !== 1 ? 's' : ''}`,
      color: 'rgba(160,130,180,0.55)',
    });
  }
  return lines;
}
