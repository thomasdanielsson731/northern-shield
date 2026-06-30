import { describe, it, expect } from 'vitest';
import {
  getCommandMapMetaHeader,
  getCommandMapBriefingLines,
  getFirstSagaNextAssault,
} from '../src/campaign/firstSagaUI.js';
import { createEmptyCampaignProgress, getMapRun } from '../src/campaign/campaignMaps.js';

describe('commandMapChrome', () => {
  it('getCommandMapMetaHeader returns first-saga region title and next assault', () => {
    const progress = createEmptyCampaignProgress();
    const run = getMapRun(progress, 0);
    const header = getCommandMapMetaHeader(progress, 0, run, {});
    expect(header.line1).toBe('REGION 1 — ASH FEN · WEST ROAD');
    expect(header.line2).toMatch(/NEXT → FIRST NIGHT/);
  });

  it('getFirstSagaNextAssault picks earliest uncleared assault', () => {
    const progress = createEmptyCampaignProgress();
    const run = getMapRun(progress, 0);
    const next = getFirstSagaNextAssault(progress, 0, run);
    expect(next?.codename).toBe('First Night');
  });

  it('getCommandMapBriefingLines includes deploy and warning lines', () => {
    const meta = { boss: { name: 'ASH-WARDEN' } };
    const lines = getCommandMapBriefingLines(meta, {
      nodeCount: 6,
      portalCount: 1,
      deployHint: 3,
      structRec: 2,
      wbAnalysis: { counts: { tank: 1, support: 0, st_dps: 2, aoe_dps: 0 } },
      warnings: ['Need more tanks'],
    });
    expect(lines[0]).toMatch(/6 assaults/);
    expect(lines[1]).toMatch(/Deploy ~3 heroes/);
    expect(lines[2]).toMatch(/Need more tanks/);
  });
});
