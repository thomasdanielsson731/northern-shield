import { describe, it, expect } from 'vitest';
import {
  PREP_HOTSPOT_LAYOUT,
  getPrepArtPlayfield,
  resolvePrepHotspotRect,
  getPrepBackdropRect,
} from '../src/preparation/fortressPrepLayout.js';
import { hotspotRect } from '../src/preparation/fortressCommanderShell.js';

describe('fortressPrepLayout', () => {
  const pf = { x: 16, y: 50, w: 600, h: 400 };

  it('west gate sits left of watch tower on art plate', () => {
    expect(PREP_HOTSPOT_LAYOUT.west_gate.fx).toBeLessThan(PREP_HOTSPOT_LAYOUT.watch_tower.fx);
    expect(PREP_HOTSPOT_LAYOUT.west_gate.fy).toBeGreaterThan(PREP_HOTSPOT_LAYOUT.watch_tower.fy);
  });

  it('wall scar overlaps west gate palisade band', () => {
    const gate = PREP_HOTSPOT_LAYOUT.west_gate;
    const wall = PREP_HOTSPOT_LAYOUT.wall_scar;
    expect(wall.fx).toBeLessThan(gate.fx + gate.fw);
    expect(wall.fy).toBeLessThan(gate.fy + gate.fh);
  });

  it('resolves hotspots in art space aligned to backdrop cover-fit', () => {
    const gate = resolvePrepHotspotRect(PREP_HOTSPOT_LAYOUT.west_gate, pf, { useArtSpace: true });
    const backdrop = getPrepBackdropRect(pf);
    expect(gate.x).toBeGreaterThanOrEqual(backdrop.dx - 1);
    expect(gate.x + gate.w).toBeLessThanOrEqual(backdrop.dx + backdrop.dw + 1);
    expect(gate.y + gate.h).toBeLessThanOrEqual(backdrop.dy + backdrop.dh + 2);
  });

  it('hotspotRect returns cx/cy for camera focus', () => {
    const r = hotspotRect(pf, 'west_gate');
    expect(r?.cx).toBeGreaterThan(pf.x);
    expect(r?.cy).toBeGreaterThan(pf.y);
  });

  it('playfield insets stay within commander area', () => {
    const play = getPrepArtPlayfield(pf);
    expect(play.y).toBeGreaterThanOrEqual(pf.y);
    expect(play.y + play.h).toBeLessThanOrEqual(pf.y + pf.h);
  });
});
