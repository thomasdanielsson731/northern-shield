import { describe, it, expect } from 'vitest';
import { getWarCampInstructionHint } from '../src/ui/warCampPanel.js';

describe('warCampPanel hints', () => {
  it('getWarCampInstructionHint surfaces chronicle unread', () => {
    const hint = getWarCampInstructionHint({ chronicleUnread: true });
    expect(hint?.title).toBe('CHRONICLE');
    expect(hint?.line).toMatch(/Unread/i);
  });
});
