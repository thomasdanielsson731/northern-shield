import { describe, it, expect } from 'vitest';
import {
  createPrepShellState,
  getHornBlockReason,
  applyPanelAction,
  defaultPrepFieldMeta,
  syncPrepMetaForAssault,
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

  it('syncs scar after A2 progression', () => {
    const m = syncPrepMetaForAssault(defaultPrepFieldMeta(), 3, 2);
    expect(m.westGateScarred).toBe(true);
    expect(m.wood).toBe(15);
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
});
