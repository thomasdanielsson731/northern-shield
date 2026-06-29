import { describe, it, expect } from 'vitest';
import {
  createPrepShellState,
  getHornBlockReason,
  getPrepObjectives,
  getPrepInstructionHint,
  applyPanelAction,
  applyFirstSagaAssaultRewards,
  defaultPrepFieldMeta,
  syncPrepMetaForAssault,
  getPrepAutoHotspot,
  getPrepRepairTeachHint,
  getPrepAdvisorContent,
  getPrepPanelActions,
  A2_DEBRIEF_WOOD_BUNDLE,
  FIRST_SAGA_A2_NODE,
  FIRST_SAGA_A3_NODE,
  GATE_REPAIR_WOOD_COST,
  PREP_HOTSPOTS,
  hotspotRect,
} from '../src/preparation/fortressCommanderShell.js';

describe('fortressCommanderShell', () => {
  it('blocks horn without assault or assignment', () => {
    expect(getHornBlockReason({
      pendingAssaultNode: null,
      postAssignments: {},
      prepMeta: defaultPrepFieldMeta(),
      assaultNodeIndex: 0,
    })).toMatch(/command map/i);

    expect(getHornBlockReason({
      pendingAssaultNode: 0,
      postAssignments: {},
      prepMeta: defaultPrepFieldMeta(),
      assaultNodeIndex: 0,
    })).toMatch(/Assign/i);
  });

  it('allows horn with assignment', () => {
    expect(getHornBlockReason({
      pendingAssaultNode: 0,
      postAssignments: { west_gate: { defenderId: 'g1' } },
      prepMeta: defaultPrepFieldMeta(),
      assaultNodeIndex: 0,
    })).toBeNull();
  });

  it('blocks horn when scar unrepaired on A3+', () => {
    const meta = { wood: 15, westGateScarred: true, westGateRepaired: false };
    expect(getHornBlockReason({
      pendingAssaultNode: 3,
      postAssignments: { west_gate: { defenderId: 'g1' } },
      prepMeta: meta,
      assaultNodeIndex: 3,
    })).toMatch(/Repair/i);
  });

  it('repairs gate spending wood', () => {
    const meta = { wood: 15, westGateScarred: true, westGateRepaired: false };
    const { meta: next, repairAnim } = applyPanelAction({ id: 'repair_gate' }, meta);
    expect(next.wood).toBe(15 - GATE_REPAIR_WOOD_COST);
    expect(next.westGateRepaired).toBe(true);
    expect(repairAnim).toBeGreaterThan(0);
  });

  it('applies A2 debrief scar and timber to field state', () => {
    const field = applyFirstSagaAssaultRewards({ gold: 0, towers: [], walls: {} }, FIRST_SAGA_A2_NODE);
    expect(field.westGateScarred).toBe(true);
    expect(field.wood).toBe(A2_DEBRIEF_WOOD_BUNDLE);
  });

  it('does not scar gate before A3 prep', () => {
    const m = syncPrepMetaForAssault(defaultPrepFieldMeta(), 2, 2);
    expect(m.westGateScarred).toBe(false);
    expect(m.wood).toBe(0);
  });

  it('bootstraps legacy saves entering A3 prep', () => {
    const m = syncPrepMetaForAssault(defaultPrepFieldMeta(), 3, 3);
    expect(m.westGateScarred).toBe(true);
    expect(m.wood).toBe(A2_DEBRIEF_WOOD_BUNDLE);
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

  it('auto-focuses wall scar on A3 teach', () => {
    const meta = { wood: 15, westGateScarred: true, westGateRepaired: false };
    expect(getPrepAutoHotspot(meta, { mapIndex: 0, nodeIndex: FIRST_SAGA_A3_NODE, isFirstSaga: true }))
      .toBe(PREP_HOTSPOTS.WALL_SCAR);
    expect(getPrepRepairTeachHint(meta)).toMatch(/Repair/i);
    expect(getPrepRepairTeachHint({ westGateScarred: true, westGateRepaired: false, wood: 2 }))
      .toMatch(/timber/i);
  });

  it('advisor content and panel actions for wall scar', () => {
    const ctx = {
      prepMeta: { westGateScarred: true, westGateRepaired: false, wood: 15 },
      postAssignments: { west_gate: { defenderId: 'd1' } },
      roster: { defenders: [{ defenderId: 'd1', name: 'Erik', type: 'berserk' }] },
      goldReserve: 0,
      nodeCasualties: new Set(),
    };
    const content = getPrepAdvisorContent(PREP_HOTSPOTS.WALL_SCAR, ctx);
    expect(content.title).toBe('West Wall');
    expect(content.lines[0]).toMatch(/splintered/i);
    const actions = getPrepPanelActions(PREP_HOTSPOTS.WALL_SCAR, ctx);
    expect(actions.some(a => a.id === 'repair_gate')).toBe(true);
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

  it('prep objectives require wall repair on A3 teach', () => {
    const ctx = {
      pendingAssaultNode: FIRST_SAGA_A3_NODE,
      assaultNodeIndex: FIRST_SAGA_A3_NODE,
      assault: { codename: 'Splinter Raid' },
      prepMeta: { westGateScarred: true, westGateRepaired: false, wood: 15 },
      postAssignments: { west_gate: { defenderId: 'd1' } },
      roster: { defenders: [{ defenderId: 'd1', name: 'Erik', type: 'berserk' }] },
    };
    const steps = getPrepObjectives(ctx);
    expect(steps.find(s => s.id === 'repair_gate')?.active).toBe(true);
    expect(getPrepInstructionHint(ctx)?.title).toBe('MEND THE GATE');
  });
});
