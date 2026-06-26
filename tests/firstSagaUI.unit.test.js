import { describe, it, expect } from 'vitest';
import { drawHeroNamingCeremony } from '../src/campaign/firstSagaUI.js';

function mockCtx() {
  const g = () => ({ addColorStop: () => {} });
  return {
    save: () => {}, restore: () => {}, beginPath: () => {}, arc: () => {},
    fill: () => {}, stroke: () => {}, fillRect: () => {}, strokeRect: () => {},
    moveTo: () => {}, lineTo: () => {}, closePath: () => {}, fillText: () => {},
    roundRect: () => {},
    measureText: () => ({ width: 10 }),
    createLinearGradient: g, createRadialGradient: g,
    font: '', textAlign: 'left', textBaseline: 'alphabetic',
    fillStyle: '', strokeStyle: '', lineWidth: 1, globalAlpha: 1,
  };
}

describe('firstSagaUI', () => {
  it('drawHeroNamingCeremony does not throw with mock ctx', () => {
    const ctx = mockCtx();
    const btns = [];
    expect(() => drawHeroNamingCeremony(ctx, 734, 480, {
      nameDraft: 'Ul',
      heroType: 'berserk',
      btnsOut: btns,
      nameValid: true,
    })).not.toThrow();
    expect(btns.length).toBe(1);
    expect(btns[0].action).toBe('confirm');
  });
});
