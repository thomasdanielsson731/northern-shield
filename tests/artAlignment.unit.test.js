import { describe, it, expect } from 'vitest';
import {
  computeContentCoverFit,
  mapContentNormToScreen,
  isGroundAnchored,
  normRectFootPoint,
} from '../src/assets/artAlignment.js';

describe('artAlignment', () => {
  it('normRectFootPoint returns bottom-center of norm rect', () => {
    const foot = normRectFootPoint({ fx: 0.1, fy: 0.2, fw: 0.3, fh: 0.4 });
    expect(foot.nx).toBeCloseTo(0.25);
    expect(foot.ny).toBeCloseTo(0.6);
  });

  it('isGroundAnchored accepts feet in lower content band', () => {
    expect(isGroundAnchored({ fy: 0.5, fh: 0.35 })).toBe(true);
    expect(isGroundAnchored({ fy: 0.1, fh: 0.3 })).toBe(false);
  });

  it('linear norm mapping fills dest rect', () => {
    const fit = computeContentCoverFit(100, 100, { sx: 0, sy: 0, sw: 1, sh: 1 }, 0, 0, 200, 100);
    const mid = mapContentNormToScreen(fit, 0.5, 0.5);
    expect(mid.x).toBeCloseTo(fit.dx + fit.dw * 0.5, 4);
    expect(mid.y).toBeCloseTo(fit.dy + fit.dh * 0.5, 4);
  });
});
