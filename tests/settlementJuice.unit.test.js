import { describe, it, expect } from 'vitest';
import {
  STONE_FLASH_FRAMES,
  tickStoneFlash,
  getStoneFlashAlpha,
  getSettlementStepGlow,
  getHeroNamingGlow,
} from '../src/ui/settlementJuice.js';

describe('settlementJuice', () => {
  it('ticks stone flash down', () => {
    expect(tickStoneFlash(520)).toBe(502);
    expect(tickStoneFlash(10)).toBe(0);
    expect(tickStoneFlash(0)).toBe(0);
  });

  it('stone flash alpha peaks at start', () => {
    expect(getStoneFlashAlpha(STONE_FLASH_FRAMES)).toBeCloseTo(0.62, 2);
    expect(getStoneFlashAlpha(0)).toBe(0);
    expect(getStoneFlashAlpha(260)).toBeCloseTo(0.155, 2);
  });

  it('step and naming glow oscillate', () => {
    expect(getSettlementStepGlow(0)).toBeCloseTo(0.06, 2);
    expect(getHeroNamingGlow(0)).toBeCloseTo(0.05, 2);
    expect(getSettlementStepGlow(Math.PI / 2 / 0.004)).toBeGreaterThan(0.08);
  });
});
