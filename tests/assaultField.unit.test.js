import { describe, it, expect } from 'vitest';
import {
  ASSAULT_UNIT_SCALE,
  ASSAULT_FIELD_ZOOM,
  assaultWorldSize,
  clampAssaultGridPan,
  getAssaultBorderSpawnPx,
  getAssaultBorderSpawnPath,
} from '../src/combat/assaultField.js';

describe('assaultField', () => {
  it('uses readable unit scale on scroll assault', () => {
    // Effective screen size = ASSAULT_UNIT_SCALE * ASSAULT_FIELD_ZOOM; keep it >= 0.7
    expect(ASSAULT_UNIT_SCALE * ASSAULT_FIELD_ZOOM).toBeGreaterThanOrEqual(0.7);
  });

  it('assaultWorldSize includes padding around the grid', () => {
    const ws = assaultWorldSize(48, 30, 14);
    expect(ws.width).toBeGreaterThan(48 * 14);
    expect(ws.padX).toBeGreaterThan(0);
  });

  it('getAssaultBorderSpawnPx places west spawns on the outer world rim', () => {
    const spawn = { col: 0, row: 15 };
    const goal = { col: 24, row: 15 };
    const padX = 18 * 14;
    const padY = 12 * 14;
    const pt = getAssaultBorderSpawnPx(spawn, goal, 48, 30, 14, padX, padY);
    expect(pt.x).toBeLessThan(0);
    expect(pt.y).toBeCloseTo(spawn.row * 14 + 7, 0);
  });

  it('getAssaultBorderSpawnPath runs from border to goal', () => {
    const path = getAssaultBorderSpawnPath(
      { col: 0, row: 15 },
      { col: 24, row: 15 },
      48, 30, 14, 252, 168,
    );
    expect(path).toHaveLength(2);
    expect(path[1].x).toBe(24 * 14 + 7);
  });

  it('clampAssaultGridPan keeps viewport inside world', () => {
    const pan = clampAssaultGridPan(-40, -20, {
      worldWidth: 1200,
      worldHeight: 900,
      viewportWidth: 500,
      viewportHeight: 400,
      zoom: ASSAULT_FIELD_ZOOM,
    });
    expect(pan.x).toBeLessThanOrEqual(0);
    expect(pan.y).toBeLessThanOrEqual(0);
  });
});
