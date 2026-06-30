/**
 * Bottom-right battle minimap — fortress schematic with live unit dots.
 */

const PANEL_PAD = 6;
const MAP_INSET = 4;

function drawPanel(ctx, x, y, w, h) {
  ctx.save();
  ctx.fillStyle = 'rgba(6,4,12,0.88)';
  ctx.strokeStyle = 'rgba(180,130,50,0.55)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 4);
  ctx.fill();
  ctx.stroke();
  ctx.font = 'bold 6px monospace';
  ctx.fillStyle = 'rgba(200,170,110,0.65)';
  ctx.textAlign = 'left';
  ctx.fillText('MAP', x + 6, y + 9);
  ctx.font = '5px monospace';
  ctx.fillStyle = 'rgba(160,140,90,0.42)';
  ctx.textAlign = 'right';
  ctx.fillText('tap', x + w - 6, y + 9);
  ctx.restore();
}

function worldToMinimap(wx, wy, mapX, mapY, mapW, mapH, worldW, worldH) {
  return {
    x: mapX + (wx / worldW) * mapW,
    y: mapY + (wy / worldH) * mapH,
  };
}

/**
 * @param {object} opts
 * @param {number} opts.x - panel outer x
 * @param {number} opts.y - panel outer y
 * @param {number} opts.w - panel width
 * @param {number} opts.h - panel height
 * @param {number} opts.worldWidth
 * @param {number} opts.worldHeight
 * @param {number} opts.viewportWidth - visible playfield width (screen px)
 * @param {number} opts.viewportHeight
 * @param {number} opts.viewLeft - world-space left edge of viewport (unscaled)
 * @param {number} opts.viewTop
 * @param {number} opts.zoom
 * @param {{col:number,row:number}} opts.goal
 * @param {{col:number,row:number}} opts.spawn
 * @param {number} opts.cellSize
 * @param {number} opts.padX
 * @param {number} opts.padY
 * @param {Array<{x:number,y:number,type?:string,defenderId?:string}>} opts.towers
 * @param {Array<{x:number,y:number,alive?:boolean,reached?:boolean,isBoss?:boolean}>} opts.enemies
 */
export function drawBattleMinimap(ctx, opts) {
  const {
    x, y, w, h,
    worldWidth, worldHeight,
    viewportWidth, viewportHeight,
    viewLeft, viewTop, zoom,
    goal, spawn, cellSize, padX, padY,
    towers = [], enemies = [],
  } = opts;

  drawPanel(ctx, x, y, w, h);

  const mapX = x + MAP_INSET;
  const mapY = y + 12;
  const mapW = w - MAP_INSET * 2;
  const mapH = h - 14 - MAP_INSET;

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(mapX, mapY, mapW, mapH, 2);
  ctx.clip();

  ctx.fillStyle = '#1a2818';
  ctx.fillRect(mapX, mapY, mapW, mapH);

  const gx = padX + (goal?.col ?? 0) * cellSize + cellSize / 2;
  const gy = padY + (goal?.row ?? 0) * cellSize + cellSize / 2;
  const g = worldToMinimap(gx, gy, mapX, mapY, mapW, mapH, worldWidth, worldHeight);
  const ringR = Math.min(mapW, mapH) * 0.17;

  ctx.strokeStyle = 'rgba(90,72,48,0.55)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(g.x, g.y, ringR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(g.x, g.y, ringR * 0.55, 0, Math.PI * 2);
  ctx.stroke();

  if (spawn) {
    const sx = opts.spawnWorldX ?? (padX + spawn.col * cellSize + cellSize / 2);
    const sy = opts.spawnWorldY ?? (padY + spawn.row * cellSize + cellSize / 2);
    const s = worldToMinimap(sx, sy, mapX, mapY, mapW, mapH, worldWidth, worldHeight);
    ctx.strokeStyle = 'rgba(180,100,60,0.45)';
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(g.x, g.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  for (const e of enemies) {
    if (!e.alive || e.reached) continue;
    const p = worldToMinimap(padX + e.x, padY + e.y, mapX, mapY, mapW, mapH, worldWidth, worldHeight);
    ctx.fillStyle = e.isBoss ? '#ff6040' : '#e84040';
    ctx.beginPath();
    ctx.arc(p.x, p.y, e.isBoss ? 2.5 : 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const t of towers) {
    const p = worldToMinimap(padX + t.x, padY + t.y, mapX, mapY, mapW, mapH, worldWidth, worldHeight);
    const isHero = !!t.defenderId;
    ctx.fillStyle = isHero ? '#60c0ff' : '#c0a050';
    ctx.beginPath();
    ctx.arc(p.x, p.y, isHero ? 2.2 : 1.6, 0, Math.PI * 2);
    ctx.fill();
  }

  const vx = viewLeft;
  const vy = viewTop;
  const vw = viewportWidth / zoom;
  const vh = viewportHeight / zoom;
  const v0 = worldToMinimap(vx, vy, mapX, mapY, mapW, mapH, worldWidth, worldHeight);
  const v1 = worldToMinimap(vx + vw, vy + vh, mapX, mapY, mapW, mapH, worldWidth, worldHeight);
  ctx.strokeStyle = 'rgba(255,220,120,0.85)';
  ctx.lineWidth = 1;
  ctx.strokeRect(v0.x, v0.y, v1.x - v0.x, v1.y - v0.y);

  ctx.restore();
}

export function getMinimapMapRect(panel) {
  return {
    x: panel.x + MAP_INSET,
    y: panel.y + 12,
    w: panel.w - MAP_INSET * 2,
    h: panel.h - 14 - MAP_INSET,
  };
}

export function minimapLayout(playfieldRight, playfieldBottom, panelW = 108, panelH = 88) {
  return {
    x: playfieldRight - panelW - PANEL_PAD,
    y: playfieldBottom - panelH - PANEL_PAD,
    w: panelW,
    h: panelH,
  };
}
