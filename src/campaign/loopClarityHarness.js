/**
 * Loop clarity harness — asserts preparation vs progression separation.
 */

import { validateSessionState } from './sessionSave.js';
import {
  HUB_BUILDINGS,
  hubBuildingAction,
} from '../settlement/settlementHub.js';
import { HUB_BUILDING_LAYOUT } from '../settlement/settlementHubLayout.js';
import { getHubBuildingMilestone, hubBuildingToProgressionMode } from '../settlement/hubMilestones.js';
import { TREASURY_BUILDING_ART } from '../ui/treasuryViewArt.js';
import { STRUCTURE_ART_IDS } from '../assets/structureArt.js';

/** @typedef {{ id: string, section: string, label: string, status: 'pass'|'fail', detail?: string }} LoopCheck */

function check(id, section, label, ok, detail = '') {
  return { id, section, label, status: ok ? 'pass' : 'fail', detail };
}

/**
 * Runnable loop-clarity assertions (no canvas).
 * @returns {LoopCheck[]}
 */
export function runLoopClarityChecks() {
  const checks = [];

  checks.push(check(
    'loop.phase.settlementHub',
    'Session',
    'settlementHub is a valid resume phase',
    validateSessionState({ version: 1, gamePhase: 'settlementHub' }) != null,
  ));

  checks.push(check(
    'loop.hub.buildings',
    'Hub',
    'Every hub building maps to an action',
    HUB_BUILDINGS.every(b => hubBuildingAction(b.id) != null),
  ));

  checks.push(check(
    'loop.hub.treasury-gate',
    'Milestones',
    'Fortress locked before First Night (First Saga)',
    !getHubBuildingMilestone('fortress', { simplifiedSaga: true, battlesCompleted: 0 }).available,
  ));

  checks.push(check(
    'loop.hub.treasury-open',
    'Milestones',
    'Fortress opens after first assault',
    getHubBuildingMilestone('fortress', { simplifiedSaga: true, battlesCompleted: 1 }).available,
  ));

  checks.push(check(
    'loop.hub.barracks-gate',
    'Milestones',
    'Barracks locked until settlement',
    !getHubBuildingMilestone('recruit', { simplifiedSaga: true, campaignState: {} }).available,
  ));

  checks.push(check(
    'loop.hub.rune-saga1',
    'Milestones',
    'Rune Smith locked on First Saga map',
    !getHubBuildingMilestone('runeSmith', { simplifiedSaga: true, mapIndex: 0, stars: 5 }).available,
  ));

  checks.push(check(
    'loop.progression.modes',
    'Progression',
    'Hub buildings map to single progression interiors',
  ['warband', 'fortress', 'recruit', 'runeSmith'].every(
    id => hubBuildingToProgressionMode(id) === id,
  ),
  ));

  checks.push(check(
    'loop.prep.phase',
    'Preparation',
    'fortressPrep remains a valid assault-prep phase',
    validateSessionState({ version: 1, gamePhase: 'fortressPrep' }) != null,
  ));

  checks.push(check(
    'loop.hub.assault-emblem',
    'Hub',
    'Assault entry is an emblem in the wilds, not a building pad',
    HUB_BUILDING_LAYOUT.command?.emblem === true
      && HUB_BUILDING_LAYOUT.command.fx < HUB_BUILDING_LAYOUT.warband.fx,
  ));

  checks.push(check(
    'loop.treasury.hub-sprites',
    'Fortress',
    'Treasury view uses settlement hub sprites for barracks and treasury',
    TREASURY_BUILDING_ART.barracks?.kind === 'hub'
      && TREASURY_BUILDING_ART.treasury?.kind === 'hub',
  ));

  checks.push(check(
    'loop.structure.dock-pngs',
    'Skirmish',
    'Structure dock has promoted PNG art for all build types',
    STRUCTURE_ART_IDS.length >= 10,
  ));

  return checks;
}

export function summarizeLoopClarity(checks) {
  const pass = checks.filter(c => c.status === 'pass').length;
  const fail = checks.filter(c => c.status === 'fail').length;
  return { pass, fail, total: checks.length };
}
