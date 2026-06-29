import { describe, it, expect } from 'vitest';
import {
  HUB_BUILDING_LAYOUT,
  getHubPlayfield,
  resolveHubBuildingRect,
  getHubBuildingsDrawOrder,
} from '../src/settlement/settlementHubLayout.js';
import { HUB_BUILDINGS } from '../src/settlement/settlementHub.js';

describe('settlementHubLayout', () => {
  const layout = { x: 16, y: 50, w: 600, h: 400 };

  it('reserves title and footer insets in playfield', () => {
    const play = getHubPlayfield(layout);
    expect(play.y).toBeGreaterThan(layout.y);
    expect(play.y + play.h).toBeLessThan(layout.y + layout.h);
  });

  it('places war horn at west gate and barracks in training yard', () => {
    expect(HUB_BUILDING_LAYOUT.command.fx).toBeLessThan(HUB_BUILDING_LAYOUT.warband.fx);
    expect(HUB_BUILDING_LAYOUT.recruit.fx).toBeGreaterThan(HUB_BUILDING_LAYOUT.warband.fx);
    expect(HUB_BUILDING_LAYOUT.recruit.fy).toBeLessThan(HUB_BUILDING_LAYOUT.chronicle.fy);
  });

  it('draws barracks in front of hall (higher z)', () => {
    const order = getHubBuildingsDrawOrder(HUB_BUILDINGS);
    const hallIdx = order.findIndex(b => b.id === 'warband');
    const barracksIdx = order.findIndex(b => b.id === 'recruit');
    expect(barracksIdx).toBeGreaterThan(hallIdx);
  });

  it('resolves building rects in playfield space by default', () => {
    const norm = HUB_BUILDING_LAYOUT.recruit;
    const box = resolveHubBuildingRect(norm, layout);
    expect(box.w).toBeGreaterThan(40);
    expect(box.y).toBeLessThan(layout.y + layout.h * 0.65);
  });
});
