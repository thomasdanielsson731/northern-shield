import { describe, it, expect } from 'vitest';
import {
  runFirstSagaPlaytestHarness,
  estimateAssaultBalance,
  simulateSagaProgress,
} from '../src/campaign/sagaPlaytestHarness.js';
import { getNextAvailableAssault } from '../src/campaign/campaignFronts.js';

describe('firstSaga playtest harness', () => {
  it('runs full checklist with zero failures', () => {
    const { checks, summary } = runFirstSagaPlaytestHarness();
    const failures = checks.filter(c => c.status === 'fail');
    if (failures.length > 0) {
      const msg = failures.map(f => `${f.id}: ${f.label} ${f.detail ?? ''}`).join('\n');
      expect.fail(`${summary.fail} harness failure(s):\n${msg}`);
    }
    expect(summary.fail).toBe(0);
    expect(summary.pass).toBeGreaterThan(40);
    expect(summary.manual).toBeGreaterThan(5);
  });

  it('linear saga progression unlocks assaults in order', () => {
    const { progress } = simulateSagaProgress(0);
    expect(getNextAvailableAssault(progress, 0)?.nodeIndex).toBe(1);
    const mid = simulateSagaProgress(2);
    expect(mid.cleared).toEqual([0, 1, 2]);
  });

  it('A0–A2 pass balance heuristic for lone Berserker', () => {
    expect(estimateAssaultBalance(0).clearable).toBe(true);
    expect(estimateAssaultBalance(1).clearable).toBe(true);
    expect(estimateAssaultBalance(2).clearable).toBe(true);
  });
});
