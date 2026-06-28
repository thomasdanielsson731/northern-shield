import { describe, it, expect } from 'vitest';
import { getCommandMapHintAlpha, tickCommandMapHintTimer } from '../src/ui/commandMapJuice.js';

describe('commandMapJuice', () => {
  it('fades command map hint', () => {
    expect(getCommandMapHintAlpha(60)).toBe(1);
    expect(getCommandMapHintAlpha(30)).toBe(0.5);
    expect(tickCommandMapHintTimer(10)).toBe(9);
  });
});
