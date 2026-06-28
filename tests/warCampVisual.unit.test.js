import { describe, it, expect } from 'vitest';
import {
  drawWarCampPanel,
  drawWarCampHeader,
  drawWarCampCycle,
  drawWarCampSectionTitle,
  drawWarCampSectionBanner,
  drawWarCampDefenderCard,
  getCareerXpProgress,
  WAR_CAMP_SECTIONS,
  WAR_CAMP_HEADER_H,
  WAR_CAMP_CYCLE_H,
  isWarCampArtReady,
} from '../src/ui/warCampVisual.js';
import { mockCtx } from './canvasMock.js';

describe('warCampVisual', () => {
  it('exports layout constants', () => {
    expect(WAR_CAMP_HEADER_H).toBeGreaterThan(0);
    expect(WAR_CAMP_CYCLE_H).toBeGreaterThan(0);
    expect(WAR_CAMP_SECTIONS.recruit.title).toBe('RECRUIT');
  });

  it('isWarCampArtReady is false before image loads in node', () => {
    expect(isWarCampArtReady()).toBe(false);
  });

  it('getCareerXpProgress clamps 0–1', () => {
    expect(getCareerXpProgress(0, 1)).toBe(0);
    expect(getCareerXpProgress(99999, 10)).toBe(1);
  });

  it('draw helpers do not throw on mock canvas', () => {
    const ctx = mockCtx();
    expect(() => drawWarCampPanel(ctx, 0, 0, 100, 80)).not.toThrow();
    expect(() => drawWarCampHeader(ctx, 8, 8, 400)).not.toThrow();
    expect(() => drawWarCampCycle(ctx, 8, 500, 400, 'warband')).not.toThrow();
    expect(() => drawWarCampSectionTitle(ctx, 10, 10, 'fortress')).not.toThrow();
    expect(() => drawWarCampSectionBanner(ctx, 10, 40, 280, 56, 'recruit')).not.toThrow();
    expect(() => drawWarCampDefenderCard(ctx, 10, 100, 260, 72, {
      name: 'Gunnar',
      type: 'valkyrie',
      careerLevel: 2,
      xp: 120,
    })).not.toThrow();
  });
});
