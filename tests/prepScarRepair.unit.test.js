import { describe, it, expect } from 'vitest';
import {
  needsGateRepair,
  canAffordGateRepair,
  repairWestGateMeta,
  applyGateScarFromAssault,
  GATE_REPAIR_GOLD_COST,
} from '../src/fortress/prepScarRepair.js';
import {
  createHornCameraState,
  computePanForCellFocus,
  tickHornCameraPan,
  HORN_CAMERA_MS,
} from '../src/preparation/prepHornCamera.js';

describe('prepScarRepair', () => {
  it('detects unrepaired scar', () => {
    expect(needsGateRepair({ westGateScarred: true, westGateRepaired: false })).toBe(true);
    expect(needsGateRepair({ westGateScarred: true, westGateRepaired: true })).toBe(false);
  });

  it('repairs with gold when wood is low', () => {
    const { meta, goldSpent, woodSpent } = repairWestGateMeta(
      { westGateScarred: true, westGateRepaired: false, wood: 0 },
      GATE_REPAIR_GOLD_COST,
    );
    expect(goldSpent).toBe(GATE_REPAIR_GOLD_COST);
    expect(woodSpent).toBe(0);
    expect(meta.westGateRepaired).toBe(true);
  });

  it('applies scar after damaged assault', () => {
    const field = applyGateScarFromAssault({ gold: 0, towers: [] }, { gateHpPct: 60 });
    expect(field.westGateScarred).toBe(true);
    expect(field.westGateRepaired).toBe(false);
    expect(field.wood).toBeGreaterThan(0);
  });
});

describe('prepHornCamera', () => {
  it('eases pan toward gate cell', () => {
    const state = createHornCameraState();
    state.active = true;
    state.fromPanX = 0;
    state.fromPanY = 0;
    state.toPanX = 100;
    state.toPanY = 50;
    state.elapsed = HORN_CAMERA_MS;
    const result = tickHornCameraPan(state, 0);
    expect(result.panX).toBeCloseTo(100, 0);
    expect(result.panY).toBeCloseTo(50, 0);
    expect(result.done).toBe(true);
  });

  it('computePanForCellFocus returns pan offsets', () => {
    const pan = computePanForCellFocus({
      cell: { col: 19, row: 15 },
      cellSize: 14,
      cols: 48,
      rows: 30,
      playfieldWidth: 400,
      playfieldHeight: 300,
      zoom: 0.54,
    });
    expect(typeof pan.panX).toBe('number');
    expect(typeof pan.panY).toBe('number');
  });
});
