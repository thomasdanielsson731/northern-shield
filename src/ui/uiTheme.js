/**
 * Northern Shield UI palette — from colorsandtopbar.png (War Room concept).
 * Dark medieval fantasy: epic, nordic, grim but readable. High contrast, not neon.
 */

export const UI_COLORS = {
  gold:      '#D4AF37', // campaign
  threat:    '#A93226', // blood red
  fortress:  '#2E7D32', // ramparts / ready
  warband:   '#4A6FA5', // heroes / battle
  magic:     '#7E57C2', // runes
  iron:      '#2B2F36', // neutral panels
  parchment: '#E8D7B5', // accent text
};

/** Parse #RRGGBB to r,g,b for rgba strings. */
export function hexRgb(hex) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

/** War Room top bar — iron panel with gold corner trims and bottom accent. */
export function drawWarRoomBarBg(ctx, x, y, w, h, opacity = 1) {
  const { r, g, b } = hexRgb(UI_COLORS.iron);
  const o = Math.max(0, Math.min(1, opacity));

  // Drop shadow under bar
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.65)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = `rgba(${r},${g},${b},${0.98 * o})`;
  ctx.fillRect(x, y, w, h);
  ctx.restore();

  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, `rgba(${r + 28},${g + 24},${b + 30},${o})`);
  grad.addColorStop(0.35, `rgba(${r + 8},${g + 6},${b + 10},${0.98 * o})`);
  grad.addColorStop(1, `rgba(${Math.max(0, r - 6)},${Math.max(0, g - 4)},${Math.max(0, b - 2)},${o})`);
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);

  // Gold frame outline — makes palette change obvious vs old dark glass
  ctx.strokeStyle = UI_COLORS.gold;
  ctx.lineWidth = 1.2;
  ctx.globalAlpha = 0.92 * o;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.globalAlpha = 1;

  // subtle horizontal grain
  ctx.save();
  ctx.globalAlpha = 0.09;
  ctx.strokeStyle = UI_COLORS.parchment;
  ctx.lineWidth = 0.5;
  for (let gy = y + 4; gy < y + h; gy += 5) {
    ctx.beginPath();
    ctx.moveTo(x + 3, gy);
    ctx.lineTo(x + w - 3, gy);
    ctx.stroke();
  }
  ctx.restore();

  // gold corner L-brackets
  const cl = Math.min(16, h - 3);
  ctx.save();
  ctx.strokeStyle = UI_COLORS.gold;
  ctx.lineWidth = 1.6;
  ctx.shadowColor = 'rgba(212,175,55,0.55)';
  ctx.shadowBlur = 4;
  const corners = [
    [[x, y + cl], [x, y], [x + cl, y]],
    [[x + w, y + cl], [x + w, y], [x + w - cl, y]],
  ];
  for (const [a, b, c] of corners) {
    ctx.beginPath();
    ctx.moveTo(...a);
    ctx.lineTo(...b);
    ctx.lineTo(...c);
    ctx.stroke();
  }
  ctx.restore();

  // bottom gold separator
  const sg = ctx.createLinearGradient(x, 0, x + w, 0);
  sg.addColorStop(0, 'rgba(212,175,55,0)');
  sg.addColorStop(0.12, 'rgba(212,175,55,0.85)');
  sg.addColorStop(0.88, 'rgba(212,175,55,0.85)');
  sg.addColorStop(1, 'rgba(212,175,55,0)');
  ctx.strokeStyle = sg;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(x, y + h - 1);
  ctx.lineTo(x + w, y + h - 1);
  ctx.stroke();
}

/** Compact stat chip — icon + value on top, label below. */
export function drawTopStatChip(ctx, x, y, w, h, { icon, value, label, accent, pulse = 1 }) {
  const { r, g, b } = hexRgb(UI_COLORS.iron);
  ctx.fillStyle = `rgba(${r},${g},${b},0.94)`;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 3);
  ctx.fill();

  const ac = hexRgb(accent);
  ctx.strokeStyle = `rgba(${ac.r},${ac.g},${ac.b},${0.35 + pulse * 0.25})`;
  ctx.lineWidth = 0.8;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.font = 'bold 7.5px monospace';
  ctx.fillStyle = accent;
  ctx.globalAlpha = 0.55 + pulse * 0.45;
  ctx.fillText(icon, x + 4, y + 11);
  ctx.fillText(value, x + 13, y + 11);
  ctx.globalAlpha = 1;

  ctx.font = '5px monospace';
  ctx.fillStyle = 'rgba(232,215,181,0.50)';
  ctx.fillText(label, x + 4, y + h - 2);
}

/** Two-line title block for left / center sections. */
export function drawTopBarTextBlock(ctx, x, y, line1, line2, { line1Color, line2Color, align = 'left' }) {
  ctx.textAlign = align;
  ctx.font = 'bold 8px monospace';
  ctx.fillStyle = line1Color;
  ctx.fillText(line1, x, y);
  if (line2) {
    ctx.font = '6.5px monospace';
    ctx.fillStyle = line2Color;
    ctx.fillText(line2, x, y + 9);
  }
}

/** Simple heraldic shield for the war-room header. */
export function drawTopBarShield(ctx, cx, cy, size, fill = UI_COLORS.warband) {
  const s = size;
  ctx.save();
  ctx.fillStyle = fill;
  ctx.strokeStyle = UI_COLORS.gold;
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(cx, cy - s);
  ctx.lineTo(cx + s * 0.85, cy - s * 0.55);
  ctx.lineTo(cx + s * 0.7, cy + s * 0.35);
  ctx.quadraticCurveTo(cx, cy + s * 0.95, cx - s * 0.7, cy + s * 0.35);
  ctx.lineTo(cx - s * 0.85, cy - s * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.font = 'bold 7px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = UI_COLORS.gold;
  ctx.fillText('✦', cx, cy + 2);
  ctx.restore();
}

/** Compact campaign meta screens — sits below frame, above content. */
export const META_TOP_BAR_COMPACT_H = 28;

/** War Room header strip for campaign meta screens (select, command map, War Camp, debrief). */
export function drawMetaTopBar(ctx, baseW, frameThick, { subtitle, center, chips = [], compact = true }) {
  const ph = compact ? META_TOP_BAR_COMPACT_H : 40;
  const y = frameThick;
  const w = baseW - frameThick * 2;
  drawWarRoomBarBg(ctx, frameThick, y, w, ph);
  const barMid = y + Math.round(ph / 2);
  const shieldR = compact ? 5 : 7;
  const textY1 = barMid - (compact ? 2 : 4);
  const textY2 = compact ? barMid + 5 : barMid + 6;

  drawTopBarShield(ctx, frameThick + 12, barMid, shieldR);
  ctx.textAlign = 'left';
  ctx.font = compact ? 'bold 7.5px monospace' : 'bold 8px monospace';
  ctx.fillStyle = UI_COLORS.gold;
  ctx.fillText('NORTHERN SHIELD', frameThick + 24, textY1);
  if (subtitle) {
    ctx.font = compact ? '6px monospace' : '6.5px monospace';
    ctx.fillStyle = 'rgba(232,215,181,0.55)';
    ctx.fillText(subtitle, frameThick + 24, textY2);
  }

  if (center?.line1) {
    ctx.textAlign = 'center';
    ctx.font = compact ? 'bold 7.5px monospace' : 'bold 8px monospace';
    ctx.fillStyle = center.color ?? UI_COLORS.parchment;
    ctx.fillText(center.line1, baseW / 2, textY1);
    if (center.line2) {
      ctx.font = compact ? '6px monospace' : '6.5px monospace';
      ctx.fillStyle = center.line2Color ?? 'rgba(232,215,181,0.55)';
      ctx.fillText(center.line2, baseW / 2, textY2);
    }
  }

  const chipH = ph - 6;
  const chipY = y + 3;
  let chipRight = baseW - frameThick - 6;
  for (let i = chips.length - 1; i >= 0; i--) {
    const c = chips[i];
    drawTopStatChip(ctx, chipRight - c.w, chipY, c.w, chipH, c);
    chipRight -= c.w + 4;
  }
}
