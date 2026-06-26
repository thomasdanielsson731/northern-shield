import { describe, it, expect } from 'vitest';
import {
  isHeroTowerType,
  serializeFieldState,
  ensurePostAssignments,
  markNodeCasualty,
  isNodeCasualty,
  clearNodeCasualties,
  startNodeAttack,
  completeNode,
  attachDeploySnapshot,
  prepareFieldForNewAssault,
  createEmptyCampaignProgress,
} from '../src/campaign/campaignRun.js';

describe('campaignRun helpers', () => {
  const goal = { col: 24, row: 15 };

  it('classifies hero tower types', () => {
    expect(isHeroTowerType('berserk')).toBe(true);
    expect(isHeroTowerType('catapult')).toBe(false);
  });

  it('serializes field stripping temporary walls and attaching posts', () => {
    const state = serializeFieldState(
      [{ type: 'berserk', col: 1, row: 2, level: 2, defenderId: 'd1', name: 'Erik' }],
      { '1_2': { hp: 50, temporary: true }, '3_3': { hp: 80, maxHp: 100 } },
      120.7,
      { west_gate: 'd1' },
    );
    expect(state.gold).toBe(120);
    expect(state.walls['1_2']).toBeUndefined();
    expect(state.postAssignments.west_gate).toBe('d1');
  });

  it('ensurePostAssignments migrates from towers when missing', () => {
    const field = {
      towers: [{ type: 'berserk', col: 19, row: 15, defenderId: 'd1' }],
      walls: {},
    };
    const posts = ensurePostAssignments(field, goal);
    expect(Object.keys(posts).length).toBeGreaterThan(0);
    expect(ensurePostAssignments({ postAssignments: { west_gate: 'd1' } })).toEqual({ west_gate: 'd1' });
    expect(ensurePostAssignments(null)).toEqual({});
  });

  it('tracks node casualties', () => {
    const set = new Set();
    markNodeCasualty(set, 'd1');
    markNodeCasualty(set, null);
    expect(isNodeCasualty(set, 'd1')).toBe(true);
    expect(isNodeCasualty(set, 'd2')).toBe(false);
    expect(isNodeCasualty(set, null)).toBe(false);
    clearNodeCasualties(set);
    expect(set.size).toBe(0);
  });

  it('startNodeAttack sets progress and returns wave plan', () => {
    const p = createEmptyCampaignProgress();
    const plan = startNodeAttack(p, 0, 1);
    expect(p.currentNodeIndex).toBe(1);
    expect(plan.waves.length).toBeGreaterThan(0);
  });

  it('completeNode is idempotent for duplicate clears', () => {
    const p = createEmptyCampaignProgress();
    const r1 = completeNode(p, 0, 0, { gold: 0, towers: [], walls: {} });
    const r2 = completeNode(p, 0, 0, { gold: 0, towers: [], walls: {} });
    expect(r1.progress).toBe(p);
    expect(r2.mapCompleted).toBe(false);
    expect(p.clearedMaps).not.toContain(0);
  });

  it('prepareFieldForNewAssault handles empty field', () => {
    expect(prepareFieldForNewAssault(null)).toEqual({ gold: 0, towers: [], walls: {} });
    expect(attachDeploySnapshot(null, { towers: [] })).toBeNull();
  });
});
