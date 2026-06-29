import { describe, it, expect } from 'vitest';
import { findAdjacentUnlockedRegion } from '../src/ui/commandMapJuice.js';

describe('commandMapJuice', () => {
  it('findAdjacentUnlockedRegion steps through unlocked maps', () => {
    const progress = { mapsUnlocked: 4 };
    expect(findAdjacentUnlockedRegion(progress, 2, -1)).toBe(1);
    expect(findAdjacentUnlockedRegion(progress, 2, 1)).toBe(3);
    expect(findAdjacentUnlockedRegion(progress, 0, -1)).toBeNull();
    expect(findAdjacentUnlockedRegion(progress, 3, 1)).toBeNull();
  });

  it('findAdjacentUnlockedRegion skips locked slices', () => {
    const progress = { mapsUnlocked: 5 };
    const locked = (i) => i === 2 || i === 3;
    expect(findAdjacentUnlockedRegion(progress, 1, 1, locked)).toBe(4);
    expect(findAdjacentUnlockedRegion(progress, 4, -1, locked)).toBe(1);
  });
});
