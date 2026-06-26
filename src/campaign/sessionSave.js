const VALID_PHASES = new Set([
  'campaignSelect', 'nodeMap', 'betweenBattles', 'debrief', 'playing', 'mapSelect',
  'fortressPrep', 'settlementCeremony', 'heroNamingCeremony',
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

  if (raw.settlementCeremony && typeof raw.settlementCeremony === 'object') {
    const sc = raw.settlementCeremony;
    s.settlementCeremony = {
      step: Math.max(0, Math.min(5, clampInt(sc.step, 0, 5))),
      recruitType: typeof sc.recruitType === 'string' ? sc.recruitType : null,
      nameDraft: typeof sc.nameDraft === 'string' ? sc.nameDraft.slice(0, 16) : '',
    };
  }

  if (raw.heroNamingCeremony && typeof raw.heroNamingCeremony === 'object') {
    const hn = raw.heroNamingCeremony;
    s.heroNamingCeremony = {
      nameDraft: typeof hn.nameDraft === 'string' ? hn.nameDraft.slice(0, 16) : '',
      defenderId: typeof hn.defenderId === 'string' ? hn.defenderId : null,
      pending: hn.pending && typeof hn.pending === 'object'
        ? { action: String(hn.pending.action ?? 'warCamp'), nodeIndex: hn.pending.nodeIndex != null ? clampInt(hn.pending.nodeIndex, 0, 29) : undefined }
        : { action: 'warCamp' },
    };
  }

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

/** Lightweight checksum for mid-battle session tamper deterrence. */
export function simpleSessionChecksum(session) {
  const c = session?.combat;
  const payload = `${session?.gamePhase ?? ''}|${session?.campaignMapIndex ?? 0}|${session?.campaignNodeIndex ?? 0}|${c?.gold ?? 0}|${c?.lives ?? 0}|${c?.waveNumber ?? 0}`;
  let h = 0;
  for (let i = 0; i < payload.length; i++) h = ((h << 5) - h + payload.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16);
}

/** Verify session checksum; clamp inflated combat economy if tampered. */
export function verifySessionChecksum(raw) {
  if (!raw) return { ok: false, state: null };
  if (raw._ck == null) {
    const validated = validateSessionState(raw);
    return { ok: !!validated, state: validated };
  }
  const { _ck, ...rest } = raw;
  const expected = simpleSessionChecksum(rest);
  const validated = validateSessionState(rest);
  if (!validated) return { ok: false, state: null };
  if (_ck === expected) return { ok: true, state: validated };
  if (validated.combat) {
    validated.combat.gold = Math.min(validated.combat.gold ?? 0, 200);
    validated.combat.lives = Math.min(validated.combat.lives ?? 0, 8);
  }
  return { ok: false, state: validated };
}

function clampInt(v, min, max) {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}
