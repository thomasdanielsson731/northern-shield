import { describe, it, expect } from 'vitest';
import {
  resolvePostCell,
  getPrimaryGateForFront,
  assignDefender,
  assignStructure,
  validateAssignments,
  buildTowerPlacements,
  inferPostAssignmentsFromTowers,
  countAssignedHeroes,
  HERO_POST_IDS,
  MAX_HERO_POSTS_FILLED,
} from '../src/fortress/defensivePosts.js';

const goal = { col: 24, row: 15 };

describe('defensivePosts', () => {
  it('resolves gate cells on fortress ring', () => {
    expect(resolvePostCell('west_gate', goal)).toEqual({ col: 19, row: 15 });
    expect(resolvePostCell('east_gate', goal)).toEqual({ col: 29, row: 15 });
    expect(getPrimaryGateForFront('north')).toBe('north_gate');
  });

  it('assigns one defender to one post', () => {
    let a = {};
    a = assignDefender(a, 'west_gate', 'd1');
    a = assignDefender(a, 'east_gate', 'd2');
    expect(a.west_gate.defenderId).toBe('d1');
    a = assignDefender(a, 'north_gate', 'd1');
    expect(a.west_gate).toBeUndefined();
    expect(a.north_gate.defenderId).toBe('d1');
  });

  it('validates minimum heroes', () => {
    expect(validateAssignments({}).ok).toBe(false);
    const ok = validateAssignments({ west_gate: { defenderId: 'd1' } });
    expect(ok.ok).toBe(true);
    expect(ok.heroCount).toBe(1);
  });

  it('rejects duplicate defender assignments', () => {
    const bad = validateAssignments({
      west_gate: { defenderId: 'd1' },
      east_gate: { defenderId: 'd1' },
    });
    expect(bad.ok).toBe(false);
  });

  it('builds tower placements from roster', () => {
    const roster = [
      { defenderId: 'g1', name: 'Gunnar', type: 'berserk', careerLevel: 2 },
    ];
    const towers = buildTowerPlacements(
      { west_gate: { defenderId: 'g1' } },
      roster,
      goal,
    );
    expect(towers).toHaveLength(1);
    expect(towers[0]).toMatchObject({ type: 'berserk', col: 19, row: 15, defenderId: 'g1' });
  });

  it('infers assignments from legacy tower positions', () => {
    const field = {
      towers: [
        { type: 'berserk', col: 19, row: 15, defenderId: 'g1', level: 1 },
        { type: 'catapult', col: 29, row: 17, level: 1 },
      ],
    };
    const inferred = inferPostAssignmentsFromTowers(field, goal);
    expect(inferred.west_gate?.defenderId).toBe('g1');
    expect(inferred.catapult_platform?.structureType).toBe('catapult');
  });

  it('assigns siege structures', () => {
    let a = assignStructure({}, 'ballista_platform', 'military', 2);
    expect(a.ballista_platform).toEqual({ structureType: 'military', level: 2 });
    expect(countAssignedHeroes(a)).toBe(0);
  });

  it('enforces max hero post cap', () => {
    const assignments = {};
    HERO_POST_IDS.slice(0, MAX_HERO_POSTS_FILLED + 1).forEach((id, i) => {
      assignments[id] = { defenderId: `d${i}` };
    });
    const v = validateAssignments(assignments);
    expect(v.ok).toBe(false);
  });
});
