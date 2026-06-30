/**
 * Hero post picker — assign defenders to any defensive post.
 */

import { HERO_POST_IDS, POST_DEFS } from '../fortress/defensivePosts.js';
import {
  getDefenderPromotionTitle,
  getSkaldPostCounsel,
  getPreferredPostLabel,
} from '../roster/postTitles.js';

export function isHeroPostId(postId) {
  return HERO_POST_IDS.includes(postId);
}

function rosterDefenders(roster) {
  if (!roster) return [];
  return Array.isArray(roster) ? roster : (roster.defenders ?? []);
}

export function pickDefenderForPost(postId, available, postAssignments) {
  const usedElsewhere = new Set(
    HERO_POST_IDS
      .filter(pid => pid !== postId)
      .map(pid => postAssignments?.[pid]?.defenderId)
      .filter(Boolean),
  );
  return available.find(d => !usedElsewhere.has(d.defenderId)) ?? available[0];
}

export function getHeroAdvisorContent(postId, ctx) {
  const { postAssignments, roster, assault } = ctx;
  const defn = POST_DEFS[postId];
  const title = defn?.label ?? postId;
  const assignedId = postAssignments?.[postId]?.defenderId;
  const def = assignedId ? rosterDefenders(roster).find(d => d.defenderId === assignedId) : null;
  const heroName = def?.name || def?.type || 'your fighter';
  const roleHint = defn?.roleHint ?? 'defender';

  if (assignedId && def) {
    const promo = getDefenderPromotionTitle(assignedId, postAssignments);
    const skald = getSkaldPostCounsel(def, postId);
    return {
      advisor: 'skald',
      title,
      lines: [
        promo ? `${heroName} — ${promo}.` : `${heroName} holds ${title}.`,
        skald
          ? skald.replace(/^The skald[^:]+:\s*"?/, '').replace(/"?\.$/, '.')
          : 'The plan starts here.',
      ],
    };
  }

  const preferredType = roleHint === 'gatekeeper' ? 'berserk'
    : roleHint === 'scout' ? 'valkyrie'
      : roleHint === 'quartermaster' ? 'skald'
        : 'berserk';

  return {
    advisor: postId.includes('gate') ? 'captain' : (roleHint === 'scout' ? 'scout' : 'captain'),
    title,
    lines: postId.includes('gate')
      ? [
          'The road stirs.',
          `Favor a gatekeeper — the ${getPreferredPostLabel(preferredType)} first.`,
        ]
      : assault
        ? [`${assault.codename} — ${assault.tierLabel ?? 'assault'}.`, `Post a ${roleHint} here.`]
        : ['Assign a hero to this post.', `The skald favors the ${getPreferredPostLabel(preferredType)}.`],
  };
}

export function getHeroPanelActions(postId, ctx) {
  const { postAssignments, roster, nodeCasualties } = ctx;
  const available = rosterDefenders(roster).filter(
    d => !nodeCasualties?.has?.(d.defenderId),
  );
  const assigned = postAssignments?.[postId]?.defenderId;

  if (!assigned && available.length > 0) {
    const d = pickDefenderForPost(postId, available, postAssignments);
    return [{
      id: 'assign_hero',
      label: `Assign ${d.name || d.type}`,
      defenderId: d.defenderId,
      postId,
    }];
  }
  if (assigned) {
    return [{ id: 'clear_hero', label: 'Clear post', postId }];
  }
  return [];
}
