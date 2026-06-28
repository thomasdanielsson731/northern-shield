import { describe, it, expect } from 'vitest';
import {
  getFlawlessNotifAlpha,
  getFlawlessNotifY,
  tickFlawlessTimer,
  FLAWLESS_TOTAL,
} from '../src/ui/flawlessJuice.js';

describe('flawlessJuice', () => {
  it('alpha peaks mid-notification', () => {
    expect(getFlawlessNotifAlpha(0)).toBe(0);
    expect(getFlawlessNotifAlpha(30)).toBeCloseTo(0.5, 1);
    expect(getFlawlessNotifAlpha(90)).toBeGreaterThan(0.8);
  });

  it('drifts downward over time', () => {
    const start = getFlawlessNotifY(FLAWLESS_TOTAL, 40, false);
    const end = getFlawlessNotifY(1, 40, false);
    expect(end).toBeGreaterThan(start);
    expect(getFlawlessNotifY(90, 40, true)).toBeGreaterThan(getFlawlessNotifY(90, 40, false));
  });

  it('ticks timer', () => {
    expect(tickFlawlessTimer(5)).toBe(4);
  });
});
