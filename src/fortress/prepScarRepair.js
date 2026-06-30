/**
 * West gate scar + repair between assaults (First Saga).
 * @see design/FORTRESS_PREP_ASSAULT_GRAPHICS.md §7.3
 */

export const GATE_REPAIR_GOLD_COST = 25;
export const GATE_REPAIR_WOOD_COST = 8;

export function needsGateRepair(meta) {
  return !!meta?.westGateScarred && meta?.westGateRepaired === false;
}

export function canAffordGateRepair(meta, goldReserve = 0) {
  if (!needsGateRepair(meta)) return false;
  const wood = meta?.wood ?? 0;
  return goldReserve >= GATE_REPAIR_GOLD_COST || wood >= GATE_REPAIR_WOOD_COST;
}

export function getGateRepairBlockReason(meta, goldReserve = 0) {
  if (!needsGateRepair(meta)) return null;
  if (canAffordGateRepair(meta, goldReserve)) return null;
  return `Need ${GATE_REPAIR_GOLD_COST}g or ${GATE_REPAIR_WOOD_COST} wood to mend the gate`;
}

/** Apply repair — prefers wood when available. Returns updated meta + spend. */
export function repairWestGateMeta(meta, goldReserve = 0) {
  if (!needsGateRepair(meta)) {
    return { meta: { ...meta }, goldSpent: 0, woodSpent: 0 };
  }
  const wood = meta?.wood ?? 0;
  let goldSpent = 0;
  let woodSpent = 0;
  if (wood >= GATE_REPAIR_WOOD_COST) {
    woodSpent = GATE_REPAIR_WOOD_COST;
  } else if (goldReserve >= GATE_REPAIR_GOLD_COST) {
    goldSpent = GATE_REPAIR_GOLD_COST;
  } else {
    return { meta: { ...meta }, goldSpent: 0, woodSpent: 0, failed: true };
  }
  return {
    meta: {
      ...meta,
      wood: wood - woodSpent,
      westGateScarred: true,
      westGateRepaired: true,
    },
    goldSpent,
    woodSpent,
  };
}

/** Persist gate damage from assault end onto field state. */
export function applyGateScarFromAssault(field, { gateHpPct = null, breached = false } = {}) {
  if (!field) return field;
  const damaged = breached || (gateHpPct != null && gateHpPct < 85);
  if (!damaged) return field;
  return {
    ...field,
    westGateScarred: true,
    westGateRepaired: false,
    wood: (field.wood ?? 0) + (breached ? 0 : 4),
  };
}
