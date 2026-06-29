import { describe, it, expect } from 'vitest';
import { runLoopClarityChecks, summarizeLoopClarity } from '../src/campaign/loopClarityHarness.js';

describe('loopClarityHarness', () => {
  it('passes all loop clarity checks', () => {
    const checks = runLoopClarityChecks();
    const summary = summarizeLoopClarity(checks);
    const failures = checks.filter(c => c.status === 'fail');
    if (failures.length) {
      console.log(failures);
    }
    expect(summary.fail).toBe(0);
    expect(summary.pass).toBeGreaterThanOrEqual(6);
  });
});
