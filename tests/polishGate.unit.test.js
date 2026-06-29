import { describe, it, expect } from 'vitest';
import { getHubInstructionHint } from '../src/settlement/settlementHub.js';
import { getHallInstructionHint } from '../src/ui/hallOfHeroesView.js';
import { getWarCampInstructionHint } from '../src/ui/warCampPanel.js';

/** RC gate smoke — chronicle + hall discoverability exports stay wired. */
describe('polish gate exports', () => {
  it('hub, hall, and war camp hints agree on chronicle unread copy', () => {
    expect(getHubInstructionHint({ chronicleUnread: true }).title).toBe('NEW SAGA ENTRY');
    expect(getWarCampInstructionHint({ chronicleUnread: true }).title).toBe('CHRONICLE');
    expect(getHallInstructionHint({ focusId: 'x' }).title).toBe('DOSSIER');
  });
});
