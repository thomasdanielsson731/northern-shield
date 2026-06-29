import { describe, it, expect } from 'vitest';
import { getHubInstructionHint } from '../src/settlement/settlementHub.js';
import { getHubBuildingMilestone } from '../src/settlement/hubMilestones.js';

describe('settlementHub', () => {
  it('getHubInstructionHint prioritizes chronicle unread', () => {
    const hint = getHubInstructionHint({ chronicleUnread: true, battlesCompleted: 3 });
    expect(hint.title).toBe('NEW SAGA ENTRY');
    expect(hint.line).toMatch(/Chronicle/i);
  });

  it('chronicle milestone pulses when unread', () => {
    const m = getHubBuildingMilestone('chronicle', { chronicleCount: 2, chronicleUnread: true });
    expect(m.available).toBe(true);
    expect(m.pulse).toBe(true);
    expect(m.unread).toBe(true);
    expect(m.banner).toBe('NEW ENTRY');
  });

  it('chronicle locked when no entries', () => {
    const m = getHubBuildingMilestone('chronicle', { chronicleCount: 0 });
    expect(m.available).toBe(false);
  });
});
