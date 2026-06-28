import { describe, it, expect } from 'vitest';
import { isFortressPrepArtReady } from '../src/preparation/fortressPrepArt.js';

describe('fortressPrepArt', () => {
  it('reports not ready before browser image load', () => {
    expect(isFortressPrepArtReady('watchTower')).toBe(false);
    expect(isFortressPrepArtReady('longhouse')).toBe(false);
    expect(isFortressPrepArtReady('treasury')).toBe(false);
  });

  it('returns false for unknown keys', () => {
    expect(isFortressPrepArtReady('missing')).toBe(false);
  });
});
