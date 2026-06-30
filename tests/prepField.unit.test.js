import { describe, it, expect } from 'vitest';
import {
  getPrepVisibleHeroPosts,
  getPrepVisibleSiegePosts,
  isPrepPostVisible,
} from '../src/preparation/prepField.js';

describe('prepField', () => {
  it('shows only slice-relevant hero posts on west assault', () => {
    const posts = getPrepVisibleHeroPosts('west');
    expect(posts).toContain('west_gate');
    expect(posts).toContain('watch_tower');
    expect(posts).not.toContain('east_gate');
  });

  it('lists siege platforms for prep', () => {
    expect(getPrepVisibleSiegePosts()).toEqual(['ballista_platform', 'catapult_platform']);
    expect(isPrepPostVisible('ballista_platform', 'west')).toBe(true);
    expect(isPrepPostVisible('north_gate', 'west')).toBe(false);
  });
});
