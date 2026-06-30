import { describe, it, expect } from 'vitest';
import {
  getPrepVisibleHeroPosts,
  getPrepVisibleSiegePosts,
  isPrepPostVisible,
} from '../src/preparation/prepField.js';

describe('prepField', () => {
  it('shows all gates and corner towers in prep', () => {
    const posts = getPrepVisibleHeroPosts('west');
    expect(posts).toContain('west_gate');
    expect(posts).toContain('east_gate');
    expect(posts).toContain('north_gate');
    expect(posts).toContain('south_gate');
    expect(posts).toContain('watch_tower');
    expect(posts).toContain('nw_tower');
    expect(posts).toContain('sw_tower');
    expect(posts).toContain('se_tower');
    expect(posts).toContain('inner_keep');
    expect(posts).not.toContain('north_wall');
    expect(posts).not.toContain('south_wall');
  });

  it('lists siege platforms for prep', () => {
    expect(getPrepVisibleSiegePosts()).toEqual(['ballista_platform', 'catapult_platform']);
    expect(isPrepPostVisible('ballista_platform', 'west')).toBe(true);
    expect(isPrepPostVisible('north_gate', 'west')).toBe(true);
    expect(isPrepPostVisible('nw_tower', 'west')).toBe(true);
  });
});
