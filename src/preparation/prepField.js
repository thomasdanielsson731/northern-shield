/**
 * Prep playfield — visible posts and zoom helpers.
 */

import {
  HERO_POST_IDS,
  SIEGE_POST_IDS,
  getPrimaryGateForFront,
} from '../fortress/defensivePosts.js';

/** Hero posts shown on the prep battlefield (not every gate on slice maps). */
export function getPrepVisibleHeroPosts(frontId = 'west', { showAllPosts = false } = {}) {
  if (showAllPosts) return [...HERO_POST_IDS];
  const primary = getPrimaryGateForFront(frontId);
  return [primary, 'watch_tower', 'inner_keep'];
}

/** Siege platforms always listed in prep UI; visibility on map follows unlock. */
export function getPrepVisibleSiegePosts() {
  return SIEGE_POST_IDS.filter(id => id !== 'gate_fixture');
}

export function isPrepPostVisible(postId, frontId = 'west', options = {}) {
  if (getPrepVisibleSiegePosts().includes(postId)) return true;
  return getPrepVisibleHeroPosts(frontId, options).includes(postId);
}
