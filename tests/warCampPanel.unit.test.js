import { describe, it, expect } from 'vitest';
import { drawCampaignWarCampBriefing, isSimplifiedWarCamp } from '../src/ui/warCampPanel.js';

function mockCtx() {
  return {
    save: () => {}, restore: () => {}, beginPath: () => {}, arc: () => {},
    fill: () => {}, stroke: () => {}, fillRect: () => {}, strokeRect: () => {},
    moveTo: () => {}, lineTo: () => {}, closePath: () => {}, fillText: () => {},
    roundRect: () => {},
    measureText: (t) => ({ width: (t ?? '').length * 5 }),
    font: '', textAlign: 'left', textBaseline: 'alphabetic',
    fillStyle: '', strokeStyle: '', lineWidth: 1, shadowBlur: 0,
  };
}

describe('warCampPanel', () => {
  it('simplifies UI on First Saga map 0', () => {
    expect(isSimplifiedWarCamp(0)).toBe(true);
    expect(isSimplifiedWarCamp(1)).toBe(false);
  });

  it('drawCampaignWarCampBriefing renders next assault CTA', () => {
    const ctx = mockCtx();
    const btns = [];
    expect(() => drawCampaignWarCampBriefing(ctx, { x: 20, y: 40, w: 280, h: 400 }, {
      defenderNames: ['Sverker'],
      defenderCount: 1,
      nextAssault: {
        codename: 'Wolf Smoke',
        tierLabel: 'A1',
        frontLabel: 'West',
        waveCount: 2,
        nodeIndex: 1,
        isRetry: false,
      },
      goldReserve: 34,
      chronicleProse: 'The warband held the west gate.',
      statusLines: [],
    }, btns)).not.toThrow();
    expect(btns.some(b => b.action === 'nextAssault')).toBe(true);
    expect(btns.some(b => b.action === 'commandMap')).toBe(true);
  });
});
