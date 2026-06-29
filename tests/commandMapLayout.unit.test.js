import { describe, it, expect } from 'vitest';
import {
  computeCoverFitRect,
  resolveCommandMapNodePositions,
  REGION1_COMMAND_MAP_NODES,
} from '../src/campaign/commandMapLayout.js';

describe('commandMapLayout', () => {
  it('cover-fit letterboxes wide panels vertically', () => {
    const r = computeCoverFitRect(800, 600, 40, 80, 720, 400);
    expect(r.dw).toBe(720);
    expect(r.dh).toBeCloseTo(540);
    expect(r.dh).toBeGreaterThan(400);
    expect(r.dy).toBeLessThan(80);
  });

  it('region 1 has six tuned nodes with OATH at the castle', () => {
    expect(REGION1_COMMAND_MAP_NODES).toHaveLength(6);
    const oath = REGION1_COMMAND_MAP_NODES[5];
    expect(oath.fx).toBeLessThan(0.25);
    expect(oath.fy).toBeLessThan(0.25);
  });

  it('returns null when region art is not loaded', () => {
    expect(resolveCommandMapNodePositions(0, 0, 0, 800, 600)).toBeNull();
  });
});
