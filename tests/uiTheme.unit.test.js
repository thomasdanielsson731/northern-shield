import { describe, it, expect } from 'vitest';
import { UI_COLORS, hexRgb } from '../src/ui/uiTheme.js';

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
});
