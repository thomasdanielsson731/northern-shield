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

  it('clampAssaultGridPan allows panning far enough to reveal the world padding', () => {
    // The render transform scales around the grid's *center*, not the world's
    // top-left corner. With gridWidth/gridHeight omitted (defaulting to the
    // world size, i.e. no padding) that offset happens to be small, but with
    // real padding the naive [-maxPan, 0] range used to fall ~240px short of
    // the world's actual left/top edge — that much of the padding was
    // permanently unreachable no matter how far the player panned.
    const cellSize = 14;
    const gridWidth = 48 * cellSize;   // 672
    const gridHeight = 30 * cellSize;  // 420
    const padX = 18 * cellSize;        // 252
    const padY = 12 * cellSize;        // 168
    const opts = {
      worldWidth: gridWidth + padX * 2,
      worldHeight: gridHeight + padY * 2,
      viewportWidth: 840,
      viewportHeight: 500,
      zoom: 0.98,
      gridWidth,
      gridHeight,
    };
    // Try to pan far past any sane bound in both directions — the clamp should
    // stop short of the world's actual edges, not short of some offset guess.
    const atMax = clampAssaultGridPan(1e6, 1e6, opts);
    const atMin = clampAssaultGridPan(-1e6, -1e6, opts);
    expect(atMax.x).toBeGreaterThan(0); // padding is reachable past the old hard 0 ceiling
    expect(atMax.x).toBeGreaterThan(atMin.x);
    expect(atMax.y).toBeGreaterThan(0);
    expect(atMax.y).toBeGreaterThan(atMin.y);
  });
});
