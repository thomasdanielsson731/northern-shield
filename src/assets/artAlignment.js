/**
 * Shared art ↔ screen alignment — content crop + cover-fit + normalized hotspots.
 * Every scene with a painted backdrop should use the same math for draw + hitboxes.
 */

import { computeCoverFitRect } from './campaignArt.js';

/**
 * @typedef {{ sx?: number, sy?: number, sw?: number, sh?: number }} ArtContentCrop
 */

/** Default crop = full plate. */
export function normalizeArtContent(crop = {}) {
  return {
    sx: crop.sx ?? 0,
    sy: crop.sy ?? 0,
    sw: crop.sw ?? 1,
    sh: crop.sh ?? 1,
  };
}

/** Cover-fit destination rect for a content crop inside a full art plate. */
export function computeContentCoverFit(artW, artH, content, destX, destY, destW, destH) {
  const c = normalizeArtContent(content);
  const srcW = artW * c.sw;
  const srcH = artH * c.sh;
  const fit = computeCoverFitRect(srcW, srcH, destX, destY, destW, destH);
  return {
    ...fit,
    artW,
    artH,
    content: c,
    srcW,
    srcH,
    srcPx: { x: c.sx * artW, y: c.sy * artH, w: srcW, h: srcH },
  };
}

/** Map norm point (0–1 inside content crop) → screen coords. */
export function mapContentNormToScreen(fit, nx, ny) {
  const c = fit.content ?? { sx: 0, sy: 0, sw: 1, sh: 1 };
  const ux = c.sx + nx * c.sw;
  const uy = c.sy + ny * c.sh;
  const scaleX = fit.dw / fit.srcW;
  const scaleY = fit.dh / fit.srcH;
  return {
    x: fit.dx + (ux - c.sx) * fit.artW * scaleX,
    y: fit.dy + (uy - c.sy) * fit.artH * scaleY,
  };
}

/** Map norm rect inside content crop → screen pixel rect. */
export function mapContentNormRect(fit, fx, fy, fw, fh) {
  const tl = mapContentNormToScreen(fit, fx, fy);
  const br = mapContentNormToScreen(fit, fx + fw, fy + fh);
  return {
    x: tl.x,
    y: tl.y,
    w: br.x - tl.x,
    h: br.y - tl.y,
  };
}

/** Ground-line check — fy+fh for building hotspots should land in lower band of content. */
export function isGroundAnchored(norm, { minFoot = 0.75, maxFoot = 1.0 } = {}) {
  const foot = (norm.fy ?? 0) + (norm.fh ?? 0);
  return foot >= minFoot && foot <= maxFoot;
}

/** Foot contact point (bottom-center) for a norm rect. */
export function normRectFootPoint(norm) {
  return {
    nx: (norm.fx ?? 0) + (norm.fw ?? 0) * 0.5,
    ny: (norm.fy ?? 0) + (norm.fh ?? 0),
  };
}

/** Verify mapped foot sits in lower portion of cover-fit dest (pixels). */
export function footYInDestBand(fit, norm, bandStart = 0.72) {
  const foot = normRectFootPoint(norm);
  const p = mapContentNormToScreen(fit, foot.nx, foot.ny);
  const minY = fit.dy + fit.dh * bandStart;
  const maxY = fit.dy + fit.dh + 2;
  return p.y >= minY && p.y <= maxY;
}
