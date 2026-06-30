import { describe, it, expect } from 'vitest';
import { minimapLayout, getMinimapMapRect } from '../src/ui/minimap.js';

describe('minimap', () => {
  it('minimapLayout anchors bottom-right of playfield edge', () => {
    const playfieldRight = 812;
    const playfieldBottom = 520;
    const mm = minimapLayout(playfieldRight, playfieldBottom);
    expect(mm.x).toBe(playfieldRight - mm.w - 6);
    expect(mm.y).toBe(playfieldBottom - mm.h - 6);
  });

  it('getMinimapMapRect matches draw clip insets', () => {
    const panel = { x: 100, y: 200, w: 108, h: 88 };
    const map = getMinimapMapRect(panel);
    expect(map).toEqual({ x: 104, y: 212, w: 100, h: 70 });
  });
});
