import { describe, it, expect } from 'vitest';
import {
  CAMPAIGN_MAP_COUNT,
  getNodeCountForMap,
  getPortalCountForMap,
  getWaveCountForNode,
  buildNodeWavePlan,
  createEmptyCampaignProgress,
  buildCampaignNodeSpawnQueue,
  difficultyToEquivWave,
  getNodeDifficulty,
  isTutorialNode,
  getMarchSuppliesGold,
  getMapDisplayName,
} from '../src/campaign/campaignMaps.js';
import { isAssaultUnlocked, getFrontLayout } from '../src/campaign/campaignFronts.js';
import {
  MAX_FIELD_HEROES,
  MAX_FIELD_STRUCTURES,
  canPlaceHero,
  canPlaceStructure,
  countFieldHeroes,
  completeNode,
  serializeFieldState,
  mergeFallenHeroesIntoFieldState,
  attachDeploySnapshot,
  prepareFieldForNewAssault,
} from '../src/campaign/campaignRun.js';

describe('campaignMaps', () => {
  it('defines 100 campaign maps', () => {
    expect(CAMPAIGN_MAP_COUNT).toBe(100);
  });

  it('map 0 display name is MIDGARD', () => {
    expect(getMapDisplayName(0)).toBe('MIDGARD');
    expect(getMapDisplayName(10)).toBe('MIDGARD 2');
  });

  it('node counts stay within 10–30', () => {
    for (let i = 0; i < CAMPAIGN_MAP_COUNT; i++) {
      const n = getNodeCountForMap(i);
      expect(n).toBeGreaterThanOrEqual(10);
      expect(n).toBeLessThanOrEqual(30);
    }
  });

  it('portal count scales with map tier (delayed second portal)', () => {
    expect(getPortalCountForMap(0)).toBe(1);
    expect(getPortalCountForMap(15)).toBe(1);
    expect(getPortalCountForMap(20)).toBe(2);
    expect(getPortalCountForMap(50)).toBe(3);
    expect(getPortalCountForMap(80)).toBe(4);
  });

  it('tutorial node is map 0 node 0 only', () => {
    expect(isTutorialNode(0, 0)).toBe(true);
    expect(isTutorialNode(0, 1)).toBe(false);
    expect(isTutorialNode(1, 0)).toBe(false);
  });

  it('map 0 node 0 has gentler difficulty than before', () => {
    const diff = getNodeDifficulty(0, 0, getNodeCountForMap(0));
    expect(diff).toBeLessThan(0.25);
    const equiv = difficultyToEquivWave(diff * 0.85, 1);
    expect(equiv).toBeLessThanOrEqual(12);
  });

  it('tutorial spawn queue is small', () => {
    const plan = buildNodeWavePlan(0, 0);
    const q = buildCampaignNodeSpawnQueue(plan.waves[0], 0);
    expect(q.length).toBeLessThanOrEqual(8);
    expect(q.every(t => typeof t === 'string')).toBe(true);
  });

  it('march supplies scale with map index and reserve', () => {
    expect(getMarchSuppliesGold(0, 0)).toBe(0);
    expect(getMarchSuppliesGold(10, 200)).toBeGreaterThan(20);
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

  it('unlocks assaults per front (first on each front open)', () => {
    const p = createEmptyCampaignProgress();
    const layout = getFrontLayout(0);
    expect(isAssaultUnlocked(p, 0, 0)).toBe(true);
    expect(isAssaultUnlocked(p, 0, 1)).toBe(true);
    const westSecond = layout.fronts.west.assaults[1];
    if (westSecond) {
      expect(isAssaultUnlocked(p, 0, westSecond.nodeIndex)).toBe(false);
      p.mapRuns[0] = { nodesCleared: [layout.fronts.west.assaults[0].nodeIndex], fieldState: null };
      expect(isAssaultUnlocked(p, 0, westSecond.nodeIndex)).toBe(true);
    }
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
    let lastResult = null;
    for (let n = 0; n < nodeCount; n++) {
      lastResult = completeNode(p, 0, n, { gold: 100, towers: [], walls: {} });
    }
    expect(p.mapsUnlocked).toBe(2);
    expect(p.clearedMaps).toContain(0);
    expect(lastResult.mapCompleted).toBe(true);
    expect(lastResult.newRegionUnlocked).toBe(1);
  });

  it('mergeFallenHeroesIntoFieldState restores fallen deploy slots', () => {
    const snapshot = {
      gold: 50,
      towers: [
        { type: 'berserk', col: 5, row: 5, level: 1, defenderId: 'a', name: 'Erik' },
        { type: 'valkyrie', col: 8, row: 5, level: 1, defenderId: 'b', name: 'Saga' },
      ],
      walls: {},
    };
    const afterBattle = {
      gold: 80,
      towers: [snapshot.towers[0]],
      walls: {},
    };
    const merged = mergeFallenHeroesIntoFieldState(afterBattle, snapshot);
    expect(merged.towers).toHaveLength(2);
    expect(merged.towers.some(t => t.defenderId === 'b')).toBe(true);
    expect(merged.gold).toBe(80);
  });

  it('prepareFieldForNewAssault restores fallen heroes from deploySnapshot', () => {
    const deploySnapshot = {
      gold: 50,
      towers: [
        { type: 'berserk', col: 5, row: 5, level: 1, defenderId: 'a', name: 'Erik' },
        { type: 'valkyrie', col: 8, row: 5, level: 1, defenderId: 'b', name: 'Saga' },
      ],
      walls: {},
    };
    const saved = {
      gold: 80,
      towers: [{ ...deploySnapshot.towers[0], combatHp: 12, combatMaxHp: 100 }],
      walls: { '3_3': { level: 0, hp: 40, maxHp: 100 } },
      deploySnapshot,
    };
    const ready = prepareFieldForNewAssault(saved);
    expect(ready.towers).toHaveLength(2);
    expect(ready.towers.some(t => t.defenderId === 'b')).toBe(true);
    expect(ready.towers[0].combatHp).toBeUndefined();
    expect(ready.walls['3_3'].hp).toBe(100);
  });

  it('attachDeploySnapshot stores layout for next assault', () => {
    const snapshot = { gold: 0, towers: [{ type: 'hydda', col: 1, row: 1, defenderId: 'h1' }], walls: {} };
    const field = attachDeploySnapshot({ gold: 10, towers: [], walls: {} }, snapshot);
    expect(field.deploySnapshot.towers).toHaveLength(1);
  });
});
