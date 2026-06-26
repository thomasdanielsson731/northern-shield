import { describe, it, expect } from 'vitest';
import { getMvpPulseScale, getDebriefRouteOpacity, getDebriefOutcomeColor } from '../src/ui/debriefJuice.js';

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

  it('outcome colors', () => {
    expect(getDebriefOutcomeColor(true)).toBe('#40e880');
    expect(getDebriefOutcomeColor(false)).toBe('#e84040');
  });
});
