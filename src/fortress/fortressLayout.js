/**
 * FortressLayout — canonical prep/assault layout (posts → cells → towers).
 * @see design/FORTRESS_PREP_ASSAULT_GRAPHICS.md
 */

import {
  buildTowerPlacements,
  FORTRESS_RING_R_DEFAULT,
  getPrimaryGateForFront,
  HERO_POST_IDS,
  POST_DEFS,
  resolvePostCell,
  SIEGE_POST_IDS,
} from './defensivePosts.js';
import { FORTRESS_LAYOUT_VERSION } from '../assets/fortressManifest.js';

export { FORTRESS_LAYOUT_VERSION };

export function createFortressLayout({
  goal,
  ringR = FORTRESS_RING_R_DEFAULT,
  frontId = 'west',
  posts = {},
  upgrades = {},
  scars = {},
  age = 1,
} = {}) {
  return {
    version: FORTRESS_LAYOUT_VERSION,
    goal,
    ringR,
    frontId,
    posts: { ...posts },
    upgrades: { ...upgrades },
    scars: { ...scars },
    age,
  };
}

export function fortressLayoutFromPrep({
  postAssignments,
  goal,
  ringR = FORTRESS_RING_R_DEFAULT,
  frontId = 'west',
  fortressUpgrades = {},
  prepMeta = {},
} = {}) {
  return createFortressLayout({
    goal,
    ringR,
    frontId,
    posts: postAssignments ?? {},
    upgrades: fortressUpgrades ?? {},
    scars: {
      westGateScarred: !!prepMeta?.westGateScarred,
      westGateRepaired: prepMeta?.westGateRepaired !== false,
    },
    age: 1,
  });
}

export function fortressLayoutFromFieldState(fieldState, goal, options = {}) {
  const frontId = options.frontId ?? 'west';
  return createFortressLayout({
    goal,
    ringR: options.ringR ?? FORTRESS_RING_R_DEFAULT,
    frontId,
    posts: fieldState?.postAssignments ?? {},
    upgrades: options.fortressUpgrades ?? {},
    scars: {
      westGateScarred: !!fieldState?.westGateScarred,
      westGateRepaired: fieldState?.westGateRepaired !== false,
    },
    age: 1,
  });
}

/** Bake posts into combat tower plain objects + structure anchors for render. */
export function bakeFortressLayout(layout, roster) {
  const towers = buildTowerPlacements(layout.posts, roster, layout.goal, {
    frontId: layout.frontId,
    ringR: layout.ringR,
  });
  const anchors = computeStructureAnchors(layout);
  return { layout, towers, anchors };
}

/** Fixed courtyard structures + siege post cells for renderer. */
export function computeStructureAnchors(layout) {
  const { goal, ringR, posts, frontId } = layout;
  const anchors = [];

  const primaryGate = getPrimaryGateForFront(frontId);
  anchors.push({
    id: 'west_gate_structure',
    kind: 'gate',
    cell: resolvePostCell(primaryGate, goal, ringR),
    postId: primaryGate,
  });

  anchors.push({
    id: 'longhouse',
    kind: 'longhouse',
    cell: { col: goal.col, row: goal.row },
  });

  anchors.push({
    id: 'watch_tower',
    kind: 'watch_tower',
    cell: resolvePostCell('watch_tower', goal, ringR),
  });

  anchors.push({
    id: 'treasury',
    kind: 'treasury',
    cell: resolvePostCell('inner_keep', goal, ringR),
  });

  for (const postId of SIEGE_POST_IDS) {
    const a = posts?.[postId];
    if (!a?.structureType || postId === 'gate_fixture') continue;
    anchors.push({
      id: `siege_${postId}`,
      kind: 'siege',
      structureType: a.structureType,
      level: a.level ?? 1,
      cell: resolvePostCell(postId, goal, ringR),
      postId,
    });
  }

  return anchors;
}

export function getDefenderPostId(postAssignments, defenderId) {
  if (!defenderId || !postAssignments) return null;
  for (const postId of HERO_POST_IDS) {
    if (postAssignments[postId]?.defenderId === defenderId) return postId;
  }
  return null;
}

export function getPostLabelForDefender(postAssignments, defenderId) {
  const postId = getDefenderPostId(postAssignments, defenderId);
  if (!postId) return null;
  return POST_DEFS[postId]?.label ?? postId;
}

export function getPrimaryFrontGatePost(frontId = 'west') {
  return getPrimaryGateForFront(frontId);
}
