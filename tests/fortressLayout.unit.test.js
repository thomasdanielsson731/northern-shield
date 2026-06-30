import { describe, it, expect } from 'vitest';
import {
  bakeFortressLayout,
  fortressLayoutFromPrep,
  getPostLabelForDefender,
  getDefenderPostId,
} from '../src/fortress/fortressLayout.js';
import { getRampartTierLabel } from '../src/assets/fortressManifest.js';
import { hitTestPrepWorldPost } from '../src/preparation/prepWorldView.js';

const GOAL = { col: 24, row: 15 };

describe('fortressLayout', () => {
  it('bakeFortressLayout places heroes at post cells', () => {
    const layout = fortressLayoutFromPrep({
      postAssignments: { west_gate: { defenderId: 'd1' } },
      goal: GOAL,
      frontId: 'west',
    });
    const roster = { defenders: [{ defenderId: 'd1', type: 'berserk', name: 'Bjorn' }] };
    const { towers } = bakeFortressLayout(layout, roster);
    expect(towers).toHaveLength(1);
    expect(towers[0].defenderId).toBe('d1');
    expect(towers[0].col).toBe(GOAL.col - 5);
    expect(towers[0].row).toBe(GOAL.row);
  });

  it('getPostLabelForDefender resolves post name', () => {
    const posts = { watch_tower: { defenderId: 'd2' } };
    expect(getDefenderPostId(posts, 'd2')).toBe('watch_tower');
    expect(getPostLabelForDefender(posts, 'd2')).toBe('Watch Tower');
    expect(getPostLabelForDefender(posts, 'missing')).toBeNull();
  });
});

describe('fortressManifest', () => {
  it('getRampartTierLabel tracks wallworks level', () => {
    expect(getRampartTierLabel(0)).toBe('Palisade');
    expect(getRampartTierLabel(2)).toBe('Stone base');
  });
});

describe('prepWorldView', () => {
  it('hitTestPrepWorldPost finds nearest post', () => {
    const cellSize = 14;
    const ringR = 5;
    const gridScreenX = (x) => 100 + x;
    const gridScreenY = (y) => 200 + y;
    const westCell = { col: GOAL.col - ringR, row: GOAL.row };
    const wx = gridScreenX(westCell.col * cellSize + cellSize / 2);
    const wy = gridScreenY(westCell.row * cellSize + cellSize / 2);
    const hit = hitTestPrepWorldPost(wx, wy, {
      goal: GOAL,
      ringR,
      cellSize,
      gridScreenX,
      gridScreenY,
      frontId: 'west',
    });
    expect(hit).toBe('west_gate');
  });
});
