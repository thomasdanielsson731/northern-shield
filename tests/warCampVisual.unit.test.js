import { describe, it, expect } from 'vitest';
import {
  drawWarCampPanel,
  drawWarCampHeader,
  drawWarCampCycle,
  drawWarCampSectionBanner,
  drawWarCampPortraitCard,
  drawWarCampFortressRow,
  drawWarCampTabWelcomeHint,
  computeWarCampCardGrid,
  warCampCardOrigin,
  getCareerXpProgress,
  getWarCampArtCropAspect,
  WAR_CAMP_BANNER_H,
  WAR_CAMP_CYCLE_H,
  WAR_CAMP_GRID_COLS,
  WAR_CAMP_CARD_ASPECT,
  isWarCampArtReady,
} from '../src/ui/warCampVisual.js';
import { mockCtx } from './canvasMock.js';

describe('warCampVisual', () => {
  it('exports layout constants', () => {
    expect(WAR_CAMP_BANNER_H).toBeGreaterThan(0);
    expect(WAR_CAMP_CYCLE_H).toBeGreaterThan(0);
    expect(WAR_CAMP_GRID_COLS).toBe(5);
    expect(WAR_CAMP_CARD_ASPECT).toBeGreaterThan(1);
  });

  it('computeWarCampCardGrid uses portrait cards', () => {
    const g = computeWarCampCardGrid(520, 320);
    expect(g.cols).toBeGreaterThanOrEqual(4);
    expect(g.cardH).toBeGreaterThan(g.cardW);
    expect(g.rowsVisible).toBeGreaterThanOrEqual(2);
    expect(g.cardsPerPage).toBe(g.cols * g.rowsVisible);
    const o = warCampCardOrigin(10, 20, g, 4);
    expect(o.col).toBe(4 % g.cols);
    expect(o.row).toBe(Math.floor(4 / g.cols));
  });

  it('isWarCampArtReady is false before image loads in node', () => {
    expect(isWarCampArtReady()).toBe(false);
  });

  it('section banner crops keep natural aspect', () => {
    expect(getWarCampArtCropAspect('recruit')).toBeLessThan(1);
    expect(getWarCampArtCropAspect('fortress')).toBeGreaterThan(1);
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
    expect(() => drawWarCampSectionBanner(ctx, 10, 40, 280, WAR_CAMP_BANNER_H, 'recruit')).not.toThrow();
    expect(() => drawWarCampTabWelcomeHint(ctx, 10, 50, 280, 18, 200)).not.toThrow();
    expect(() => drawWarCampPortraitCard(ctx, 10, 100, 72, 112, {
      name: 'Gunnar',
      type: 'valkyrie',
      careerLevel: 2,
      xp: 120,
      equipment: [null, null],
      defenderId: 'd1',
    }, {
      slotMeta: [{ itemDef: null }, { itemDef: null }],
      btnsOut: [],
    })).not.toThrow();
    expect(() => drawWarCampFortressRow(ctx, 10, 200, 280, {
      icon: '⬡', label: 'Barracks', maxLevel: 3, levelDesc: ['+1 slot'],
    }, 1, false, 50, true, [], 'barracks')).not.toThrow();
  });
});
