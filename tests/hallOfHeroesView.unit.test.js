import { describe, it, expect } from 'vitest';
import {
  computeHallOfHeroesLayout,
  computeHallPlinthSlots,
  computeHallImmersiveRect,
  drawHallOfHeroesView,
  isHallOfHeroesViewReady,
  getHallInstructionHint,
  getHallObjectiveGuidance,
  HALL_MAX_STATUES,
  HALL_PLINTH_NORM,
  HALL_FLOOR_BOUNDS,
  pickHallStatueSlotIndices,
  clampHallFloorNorm,
  getHallFloorScreenRect,
} from '../src/ui/hallOfHeroesView.js';
import { mockCtx } from './canvasMock.js';

describe('hallOfHeroesView', () => {
  it('layout uses full height hall without bottom roster strip', () => {
    const L = computeHallOfHeroesLayout(10, 20, 600, 400, true);
    expect(L.hall.w).toBeGreaterThan(560);
    expect(L.hall.h).toBeGreaterThan(380);
    expect(L.roster).toBeNull();
    expect(L.dossier.x).toBeGreaterThan(L.hall.x + L.hall.w * 0.55);
  });

  it('plinth slots scale with defender count up to max statues', () => {
    const hall = { x: 0, y: 0, w: 400, h: 300 };
    expect(computeHallPlinthSlots(1, hall)).toHaveLength(1);
    expect(computeHallPlinthSlots(HALL_MAX_STATUES, hall)).toHaveLength(HALL_MAX_STATUES);
  });

  it('statue anchors stay inside painted floor band', () => {
    const b = HALL_FLOOR_BOUNDS;
    for (const p of HALL_PLINTH_NORM) {
      expect(p.nx).toBeGreaterThanOrEqual(b.minX);
      expect(p.nx).toBeLessThanOrEqual(b.maxX);
      expect(p.ny).toBeGreaterThanOrEqual(b.minY);
      expect(p.ny).toBeLessThanOrEqual(b.maxY);
      expect(p.z).toBeDefined();
    }
    expect(HALL_PLINTH_NORM).toHaveLength(HALL_MAX_STATUES);
  });

  it('clampHallFloorNorm keeps outliers on the planks', () => {
    const c = clampHallFloorNorm(0.05, 0.90);
    expect(c.nx).toBe(HALL_FLOOR_BOUNDS.minX);
    expect(c.ny).toBe(HALL_FLOOR_BOUNDS.maxY);
  });

  it('getHallFloorScreenRect maps floor bounds inside hall', () => {
    const hall = { x: 10, y: 20, w: 500, h: 300 };
    const floor = getHallFloorScreenRect(hall);
    expect(floor.x).toBeGreaterThanOrEqual(hall.x);
    expect(floor.y).toBeGreaterThanOrEqual(hall.y);
    expect(floor.x + floor.w).toBeLessThanOrEqual(hall.x + hall.w + 2);
    expect(floor.y + floor.h).toBeLessThanOrEqual(hall.y + hall.h + 2);
  });

  it('pickHallStatueSlotIndices spreads few defenders across hall', () => {
    expect(pickHallStatueSlotIndices(3)).toEqual([0, 5, 9]);
    expect(pickHallStatueSlotIndices(10)).toHaveLength(10);
  });

  it('immersive rect fills inner frame', () => {
    const r = computeHallImmersiveRect(16, 60, 500, 800, true);
    expect(r.w).toBeGreaterThan(740);
    expect(r.h).toBeGreaterThan(430);
  });

  it('getHallObjectiveGuidance returns compact copy', () => {
    const g = getHallObjectiveGuidance({ defenderCount: 2, focusId: 'd1' });
    expect(g.title).toBe('DOSSIER');
    expect(g.subtitle).toMatch(/statue/i);
    const warCamp = getHallObjectiveGuidance({ defenderCount: 2, nextAssault: null });
    expect(warCamp.title).toBe('WHAT TO DO NOW');
    expect(warCamp.subtitle).toMatch(/assault|Command Map/i);
  });

  it('isHallOfHeroesViewReady is false before images load in node', () => {
    expect(isHallOfHeroesViewReady()).toBe(false);
  });

  it('drawHallOfHeroesView supports base and overlay phases', () => {
    const ctx = mockCtx();
    const defenders = [{
      defenderId: 'd1',
      name: 'Sverker',
      type: 'berserk',
      careerLevel: 1,
      xp: 0,
      careerKills: 3,
      battlesPlayed: 1,
      equipment: [null, null],
    }];
    const rect = { x: 0, y: 0, w: 520, h: 320 };
    expect(() => drawHallOfHeroesView(ctx, rect, {
      defenders,
      focusId: 'd1',
      btnsOut: [],
      phase: 'base',
      drawPortrait: () => {},
    })).not.toThrow();
    expect(() => drawHallOfHeroesView(ctx, rect, {
      defenders,
      focusId: 'd1',
      btnsOut: [],
      phase: 'overlays',
      drawPortrait: () => {},
    })).not.toThrow();
  });

  it('getHallInstructionHint reflects focus and rename state', () => {
    expect(getHallInstructionHint({ focusId: 'd1' }).title).toBe('DOSSIER');
    expect(getHallInstructionHint({ renameActive: true }).title).toBe('NAMING');
    expect(getHallInstructionHint({ defenderCount: 1 }).line).toMatch(/statue/i);
  });
});
