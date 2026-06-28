import { describe, it, expect } from 'vitest';
import {
  STRUCTURE_ART_IDS,
  resolveStructureArtKey,
  hasStructureArt,
  drawStructureDockIcon,
} from '../src/assets/structureArt.js';

function mockCtx() {
  const g = () => ({ addColorStop: () => {} });
  return {
    save: () => {}, restore: () => {}, beginPath: () => {}, arc: () => {},
    fill: () => {}, stroke: () => {}, fillRect: () => {}, strokeRect: () => {},
    moveTo: () => {}, lineTo: () => {}, closePath: () => {}, fillText: () => {},
    drawImage: () => {}, roundRect: () => {},
    measureText: () => ({ width: 10 }),
    createLinearGradient: g, createRadialGradient: g,
    font: '', textAlign: 'left', textBaseline: 'alphabetic',
    fillStyle: '', strokeStyle: '', lineWidth: 1, globalAlpha: 1,
  };
}

describe('structureArt', () => {
  it('lists all skirmish structure dock types', () => {
    expect(STRUCTURE_ART_IDS).toContain('gate');
    expect(STRUCTURE_ART_IDS).toContain('piltorn');
    expect(STRUCTURE_ART_IDS).toContain('reinforce');
    expect(STRUCTURE_ART_IDS.length).toBe(10);
  });

  it('resolves wall alias to reinforce art', () => {
    expect(resolveStructureArtKey('wall')).toBe('reinforce');
    expect(hasStructureArt('reinforce')).toBe(true);
    expect(hasStructureArt('berserk')).toBe(false);
  });

  it('drawStructureDockIcon does not throw for every structure type', () => {
    const ctx = mockCtx();
    for (const id of [...STRUCTURE_ART_IDS, 'wall']) {
      expect(() => drawStructureDockIcon(ctx, id, 16, 16, 24, true)).not.toThrow();
    }
  });
});
