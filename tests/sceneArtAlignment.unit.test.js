import { describe, it, expect } from 'vitest';
import {
  computeContentCoverFit,
  mapContentNormToScreen,
  mapContentNormRect,
  isGroundAnchored,
  footYInDestBand,
  normRectFootPoint,
} from '../src/assets/artAlignment.js';
import {
  HUB_ART_W,
  HUB_ART_H,
  HUB_ART_CONTENT,
  HUB_BUILDING_LAYOUT,
  getHubContentDestRect,
  getHubPlayfield,
  resolveHubBuildingRect,
} from '../src/settlement/settlementHubLayout.js';
import { HUB_BUILDINGS } from '../src/settlement/settlementHub.js';
import {
  HALL_ART_W,
  HALL_ART_H,
  HALL_ART_CONTENT,
  HALL_PLINTH_NORM,
  HALL_FLOOR_BOUNDS,
  hallArtToScreen,
  computeHallImmersiveRect,
} from '../src/ui/hallOfHeroesView.js';
import {
  PREP_ART_W,
  PREP_ART_H,
  PREP_HOTSPOT_LAYOUT,
  getPrepBackdropRect,
  resolvePrepHotspotRect,
  isPrepHotspotGroundAnchored,
} from '../src/preparation/fortressPrepLayout.js';
import {
  REGION1_COMMAND_MAP_NODES,
  computeCoverFitRect,
  resolveCommandMapNodePositions,
} from '../src/campaign/commandMapLayout.js';
import { getDebriefPanelDrawRect } from '../src/ui/debriefJuice.js';

const HUB_LAYOUT = { x: 16, y: 50, w: 768, h: 430 };

describe('artAlignment core', () => {
  it('hub backdrop uses full plate content crop', () => {
    expect(HUB_ART_CONTENT.sh).toBe(1);
    expect(HUB_ART_CONTENT.sy).toBe(0);
    const full = computeCoverFitRect(HUB_ART_W, HUB_ART_H, 0, 0, 800, 450);
    const cropped = computeContentCoverFit(HUB_ART_W, HUB_ART_H, HUB_ART_CONTENT, 0, 0, 800, 450);
    expect(cropped.dw / cropped.dh).toBeCloseTo(full.dw / full.dh, 4);
    expect(cropped.srcW).toBeCloseTo(HUB_ART_W * HUB_ART_CONTENT.sw, 4);
    expect(cropped.srcH).toBeCloseTo(HUB_ART_H * HUB_ART_CONTENT.sh, 4);
  });

  it('maps content corners to dest corners', () => {
    const fit = computeContentCoverFit(960, 540, { sx: 0, sy: 0.4, sw: 1, sh: 0.58 }, 10, 20, 500, 300);
    const tl = mapContentNormToScreen(fit, 0, 0);
    const br = mapContentNormToScreen(fit, 1, 1);
    expect(tl.x).toBeCloseTo(fit.dx, 1);
    expect(tl.y).toBeCloseTo(fit.dy, 1);
    expect(br.x).toBeCloseTo(fit.dx + fit.dw, 1);
    expect(br.y).toBeCloseTo(fit.dy + fit.dh, 1);
  });

  it('mapContentNormRect matches point mapping', () => {
    const fit = computeContentCoverFit(640, 360, { sx: 0, sy: 0, sw: 1, sh: 1 }, 0, 0, 640, 360);
    const rect = mapContentNormRect(fit, 0.1, 0.2, 0.3, 0.4);
    const tl = mapContentNormToScreen(fit, 0.1, 0.2);
    expect(rect.x).toBeCloseTo(tl.x, 4);
    expect(rect.y).toBeCloseTo(tl.y, 4);
    expect(rect.w).toBeGreaterThan(0);
    expect(rect.h).toBeGreaterThan(0);
  });
});

describe('settlement hub art alignment', () => {
  const dest = () => getHubContentDestRect(HUB_LAYOUT);

  it('backdrop dest rect uses content crop dimensions', () => {
    const rect = dest();
    const cropped = computeContentCoverFit(HUB_ART_W, HUB_ART_H, HUB_ART_CONTENT,
      getHubPlayfield(HUB_LAYOUT).x, getHubPlayfield(HUB_LAYOUT).y,
      getHubPlayfield(HUB_LAYOUT).w, getHubPlayfield(HUB_LAYOUT).h);
    expect(rect.dx).toBeCloseTo(cropped.dx, 4);
    expect(rect.dw).toBeCloseTo(cropped.dw, 4);
    expect(rect.dh).toBeCloseTo(cropped.dh, 4);
  });

  it('ground buildings anchor feet in lower content band', () => {
    const groundIds = ['warband', 'fortress', 'recruit', 'chronicle', 'runeSmith', 'skirmish'];
    for (const id of groundIds) {
      const norm = HUB_BUILDING_LAYOUT[id];
      expect(isGroundAnchored(norm), id).toBe(true);
    }
    expect(HUB_BUILDING_LAYOUT.command.emblem).toBe(true);
    expect(isGroundAnchored(HUB_BUILDING_LAYOUT.command)).toBe(false);
  });

  it('building feet land in lower dest band when art space is used', () => {
    const fit = dest();
    for (const b of HUB_BUILDINGS) {
      if (b.id === 'slots') continue;
      const norm = HUB_BUILDING_LAYOUT[b.id];
      if (norm.emblem) continue;
      expect(footYInDestBand(fit, norm, 0.68), b.id).toBe(true);
    }
  });

  it('resolved building rects stay inside cover-fit dest', () => {
    const fit = dest();
    for (const b of HUB_BUILDINGS) {
      const norm = HUB_BUILDING_LAYOUT[b.id];
      const box = resolveHubBuildingRect(norm, HUB_LAYOUT, { useArtSpace: true });
      if (norm.emblem) {
        expect(box.x + box.w * 0.5).toBeLessThan(fit.dx + fit.dw * 0.12);
        continue;
      }
      expect(box.x).toBeGreaterThanOrEqual(fit.dx - 2);
      expect(box.y).toBeGreaterThanOrEqual(fit.dy - 2);
      expect(box.x + box.w).toBeLessThanOrEqual(fit.dx + fit.dw + 2);
      expect(box.y + box.h).toBeLessThanOrEqual(fit.dy + fit.dh + 4);
    }
  });

  it('save slots sit in top band of content (not ground)', () => {
    const slots = HUB_BUILDING_LAYOUT.slots;
    expect((slots.fy ?? 0) + (slots.fh ?? 0)).toBeLessThan(0.25);
  });
});

describe('hall of heroes art alignment', () => {
  const hall = { x: 20, y: 60, w: 760, h: 360 };

  it('plinth anchors sit on floor band of content (two rows)', () => {
    const b = HALL_FLOOR_BOUNDS;
    for (const p of HALL_PLINTH_NORM) {
      expect(p.nx).toBeGreaterThanOrEqual(b.minX);
      expect(p.nx).toBeLessThanOrEqual(b.maxX);
      expect(p.ny).toBeGreaterThanOrEqual(b.minY);
      expect(p.ny).toBeLessThanOrEqual(b.maxY);
    }
  });

  it('hallArtToScreen maps statue feet inside floor band', () => {
    for (const p of HALL_PLINTH_NORM) {
      const pt = hallArtToScreen(hall, p.nx, p.ny);
      const tl = hallArtToScreen(hall, HALL_FLOOR_BOUNDS.minX, HALL_FLOOR_BOUNDS.minY);
      const br = hallArtToScreen(hall, HALL_FLOOR_BOUNDS.maxX, HALL_FLOOR_BOUNDS.maxY);
      expect(pt.x).toBeGreaterThanOrEqual(tl.x - 1);
      expect(pt.x).toBeLessThanOrEqual(br.x + 1);
      expect(pt.y).toBeGreaterThanOrEqual(tl.y - 1);
      expect(pt.y).toBeLessThanOrEqual(br.y + 1);
    }
  });

  it('immersive rect leaves bottom inset for frame', () => {
    const r = computeHallImmersiveRect(16, 60, 500, 800, false);
    expect(r.h).toBeLessThan(500 - 60 - 10);
  });

  it('hall cover-fit uses cropped plate not full 1536×1024 aspect', () => {
    const full = computeCoverFitRect(HALL_ART_W, HALL_ART_H, hall.x, hall.y, hall.w, hall.h);
    const cropped = computeContentCoverFit(HALL_ART_W, HALL_ART_H, HALL_ART_CONTENT, hall.x, hall.y, hall.w, hall.h);
    expect(cropped.dw).not.toBeCloseTo(full.dw, 0);
  });
});

describe('fortress prep art alignment', () => {
  const playfield = { x: 40, y: 80, w: 700, h: 380 };

  it('prep hotspots with ground structures anchor feet', () => {
    expect(isPrepHotspotGroundAnchored('west_gate')).toBe(true);
    expect(isPrepHotspotGroundAnchored('longhouse')).toBe(true);
    expect(isPrepHotspotGroundAnchored('treasury')).toBe(true);
  });

  it('resolved prep rects stay inside backdrop dest', () => {
    const fit = getPrepBackdropRect(playfield);
    for (const [id, norm] of Object.entries(PREP_HOTSPOT_LAYOUT)) {
      const box = resolvePrepHotspotRect(norm, playfield, { useArtSpace: true });
      expect(box.x).toBeGreaterThanOrEqual(fit.dx - 2);
      expect(box.y).toBeGreaterThanOrEqual(fit.dy - 2);
      expect(box.x + box.w).toBeLessThanOrEqual(fit.dx + fit.dw + 2);
      expect(box.y + box.h).toBeLessThanOrEqual(fit.dy + fit.dh + 4);
      expect(id).toBeTruthy();
    }
  });

  it('west gate foot maps to lower schematic band', () => {
    const fit = getPrepBackdropRect(playfield);
    const gate = PREP_HOTSPOT_LAYOUT.west_gate;
    const foot = normRectFootPoint(gate);
    const p = mapContentNormToScreen(fit, foot.nx, foot.ny);
    expect(p.y).toBeGreaterThan(fit.dy + fit.dh * 0.65);
  });
});

describe('command map art alignment', () => {
  const mapBox = { x: 50, y: 70, w: 700, h: 400 };

  it('region 1 assault nodes descend along road (increasing fy)', () => {
    const assault = REGION1_COMMAND_MAP_NODES.slice(0, 5);
    for (let i = 1; i < assault.length; i++) {
      expect(assault[i].fy).toBeGreaterThan(assault[i - 1].fy);
    }
  });

  it('all norm nodes are inside unit square', () => {
    for (const n of REGION1_COMMAND_MAP_NODES) {
      expect(n.fx).toBeGreaterThanOrEqual(0);
      expect(n.fx).toBeLessThanOrEqual(1);
      expect(n.fy).toBeGreaterThanOrEqual(0);
      expect(n.fy).toBeLessThanOrEqual(1);
    }
  });

  it('fallback linear positions would differ from art-mapped layout', () => {
    const rect = computeCoverFitRect(800, 600, mapBox.x, mapBox.y, mapBox.w, mapBox.h);
    const artPts = REGION1_COMMAND_MAP_NODES.map((n) => ({
      x: rect.dx + n.fx * rect.dw,
      y: rect.dy + n.fy * rect.dh,
    }));
    const roadY = mapBox.y + mapBox.h * 0.55;
    const linearX = mapBox.x + mapBox.w * 0.12;
    expect(artPts[0].y).not.toBeCloseTo(roadY, 0);
    expect(artPts[0].x).not.toBeCloseTo(linearX, 0);
  });
});

describe('debrief panel alignment', () => {
  it('panel draw rect preserves 640×480 aspect', () => {
    const outer = { x: 100, y: 50, w: 480, h: 340 };
    const inner = getDebriefPanelDrawRect(outer.x, outer.y, outer.w, outer.h);
    expect(inner.w / inner.h).toBeCloseTo(640 / 480, 3);
  });
});
