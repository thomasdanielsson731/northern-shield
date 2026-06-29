import { describe, it, expect } from 'vitest';
import {
  isFortressPrepArtReady,
  getWestGateArtKey,
  getBattleWestGateArtKey,
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

  it('picks battle gate art from live wall HP', () => {
    expect(getBattleWestGateArtKey({ hp: 120, maxHp: 120 }, null)).toBe('westGateIntact');
    expect(getBattleWestGateArtKey({ hp: 40, maxHp: 120 }, null)).toBe('westGateCracked');
    expect(getBattleWestGateArtKey({ hp: 0, maxHp: 120 }, null)).toBe('westGateBreached');
    expect(getBattleWestGateArtKey(null, { westGateScarred: true, westGateRepaired: false })).toBe('westGateCracked');
  });

  it('returns false for unknown keys', () => {
    expect(isFortressPrepArtReady('missing')).toBe(false);
  });
});
