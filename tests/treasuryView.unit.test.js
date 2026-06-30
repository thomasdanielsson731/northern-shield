import { describe, it, expect } from 'vitest';
import {
  canAffordFortressUpgrade,
  computeTreasuryImmersiveRect,
  computeTreasuryBuildingSlots,
  drawTreasuryView,
  getTreasuryInstructionHint,
  getTreasuryObjectiveGuidance,
  isTreasuryViewReady,
  shouldShowFortressUpgradeView,
  shouldShowHallOfHeroesView,
  TREASURY_BUILDING_NORM,
  TREASURY_NODE_KEYS,
} from '../src/ui/treasuryView.js';
import { TREASURY_BUILDING_ART } from '../src/ui/treasuryViewArt.js';
import { mockCtx } from './canvasMock.js';

describe('treasuryView', () => {
  it('has five building slots aligned to fortress nodes', () => {
    expect(TREASURY_NODE_KEYS).toHaveLength(5);
    expect(TREASURY_BUILDING_NORM).toHaveLength(5);
    expect(Object.keys(TREASURY_BUILDING_ART).sort()).toEqual([...TREASURY_NODE_KEYS].sort());
  });

  it('building anchors align to settlement hill footprints', () => {
    const back = TREASURY_BUILDING_NORM.filter(p => p.z === 0);
    const front = TREASURY_BUILDING_NORM.filter(p => p.z >= 1);
    expect(back).toHaveLength(1);
    expect(front).toHaveLength(4);
    for (const p of TREASURY_BUILDING_NORM) {
      expect(p.nx).toBeGreaterThanOrEqual(0.20);
      expect(p.nx).toBeLessThanOrEqual(0.80);
      expect(p.ny).toBeGreaterThanOrEqual(0.42);
      expect(p.ny).toBeLessThanOrEqual(0.82);
    }
    const watch = TREASURY_BUILDING_NORM[2];
    const wall = TREASURY_BUILDING_NORM[3];
    expect(wall.nx).toBeLessThan(watch.nx);
    expect(wall.ny).toBeGreaterThan(watch.ny);
  });

  it('canAffordFortressUpgrade respects level cap and gold reserve', () => {
    const def = { maxLevel: 3, cost: [40, 90, 170] };
    expect(canAffordFortressUpgrade(def, 0, 39)).toBe(false);
    expect(canAffordFortressUpgrade(def, 0, 40)).toBe(true);
    expect(canAffordFortressUpgrade(def, 3, 500)).toBe(false);
  });

  it('computeTreasuryBuildingSlots maps hub-aligned coordinates', () => {
    const hall = { x: 20, y: 40, w: 400, h: 300 };
    const slots = computeTreasuryBuildingSlots(hall);
    expect(slots[0].x).toBeCloseTo(20 + 0.63 * 400, 4);
    expect(slots[0].y).toBeCloseTo(40 + 0.70 * 300, 4);
    expect(slots[4].x).toBeCloseTo(20 + 0.50 * 400, 4);
  });

  it('treasury building art uses hub sprites for barracks and treasury', () => {
    expect(TREASURY_BUILDING_ART.barracks).toEqual({ kind: 'hub', id: 'recruit' });
    expect(TREASURY_BUILDING_ART.treasury).toEqual({ kind: 'hub', id: 'fortress' });
  });

  it('immersive rect fills inner frame', () => {
    const r = computeTreasuryImmersiveRect(16, 60, 500, 800, true);
    expect(r.w).toBeGreaterThan(740);
    expect(r.h).toBeGreaterThan(430);
  });

  it('computeTreasuryBuildingSlots maps keys in order', () => {
    const hall = { x: 0, y: 0, w: 400, h: 300 };
    const slots = computeTreasuryBuildingSlots(hall);
    expect(slots).toHaveLength(5);
    expect(slots.map(s => s.key)).toEqual(TREASURY_NODE_KEYS);
  });

  it('getTreasuryInstructionHint reflects focus and reserve', () => {
    expect(getTreasuryInstructionHint({ focusKey: 'barracks' }).title).toBe('BUILDING');
    expect(getTreasuryInstructionHint({ goldReserve: 120 }).line).toMatch(/120g/);
  });

  it('getTreasuryObjectiveGuidance shows upgrade hint when affordable', () => {
    const g = getTreasuryObjectiveGuidance({
      goldReserve: 80,
      nextUpgrade: { label: 'Barracks', cost: 40 },
    });
    expect(g.subtitle).toMatch(/Barracks/);
  });

  it('isTreasuryViewReady is always true (settlement backdrop fallback)', () => {
    expect(isTreasuryViewReady()).toBe(true);
  });

  it('shouldShowFortressUpgradeView respects progression building over tab', () => {
    expect(shouldShowFortressUpgradeView('warband', 'fortress')).toBe(true);
    expect(shouldShowFortressUpgradeView('fortress', 'warband')).toBe(false);
    expect(shouldShowFortressUpgradeView('fortress', null)).toBe(true);
  });

  it('shouldShowHallOfHeroesView respects progression building over tab', () => {
    expect(shouldShowHallOfHeroesView('fortress', 'warband')).toBe(true);
    expect(shouldShowHallOfHeroesView('warband', 'fortress')).toBe(false);
    expect(shouldShowHallOfHeroesView('warband', null)).toBe(true);
  });

  it('drawTreasuryView supports base and overlay phases', () => {
    const ctx = mockCtx();
    const rect = { x: 0, y: 0, w: 520, h: 320 };
    const opts = {
      upgrades: { barracks: 1, treasury: 0 },
      goldReserve: 90,
      focusKey: 'barracks',
      btnsOut: [],
    };
    expect(() => drawTreasuryView(ctx, rect, { ...opts, phase: 'base' })).not.toThrow();
    expect(() => drawTreasuryView(ctx, rect, { ...opts, phase: 'overlays' })).not.toThrow();
  });
});
