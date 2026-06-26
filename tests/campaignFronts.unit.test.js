import { describe, it, expect } from 'vitest';
import {
  FRONT_IDS,
  getFrontLayout,
  getAssaultCodename,
  getAssaultTierLabel,
  isAssaultUnlocked,
  getNextAvailableAssault,
  getFrontStatusLine,
  getFrontStatusSymbol,
  getFrontSubtitle,
} from '../src/campaign/campaignFronts.js';
import { createEmptyCampaignProgress, getNodeCountForMap } from '../src/campaign/campaignMaps.js';
import { FIRST_SAGA_A4_NODE } from '../src/campaign/firstSaga.js';

describe('campaignFronts', () => {
  it('generates deterministic assault codenames', () => {
    const a = getAssaultCodename(0, 0);
    const b = getAssaultCodename(0, 0);
    expect(a).toMatch(/^[A-Za-zäöüÄÖÜ]+ [A-Za-z]+$/);
    expect(a).toBe(b);
    expect(getAssaultCodename(0, 1)).not.toBe(a);
  });

  it('places boss on west front for first saga map 0', () => {
    const layout = getFrontLayout(0);
    expect(layout.firstSaga).toBe(true);
    const bossIndex = FIRST_SAGA_A4_NODE;
    expect(layout.nodeToAssault[bossIndex].frontId).toBe('west');
    const westBoss = layout.fronts.west.assaults.find(a => a.isBoss);
    expect(westBoss?.nodeIndex).toBe(bossIndex);
    expect(westBoss?.codename).toBe('Ash-Warden');
  });

  it('unlocks first assault on west front only for saga map 0', () => {
    const p = createEmptyCampaignProgress();
    const layout = getFrontLayout(0);
    const westFirst = layout.fronts.west.assaults[0];
    expect(isAssaultUnlocked(p, 0, westFirst.nodeIndex)).toBe(true);
    expect(layout.fronts.north.assaults).toHaveLength(0);
  });

  it('requires prior assault on same front before unlocking next', () => {
    const p = createEmptyCampaignProgress();
    const layout = getFrontLayout(0);
    const west = layout.fronts.west.assaults;
    if (west.length < 2) return;
    expect(isAssaultUnlocked(p, 0, west[1].nodeIndex)).toBe(false);
    p.mapRuns[0] = { nodesCleared: [west[0].nodeIndex], fieldState: null };
    expect(isAssaultUnlocked(p, 0, west[1].nodeIndex)).toBe(true);
  });

  it('getNextAvailableAssault prefers same front', () => {
    const p = createEmptyCampaignProgress();
    const layout = getFrontLayout(0);
    const west0 = layout.fronts.west.assaults[0];
    p.mapRuns[0] = { nodesCleared: [west0.nodeIndex], fieldState: null };
    const next = getNextAvailableAssault(p, 0, 'west');
    expect(next?.frontId).toBe('west');
  });

  it('blocks assaults on locked maps (matches campaign select)', () => {
    const p = createEmptyCampaignProgress();
    p.mapsUnlocked = 1;
    const layout = getFrontLayout(1);
    const first = layout.fronts.west.assaults[0];
    expect(isAssaultUnlocked(p, 1, first.nodeIndex)).toBe(false);
    expect(isAssaultUnlocked(p, 0, layout.fronts.west.assaults[0].nodeIndex)).toBe(true);
  });

  it('only west front has assaults on fresh saga map 0', () => {
    const p = createEmptyCampaignProgress();
    const layout = getFrontLayout(0);
    expect(layout.fronts.west.assaults.length).toBeGreaterThan(0);
    for (const frontId of ['north', 'east', 'south']) {
      expect(layout.fronts[frontId].assaults).toHaveLength(0);
    }
    const active = layout.fronts.west.assaults.some(
      a => isAssaultUnlocked(p, 0, a.nodeIndex)
    );
    expect(active).toBe(true);
  });

  it('front status lines include non-color symbols for a11y', () => {
    const p = createEmptyCampaignProgress();
    const layout = getFrontLayout(0);
    const west = layout.fronts.west;
    expect(getFrontStatusSymbol(west, p, 0)).toBe('▶');
    expect(getFrontStatusLine(west, p, 0, 1)).toMatch(/^▶ /);
    p.mapRuns[0] = { nodesCleared: west.assaults.map(a => a.nodeIndex), fieldState: null };
    expect(getFrontStatusSymbol(west, p, 0)).toBe('✓');
    expect(getFrontStatusLine(west, p, 0, 1)).toBe('✓ SECURED');
  });

  it('tier labels and subtitles for assault rows', () => {
    expect(getAssaultTierLabel(0, false)).toMatch(/Raid/);
    expect(getAssaultTierLabel(2, false)).toMatch(/Skirmish/);
    expect(getAssaultTierLabel(0, true)).toBe('Boss');
    const p = createEmptyCampaignProgress();
    const layout = getFrontLayout(0);
    const west = layout.fronts.west;
    expect(getFrontSubtitle(west, p, 0, 1)).toMatch(/█/);
    p.mapRuns[0] = { nodesCleared: west.assaults.map(a => a.nodeIndex), fieldState: null };
    expect(getFrontSubtitle(west, p, 0, 1)).toBe('SECURED');
  });
});
