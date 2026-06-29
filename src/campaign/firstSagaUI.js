/**
 * First Saga command map + settlement ceremony canvas UI.
 */

import {
  FIRST_SAGA_ASSAULTS,
  FIRST_SAGA_SETTLEMENT,
  FIRST_SAGA_DISPLAY_NODE_COUNT,
  FIRST_SAGA_A4_NODE,
  isFirstSagaSettlementReady,
  isFirstSagaSettlementComplete,
  getFirstSagaRecruitTypes,
} from './firstSaga.js';
import {
  SETTLEMENT_STAGES,
  SETTLEMENT_STAGE_COUNT,
} from './settlementCeremony.js';
import { isAssaultUnlocked } from './campaignFronts.js';
import {
  getStoneFlashAlpha,
  getSettlementStepGlow,
  getHeroNamingGlow,
} from '../ui/settlementJuice.js';
import { drawCampaignArtCover, drawAssaultNodeIcon } from '../assets/campaignArt.js';
import { drawFortressPrepSprite } from '../preparation/fortressPrepArt.js';
import { getCommandMapArtKey, resolveCommandMapNodePositions } from './commandMapLayout.js';

function drawPanel(ctx, x, y, w, h, fillStyle, borderAlpha = 0.7, radius = 8) {
  ctx.fillStyle = fillStyle;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fill();
  ctx.strokeStyle = `rgba(200,160,80,${borderAlpha})`;
  ctx.lineWidth = 1;
  ctx.stroke();
}

/** Linear west-road command map (6 nodes). Mutates btnsOut. */
export function drawFirstSagaCommandMap(ctx, {
  mapX, mapY, mapW, mapH,
  progress, mapIndex, run,
  btnsOut,
  settlementDone = false,
}) {
  const cx = mapX + mapW / 2;
  const artKey = getCommandMapArtKey(mapIndex) ?? 'commandMapRegion1';
  const hasArt = drawCampaignArtCover(ctx, artKey, mapX, mapY, mapW, mapH, 0.72);
  const layoutPts = resolveCommandMapNodePositions(mapIndex, mapX, mapY, mapW, mapH);

  ctx.font = 'bold 10px monospace';
  ctx.fillStyle = 'rgba(160,140,90,0.65)';
  ctx.textAlign = 'center';
  ctx.fillText('REGION 1 — ASH FEN · WEST ROAD', cx, mapY + 22);

  const nextAssault = FIRST_SAGA_ASSAULTS.find(a =>
    isAssaultUnlocked(progress, mapIndex, a.nodeIndex)
    && !run.nodesCleared.includes(a.nodeIndex)
    && !FIRST_SAGA_ASSAULTS.some(b =>
      b.nodeIndex < a.nodeIndex && !run.nodesCleared.includes(b.nodeIndex),
    ),
  );
  if (nextAssault) {
    const pulse = 0.55 + Math.sin(performance.now() * 0.005) * 0.25;
    ctx.font = '7px monospace';
    ctx.fillStyle = `rgba(240,200,100,${pulse})`;
    ctx.fillText(`NEXT → ${nextAssault.codename.toUpperCase()} · tap highlighted node`, cx, mapY + 36);
  }

  const roadY = mapY + mapH * 0.55;
  const roadX0 = mapX + 36;
  const roadX1 = mapX + mapW - 36;
  const step = (roadX1 - roadX0) / (FIRST_SAGA_DISPLAY_NODE_COUNT - 1);

  if (!layoutPts) {
    ctx.strokeStyle = 'rgba(80,100,60,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(roadX0, roadY);
    ctx.lineTo(roadX1, roadY);
    ctx.stroke();
  } else {
    ctx.strokeStyle = 'rgba(80,100,60,0.22)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < layoutPts.length; i++) {
      const p = layoutPts[i];
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }

  const settlementReady = isFirstSagaSettlementReady(progress, mapIndex);

  const nodes = [
    ...FIRST_SAGA_ASSAULTS.map(a => ({ ...a, kind: 'assault' })),
    { ...FIRST_SAGA_SETTLEMENT, kind: 'settlement' },
  ];

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const pt = layoutPts?.[i];
    const nx = pt?.x ?? (roadX0 + i * step);
    const ny = pt?.y ?? roadY;
    const nodeR = pt?.r ? Math.max(11, Math.min(18, pt.r * 0.85)) : (node.kind === 'settlement' ? 16 : 13);
    const cleared = node.kind === 'assault'
      ? run.nodesCleared.includes(node.nodeIndex)
      : settlementDone;
    const unlocked = node.kind === 'assault'
      ? isAssaultUnlocked(progress, mapIndex, node.nodeIndex)
      : settlementReady;
    const isNext = node.kind === 'assault'
      && unlocked && !cleared
      && !FIRST_SAGA_ASSAULTS.some(a =>
        a.nodeIndex < node.nodeIndex
        && !run.nodesCleared.includes(a.nodeIndex)
      );
    const isSettlementNext = node.kind === 'settlement' && settlementReady && !settlementDone;

    const r = nodeR;
    ctx.beginPath();
    ctx.arc(nx, ny, r, 0, Math.PI * 2);
    const artFill = hasArt ? 0.62 : 1;
    if (cleared) {
      ctx.fillStyle = `rgba(40,80,40,${0.9 * artFill})`;
      ctx.strokeStyle = 'rgba(100,200,100,0.7)';
    } else if (isNext || isSettlementNext) {
      const pulse = 0.5 + Math.sin(performance.now() * 0.006) * 0.3;
      ctx.fillStyle = `rgba(80,60,20,${(0.85 + pulse * 0.1) * artFill})`;
      ctx.strokeStyle = `rgba(200,170,100,${0.45 + pulse * 0.25})`;
    } else if (unlocked) {
      ctx.fillStyle = `rgba(30,28,18,${0.92 * artFill})`;
      ctx.strokeStyle = 'rgba(180,150,90,0.5)';
    } else {
      ctx.fillStyle = `rgba(18,16,12,${0.85 * artFill})`;
      ctx.strokeStyle = 'rgba(60,50,35,0.35)';
    }
    ctx.fill();
    ctx.lineWidth = isNext || isSettlementNext ? 2 : 1;
    ctx.stroke();

    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = cleared ? '#90e080' : (isNext || isSettlementNext) ? '#f0d060' : '#807060';
    const label = node.kind === 'settlement' ? 'OATH' : `A${node.nodeIndex}`;
    ctx.fillText(label, nx, ny + 3);

    ctx.font = '7px monospace';
    ctx.fillStyle = cleared ? 'rgba(120,180,100,0.75)' : 'rgba(160,140,100,0.65)';
    ctx.fillText(node.codename, nx, ny + r + 14);
    drawAssaultNodeIcon(ctx, i, nx, ny - r - 4, 18);

    const hitW = Math.max(52, r * 4.2);
    const hitH = Math.max(48, r * 3.8);
    const hx = nx - hitW / 2;
    const hy = ny - hitH / 2;
    if (node.kind === 'assault' && unlocked && !cleared) {
      btnsOut.push({ x: hx, y: hy, w: hitW, h: hitH, action: 'attack', nodeIndex: node.nodeIndex });
    }
    if (node.kind === 'settlement' && settlementReady && !settlementDone) {
      btnsOut.push({ x: hx, y: hy, w: hitW, h: hitH, action: 'settlement' });
    }
  }

  ctx.font = '7px monospace';
  ctx.fillStyle = 'rgba(140,120,80,0.5)';
  ctx.fillText('One road · six beats · the saga begins here', cx, mapY + mapH - 14);
}

/** Full-screen settlement ceremony. Mutates btnsOut. */
export function drawSettlementCeremony(ctx, W, H, {
  step,
  recruitType,
  nameDraft,
  btnsOut,
  settlementComplete,
  stoneFlash = 0,
}) {
  const fade = 1;
  ctx.save();
  ctx.globalAlpha = fade * 0.92;
  if (!drawCampaignArtCover(ctx, 'ceremonySettlement', 0, 0, W, H, 0.85)) {
    ctx.fillStyle = 'rgba(4,2,8,1)';
    ctx.fillRect(0, 0, W, H);
  }
  ctx.globalAlpha = 1;

  if (stoneFlash > 0) {
    const a = getStoneFlashAlpha(stoneFlash);
    ctx.fillStyle = `rgba(255,248,220,${a})`;
    ctx.fillRect(0, 0, W, H);
  }

  if (step >= SETTLEMENT_STAGE_COUNT) return;

  const stage = SETTLEMENT_STAGES[step];
  const panW = 440;
  const panH = step === 3 ? 300 : 260;
  const panX = Math.round((W - panW) / 2);
  const panY = Math.round((H - panH) / 2) - 10;

  if (step === 1) {
    const glow = getSettlementStepGlow(performance.now());
    ctx.fillStyle = `rgba(200,210,230,${glow})`;
    ctx.fillRect(panX - 20, panY - 20, panW + 40, panH + 40);
  }

  drawPanel(ctx, panX, panY, panW, panH, 'rgba(8,4,18,0.99)');
  const hx = panX + panW / 2;
  let hy = panY + 28;

  if (step === 1) {
    const gateBox = { x: hx - 70, y: panY + panH - 100, w: 140, h: 90 };
    drawFortressPrepSprite(ctx, 'westGateStoneCeremony', gateBox);
  }

  ctx.textAlign = 'center';
  ctx.font = 'bold 11px monospace';
  ctx.fillStyle = 'rgba(160,130,80,0.55)';
  ctx.fillText(stage.title.toUpperCase(), hx, hy);
  hy += 22;

  ctx.font = '9px monospace';
  ctx.fillStyle = 'rgba(210,190,150,0.88)';
  const words = stage.prose.split(' ');
  let line = '';
  const lines = [];
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (test.length > 52) { lines.push(line); line = w; }
    else line = test;
  }
  if (line) lines.push(line);
  for (const ln of lines.slice(0, 4)) {
    ctx.fillText(ln, hx, hy);
    hy += 14;
  }
  hy += 10;

  if (step === 3) {
    const types = getFirstSagaRecruitTypes();
    const chipW = 120;
    const chipH = 36;
    const gap = 16;
    const totalW = types.length * chipW + (types.length - 1) * gap;
    let bx = hx - totalW / 2;
    const by = hy + 8;
    for (const type of types) {
      const sel = recruitType === type;
      drawPanel(ctx, bx, by, chipW, chipH, sel ? 'rgba(28,40,16,0.97)' : 'rgba(12,8,4,0.95)', 0.75, 6);
      ctx.font = 'bold 9px monospace';
      ctx.fillStyle = sel ? '#a8e070' : '#c0a060';
      ctx.fillText(type.toUpperCase(), bx + chipW / 2, by + 22);
      btnsOut.push({ x: bx, y: by, w: chipW, h: chipH, action: 'pickRecruit', recruitType: type });
      bx += chipW + gap;
    }
    hy = by + chipH + 12;
    ctx.font = '7px monospace';
    ctx.fillStyle = 'rgba(140,120,80,0.55)';
    ctx.fillText('Tap a class to continue', hx, hy);
    hy += 14;
  }

  if (step === 4) {
    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = '#e8d8b0';
    const cursor = Math.floor(performance.now() / 450) % 2 === 0 ? '|' : '';
    ctx.fillText(`${nameDraft}${cursor}`, hx, hy + 10);
    hy += 28;
    ctx.font = '7px monospace';
    ctx.fillStyle = 'rgba(140,120,80,0.5)';
    ctx.fillText('Type a name · Enter to swear', hx, hy);
    hy += 16;
  }

  if (stage.cta || (step === 3 && recruitType)) {
    const ctaLabel = step === 3 ? 'Name them' : stage.cta;
    const btnW = 160;
    const btnH = 30;
    const btnX = hx - btnW / 2;
    const btnY = panY + panH - 48;
    drawPanel(ctx, btnX, btnY, btnW, btnH, 'rgba(20,30,14,0.97)', 0.8, 6);
    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = '#90c070';
    ctx.fillText(ctaLabel, hx, btnY + 19);
    btnsOut.push({ x: btnX, y: btnY, w: btnW, h: btnH, action: 'advance' });
  }

  if (settlementComplete && step === SETTLEMENT_STAGE_COUNT - 1) {
    ctx.font = '7px monospace';
    ctx.fillStyle = 'rgba(140,200,120,0.65)';
    ctx.fillText('Region 2 — Saga II+ (locked)', hx, panY + panH - 12);
  }

  ctx.textAlign = 'left';
  ctx.restore();
}

/** Post-A0 naming ceremony — skald + name input. Mutates btnsOut. */
export function drawHeroNamingCeremony(ctx, W, H, {
  nameDraft,
  heroType = 'berserk',
  btnsOut,
  nameValid,
}) {
  ctx.save();
  if (!drawCampaignArtCover(ctx, 'ceremonyNaming', 0, 0, W, H, 0.88)) {
    ctx.fillStyle = 'rgba(4,2,8,0.96)';
    ctx.fillRect(0, 0, W, H);
  }

  const panW = 420;
  const panH = 240;
  const panX = Math.round((W - panW) / 2);
  const panY = Math.round((H - panH) / 2) - 8;
  const hx = panX + panW / 2;

  const glow = getHeroNamingGlow(performance.now());
  ctx.fillStyle = `rgba(220,180,80,${glow})`;
  ctx.fillRect(panX - 16, panY - 16, panW + 32, panH + 32);

  drawPanel(ctx, panX, panY, panW, panH, 'rgba(8,4,18,0.99)');

  let hy = panY + 26;
  ctx.textAlign = 'center';
  ctx.font = 'bold 10px monospace';
  ctx.fillStyle = 'rgba(160,130,80,0.55)';
  ctx.fillText('NAMING · SKALD', hx, hy);
  hy += 18;

  ctx.font = 'bold 13px monospace';
  ctx.fillStyle = '#e8c860';
  ctx.fillText(heroType.toUpperCase(), hx, hy);
  hy += 20;

  ctx.font = '8px monospace';
  ctx.fillStyle = 'rgba(200,175,130,0.82)';
  ctx.fillText('He held the west gate alone. The fire still burns.', hx, hy);
  hy += 16;
  ctx.fillStyle = 'rgba(210,190,150,0.88)';
  ctx.fillText('The wall will remember this name.', hx, hy);
  hy += 22;

  ctx.font = 'bold 12px monospace';
  ctx.fillStyle = '#e8d8b0';
  const cursor = Math.floor(performance.now() / 450) % 2 === 0 ? '|' : '';
  ctx.fillText(`${nameDraft}${cursor}`, hx, hy);
  hy += 20;

  ctx.font = '7px monospace';
  ctx.fillStyle = nameValid ? 'rgba(140,200,120,0.55)' : 'rgba(140,120,80,0.45)';
  ctx.fillText(nameValid ? 'Enter or click to swear' : 'At least 2 characters', hx, hy);

  const btnW = 168;
  const btnH = 30;
  const btnX = hx - btnW / 2;
  const btnY = panY + panH - 46;
  drawPanel(ctx, btnX, btnY, btnW, btnH, nameValid ? 'rgba(20,30,14,0.97)' : 'rgba(16,12,8,0.9)', 0.75, 6);
  ctx.font = 'bold 9px monospace';
  ctx.fillStyle = nameValid ? '#90c070' : 'rgba(120,100,70,0.45)';
  ctx.fillText('Swear the name', hx, btnY + 19);
  if (nameValid) {
    btnsOut.push({ x: btnX, y: btnY, w: btnW, h: btnH, action: 'confirm' });
  }

  ctx.textAlign = 'left';
  ctx.restore();
}

export { SETTLEMENT_STAGE_COUNT };
