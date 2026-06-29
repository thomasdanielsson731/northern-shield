import { describe, it, expect } from 'vitest';
import {
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

  it('building anchors sit on settlement hill band (view-local 0–1)', () => {
    const back = TREASURY_BUILDING_NORM.filter(p => p.z === 0);
    const front = TREASURY_BUILDING_NORM.filter(p => p.z === 1);
    expect(back).toHaveLength(2);
    expect(front).toHaveLength(3);
    for (const p of TREASURY_BUILDING_NORM) {
      expect(p.nx).toBeGreaterThanOrEqual(0.05);
      expect(p.nx).toBeLessThanOrEqual(0.95);
      expect(p.ny).toBeGreaterThanOrEqual(0.54);
      expect(p.ny).toBeLessThanOrEqual(0.62);
    }
  });

  it('computeTreasuryBuildingSlots maps view-local coordinates', () => {
    const hall = { x: 20, y: 40, w: 400, h: 300 };
    const slots = computeTreasuryBuildingSlots(hall);
    expect(slots[0].x).toBeCloseTo(20 + 0.07 * 400, 4);
    expect(slots[0].y).toBeCloseTo(40 + 0.56 * 300, 4);
    expect(slots[4].x).toBeCloseTo(20 + 0.93 * 400, 4);
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
    expect(shouldShowHallOfHeroesView('fortress', 'warband')).toBe(false);
    expect(shouldShowHallOfHeroesView('warband', 'fortress')).toBe(false);
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
