/**
 * Per-class attack VFX — drawn on top of sprites during fireFlash / melee swing.
 */

import { drawHitSparkArt } from '../assets/combatArt.js';

export function drawTowerAttackVfx(ctx, tower, t) {
  if (tower.fireFlash <= 0) return;
  const alpha = tower.fireFlash / (tower.maxFireFlash || 8);
  const ax = tower.x;
  const ay = tower.y;
  const ang = tower.aimAngle ?? 0;

  ctx.save();

  switch (tower.type) {
    case 'berserk':
      ctx.strokeStyle = `rgba(180,110,60,${alpha * 0.85})`;
      ctx.lineWidth = 5 * alpha;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(ax, ay, (tower.range ?? 22) * 0.85, ang - 1.15, ang + 0.35);
      ctx.stroke();
      if (alpha > 0.5) {
        const sx = ax + Math.cos(ang) * 20;
        const sy = ay + Math.sin(ang) * 20;
        drawHitSparkArt(ctx, sx, sy, 14 + alpha * 6, alpha);
      }
      break;

    case 'valkyrie':
      ctx.strokeStyle = `rgba(220,190,80,${alpha * 0.85})`;
      ctx.lineWidth = 2.5 * alpha;
      ctx.beginPath();
      ctx.arc(ax, ay, tower.radius + 6 + (1 - alpha) * 10, ang - 0.5, ang + 0.5);
      ctx.stroke();
      ctx.fillStyle = `rgba(200,180,140,${alpha * 0.22})`;
      ctx.beginPath();
      ctx.moveTo(ax + Math.cos(ang) * 12, ay + Math.sin(ang) * 12);
      ctx.lineTo(ax + Math.cos(ang + 0.4) * 22, ay + Math.sin(ang + 0.4) * 22);
      ctx.lineTo(ax + Math.cos(ang - 0.4) * 22, ay + Math.sin(ang - 0.4) * 22);
      ctx.closePath();
      ctx.fill();
      break;

    case 'military':
      ctx.strokeStyle = `rgba(140,130,115,${alpha * 0.85})`;
      ctx.lineWidth = 1.5 * alpha;
      const tipX = ax + Math.cos(ang) * 28;
      const tipY = ay + Math.sin(ang) * 28;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();
      ctx.fillStyle = `rgba(170,165,150,${alpha * 0.55})`;
      ctx.beginPath();
      ctx.arc(tipX, tipY, 3 * alpha, 0, Math.PI * 2);
      ctx.fill();
      break;

    case 'hydda':
      ctx.strokeStyle = `rgba(100,130,105,${alpha * 0.70})`;
      ctx.lineWidth = 2 * alpha;
      for (let i = 0; i < 3; i++) {
        const a = ang + (i - 1) * 0.35;
        ctx.beginPath();
        ctx.arc(ax, ay, 10 + i * 6 + (1 - alpha) * 8, a - 0.2, a + 0.2);
        ctx.stroke();
      }
      break;

    case 'blondie':
      ctx.fillStyle = `rgba(160,120,110,${alpha * 0.45})`;
      for (let i = 0; i < 5; i++) {
        const a = ang + (i / 5) * Math.PI * 0.6 - 0.3;
        const r = 8 + i * 3;
        ctx.beginPath();
        ctx.arc(ax + Math.cos(a) * r, ay + Math.sin(a) * r, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      break;

    case 'isjatten':
      ctx.fillStyle = `rgba(120,135,145,${alpha * 0.30})`;
      ctx.beginPath();
      ctx.arc(ax, ay, 14 + (1 - alpha) * 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(160,170,175,${alpha * 0.70})`;
      ctx.lineWidth = 2 * alpha;
      ctx.stroke();
      break;

    case 'catapult':
    case 'piltorn':
      ctx.fillStyle = `rgba(220,140,40,${alpha * 0.5})`;
      ctx.beginPath();
      ctx.arc(ax + Math.cos(ang) * 18, ay + Math.sin(ang) * 18, 6 * alpha, 0, Math.PI * 2);
      ctx.fill();
      break;

    default:
      ctx.strokeStyle = `rgba(255,255,200,${alpha * 0.85})`;
      ctx.lineWidth = 2.5 * alpha;
      ctx.beginPath();
      ctx.arc(ax, ay, tower.radius + 2 + (tower.maxFireFlash - tower.fireFlash) * 1.5, 0, Math.PI * 2);
      ctx.stroke();
  }

  ctx.shadowBlur = 0;
  ctx.restore();
}

export function drawEnemyAttackVfx(ctx, enemy, t) {
  const timer = enemy.attackAnimTimer ?? 0;
  if (timer <= 0) return;
  const max = enemy.attackAnimMax ?? 14;
  const alpha = timer / max;
  const ax = enemy.x;
  const ay = enemy.y;
  const tx = enemy.meleeTargetX ?? ax + 10;
  const ty = enemy.meleeTargetY ?? ay;
  const ang = enemy.attackAimAngle ?? Math.atan2(ty - ay, tx - ax);
  const reach = enemy.radius * (enemy.isBoss ? 2.8 : 2.3);
  const swing = 0.55 + (1 - alpha) * 0.45;

  ctx.save();
  const pulse = 0.7 + Math.sin(t * 20) * 0.3;

  const drawMeleeSlash = (color, width, spark = false) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(
      ax + Math.cos(ang - 1.1 * swing) * reach * 0.25,
      ay + Math.sin(ang - 1.1 * swing) * reach * 0.25,
    );
    ctx.quadraticCurveTo(
      ax + Math.cos(ang) * reach * 0.72,
      ay + Math.sin(ang) * reach * 0.72,
      ax + Math.cos(ang + 0.65 * swing) * reach,
      ay + Math.sin(ang + 0.65 * swing) * reach,
    );
    ctx.stroke();
    if (spark && alpha > 0.3) {
      const sx = ax + Math.cos(ang) * reach * 0.78;
      const sy = ay + Math.sin(ang) * reach * 0.78;
      drawHitSparkArt(ctx, sx, sy, 10 + alpha * 12, alpha);
    }
  };

  switch (enemy.type) {
    case 'raider':
      drawMeleeSlash(`rgba(220,170,100,${alpha * 0.95})`, 3 * alpha, true);
      break;

    case 'warg':
      ctx.fillStyle = `rgba(160,120,80,${alpha * 0.40 * pulse})`;
      ctx.beginPath();
      ctx.ellipse(
        ax + Math.cos(ang) * reach * 0.55,
        ay + Math.sin(ang) * reach * 0.55,
        12 * alpha, 5 * alpha, ang, 0, Math.PI * 2,
      );
      ctx.fill();
      drawMeleeSlash(`rgba(200,150,90,${alpha * 0.75})`, 2 * alpha, true);
      break;

    case 'draugr':
      ctx.fillStyle = `rgba(110,100,120,${alpha * 0.45})`;
      ctx.beginPath();
      ctx.arc(ax + Math.cos(ang) * reach * 0.5, ay + Math.sin(ang) * reach * 0.5, 9 * alpha, 0, Math.PI * 2);
      ctx.fill();
      drawMeleeSlash(`rgba(180,160,200,${alpha * 0.70})`, 2.2 * alpha, true);
      break;

    default:
      if (enemy.isBoss) {
        drawMeleeSlash(`rgba(255,90,60,${alpha * 0.90})`, 4 * alpha, true);
        ctx.strokeStyle = `rgba(220,60,40,${alpha * 0.55})`;
        ctx.lineWidth = 2 * alpha;
        ctx.beginPath();
        ctx.arc(ax, ay, enemy.radius * 1.9, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        drawMeleeSlash(`rgba(255,200,120,${alpha * 0.88})`, 2.5 * alpha, true);
      }
  }

  ctx.restore();
}

/** Subtle foot dust — sells locomotion without extra sprite frames. */
export function drawEnemyWalkDust(ctx, enemy, t, bob = { yOff: 0 }) {
  if ((enemy.moveSpeed ?? 0) < 0.12) return;
  const phase = t * (enemy.strideMul ?? 1) * 4.6 + (enemy.animPhaseOff ?? 0);
  const step = Math.floor(phase) % 2;
  if (step !== 0) return;

  const nx = enemy.x;
  const ny = enemy.y + (bob.yOff ?? 0) + enemy.radius * 0.55;
  const nextPt = enemy.path && enemy.pathIndex + 1 < enemy.path.length
    ? enemy.path[enemy.pathIndex + 1] : null;
  const dx = nextPt ? nextPt.x - enemy.x : 1;
  const dy = nextPt ? nextPt.y - enemy.y : 0;
  const len = Math.hypot(dx, dy) || 1;
  const backX = nx - (dx / len) * enemy.radius * 0.9;
  const backY = ny - (dy / len) * enemy.radius * 0.5;

  ctx.save();
  ctx.globalAlpha = 0.22 + Math.min(0.18, enemy.moveSpeed * 0.08);
  const g = ctx.createRadialGradient(backX, backY, 0, backX, backY, enemy.radius * 1.1);
  g.addColorStop(0, 'rgba(120,95,70,0.55)');
  g.addColorStop(1, 'rgba(60,48,36,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(backX, backY, enemy.radius * 0.95, enemy.radius * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
