import { describe, it, expect } from 'vitest';
import { getWarCampInstructionHint } from '../src/ui/warCampPanel.js';

describe('warCampPanel hints', () => {
  it('getWarCampInstructionHint surfaces chronicle unread', () => {
    const hint = getWarCampInstructionHint({ chronicleUnread: true });
    expect(hint?.title).toBe('CHRONICLE');
    expect(hint?.line).toMatch(/Unread/i);
  });

  it('getWarCampInstructionHint surfaces open roster slot after victory', () => {
    const hint = getWarCampInstructionHint({ isVictory: true, rosterCount: 2, rosterCap: 6 });
    expect(hint?.title).toBe('OPEN SLOT');
    expect(hint?.line).toMatch(/2\/6/);
  });
});
