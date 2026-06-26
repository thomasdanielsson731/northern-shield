import { describe, it, expect } from 'vitest';
import {
  validateSessionState,
  simpleSessionChecksum,
  verifySessionChecksum,
} from '../src/campaign/sessionSave.js';

describe('sessionSave', () => {
  it('rejects invalid phase', () => {
    expect(validateSessionState({ version: 1, gamePhase: 'bogus' })).toBeNull();
  });

  it('sanitizes combat resume state', () => {
    const s = validateSessionState({
      version: 1,
      gamePhase: 'playing',
      combat: {
        mapIndex: 0,
        nodeIndex: 2,
        waveNumber: 3,
        waveState: 'active',
        gold: 999999,
        lives: 50,
        casualties: ['a', 1, 'b'],
      },
    });
    expect(s.combat.gold).toBe(999999);
    expect(s.combat.waveState).toBe('active');
    expect(s.combat.casualties).toEqual(['a', 'b']);
  });

  it('produces stable session checksum', () => {
    const s = { version: 1, gamePhase: 'nodeMap', campaignMapIndex: 1 };
    expect(simpleSessionChecksum(s)).toMatch(/^[0-9a-f]+$/);
    expect(simpleSessionChecksum(s)).toBe(simpleSessionChecksum(s));
  });

  it('sanitizes settlement and hero naming ceremony state', () => {
    const s = validateSessionState({
      version: 1,
      gamePhase: 'heroNamingCeremony',
      settlementCeremony: { step: 99, recruitType: 'valkyrie', nameDraft: 'x'.repeat(30) },
      heroNamingCeremony: {
        nameDraft: 'Sverker',
        defenderId: 'd1',
        pending: { action: 'prep', nodeIndex: 2 },
      },
    });
    expect(s.gamePhase).toBe('heroNamingCeremony');
    expect(s.settlementCeremony.step).toBe(5);
    expect(s.settlementCeremony.nameDraft).toHaveLength(16);
    expect(s.heroNamingCeremony.pending.action).toBe('prep');
    expect(s.heroNamingCeremony.pending.nodeIndex).toBe(2);
  });

  it('accepts session without checksum', () => {
    const { ok, state } = verifySessionChecksum({ version: 1, gamePhase: 'nodeMap', campaignMapIndex: 0 });
    expect(ok).toBe(true);
    expect(state.gamePhase).toBe('nodeMap');
  });

  it('verifySessionChecksum clamps tampered combat gold', () => {
    const s = {
      version: 1,
      gamePhase: 'playing',
      combat: { mapIndex: 0, nodeIndex: 0, waveNumber: 2, gold: 120, lives: 5 },
    };
    const ck = simpleSessionChecksum(s);
    const tampered = {
      ...s,
      combat: { ...s.combat, gold: 50000, lives: 99 },
      _ck: ck,
    };
    const { ok, state } = verifySessionChecksum(tampered);
    expect(ok).toBe(false);
    expect(state.combat.gold).toBe(200);
    expect(state.combat.lives).toBe(8);
  });
});
