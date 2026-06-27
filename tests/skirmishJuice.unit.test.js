import { describe, it, expect } from 'vitest';
import {
  getSkirmishDiscoveryPulseAlpha,
  tickSkirmishDiscoveryTimer,
  SKIRMISH_DISCOVERY_FRAMES,
} from '../src/ui/skirmishJuice.js';

describe('skirmishJuice', () => {
  it('pulse alpha oscillates', () => {
    expect(getSkirmishDiscoveryPulseAlpha(0)).toBeCloseTo(0.72, 1);
    expect(getSkirmishDiscoveryPulseAlpha(Math.PI / 2 / 0.006)).toBeGreaterThan(0.8);
  });

  it('ticks discovery timer', () => {
    expect(SKIRMISH_DISCOVERY_FRAMES).toBe(420);
    expect(tickSkirmishDiscoveryTimer(5)).toBe(4);
    expect(tickSkirmishDiscoveryTimer(0)).toBe(0);
  });
});
