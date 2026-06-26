import { describe, it, expect } from 'vitest';
import { drawProceduralStructureIcon } from '../src/ui/structurePortrait.js';

function mockCtx() {
  const g = () => ({ addColorStop: () => {} });
  return {
    save: () => {}, restore: () => {}, beginPath: () => {}, arc: () => {},
    fill: () => {}, stroke: () => {}, fillRect: () => {}, strokeRect: () => {},
    moveTo: () => {}, lineTo: () => {}, closePath: () => {}, fillText: () => {},
    measureText: () => ({ width: 10 }),
    createLinearGradient: g, createRadialGradient: g,
    font: '', textAlign: 'left', textBaseline: 'alphabetic',
    fillStyle: '', strokeStyle: '', lineWidth: 1, globalAlpha: 1,
  };
}

describe('structurePortrait', () => {
  it('draws siege structure icons without throwing', () => {
    const ctx = mockCtx();
    for (const id of ['ballista', 'watchtower', 'mine', 'barracks', 'runeshrine', 'gate', 'catapult', 'piltorn', 'drakship', 'unknown']) {
      expect(() => drawProceduralStructureIcon(ctx, 16, 16, id, 24, true)).not.toThrow();
    }
  });
});
