import { describe, it, expect } from 'vitest';
import {
  isSiegePostUnlocked,
  getSiegePanelActions,
  SIEGE_PLATFORM_OPTIONS,
} from '../src/preparation/prepSiegePicker.js';
import { buildDeployedPostLines } from '../src/campaign/debriefReport.js';
import { getSiegePostRows } from '../src/fortress/fortressLayout.js';

describe('prepSiegePicker', () => {
  it('gates ballista on armory level 1', () => {
    expect(isSiegePostUnlocked('ballista_platform', { armory: 0 })).toBe(false);
    expect(isSiegePostUnlocked('ballista_platform', { armory: 1 })).toBe(true);
  });

  it('offers mount action when unlocked and empty', () => {
    const actions = getSiegePanelActions('ballista_platform', {
      postAssignments: {},
      fortressUpgrades: { armory: 1 },
    });
    expect(actions).toHaveLength(1);
    expect(actions[0].id).toBe('assign_siege');
    expect(actions[0].structureType).toBe(SIEGE_PLATFORM_OPTIONS.ballista_platform.structureType);
  });
});

describe('buildDeployedPostLines', () => {
  it('cites hero and siege posts by name', () => {
    const lines = buildDeployedPostLines(
      {
        west_gate: { defenderId: 'd1' },
        ballista_platform: { structureType: 'ballista', level: 1 },
      },
      { defenders: [{ defenderId: 'd1', name: 'Bjorn', type: 'berserk' }] },
      { isVictory: true },
    );
    expect(lines.some(l => l.includes('Bjorn') && l.includes('West Gate'))).toBe(true);
    expect(lines.some(l => l.includes('Ballista') && l.includes('Ballista Platform'))).toBe(true);
  });
});

describe('getSiegePostRows', () => {
  it('lists mounted siege posts', () => {
    const rows = getSiegePostRows({
      catapult_platform: { structureType: 'catapult', level: 2 },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].structureType).toBe('catapult');
    expect(rows[0].level).toBe(2);
  });
});
