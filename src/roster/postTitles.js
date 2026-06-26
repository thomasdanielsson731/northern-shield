/**
 * Post-linked promotion titles and preferred-post hints (First Saga).
 * @see design/FORTRESS_COMMANDER.md · design/heroes.md
 */

import { POST_DEFS, HERO_POST_IDS } from '../fortress/defensivePosts.js';

/** Title earned while assigned to a defensive post. */
export const POST_PROMOTION_TITLES = {
  west_gate:   'Gate Captain',
  east_gate:   'Gate Captain',
  north_gate:  'Gate Warden',
  south_gate:  'Gate Warden',
  watch_tower: 'Eagle of the Tower',
  north_wall:  'Wall Warden',
  south_wall:  'Wall Warden',
  inner_keep:  'Keeper of the Hoard',
};

/** Default preferred post per hero class (slice — west front). */
export const PREFERRED_POST_BY_TYPE = {
  berserk:   'west_gate',
  military:  'west_gate',
  valkyrie:  'watch_tower',
  hydda:     'inner_keep',
  blondie:   'watch_tower',
  isjatten:  'north_wall',
};

export function postIdForDefender(defenderId, postAssignments) {
  if (!defenderId || !postAssignments) return null;
  for (const postId of HERO_POST_IDS) {
    if (postAssignments[postId]?.defenderId === defenderId) return postId;
  }
  return null;
}

export function getDefenderPromotionTitle(defenderId, postAssignments) {
  const postId = postIdForDefender(defenderId, postAssignments);
  if (!postId) return null;
  return POST_PROMOTION_TITLES[postId] ?? null;
}

export function getPreferredPostId(defenderType) {
  return PREFERRED_POST_BY_TYPE[defenderType] ?? 'west_gate';
}

export function getPreferredPostLabel(defenderType) {
  const id = getPreferredPostId(defenderType);
  return POST_DEFS[id]?.label ?? 'West Gate';
}

/** Skald one-liner when a hero is well-suited or misplaced for a post. */
export function getSkaldPostCounsel(defender, postId) {
  if (!defender) return null;
  const name = defender.name || defender.type || 'the fighter';
  const preferred = getPreferredPostId(defender.type);
  const postLabel = POST_DEFS[postId]?.label ?? postId;
  if (postId === preferred) {
    return `The skald nods: "${name} belongs at the ${postLabel}."`;
  }
  const prefLabel = POST_DEFS[preferred]?.label ?? 'their post';
  return `The skald murmurs: "${name} fights best at the ${prefLabel}."`;
}

export function formatDefenderPostBadge(defender, postAssignments) {
  const title = getDefenderPromotionTitle(defender.defenderId, postAssignments);
  if (title) return title;
  return `→ ${getPreferredPostLabel(defender.type)}`;
}
