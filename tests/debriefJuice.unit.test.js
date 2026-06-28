import { describe, it, expect } from 'vitest';
import { getMvpPulseScale, getMvpPulseAlpha, getDebriefRouteOpacity, getDebriefContinuePulse, getDebriefOutcomeColor, getDebriefHeaderColors, getDebriefContentAlpha, getDebriefScrollSafeArea, getDebriefPanelDrawRect, formatDebriefAssaultHeader } from '../src/ui/debriefJuice.js';

describe('debriefJuice', () => {
  it('pulses MVP label', () => {
    expect(getMvpPulseScale(0)).toBeCloseTo(0.85, 1);
    expect(getMvpPulseScale(15)).toBeGreaterThan(0.85);
  });

  it('emphasizes retry route on defeat', () => {
    expect(getDebriefRouteOpacity(false, 0)).toBe(1);
    expect(getDebriefRouteOpacity(true, 1)).toBe(1);
    expect(getDebriefRouteOpacity(true, 0)).toBeLessThan(1);
  });

  it('MVP pulse settles after hold frames', () => {
    expect(getMvpPulseAlpha(100)).toBe(1);
    expect(getDebriefContinuePulse(0)).toBeCloseTo(0.65, 1);
  });

  it('outcome colors', () => {
    expect(getDebriefOutcomeColor(true)).toBe('#40e880');
    expect(getDebriefOutcomeColor(false)).toBe('#e84040');
  });

  it('header colors for debrief panels', () => {
    const win = getDebriefHeaderColors(true);
    const loss = getDebriefHeaderColors(false);
    expect(win.fill).toBe('#f0c840');
    expect(loss.fill).toBe('#e04040');
    expect(win.shadowBlur).toBeGreaterThan(loss.shadowBlur);
  });

  it('fades debrief prose in after delay', () => {
    expect(getDebriefContentAlpha(0)).toBe(0);
    expect(getDebriefContentAlpha(30)).toBe(1);
  });

  it('insets debrief text inside parchment safe area', () => {
    const safe = getDebriefScrollSafeArea(100, 50, 480, 340);
    expect(safe.left).toBeGreaterThan(180);
    expect(safe.right).toBeLessThan(500);
    expect(safe.top).toBeGreaterThan(115);
    expect(safe.width).toBeLessThanOrEqual(230);
  });

  it('matches cover-fit draw rect for debrief panel', () => {
    const draw = getDebriefPanelDrawRect(100, 50, 480, 340);
    expect(draw.h).toBeGreaterThan(340);
    expect(draw.y).toBeLessThan(50);
  });

  it('formats assault header for parchment', () => {
    expect(formatDebriefAssaultHeader({ codename: 'First Night', tierLabel: 'A0', frontId: 'west' }))
      .toBe('FIRST NIGHT  ·  A0  ·  WEST FRONT');
  });
});
