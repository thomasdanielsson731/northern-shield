import { describe, it, expect } from 'vitest';
import { isAshfenTerrainReady, isPalisadeTileReady } from '../src/assets/terrainArt.js';

describe('terrainArt', () => {
  it('reports tile readiness in node (images not loaded)', () => {
    expect(isAshfenTerrainReady()).toBe(false);
    expect(isPalisadeTileReady()).toBe(false);
  });
});
