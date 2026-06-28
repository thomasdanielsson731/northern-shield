import { describe, it, expect } from 'vitest';
import {
  isFortressPrepArtReady,
  getWestGateArtKey,
} from '../src/preparation/fortressPrepArt.js';

describe('fortressPrepArt', () => {
  it('reports not ready before browser image load', () => {
    expect(isFortressPrepArtReady('watchTower')).toBe(false);
    expect(isFortressPrepArtReady('westGateIntact')).toBe(false);
  });

  it('picks gate damage art key from prep meta', () => {
    expect(getWestGateArtKey({ westGateScarred: false })).toBe('westGateIntact');
    expect(getWestGateArtKey({ westGateScarred: true, westGateRepaired: false })).toBe('westGateCracked');
    expect(getWestGateArtKey({ westGateScarred: true, westGateRepaired: true })).toBe('westGateIntact');
  });

  it('returns false for unknown keys', () => {
    expect(isFortressPrepArtReady('missing')).toBe(false);
  });
});
