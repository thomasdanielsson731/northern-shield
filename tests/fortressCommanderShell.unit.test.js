import { describe, it, expect } from 'vitest';
import {
  createPrepShellState,
  getHornBlockReason,
  getPrepObjectives,
  getPrepInstructionHint,
  applyFirstSagaAssaultRewards,
  defaultPrepFieldMeta,
  loadPrepFieldMeta,
  normalizePrepFieldMeta,
  syncPrepMetaForAssault,
  getPrepAdvisorContent,
  getPrepPanelActions,
  PREP_HOTSPOTS,
  hotspotRect,
} from '../src/preparation/fortressCommanderShell.js';
import { FIRST_SAGA_A3_NODE } from '../src/campaign/firstSaga.js';

describe('fortressCommanderShell', () => {
  it('blocks horn without assault or assignment', () => {
    expect(getHornBlockReason({
      pendingAssaultNode: null,
      postAssignments: {},
    })).toMatch(/command map/i);

    expect(getHornBlockReason({
      pendingAssaultNode: 0,
      postAssignments: {},
    })).toMatch(/Assign/i);
  });

  it('allows horn with assignment even when legacy scar meta exists', () => {
    expect(getHornBlockReason({
      pendingAssaultNode: 3,
      postAssignments: { west_gate: { defenderId: 'g1' } },
    })).toBeNull();
  });

  it('clears legacy scar meta after assault victory', () => {
    const field = applyFirstSagaAssaultRewards({
      gold: 0,
      towers: [],
      walls: {},
      westGateScarred: true,
      wood: 15,
    });
    expect(field.westGateScarred).toBe(false);
    expect(field.westGateRepaired).toBe(true);
    expect(field.wood).toBe(0);
  });

  it('normalizes prep meta to a fully restored fortress', () => {
    const m = syncPrepMetaForAssault({
      wood: 15,
      westGateScarred: true,
      westGateRepaired: false,
    });
    expect(m.westGateScarred).toBe(false);
    expect(m.westGateRepaired).toBe(true);
    expect(m.wood).toBe(0);

    const loaded = loadPrepFieldMeta({
      westGateScarred: true,
      westGateRepaired: false,
      wood: 20,
    });
    expect(loaded).toEqual(normalizePrepFieldMeta({}));
  });

  it('defines five hotspot layouts', () => {
    const pf = { x: 0, y: 0, w: 400, h: 300 };
    expect(hotspotRect(pf, PREP_HOTSPOTS.WEST_GATE)).toBeTruthy();
    expect(hotspotRect(pf, PREP_HOTSPOTS.TREASURY)).toBeTruthy();
  });

  it('creates shell camera state', () => {
    const s = createPrepShellState();
    expect(s.cameraScale).toBe(1);
    expect(s.selectedHotspot).toBeNull();
  });

  it('advisor content for west wall describes intact palisade', () => {
    const ctx = {
      prepMeta: defaultPrepFieldMeta(),
      postAssignments: { west_gate: { defenderId: 'd1' } },
      roster: { defenders: [{ defenderId: 'd1', name: 'Erik', type: 'berserk' }] },
      goldReserve: 0,
      nodeCasualties: new Set(),
    };
    const content = getPrepAdvisorContent(PREP_HOTSPOTS.WALL_SCAR, ctx);
    expect(content.title).toBe('West Wall');
    expect(content.lines[0]).toMatch(/stands/i);
    expect(getPrepPanelActions(PREP_HOTSPOTS.WALL_SCAR, ctx)).toEqual([]);
  });

  it('prep objectives progress from gate assign through horn', () => {
    const assault = { codename: 'Wolf Smoke', tierLabel: 'A1' };
    const base = {
      pendingAssaultNode: 0,
      assaultNodeIndex: 0,
      assault,
      prepMeta: defaultPrepFieldMeta(),
      postAssignments: {},
      roster: { defenders: [{ defenderId: 'd1', name: 'Erik', type: 'berserk' }] },
    };

    let steps = getPrepObjectives(base);
    expect(steps.find(s => s.id === 'assign_gate')?.active).toBe(true);
    expect(getPrepInstructionHint(base)?.title).toBe('ASSIGN GATE');

    const assigned = {
      ...base,
      postAssignments: { west_gate: { defenderId: 'd1' } },
    };
    steps = getPrepObjectives(assigned);
    expect(steps.find(s => s.id === 'assign_gate')?.done).toBe(true);
    expect(steps.find(s => s.id === 'sound_horn')?.active).toBe(true);
    expect(getPrepInstructionHint(assigned)?.title).toBe('SOUND HORN');

    const noAssault = { ...base, pendingAssaultNode: null, assaultNodeIndex: null, assault: null };
    expect(getPrepInstructionHint(noAssault)?.title).toBe('COMMAND MAP');
  });

  it('prep objectives skip repair on A3 teach', () => {
    const ctx = {
      pendingAssaultNode: FIRST_SAGA_A3_NODE,
      assaultNodeIndex: FIRST_SAGA_A3_NODE,
      assault: { codename: 'Splinter Raid' },
      prepMeta: defaultPrepFieldMeta(),
      postAssignments: { west_gate: { defenderId: 'd1' } },
      roster: { defenders: [{ defenderId: 'd1', name: 'Erik', type: 'berserk' }] },
    };
    const steps = getPrepObjectives(ctx);
    expect(steps.find(s => s.id === 'repair_gate')).toBeUndefined();
    expect(getPrepInstructionHint(ctx)?.title).toBe('SOUND HORN');
  });
});
