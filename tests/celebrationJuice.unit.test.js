import { describe, it, expect } from 'vitest';
import {
  getCelebrationFadeAlpha,
  tickFxTimer,
  getMapUnlockBandY,
  getRegionClearTextY,
  getToastFadeAlpha,
} from '../src/ui/celebrationJuice.js';

describe('celebrationJuice', () => {
  it('fades celebration overlays', () => {
    expect(getCelebrationFadeAlpha(40, 40)).toBe(1);
    expect(getCelebrationFadeAlpha(20, 40)).toBe(0.5);
    expect(getCelebrationFadeAlpha(0)).toBe(0);
  });

  it('positions unlock and region text', () => {
    expect(getMapUnlockBandY(480)).toBeCloseTo(168, 0);
    expect(getRegionClearTextY(50)).toBe(106);
  });

  it('ticks FX and toast timers', () => {
    expect(tickFxTimer(3)).toBe(2);
    expect(getToastFadeAlpha(10)).toBe(0.5);
  });
});
