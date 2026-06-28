import { describe, it, expect } from 'vitest';
import {
  getFlawlessNotifAlpha,
  getFlawlessNotifY,
  getBossHudBottomY,
  tickFlawlessTimer,
  FLAWLESS_TOTAL,
} from '../src/ui/flawlessJuice.js';

describe('flawlessJuice', () => {
  it('alpha peaks mid-notification', () => {
    expect(getFlawlessNotifAlpha(0)).toBe(0);
    expect(getFlawlessNotifAlpha(30)).toBeCloseTo(0.5, 1);
    expect(getFlawlessNotifAlpha(90)).toBeGreaterThan(0.8);
  });

  it('drifts downward and clears boss HUD', () => {
    const gridTop = 40;
    const start = getFlawlessNotifY(FLAWLESS_TOTAL, gridTop, null);
    const end = getFlawlessNotifY(1, gridTop, null);
    expect(end).toBeGreaterThan(start);
    const bossBottom = getBossHudBottomY(gridTop, { hasBoss: true });
    expect(getFlawlessNotifY(90, gridTop, bossBottom)).toBeGreaterThan(getFlawlessNotifY(90, gridTop, null));
    expect(getBossHudBottomY(gridTop, { hasBoss: false })).toBeNull();
  });

  it('ticks timer', () => {
    expect(tickFlawlessTimer(5)).toBe(4);
  });
});
