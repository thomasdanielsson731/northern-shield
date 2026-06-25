import { describe, it, expect } from 'vitest';
import {
  FRONT_IDS,
  getFrontLayout,
  getAssaultCodename,
  isAssaultUnlocked,
  getNextAvailableAssault,
  getFrontStatusLine,
  getFrontStatusSymbol,
} from '../src/campaign/campaignFronts.js';
import { createEmptyCampaignProgress, getNodeCountForMap } from '../src/campaign/campaignMaps.js';

describe('campaignFronts', () => {
  it('generates deterministic assault codenames', () => {
    const a = getAssaultCodename(0, 0);
    const b = getAssaultCodename(0, 0);
    expect(a).toMatch(/^[A-Za-zäöüÄÖÜ]+ [A-Za-z]+$/);
    expect(a).toBe(b);
    expect(getAssaultCodename(0, 1)).not.toBe(a);
  });

  it('places boss on south front', () => {
    const layout = getFrontLayout(0);
    const bossIndex = getNodeCountForMap(0) - 1;
    expect(layout.nodeToAssault[bossIndex].frontId).toBe('south');
    const southBoss = layout.fronts.south.assaults.find(a => a.isBoss);
    expect(southBoss?.nodeIndex).toBe(bossIndex);
  });

  it('unlocks first assault on each front', () => {
    const p = createEmptyCampaignProgress();
    const layout = getFrontLayout(0);
    for (const frontId of FRONT_IDS) {
      const first = layout.fronts[frontId].assaults[0];
      if (first) {
        expect(isAssaultUnlocked(p, 0, first.nodeIndex)).toBe(true);
      }
    }
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

  it('each front has an active assault on a fresh map 0 run', () => {
    const p = createEmptyCampaignProgress();
    const layout = getFrontLayout(0);
    for (const frontId of FRONT_IDS) {
      const front = layout.fronts[frontId];
      const active = front.assaults.some(
        a => isAssaultUnlocked(p, 0, a.nodeIndex)
      );
      expect(active).toBe(true);
    }
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
});
