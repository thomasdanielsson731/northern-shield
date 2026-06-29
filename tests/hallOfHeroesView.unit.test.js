import { describe, it, expect } from 'vitest';
import {
  computeHallOfHeroesLayout,
  computeHallPlinthSlots,
  drawHallOfHeroesView,
  isHallOfHeroesViewReady,
  getHallInstructionHint,
} from '../src/ui/hallOfHeroesView.js';
import { mockCtx } from './canvasMock.js';

describe('hallOfHeroesView', () => {
  it('layout splits hall, dossier, and roster strip', () => {
    const L = computeHallOfHeroesLayout(10, 20, 600, 400, true);
    expect(L.hall.w).toBeGreaterThan(L.dossier.w);
    expect(L.roster.y).toBeGreaterThan(L.hall.y);
    expect(L.dossier.x).toBeGreaterThan(L.hall.x + L.hall.w);
  });

  it('plinth slots scale with defender count', () => {
    const hall = { x: 0, y: 0, w: 400, h: 300 };
    expect(computeHallPlinthSlots(1, hall)).toHaveLength(1);
    expect(computeHallPlinthSlots(5, hall)).toHaveLength(5);
  });

  it('dossier column hidden until focus', () => {
    const open = computeHallOfHeroesLayout(0, 0, 600, 400, true);
    const closed = computeHallOfHeroesLayout(0, 0, 600, 400, false);
    expect(open.dossier).not.toBeNull();
    expect(closed.dossier).toBeNull();
    expect(closed.hall.w).toBeGreaterThan(open.hall.w);
  });

  it('isHallOfHeroesViewReady is false before images load in node', () => {
    expect(isHallOfHeroesViewReady()).toBe(false);
  });

  it('drawHallOfHeroesView does not throw on mock canvas', () => {
    const ctx = mockCtx();
    const defenders = [{
      defenderId: 'd1',
      name: 'Sverker',
      type: 'berserk',
      careerLevel: 1,
      xp: 0,
      equipment: [null, null],
    }];
    expect(() => drawHallOfHeroesView(ctx, { x: 0, y: 0, w: 520, h: 320 }, {
      defenders,
      focusId: 'd1',
      btnsOut: [],
      drawPortrait: () => {},
    })).not.toThrow();
  });

  it('getHallInstructionHint reflects focus and rename state', () => {
    expect(getHallInstructionHint({ focusId: 'd1' }).title).toBe('DOSSIER');
    expect(getHallInstructionHint({ renameActive: true }).title).toBe('NAMING');
    expect(getHallInstructionHint({ defenderCount: 1 }).line).toMatch(/plinth/i);
  });
});
