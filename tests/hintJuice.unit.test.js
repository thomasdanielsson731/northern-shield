import { describe, it, expect } from 'vitest';
import { getHintFadeAlpha, tickHintTimer, shouldDismissAutoMoveHint } from '../src/ui/hintJuice.js';

describe('hintJuice', () => {
  it('fades hints', () => {
    expect(getHintFadeAlpha(40)).toBe(1);
    expect(getHintFadeAlpha(20)).toBe(0.5);
    expect(tickHintTimer(5)).toBe(4);
  });

  it('dismisses auto-move hint conditions', () => {
    expect(shouldDismissAutoMoveHint(2, false)).toBe(true);
    expect(shouldDismissAutoMoveHint(1, true)).toBe(true);
    expect(shouldDismissAutoMoveHint(1, false)).toBe(false);
  });
});
