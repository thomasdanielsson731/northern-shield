import { describe, it, expect } from 'vitest';
import {
  computeBetweenBattlesFadeAlpha,
  computeBetweenSectionAlpha,
  tickBtParticle,
  createBtParticlePool,
  getVictoryHeaderStyle,
  BETWEEN_FADE_FRAMES,
} from '../src/ui/betweenBattlesJuice.js';

describe('betweenBattlesJuice', () => {
  it('fades in over entry frames', () => {
    expect(computeBetweenBattlesFadeAlpha(0)).toBe(1);
    expect(computeBetweenBattlesFadeAlpha(30)).toBe(0);
    expect(computeBetweenBattlesFadeAlpha(20)).toBe(0.5);
  });

  it('staggers section reveal after delay', () => {
    expect(computeBetweenSectionAlpha(30, 0.15)).toBe(0);
    expect(computeBetweenSectionAlpha(20, 0)).toBeGreaterThan(0);
    expect(computeBetweenSectionAlpha(0, 0.5)).toBe(1);
  });

  it('wraps ambient particles', () => {
    const p = { x: 10, y: 500, dx: 0, dy: 2, ember: false, a: 0.3 };
    tickBtParticle(p, { w: 400, h: 480 });
    expect(p.y).toBeLessThan(0);
  });

  it('creates particle pool', () => {
    expect(createBtParticlePool(5, { w: 100, h: 100 })).toHaveLength(5);
  });

  it('pulses victory header style', () => {
    const v = getVictoryHeaderStyle(true, 0);
    const v2 = getVictoryHeaderStyle(true, 500);
    expect(v.color).toBe('#40e880');
    expect(v.blur).not.toBe(v2.blur);
    expect(getVictoryHeaderStyle(false).color).toBe('#e84040');
  });
});
