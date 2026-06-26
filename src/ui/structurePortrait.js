/**
 * Procedural structure icons for build dock (no PNG required).
 */
import { UI_COLORS } from './uiTheme.js';

export function drawProceduralStructureIcon(ctx, cx, cy, itemId, size, affordable = true) {
  const a = affordable ? 1 : 0.42;
  const s = size * 0.42;
  ctx.save();
  ctx.globalAlpha = a;

  if (itemId === 'ballista') {
    ctx.fillStyle = '#5a4838';
    ctx.fillRect(cx - s, cy - 2, s * 2, 4);
    ctx.fillRect(cx - 2, cy - s * 0.75, 4, s * 1.1);
    ctx.fillStyle = UI_COLORS.gold;
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.4, cy);
    ctx.lineTo(cx + s * 1.1, cy - 5);
    ctx.lineTo(cx + s * 1.1, cy + 5);
    ctx.closePath();
    ctx.fill();
  } else if (itemId === 'watchtower') {
    ctx.fillStyle = '#4a3828';
    ctx.fillRect(cx - s * 0.35, cy - s * 0.2, s * 0.7, s * 0.9);
    ctx.fillStyle = UI_COLORS.fortress;
    ctx.beginPath();
    ctx.moveTo(cx, cy - s);
    ctx.lineTo(cx + s * 0.55, cy - s * 0.15);
    ctx.lineTo(cx - s * 0.55, cy - s * 0.15);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(232,215,181,0.5)';
    ctx.fillRect(cx - 3, cy - s * 0.55, 6, 5);
  } else if (itemId === 'mine') {
    ctx.fillStyle = '#3a3020';
    ctx.beginPath();
    ctx.arc(cx, cy + s * 0.15, s * 0.55, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = UI_COLORS.gold;
    ctx.beginPath();
    ctx.arc(cx, cy - s * 0.1, s * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#806020';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, cy - s * 0.45);
    ctx.lineTo(cx, cy - s * 0.75);
    ctx.stroke();
  } else if (itemId === 'barracks') {
    ctx.fillStyle = UI_COLORS.warband;
    ctx.fillRect(cx - s * 0.7, cy - s * 0.35, s * 1.4, s * 0.85);
    ctx.fillStyle = UI_COLORS.gold;
    ctx.fillRect(cx - s * 0.25, cy - s * 0.55, s * 0.5, s * 0.25);
    ctx.fillStyle = 'rgba(232,215,181,0.45)';
    ctx.fillRect(cx - s * 0.5, cy - s * 0.1, s * 0.35, s * 0.35);
    ctx.fillRect(cx + s * 0.15, cy - s * 0.1, s * 0.35, s * 0.35);
  } else if (itemId === 'runeshrine') {
    ctx.strokeStyle = UI_COLORS.magic;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(cx, cy, s * 0.55, 0, Math.PI * 2);
    ctx.stroke();
    ctx.font = `bold ${Math.floor(size * 0.38)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = UI_COLORS.magic;
    ctx.fillText('ᛟ', cx, cy + 1);
    ctx.textBaseline = 'alphabetic';
  } else if (itemId === 'gate') {
    ctx.fillStyle = '#5a4028';
    ctx.fillRect(cx - s * 0.6, cy - s * 0.5, s * 1.2, s * 0.95);
    ctx.strokeStyle = UI_COLORS.gold;
    ctx.lineWidth = 1.4;
    ctx.strokeRect(cx - s * 0.6, cy - s * 0.5, s * 1.2, s * 0.95);
    ctx.fillStyle = 'rgba(20,12,6,0.55)';
    ctx.fillRect(cx - s * 0.14, cy - s * 0.08, s * 0.28, s * 0.38);
    ctx.fillStyle = 'rgba(232,215,181,0.25)';
    ctx.fillRect(cx - s * 0.5, cy - s * 0.38, s * 0.18, s * 0.22);
    ctx.fillRect(cx + s * 0.32, cy - s * 0.38, s * 0.18, s * 0.22);
    const badgeR = s * 0.28;
    ctx.fillStyle = 'rgba(180,40,30,0.92)';
    ctx.beginPath();
    ctx.arc(cx, cy - s * 0.62, badgeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffd080';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.font = `bold ${Math.floor(size * 0.24)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff8e8';
    ctx.fillText('P', cx, cy - s * 0.62);
    ctx.textBaseline = 'alphabetic';
  } else if (itemId === 'catapult') {
    ctx.fillStyle = '#4a3828';
    ctx.fillRect(cx - s * 0.5, cy + s * 0.1, s * 1.0, s * 0.25);
    ctx.strokeStyle = '#5a4838';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx - s * 0.35, cy + s * 0.1, s * 0.35, Math.PI, 0);
    ctx.stroke();
    ctx.fillStyle = UI_COLORS.gold;
    ctx.beginPath();
    ctx.arc(cx + s * 0.45, cy - s * 0.15, s * 0.22, 0, Math.PI * 2);
    ctx.fill();
  } else if (itemId === 'piltorn') {
    ctx.fillStyle = '#3a4a38';
    ctx.fillRect(cx - s * 0.2, cy - s * 0.15, s * 0.4, s * 0.95);
    ctx.fillStyle = UI_COLORS.fortress;
    ctx.beginPath();
    ctx.moveTo(cx, cy - s * 0.85);
    ctx.lineTo(cx + s * 0.42, cy - s * 0.1);
    ctx.lineTo(cx - s * 0.42, cy - s * 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = UI_COLORS.gold;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.55, cy + s * 0.35);
    ctx.lineTo(cx + s * 0.55, cy + s * 0.35);
    ctx.stroke();
  } else if (itemId === 'drakship') {
    ctx.fillStyle = '#2a3848';
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.65, cy + s * 0.2);
    ctx.lineTo(cx + s * 0.55, cy + s * 0.05);
    ctx.lineTo(cx + s * 0.35, cy - s * 0.25);
    ctx.lineTo(cx - s * 0.45, cy - s * 0.15);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = UI_COLORS.magic;
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.2, cy - s * 0.35);
    ctx.lineTo(cx + s * 0.05, cy - s * 0.75);
    ctx.lineTo(cx + s * 0.25, cy - s * 0.3);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.font = `${Math.floor(size * 0.50)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = UI_COLORS.parchment;
    ctx.fillText('◆', cx, cy + 1);
    ctx.textBaseline = 'alphabetic';
  }

  ctx.restore();
}
