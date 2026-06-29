/**
 * Assault combat panels — deployed field roster (left) and status HP bars.
 */
import { UI_COLORS, hexRgb } from './uiTheme.js';

/** Gradient HP bar for dock overlay cards. */
export function drawPanelHpBar(ctx, x, y, w, h, frac, accent) {
  const f = Math.max(0, Math.min(1, frac));
  ctx.fillStyle = 'rgba(0,0,0,0.58)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, h / 2);
  ctx.fill();

  if (f <= 0.001) return;

  const col = accent ?? (f > 0.55 ? UI_COLORS.fortress : f > 0.28 ? UI_COLORS.gold : UI_COLORS.threat);
  const { r, g, b } = hexRgb(col);
  const grad = ctx.createLinearGradient(x, y, x + w, y);
  grad.addColorStop(0, `rgba(${r},${g},${b},0.75)`);
  grad.addColorStop(1, `rgba(${Math.min(255, r + 40)},${Math.min(255, g + 30)},${b},0.95)`);
  ctx.fillStyle = grad;
  if (f > 0.92) {
  }
  ctx.beginPath();
  ctx.roundRect(x, y, Math.max(h, w * f), h, h / 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

/** In-field HP bar width — matches hero bars at default cell size (14 × 0.9). */
export const COMBAT_FIELD_HP_W = 12.6;

export function combatFieldHpBarHeight(frac) {
  return frac < 0.25 ? 4 : 3;
}

export function combatFieldHpAccent(frac) {
  const f = Math.max(0, Math.min(1, frac));
  return f > 0.5 ? UI_COLORS.fortress : f > 0.25 ? UI_COLORS.gold : UI_COLORS.threat;
}

/**
 * Slim rounded combat HP bar — shared by pathless heroes and enemies.
 * @param {{ dimAtFull?: boolean, forceShow?: boolean }} opts
 */
export function drawCombatFieldHpBar(ctx, cx, by, frac, accent, opts = {}) {
  const f = Math.max(0, Math.min(1, frac));
  const barW = COMBAT_FIELD_HP_W;
  const barH = combatFieldHpBarHeight(f);
  const bx = cx - barW / 2;
  const col = accent ?? combatFieldHpAccent(f);
  const showFill = f < 1.0 || opts.forceShow;
  const dimTray = opts.dimAtFull && !showFill;

  ctx.save();
  if (dimTray) ctx.globalAlpha = 0.32;
  drawPanelHpBar(ctx, bx, by, barW, barH, showFill ? f : 0, col);
  ctx.restore();

  if (f < 0.25 && f > 0) {
    const pulse = 0.5 + Math.sin(performance.now() * 0.012) * 0.5;
    ctx.strokeStyle = `rgba(169,50,38,${0.35 + pulse * 0.45})`;
    ctx.lineWidth = 0.8;
    ctx.strokeRect(bx - 1, by - 1, barW + 2, barH + 2);
  }
  return { w: barW, h: barH, bx, by };
}

export function getHeroHpFrac(tower) {
  if (tower.combatMaxHp == null || tower.combatMaxHp <= 0) return 1;
  return Math.max(0, (tower.combatHp ?? 0) / tower.combatMaxHp);
}

export function getStructureHpFrac(tower, getStructureCombatHp) {
  const max = tower.structureMaxHp ?? getStructureCombatHp?.(tower.type, tower.level ?? 1) ?? 1;
  const hp = tower.structureHp ?? max;
  return Math.max(0, Math.min(1, hp / Math.max(1, max)));
}

export function getFieldUnitStatus(tower, isHero) {
  if (isHero) {
    const cd = (tower.fireCooldown ?? 0) / Math.max(1, tower.fireRate ?? 1);
    if ((tower.combatHp ?? 1) <= 0) return { label: 'FALLEN', color: UI_COLORS.threat };
    if (tower.type === 'hydda') {
      const healed = tower.healDone ?? 0;
      if (healed > 0) return { label: `HEAL +${healed}`, color: UI_COLORS.fortress };
      return { label: 'SUPPORT', color: UI_COLORS.magic };
    }
    if (cd < 0.1) return { label: 'READY', color: UI_COLORS.fortress };
    if (cd < 0.55) return { label: 'ENGAGED', color: UI_COLORS.warband };
    return { label: 'RELOAD', color: 'rgba(232,215,181,0.55)' };
  }
  const cd = (tower.fireCooldown ?? 0) / Math.max(1, tower.fireRate ?? 1);
  if (cd < 0.12) return { label: 'READY', color: UI_COLORS.fortress };
  return { label: 'FIRING', color: UI_COLORS.gold };
}

/**
 * Compact deployed-unit overlay card. Returns card height used.
 * drawMiniPortrait(id, x, y, type, r) injected from game.js.
 */
export function drawDeployedFieldCard(ctx, x, y, w, h, unit, opts) {
  const {
    isHero,
    isSelected,
    glowRgb,
    label,
    sublabel,
    hpFrac,
    status,
    drawMiniPortrait,
    rightStat,
  } = opts;

  const rgb = glowRgb ?? '74,111,165';
  ctx.fillStyle = isSelected ? `rgba(${rgb},0.22)` : `rgba(${rgb},0.10)`;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 4);
  ctx.fill();
  ctx.strokeStyle = isSelected ? `rgba(${rgb},0.90)` : `rgba(${rgb},0.28)`;
  ctx.lineWidth = isSelected ? 1.2 : 0.7;
  ctx.stroke();

  ctx.fillStyle = `rgba(${rgb},0.75)`;
  ctx.beginPath();
  ctx.roundRect(x, y, 3, h, [4, 0, 0, 4]);
  ctx.fill();

  const avX = x + 14;
  const avY = y + h / 2 + 1;
  if (drawMiniPortrait) drawMiniPortrait(avX, avY, unit.type, Math.min(9, h * 0.32));

  const tx = x + 26;
  ctx.textAlign = 'left';
  ctx.font = 'bold 7px monospace';
  ctx.fillStyle = UI_COLORS.parchment;
  ctx.fillText(label.length > 11 ? `${label.slice(0, 10)}…` : label, tx, y + 9);

  ctx.font = '5.5px monospace';
  ctx.fillStyle = `rgba(${rgb},0.55)`;
  ctx.fillText(sublabel ?? '', tx, y + 17);

  ctx.font = 'bold 5.5px monospace';
  ctx.fillStyle = status.color;
  ctx.fillText(status.label, tx, y + h - 5);

  if (rightStat) {
    ctx.font = 'bold 6px monospace';
    ctx.textAlign = 'right';
    ctx.fillStyle = `rgba(${rgb},0.80)`;
    ctx.fillText(rightStat, x + w - 5, y + 10);
    ctx.textAlign = 'left';
  }

  const barY = y + h - 11;
  const barW = w - 30;
  drawPanelHpBar(ctx, tx, barY, barW, 4, hpFrac);

  return h + 2;
}
