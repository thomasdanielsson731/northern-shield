const VALID_PHASES = new Set([
  'campaignSelect', 'nodeMap', 'betweenBattles', 'debrief', 'playing', 'mapSelect',
]);

/** Sanitize persisted navigation / resume state for a save slot. */
export function validateSessionState(raw) {
  if (!raw || raw.version !== 1) return null;
  if (!VALID_PHASES.has(raw.gamePhase)) return null;

  const s = {
    version: 1,
    gamePhase: raw.gamePhase,
    campaignMapIndex: clampInt(raw.campaignMapIndex, 0, 99),
    campaignNodeIndex: clampInt(raw.campaignNodeIndex, 0, 29),
    campaignRegionActive: !!raw.campaignRegionActive,
    campaignMapPage: clampInt(raw.campaignMapPage, 0, 99),
    selectedMapIdx: clampInt(raw.selectedMapIdx, 0, 9),
    returnToNodeMapAfterDebrief: !!raw.returnToNodeMapAfterDebrief,
  };

  if (raw.combat && typeof raw.combat === 'object') {
    const c = raw.combat;
    s.combat = {
      mapIndex: clampInt(c.mapIndex, 0, 99),
      nodeIndex: clampInt(c.nodeIndex, 0, 29),
      waveNumber: Math.max(0, clampInt(c.waveNumber, 0, 999)),
      waveState: ['countdown', 'break', 'active'].includes(c.waveState) ? c.waveState : 'break',
      nodeWaveIndex: Math.max(0, clampInt(c.nodeWaveIndex, 0, 9)),
      lives: Math.max(0, clampInt(c.lives, 0, 99)),
      gold: Math.max(0, clampInt(c.gold, 0, 999999)),
      field: c.field ?? null,
      casualties: Array.isArray(c.casualties) ? c.casualties.filter(id => typeof id === 'string') : [],
      skirmishPresetIndex: c.skirmishPresetIndex != null ? clampInt(c.skirmishPresetIndex, 0, 9) : null,
    };
  }

  return s;
}

function clampInt(v, min, max) {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}
