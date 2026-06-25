/**
 * Assault (pathless) enemy targeting — fortress gates / PORT priority.
 * Gates are the top priority until one is breached; after that enemies ignore ports.
 */

export function hasLivingFortressGates(wallData) {
  return Object.values(wallData ?? {}).some(w => w.isGate && (w.hp ?? 1) > 0);
}

export function shouldPrioritizeFortressGates(pathless, gateBreached, wallData) {
  return !!pathless && !gateBreached && hasLivingFortressGates(wallData);
}

/** Insert `gates` first while ports are still the assault objective. */
export function buildAssaultTargetPriority(basePriority, { pathless, gateBreached, wallData }) {
  const base = (basePriority ?? []).filter(k => k !== 'gates');
  if (!shouldPrioritizeFortressGates(pathless, gateBreached, wallData)) return base;
  return ['gates', ...base];
}

/** Ring walls are structure targets; gates only via the `gates` priority kind. */
export function isStructureWallTarget(wall) {
  return wall && !wall.isGate && (wall.hp ?? 1) > 0;
}

export function isGateWallTarget(wall, gateBreached) {
  return wall?.isGate && !gateBreached && (wall.hp ?? 1) > 0;
}
