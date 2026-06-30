/**
 * Siege post picker — structure options gated by armory upgrade.
 * @see design/FORTRESS_PREP_ASSAULT_GRAPHICS.md §7.2
 */

import { POST_DEFS, SIEGE_POST_IDS } from '../fortress/defensivePosts.js';
import { TOWER_DEFS } from '../entities/tower.js';

export const SIEGE_PLATFORM_OPTIONS = Object.freeze({
  ballista_platform: { structureType: 'ballista', minArmory: 0 },
  catapult_platform: { structureType: 'catapult', minArmory: 2 },
});

export function isSiegePostId(postId) {
  return SIEGE_POST_IDS.includes(postId) && postId !== 'gate_fixture';
}

export function getSiegeOptionForPost(postId) {
  return SIEGE_PLATFORM_OPTIONS[postId] ?? null;
}

export function isSiegePostUnlocked(postId, fortressUpgrades = {}) {
  const opt = getSiegeOptionForPost(postId);
  if (!opt) return false;
  const armory = fortressUpgrades?.armory ?? 0;
  return armory >= opt.minArmory;
}

export function getSiegeStructureLabel(structureType) {
  return TOWER_DEFS[structureType]?.label ?? structureType ?? 'Siege';
}

export function getSiegeAdvisorContent(postId, ctx) {
  const { postAssignments, fortressUpgrades = {} } = ctx;
  const defn = POST_DEFS[postId];
  const title = defn?.label ?? postId;
  const assigned = postAssignments?.[postId];
  const opt = getSiegeOptionForPost(postId);

  if (!opt) {
    return {
      advisor: 'builder',
      title,
      lines: ['Siege posts mount on the outer ring.', 'Upgrade the armory in War Camp.'],
    };
  }

  if (!isSiegePostUnlocked(postId, fortressUpgrades)) {
    return {
      advisor: 'builder',
      title,
      lines: [
        `Armory Lv ${opt.minArmory} unlocks ${getSiegeStructureLabel(opt.structureType)}.`,
        'Return to War Camp → Fortress to upgrade.',
      ],
    };
  }

  if (assigned?.structureType) {
    const sLabel = getSiegeStructureLabel(assigned.structureType);
    return {
      advisor: 'builder',
      title,
      lines: [
        `${sLabel} mounted — Lv ${assigned.level ?? 1}.`,
        'It fires from this platform when the horn sounds.',
      ],
    };
  }

  return {
    advisor: 'builder',
    title,
    lines: [
      `Mount a ${getSiegeStructureLabel(opt.structureType)} here.`,
      'Optional — but it punishes clustered foes.',
    ],
  };
}

export function getSiegePanelActions(postId, ctx) {
  const { postAssignments, fortressUpgrades = {} } = ctx;
  const opt = getSiegeOptionForPost(postId);
  if (!opt || !isSiegePostUnlocked(postId, fortressUpgrades)) return [];

  const assigned = postAssignments?.[postId];
  const sLabel = getSiegeStructureLabel(opt.structureType);

  if (!assigned?.structureType) {
    return [{
      id: 'assign_siege',
      label: `Mount ${sLabel}`,
      postId,
      structureType: opt.structureType,
      level: 1,
    }];
  }

  return [{
    id: 'clear_siege',
    label: `Clear ${sLabel}`,
    postId,
  }];
}

/** Always-visible siege buttons for the prep sidebar. */
export function getPrepSiegeSidebarActions(ctx) {
  const { postAssignments, fortressUpgrades = {} } = ctx;
  const actions = [];

  for (const postId of ['ballista_platform', 'catapult_platform']) {
    const opt = getSiegeOptionForPost(postId);
    if (!opt) continue;
    const title = POST_DEFS[postId]?.label ?? postId;
    const sLabel = getSiegeStructureLabel(opt.structureType);
    const assigned = postAssignments?.[postId];
    const unlocked = isSiegePostUnlocked(postId, fortressUpgrades);

    if (!unlocked) {
      actions.push({
        id: 'siege_locked',
        label: `🔒 ${title} — Armory Lv ${opt.minArmory}`,
        disabled: true,
      });
      continue;
    }

    if (!assigned?.structureType) {
      actions.push({
        id: 'assign_siege',
        postId,
        structureType: opt.structureType,
        level: 1,
        label: `▣ Mount ${sLabel}`,
        siegeHighlight: true,
      });
    } else {
      actions.push({
        id: 'focus_siege',
        postId,
        label: `✓ ${sLabel} on ${title.split(' ')[0]}`,
      });
      actions.push({
        id: 'clear_siege',
        postId,
        label: `Clear ${sLabel}`,
      });
    }
  }

  return actions;
}
