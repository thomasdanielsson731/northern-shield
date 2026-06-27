/**
 * War Camp UI — campaign briefing panel (screen law: one question per screen).
 * War Camp answers "Who fights?" — not battle recap (that lives on debrief).
 */

import { UI_COLORS } from './uiTheme.js';

function drawPanel(ctx, x, y, w, h, fill, borderA = 0.75, r = 8) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
  ctx.strokeStyle = `rgba(200,160,80,${borderA})`;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function wrapLines(ctx, text, maxW) {
  const words = (text ?? '').split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Left panel for campaign War Camp — commander briefing, not battle recap.
 * @returns {{ btnsY: number }} layout hint for chronicle button below
 */
export function drawCampaignWarCampBriefing(ctx, panel, state, btnsOut) {
  const { x, y, w, h } = panel;
  const cx = x + w / 2;
  const pad = 14;
  let hy = y + 28;

  ctx.save();
  ctx.textAlign = 'center';

  ctx.font = 'bold 10px monospace';
  ctx.fillStyle = 'rgba(160,130,80,0.55)';
  ctx.fillText('COMMANDER BRIEFING', cx, hy);
  hy += 20;

  ctx.font = 'bold 22px monospace';
  ctx.fillStyle = UI_COLORS.gold;
  ctx.shadowColor = 'rgba(212,175,55,0.45)';
  ctx.shadowBlur = 10;
  ctx.fillText('WAR CAMP', cx, hy);
  ctx.shadowBlur = 0;
  hy += 18;

  ctx.font = '9px monospace';
  ctx.fillStyle = 'rgba(210,190,150,0.82)';
  ctx.fillText('Who holds the line at the next assault?', cx, hy);
  hy += 22;

  // ── Warband snapshot ──────────────────────────────────────
  drawPanel(ctx, x + pad, hy, w - pad * 2, 52, 'rgba(12,10,20,0.92)', 0.55, 6);
  const snapX = x + pad + 10;
  ctx.textAlign = 'left';
  ctx.font = 'bold 8px monospace';
  ctx.fillStyle = 'rgba(160,140,100,0.55)';
  ctx.fillText('WARBAND', snapX, hy + 14);
  ctx.font = '10px monospace';
  ctx.fillStyle = UI_COLORS.parchment;
  const names = (state.defenderNames ?? []).slice(0, 3);
  if (names.length === 0) {
    ctx.fillStyle = 'rgba(140,120,90,0.5)';
    ctx.fillText('No defenders yet', snapX, hy + 32);
  } else {
    ctx.fillText(names.join('  ·  '), snapX, hy + 32);
    if ((state.defenderCount ?? 0) > 3) {
      ctx.font = '7px monospace';
      ctx.fillStyle = 'rgba(140,120,80,0.45)';
      ctx.fillText(`+${state.defenderCount - 3} more`, snapX, hy + 44);
    }
  }
  hy += 62;

  // ── Next assault (primary focus) ──────────────────────────
  if (state.nextAssault) {
    const cardH = 72;
    drawPanel(ctx, x + pad, hy, w - pad * 2, cardH, 'rgba(16,28,14,0.95)', 0.8, 8);
    ctx.textAlign = 'left';
    ctx.font = 'bold 8px monospace';
    ctx.fillStyle = 'rgba(140,200,120,0.65)';
    ctx.fillText('NEXT ASSAULT', snapX, hy + 16);
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#a8e070';
    ctx.fillText(state.nextAssault.codename, snapX, hy + 36);
    ctx.font = '9px monospace';
    ctx.fillStyle = 'rgba(180,200,160,0.75)';
    ctx.fillText(
      `${state.nextAssault.tierLabel} · ${(state.nextAssault.frontLabel ?? 'WEST').toUpperCase()} FRONT · ${state.nextAssault.waveCount ?? 1} wave${(state.nextAssault.waveCount ?? 1) !== 1 ? 's' : ''}`,
      snapX,
      hy + 52,
    );
    ctx.textAlign = 'center';
    const prepW = w - pad * 2 - 20;
    const prepH = 26;
    const prepX = cx - prepW / 2;
    const prepY = hy + cardH - prepH - 8;
    drawPanel(ctx, prepX, prepY, prepW, prepH, 'rgba(28,48,18,0.98)', 0.85, 5);
    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = '#90c070';
    ctx.fillText('PREPARE FORTRESS →', cx, prepY + 17);
    btnsOut.push({
      x: prepX, y: prepY, w: prepW, h: prepH,
      action: state.nextAssault.isRetry ? 'retryAssault' : 'nextAssault',
      nodeIndex: state.nextAssault.nodeIndex,
    });
    hy += cardH + 12;
  } else {
    drawPanel(ctx, x + pad, hy, w - pad * 2, 48, 'rgba(20,18,12,0.9)', 0.5, 6);
    ctx.textAlign = 'center';
    ctx.font = '9px monospace';
    ctx.fillStyle = 'rgba(180,160,120,0.7)';
    ctx.fillText('Region secured — pick your next move', cx, hy + 28);
    hy += 60;
  }

  // ── Fortress & reserve status ─────────────────────────────
  ctx.textAlign = 'left';
  ctx.font = '8px monospace';
  const statusLines = state.statusLines ?? [];
  for (const { text, color } of statusLines) {
    ctx.fillStyle = color ?? 'rgba(180,160,120,0.7)';
    ctx.fillText(text, snapX, hy);
    hy += 13;
  }
  if (state.goldReserve > 0) {
    ctx.fillStyle = UI_COLORS.gold;
    ctx.fillText(`◆ ${state.goldReserve}g in war reserve`, snapX, hy);
    hy += 13;
  }

  // ── Chronicle whisper ─────────────────────────────────────
  if (state.chronicleProse) {
    hy += 6;
    ctx.strokeStyle = 'rgba(140,110,60,0.25)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(x + pad, hy);
    ctx.lineTo(x + w - pad, hy);
    ctx.stroke();
    hy += 14;
    ctx.font = 'bold 7px monospace';
    ctx.fillStyle = 'rgba(160,130,80,0.5)';
    ctx.textAlign = 'center';
    ctx.fillText('THE CHRONICLE', cx, hy);
    hy += 12;
    ctx.font = '8px monospace';
    ctx.fillStyle = 'rgba(190,165,115,0.72)';
    ctx.textAlign = 'left';
    const lines = wrapLines(ctx, `"${state.chronicleProse}"`, w - pad * 2);
    for (const ln of lines.slice(0, 2)) {
      ctx.fillText(ln, snapX, hy);
      hy += 11;
    }
  }

  // ── Secondary CTA ─────────────────────────────────────────
  const btnsY = y + h - 44;
  const btnW = 148;
  const btnH = 30;
  const mapX = cx - btnW / 2;
  drawPanel(ctx, mapX, btnsY, btnW, btnH, 'rgba(12,8,4,0.97)', 0.7, 6);
  ctx.textAlign = 'center';
  ctx.font = 'bold 10px monospace';
  ctx.fillStyle = '#c0a060';
  ctx.fillText('COMMAND MAP', cx, btnsY + 19);
  btnsOut.push({ x: mapX, y: btnsY, w: btnW, h: btnH, action: 'commandMap' });

  ctx.font = '7px monospace';
  ctx.fillStyle = 'rgba(140,120,80,0.45)';
  ctx.fillText(getWarCampTabHint(state.tabPulseTarget), cx, btnsY - 8);

  ctx.restore();
  return { btnsY };
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
  if (prepMeta?.westGateScarred && !prepMeta?.westGateRepaired) {
    const woodHint = (prepMeta.wood ?? 0) >= 10 ? ' — tap Repair in prep' : '';
    lines.push({
      text: `⚠ West gate scarred — mend in fortress prep${woodHint}`,
      color: 'rgba(220,140,60,0.88)',
    });
  } else if (prepMeta?.westGateRepaired) {
    lines.push({ text: '✓ West gate bears a patch', color: 'rgba(140,180,120,0.72)' });
  }
  if ((prepMeta?.wood ?? 0) > 0) {
    lines.push({
      text: `▣ ${prepMeta.wood} salvage wood ready`,
      color: 'rgba(160,130,90,0.78)',
    });
  }
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
