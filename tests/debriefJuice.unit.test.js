import { describe, it, expect } from 'vitest';
import { getMvpPulseScale, getMvpPulseAlpha, getDebriefRouteOpacity, getDebriefContinuePulse, getDebriefOutcomeColor, getDebriefHeaderColors, getDebriefContentAlpha, getDebriefScrollSafeArea, getDebriefPanelDrawRect, formatDebriefAssaultHeader, buildDebriefContextLines, planDebriefBodyLayout, debriefLineFits } from '../src/ui/debriefJuice.js';

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
    expect(getDebriefOutcomeColor(true)).toBe('#8a9a58');
    expect(getDebriefOutcomeColor(false)).toBe('#a93226');
  });

  it('header colors for debrief panels', () => {
    const win = getDebriefHeaderColors(true);
    const loss = getDebriefHeaderColors(false);
    expect(win.fill).toBe('#c9a227');
    expect(loss.fill).toBe('#a93226');
    expect(win.shadowBlur).toBe(0);
    expect(loss.shadowBlur).toBe(0);
  });

  it('fades debrief prose in after delay', () => {
    expect(getDebriefContentAlpha(0)).toBe(0);
    expect(getDebriefContentAlpha(30)).toBe(1);
  });

  it('insets debrief text inside parchment safe area', () => {
    const safe = getDebriefScrollSafeArea(100, 50, 480, 340);
    expect(safe.left).toBeGreaterThan(200);
    expect(safe.right).toBeLessThan(480);
    expect(safe.top).toBeGreaterThan(110);
    expect(safe.bottom).toBeLessThan(360);
    expect(safe.width).toBeLessThanOrEqual(210);
    expect(safe.bottom - safe.top).toBeGreaterThan(120);
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

  it('builds debrief context lines for defeat and timber teach', () => {
    const lines = buildDebriefContextLines({
      isVictory: true,
      nodeIndex: 2,
      casualties: 1,
    });
    expect(lines).toContain('The gate cracked. Salvage crews gathered timber.');
    expect(lines.some(l => l.includes('fallen'))).toBe(true);

    const defeat = buildDebriefContextLines({
      isVictory: false,
      nodeIndex: 0,
      defeatReason: 'ramparts',
      goldStolen: 40,
    });
    expect(defeat).toContain('Ramparts breached — treasury exposed');
    expect(defeat.some(l => l.includes('Treasury'))).toBe(false);

    const wiped = buildDebriefContextLines({
      isVictory: false,
      nodeIndex: 2,
      defeatReason: 'field_wiped',
    });
    expect(wiped).toHaveLength(1);
    expect(wiped[0]).toContain('retry restores full HP');
  });

  it('plans debrief body to fit parchment height', () => {
    const safe = getDebriefScrollSafeArea(100, 50, 480, 340);
    const startY = safe.top + 70;
    const plan = planDebriefBodyLayout(safe, startY, {
      proseLineCount: 6,
      hasMvp: true,
      contextLineCount: 3,
      hasBossLoot: false,
      fortressRowCount: 3,
      isVictory: false,
    });
    expect(plan.proseMax).toBeLessThanOrEqual(2);
    expect(plan.contextMax).toBeLessThanOrEqual(3);
    expect(debriefLineFits(safe.bottom - 5, 11, safe)).toBe(true);
    expect(debriefLineFits(safe.bottom, 11, safe)).toBe(false);
  });
});
