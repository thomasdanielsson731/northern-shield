import { describe, it, expect } from 'vitest';
import {
  trimChronicleBattles,
  trimCampaignCollections,
  validateMapBests,
  estimateSaveBytes,
  MAX_CHRONICLE_BATTLES,
  MAX_BATTLE_HISTORY,
} from '../src/campaign/scaleLimits.js';
import { createNewCampaign } from '../src/campaign/save.js';

describe('scaleLimits', () => {
  it('trims chronicle to tail', () => {
    const battles = Array.from({ length: 250 }, (_, i) => ({ battleNumber: i }));
    const trimmed = trimChronicleBattles(battles);
    expect(trimmed.length).toBe(MAX_CHRONICLE_BATTLES);
    expect(trimmed[0].battleNumber).toBe(50);
  });

  it('trims campaign collections on save shape', () => {
    const s = createNewCampaign();
    s.chronicle.battles = Array.from({ length: 300 }, (_, i) => ({ battleNumber: i }));
    s.battleHistory = Array.from({ length: 150 }, () => ({}));
    s.defenders = Array.from({ length: 40 }, () => ({}));
    const t = trimCampaignCollections(s);
    expect(t.chronicle.battles.length).toBe(MAX_CHRONICLE_BATTLES);
    expect(t.battleHistory.length).toBe(MAX_BATTLE_HISTORY);
    expect(t.defenders.length).toBe(32);
  });

  it('validates map bests', () => {
    const v = validateMapBests({ MIDGARD: { waves: 99999, slain: -1 }, bad: null });
    expect(v.MIDGARD.waves).toBe(9999);
    expect(v.MIDGARD.slain).toBe(0);
    expect(v.bad).toBeUndefined();
  });

  it('estimates save size', () => {
    expect(estimateSaveBytes(createNewCampaign())).toBeGreaterThan(100);
  });
});
