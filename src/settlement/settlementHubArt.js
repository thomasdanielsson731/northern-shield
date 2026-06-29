/**
 * Settlement hub backdrop + building hotspot sprites.
 * @see design/art/BATCH_PROMPTS.md Wave 11
 */

import { getHubContentDestRect, getHubPlayfield, HUB_ART_CONTENT, HUB_ART_H, HUB_ART_W } from './settlementHubLayout.js';

const HUB_ART_SRC = {
  backdrop: '/assets/ui/ui_settlement_hub_bg_age1@960x540.png',
  assaultEmblem: '/assets/settlement/hub_emblem_assault@72x72.png',
  hall: '/assets/settlement/hub_building_hall@140x100.png',
  treasury: '/assets/settlement/hub_building_treasury@80x72.png',
  barracks: '/assets/settlement/hub_building_barracks@96x80.png',
  runeSmith: '/assets/settlement/hub_building_rune_smith@80x72.png',
  chronicle: '/assets/settlement/hub_building_chronicle@64x64.png',
  arena: '/assets/settlement/hub_building_arena@64x64.png',
};

export const HUB_BUILDING_ART = {
  command: 'assaultEmblem',
  warband: 'hall',
  fortress: 'treasury',
  recruit: 'barracks',
  runeSmith: 'runeSmith',
  chronicle: 'chronicle',
  skirmish: 'arena',
};

const _images = {};
let _backdropUsable = false;

for (const [key, src] of Object.entries(HUB_ART_SRC)) {
  const img = new Image();
  img.src = src;
  if (key === 'backdrop') {
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = 48;
        c.height = 27;
        const cx = c.getContext('2d');
        cx.drawImage(img, 0, 0, 48, 27);
        const d = cx.getImageData(0, 0, 48, 27).data;
        let sum = 0;
        let n = 0;
        for (let i = 0; i < d.length; i += 4) {
          if (d[i + 3] < 8) continue;
          sum += d[i] + d[i + 1] + d[i + 2];
          n++;
        }
        const mean = n > 0 ? sum / n : 0;
        let minX = 48;
        let maxX = 0;
        let minY = 27;
        let maxY = 0;
        for (let y = 0; y < 27; y++) {
          for (let x = 0; x < 48; x++) {
            const i = (y * 48 + x) * 4;
            if (d[i + 3] < 8) continue;
            if (d[i] + d[i + 1] + d[i + 2] < 36) continue;
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
          }
        }
        const contentW = maxX - minX;
        const contentH = maxY - minY;
        const wideEnough = contentW > 34 && contentH > 14;
        _backdropUsable = n > 0 && mean > 24 && wideEnough;
      } catch {
        _backdropUsable = false;
      }
    };
  }
  _images[key] = img;
}

function ready(key) {
  const img = _images[key];
  return Boolean(img?.complete && img.naturalWidth > 0);
}

export function isSettlementHubBackdropUsable() {
  if (!ready('backdrop')) return false;
  // Panorama plates with large letterbox voids still align via art-space layout once loaded.
  const img = _images.backdrop;
  return (img.naturalWidth >= 640 && img.naturalHeight >= 360);
}

export function isSettlementHubBackdropReady() {
  return ready('backdrop');
}

export function isHubBuildingArtReady(buildingId) {
  const artKey = HUB_BUILDING_ART[buildingId];
  return artKey ? ready(artKey) : false;
}

/** Procedural fallback while backdrop PNG loads. */
export function drawSettlementHubProceduralBackdrop(ctx, layout) {
  const { x, y, w, h } = layout;
  const play = getHubPlayfield(layout);
  const px = play.x;
  const py = play.y;
  const pw = play.w;
  const ph = play.h;

  const sky = ctx.createLinearGradient(px, py, px, py + ph);
  sky.addColorStop(0, '#1a2430');
  sky.addColorStop(0.45, '#243038');
  sky.addColorStop(1, '#2a2218');
  ctx.fillStyle = sky;
  ctx.fillRect(x, y, w, h);

  const fenL = ctx.createLinearGradient(px, py + ph * 0.55, px, py + ph);
  fenL.addColorStop(0, 'rgba(18,28,22,0)');
  fenL.addColorStop(1, 'rgba(12,20,16,0.85)');
  ctx.fillStyle = fenL;
  ctx.fillRect(px, py + ph * 0.45, pw * 0.35, ph * 0.55);

  const fenR = ctx.createLinearGradient(px + pw, py + ph * 0.55, px + pw * 0.65, py + ph);
  fenR.addColorStop(0, 'rgba(18,28,22,0)');
  fenR.addColorStop(1, 'rgba(14,22,18,0.75)');
  ctx.fillStyle = fenR;
  ctx.fillRect(px + pw * 0.55, py + ph * 0.5, pw * 0.45, ph * 0.5);

  const hill = ctx.createLinearGradient(px, py + ph * 0.35, px, py + ph);
  hill.addColorStop(0, 'rgba(42,34,24,0.15)');
  hill.addColorStop(0.55, 'rgba(36,28,20,0.55)');
  hill.addColorStop(1, 'rgba(28,22,16,0.92)');
  ctx.fillStyle = hill;
  ctx.beginPath();
  ctx.moveTo(px, py + ph * 0.42);
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    const hx = px + pw * t;
    const hy = py + ph * (0.40 + Math.sin(t * Math.PI) * 0.08 + t * 0.12);
    ctx.lineTo(hx, hy);
  }
  ctx.lineTo(px + pw, py + ph);
  ctx.lineTo(px, py + ph);
  ctx.closePath();
  ctx.fill();

  const cx = px + pw * 0.42;
  const cy = py + ph * 0.62;
  ctx.strokeStyle = 'rgba(80,65,45,0.45)';
  ctx.lineWidth = 1.5;
  if (ctx.setLineDash) ctx.setLineDash([4, 6]);
  ctx.beginPath();
  ctx.ellipse(cx, cy, pw * 0.36, ph * 0.22, 0, 0, Math.PI * 2);
  ctx.stroke();
  if (ctx.setLineDash) ctx.setLineDash([]);

  ctx.strokeStyle = 'rgba(70,58,40,0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(px + pw * 0.06, py + ph * 0.72);
  ctx.quadraticCurveTo(px + pw * 0.18, py + ph * 0.58, px + pw * 0.30, py + ph * 0.52);
  ctx.stroke();

  const gateX = px + pw * 0.10;
  const gateY = py + ph * 0.58;
  ctx.strokeStyle = 'rgba(90,72,50,0.65)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(gateX - pw * 0.04, gateY);
  ctx.lineTo(gateX - pw * 0.04, gateY - ph * 0.14);
  ctx.lineTo(gateX + pw * 0.04, gateY - ph * 0.14);
  ctx.lineTo(gateX + pw * 0.04, gateY);
  ctx.stroke();
  ctx.font = '6px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(140,120,90,0.45)';
  ctx.fillText('WEST GATE', gateX, gateY + ph * 0.06);

  const yardX = px + pw * 0.68;
  const yardY = py + ph * 0.62;
  ctx.strokeStyle = 'rgba(75,60,42,0.4)';
  if (ctx.setLineDash) ctx.setLineDash([3, 5]);
  ctx.strokeRect(yardX - pw * 0.08, yardY - ph * 0.12, pw * 0.16, ph * 0.18);
  if (ctx.setLineDash) ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(120,100,70,0.35)';
  ctx.fillText('TRAINING YARD', yardX, yardY + ph * 0.10);

  const hearthX = px + pw * 0.38;
  const hearthY = py + ph * 0.54;
  const hg = ctx.createRadialGradient(hearthX, hearthY, 0, hearthX, hearthY, pw * 0.12);
  hg.addColorStop(0, 'rgba(192,120,32,0.22)');
  hg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.arc(hearthX, hearthY, pw * 0.12, 0, Math.PI * 2);
  ctx.fill();

  ctx.textAlign = 'left';
  return true;
}

/** Rich PNG plate when available; procedural dusk hamlet while loading. */
export function drawSettlementHubBackdrop(ctx, layout) {
  const { x, y, w, h } = layout;

  if (ready('backdrop')) {
    const img = _images.backdrop;
    const rect = getHubContentDestRect(layout);
    const c = HUB_ART_CONTENT;
    const sw = img.naturalWidth || HUB_ART_W;
    const sh = img.naturalHeight || HUB_ART_H;
    ctx.save();
    ctx.fillStyle = '#0a0810';
    ctx.fillRect(x, y, w, h);
    const alpha = isSettlementHubBackdropUsable() ? 0.98 : 0.9;
    ctx.globalAlpha = alpha;
    ctx.drawImage(
      img,
      c.sx * sw, c.sy * sh, c.sw * sw, c.sh * sh,
      rect.dx, rect.dy, rect.dw, rect.dh,
    );
    const vig = ctx.createLinearGradient(x, y, x, y + h);
    vig.addColorStop(0, 'rgba(6,5,8,0.22)');
    vig.addColorStop(0.35, 'rgba(0,0,0,0)');
    vig.addColorStop(0.88, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(4,3,6,0.38)');
    ctx.fillStyle = vig;
    ctx.globalAlpha = 1;
    ctx.fillRect(x, y, w, h);
    ctx.restore();
    return true;
  }

  return drawSettlementHubProceduralBackdrop(ctx, layout);
}

export function drawHubBuildingSprite(ctx, buildingId, box, { alpha = 1, locked = false } = {}) {
  const artKey = HUB_BUILDING_ART[buildingId];
  if (!artKey || !ready(artKey)) return false;
  const img = _images[artKey];
  const scale = Math.min(box.w / img.naturalWidth, box.h / img.naturalHeight) * 0.95;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const centerAnchored = buildingId === 'command';
  const anchorX = box.x + box.w / 2;
  const anchorY = centerAnchored ? box.y + box.h / 2 : box.y + box.h;
  const dx = anchorX - dw / 2;
  const dy = centerAnchored ? anchorY - dh / 2 : anchorY - dh;
  ctx.save();
  ctx.globalAlpha = alpha * (locked ? 0.45 : 1);
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
  return true;
}

/** Procedural crossed swords while assault emblem PNG loads. */
export function drawAssaultEmblemFallback(ctx, box, { alpha = 1, locked = false, pulse = false } = {}) {
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const size = Math.min(box.w, box.h) * 0.42;
  const t = performance.now() * 0.003;
  const glow = pulse ? 0.55 + Math.sin(t) * 0.25 : 0.45;

  ctx.save();
  ctx.globalAlpha = alpha * (locked ? 0.45 : 1);

  const mist = ctx.createRadialGradient(cx, cy, size * 0.1, cx, cy, size * 1.35);
  mist.addColorStop(0, `rgba(200,150,60,${0.14 * glow})`);
  mist.addColorStop(0.55, `rgba(120,160,200,${0.06 * glow})`);
  mist.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = mist;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 1.35, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(18,14,10,0.85)';
  ctx.lineWidth = Math.max(1.4, size * 0.08);
  ctx.lineCap = 'round';

  function drawBlade(angle) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    const bladeGrad = ctx.createLinearGradient(0, -size, 0, size * 0.55);
    bladeGrad.addColorStop(0, '#f0d868');
    bladeGrad.addColorStop(0.55, '#c89830');
    bladeGrad.addColorStop(1, '#8a6020');
    ctx.strokeStyle = 'rgba(12,10,8,0.9)';
    ctx.lineWidth = Math.max(1.6, size * 0.09);
    ctx.beginPath();
    ctx.moveTo(0, size * 0.55);
    ctx.lineTo(0, -size * 0.92);
    ctx.stroke();
    ctx.strokeStyle = bladeGrad;
    ctx.lineWidth = Math.max(1.1, size * 0.06);
    ctx.beginPath();
    ctx.moveTo(0, size * 0.48);
    ctx.lineTo(0, -size * 0.88);
    ctx.stroke();
    ctx.fillStyle = '#5c3820';
    ctx.fillRect(-size * 0.12, size * 0.42, size * 0.24, size * 0.16);
    ctx.fillStyle = '#a06820';
    ctx.fillRect(-size * 0.05, size * 0.36, size * 0.10, size * 0.22);
    ctx.restore();
  }

  drawBlade(-0.55);
  drawBlade(0.55);
  ctx.restore();
  return true;
}
