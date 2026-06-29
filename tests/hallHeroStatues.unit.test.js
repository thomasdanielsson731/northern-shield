import { describe, it, expect } from 'vitest';
import {
  isHallHeroStatueReady,
  anyHallHeroStatueReady,
  drawHallHeroStatue,
  STATUE_SRC,
} from '../src/ui/hallHeroStatues.js';
import { mockCtx } from './canvasMock.js';

describe('hallHeroStatues', () => {
  it('maps archer type to military statue asset', () => {
    expect(STATUE_SRC.archer).toBe(STATUE_SRC.military);
  });

  it('is not ready before images load in node', () => {
    expect(isHallHeroStatueReady('berserk')).toBe(false);
    expect(anyHallHeroStatueReady()).toBe(false);
  });

  it('drawHallHeroStatue returns false when art not loaded', () => {
    const ctx = mockCtx();
    expect(drawHallHeroStatue(ctx, 100, 200, 'berserk', 88)).toBe(false);
  });
});
