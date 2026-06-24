import { describe, it, expect } from 'vitest';
import {
  CAMPAIGN_MAP_COUNT,
  getNodeCountForMap,
  getPortalCountForMap,
  getWaveCountForNode,
  buildNodeWavePlan,
  isNodeUnlocked,
  createEmptyCampaignProgress,
  buildCampaignNodeSpawnQueue,
  difficultyToEquivWave,
} from '../src/campaign/campaignMaps.js';
import {
  MAX_FIELD_HEROES,
  MAX_FIELD_STRUCTURES,
  canPlaceHero,
  canPlaceStructure,
  countFieldHeroes,
  completeNode,
} from '../src/campaign/campaignRun.js';

describe('campaignMaps', () => {
  it('defines 100 campaign maps', () => {
    expect(CAMPAIGN_MAP_COUNT).toBe(100);
  });

  it('node counts stay within 10–30', () => {
    for (let i = 0; i < CAMPAIGN_MAP_COUNT; i++) {
      const n = getNodeCountForMap(i);
      expect(n).toBeGreaterThanOrEqual(10);
      expect(n).toBeLessThanOrEqual(30);
    }
  });

  it('portal count scales with map tier', () => {
    expect(getPortalCountForMap(0)).toBe(1);
    expect(getPortalCountForMap(20)).toBe(2);
    expect(getPortalCountForMap(50)).toBe(3);
    expect(getPortalCountForMap(80)).toBe(4);
  });

  it('each node has 2–3 waves; last node ends with boss', () => {
    for (let m = 0; m < 5; m++) {
      const nodeCount = getNodeCountForMap(m);
      for (let n = 0; n < nodeCount; n++) {
        const w = getWaveCountForNode(m, n);
        expect(w).toBeGreaterThanOrEqual(2);
        expect(w).toBeLessThanOrEqual(3);
        const plan = buildNodeWavePlan(m, n);
        const last = plan.waves[plan.waves.length - 1];
        if (n === nodeCount - 1) expect(last.isBoss).toBe(true);
        else expect(last.isBoss).toBe(false);
      }
    }
  });

  it('unlocks nodes sequentially', () => {
    const p = createEmptyCampaignProgress();
    expect(isNodeUnlocked(p, 0, 0)).toBe(true);
    expect(isNodeUnlocked(p, 0, 1)).toBe(false);
    p.mapRuns[0] = { nodesCleared: [0], fieldState: null };
    expect(isNodeUnlocked(p, 0, 1)).toBe(true);
  });

  it('difficulty maps to sensible wave equivalents', () => {
    expect(difficultyToEquivWave(0.5, 1)).toBeGreaterThan(difficultyToEquivWave(0.2, 1));
  });

  it('boss spawn queue ends with node boss marker', () => {
    const plan = buildNodeWavePlan(0, getNodeCountForMap(0) - 1);
    const lastWave = plan.waves[plan.waves.length - 1];
    const queue = buildCampaignNodeSpawnQueue(lastWave, 0);
    expect(queue[queue.length - 1].__nodeBoss).toBe(true);
  });
});

describe('campaignRun field limits', () => {
  it('caps heroes and structures at 10', () => {
    const heroes = Array.from({ length: MAX_FIELD_HEROES }, (_, i) => ({ type: 'berserk', id: i }));
    expect(canPlaceHero(heroes)).toBe(false);
    expect(countFieldHeroes(heroes)).toBe(MAX_FIELD_HEROES);

    const structs = Array.from({ length: MAX_FIELD_STRUCTURES }, () => ({ type: 'catapult' }));
    expect(canPlaceStructure(structs)).toBe(false);
  });

  it('completeNode unlocks next map when final node cleared', () => {
    const p = createEmptyCampaignProgress();
    const nodeCount = getNodeCountForMap(0);
    for (let n = 0; n < nodeCount; n++) {
      completeNode(p, 0, n, { gold: 100, towers: [], walls: {} });
    }
    expect(p.mapsUnlocked).toBe(2);
    expect(p.clearedMaps).toContain(0);
  });
});
