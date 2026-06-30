import { describe, it, expect } from 'vitest';
import {
  fortressCoordToNorm,
  fortressCoordRect,
  FORTRESS_STRUCTURE_COORDS,
  PREP_COORD_HOTSPOTS,
} from '../src/preparation/fortressCoordSystem.js';

describe('fortressCoordSystem', () => {
  it('maps center treasury to art midpoint', () => {
    const n = fortressCoordToNorm(0, 0);
    expect(n.fx).toBeCloseTo(0.5, 5);
    expect(n.fy).toBeCloseTo(0.5, 5);
  });

  it('maps west gate to left edge', () => {
    const n = fortressCoordToNorm(-12, 0);
    expect(n.fx).toBeCloseTo(0, 5);
    expect(n.fy).toBeCloseTo(0.5, 5);
  });

  it('maps NW tower above west gate on screen', () => {
    const gate = fortressCoordToNorm(-12, 0);
    const tower = fortressCoordToNorm(-9, 9);
    expect(tower.fx).toBeGreaterThan(gate.fx);
    expect(tower.fy).toBeLessThan(gate.fy);
  });

  it('prep hotspots match structure coords', () => {
    const tr = PREP_COORD_HOTSPOTS.treasury;
    const c = fortressCoordRect(
      FORTRESS_STRUCTURE_COORDS.treasury.cx,
      FORTRESS_STRUCTURE_COORDS.treasury.cy,
      2.4,
    );
    expect(tr.fx).toBeCloseTo(c.fx, 5);
    expect(tr.fy).toBeCloseTo(c.fy, 5);
  });
});
