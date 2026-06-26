import { describe, it, expect } from 'vitest';
import {
  UI_COLORS, hexRgb, META_TOP_BAR_COMPACT_H,
  drawWarRoomBarBg, drawTopStatChip, drawTopBarTextBlock,
  drawTopBarShield, drawMetaTopBar,
} from '../src/ui/uiTheme.js';
import { mockCtx } from './canvasMock.js';

describe('uiTheme', () => {
  it('exports the Northern Shield palette from colorsandtopbar concept', () => {
    expect(UI_COLORS.gold).toBe('#D4AF37');
    expect(UI_COLORS.threat).toBe('#A93226');
    expect(UI_COLORS.fortress).toBe('#2E7D32');
    expect(UI_COLORS.warband).toBe('#4A6FA5');
    expect(UI_COLORS.magic).toBe('#7E57C2');
    expect(UI_COLORS.iron).toBe('#2B2F36');
    expect(UI_COLORS.parchment).toBe('#E8D7B5');
  });

  it('parses hex colors for rgba helpers', () => {
    expect(hexRgb('#D4AF37')).toEqual({ r: 212, g: 175, b: 55 });
  });

  it('drawWarRoomBarBg renders without throw', () => {
    const ctx = mockCtx();
    expect(() => drawWarRoomBarBg(ctx, 0, 0, 400, 32)).not.toThrow();
    expect(() => drawWarRoomBarBg(ctx, 0, 0, 400, 32, 0.5)).not.toThrow();
  });

  it('drawTopStatChip and text block helpers', () => {
    const ctx = mockCtx();
    expect(() => drawTopStatChip(ctx, 10, 10, 60, 20, {
      icon: '★', value: '3', label: 'STARS', accent: UI_COLORS.gold, pulse: 1.2,
    })).not.toThrow();
    expect(() => drawTopBarTextBlock(ctx, 20, 20, 'LINE1', 'LINE2', {
      line1Color: UI_COLORS.gold, line2Color: UI_COLORS.parchment,
    })).not.toThrow();
    expect(() => drawTopBarShield(ctx, 50, 50, 8)).not.toThrow();
  });

  it('drawMetaTopBar compact and full modes', () => {
    const ctx = mockCtx();
    expect(META_TOP_BAR_COMPACT_H).toBe(28);
    expect(() => drawMetaTopBar(ctx, 480, 8, {
      subtitle: 'War Camp',
      center: { line1: 'A1', line2: 'Wolf Smoke', color: UI_COLORS.parchment },
      chips: [{ w: 50, icon: 'G', value: '34', label: 'GOLD', accent: UI_COLORS.gold }],
      compact: true,
    })).not.toThrow();
    expect(() => drawMetaTopBar(ctx, 480, 8, { compact: false })).not.toThrow();
  });
});
