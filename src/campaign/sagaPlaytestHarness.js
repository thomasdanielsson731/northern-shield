/**
 * First Saga playtest harness — maps Sprint 5 checklist items to runnable assertions.
 * Used by Vitest and by the FIRST-SAGA-PLAYTEST agent (see agents/first-saga-playtest-runner.md).
 *
 * Does NOT drive the canvas — UI/feel/balance items need human or future browser hooks.
 */

import { ENEMY_DEFS } from '../entities/enemy.js';
import { TOWER_DEFS, TOWER_TYPES } from '../entities/tower.js';
import { validateAssignments } from '../fortress/defensivePosts.js';
import { getHornBlockReason, GATE_REPAIR_WOOD_COST, applyFirstSagaAssaultRewards, A2_DEBRIEF_WOOD_BUNDLE } from '../preparation/fortressCommanderShell.js';
import { isAssaultUnlocked, getNextAvailableAssault } from './campaignFronts.js';
import {
  buildNodeWavePlan,
  buildCampaignNodeSpawnQueue,
  getPortalCountForMap,
  createEmptyCampaignProgress,
} from './campaignMaps.js';
import { validateSessionState } from './sessionSave.js';
import { runLoopClarityChecks } from './loopClarityHarness.js';
import {
  isFirstSagaSliceLockedRegion,
  isFirstSagaRecruitUnlocked,
  getFirstSagaRecruitTypes,
  getFirstSagaFrontLayout,
  FIRST_SAGA_DISPLAY_NODE_COUNT,
  FIRST_SAGA_A4_NODE,
  buildFirstSagaSpawnQueue,
  getFirstSagaWaveBands,
  getFirstSagaSpawnGap,
  getFirstSagaStartingLives,
  getFirstSagaBetweenWaveHealFraction,
  getFirstSagaWaveBreakFrames,
  getFirstSagaBossConfig,
} from './firstSaga.js';
import {
  shouldOfferSettlementCeremony,
  applySettlementComplete,
  validateSettlementName,
  SETTLEMENT_STAGE_COUNT,
} from './settlementCeremony.js';
import {
  shouldOfferHeroNaming,
  applyHeroNaming,
  validateHeroName,
} from './heroNamingCeremony.js';
import { Defender } from '../roster/defender.js';
import { Roster } from '../roster/roster.js';

const BERSERK = TOWER_DEFS[TOWER_TYPES.BERSERK];

/** @typedef {{ id: string, section: string, label: string, status: 'pass'|'fail'|'manual', detail?: string }} PlaytestCheck */

function check(id, section, label, ok, detail = '') {
  return { id, section, label, status: ok ? 'pass' : 'fail', detail };
}

function manual(id, section, label, detail = '') {
  return { id, section, label, status: 'manual', detail };
}

function enemyHp(type, hpScale, waveHp) {
  return (ENEMY_DEFS[type]?.hp ?? 100) * hpScale * waveHp;
}

/**
 * Crude DPS budget: one Berserker on gate vs saga spawn queue.
 * Returns { clearable, margin, shotsNeeded, totalHp } per assault.
 */
export function estimateAssaultBalance(nodeIndex) {
  const plan = buildNodeWavePlan(0, nodeIndex);
  const lives = getFirstSagaStartingLives(nodeIndex);
  const healFrac = getFirstSagaBetweenWaveHealFraction(nodeIndex);
  let totalHp = 0;
  let waveHps = [];

  for (const wave of plan.waves) {
    if (wave.isBoss) continue;
    const queue = buildFirstSagaSpawnQueue(nodeIndex, wave) ?? [];
    const bands = getFirstSagaWaveBands(nodeIndex, wave.waveInNode);
    let wHp = 0;
    for (const e of queue) {
      if (!e.type) continue;
      wHp += enemyHp(e.type, e.hpScale ?? 1, bands.hp);
    }
    waveHps.push(wHp);
    totalHp += wHp;
  }

  const shotsNeeded = Math.ceil(totalHp / BERSERK.damage);
  const ticksToClear = shotsNeeded * BERSERK.fireRate;
  const spawnGap = getFirstSagaSpawnGap(nodeIndex, 1);
  const enemyCount = waveHps.length
    ? (buildFirstSagaSpawnQueue(nodeIndex, plan.waves[0]) ?? []).filter(e => e.type).length
    : 0;
  const spawnWindow = enemyCount * spawnGap * plan.waves.length;

  // Heuristic: hero must clear HP pool with ~lives-1 leak budget; heal between waves helps multi-wave
  const healBonus = healFrac > 0 ? 1.15 : 1;
  const margin = (ticksToClear / Math.max(1, spawnWindow)) / healBonus;
  const clearable = margin < lives * 0.85;

  return { nodeIndex, totalHp, shotsNeeded, margin, clearable, lives, healFrac, waveHps };
}

/** Simulate clearing assaults 0..nodeIndex on campaign progress. */
export function simulateSagaProgress(clearedThrough = FIRST_SAGA_A4_NODE) {
  const progress = createEmptyCampaignProgress();
  const campaign = { chronicle: { battles: [] }, defenders: [] };
  const cleared = [];
  for (let n = 0; n <= clearedThrough; n++) {
    cleared.push(n);
    progress.mapRuns[0] = {
      nodesCleared: [...cleared],
      fieldState: applyFirstSagaAssaultRewards(
        progress.mapRuns[0]?.fieldState ?? { gold: 0, towers: [], walls: {} },
        n,
      ),
    };
  }
  return { progress, campaign, cleared };
}

/**
 * Run all automatable First Saga playtest checks.
 * @returns {{ checks: PlaytestCheck[], summary: { pass: number, fail: number, manual: number } }}
 */
export function runFirstSagaPlaytestHarness() {
  const checks = [];

  // --- Setup ---
  checks.push(check('setup.region1-only', 'Setup', 'Region 2+ locked on slice', !isFirstSagaSliceLockedRegion(0) && isFirstSagaSliceLockedRegion(1)));
  const layout = getFirstSagaFrontLayout();
  checks.push(check('setup.west-road', 'Setup', 'West road has 5 assaults + settlement node', layout.fronts.west.assaults.length === 5 && FIRST_SAGA_DISPLAY_NODE_COUNT === 6));
  checks.push(check('setup.single-portal', 'Setup', 'Map 0 uses one portal', getPortalCountForMap(0) === 1));
  checks.push(manual('setup.skirmish-hidden', 'Setup', 'Skirmish not in First Saga onboarding', 'No automated UI path test'));

  // --- Linear unlock ---
  const fresh = createEmptyCampaignProgress();
  checks.push(check('unlock.a0', 'Setup', 'A0 unlocked on fresh save', isAssaultUnlocked(fresh, 0, 0)));
  checks.push(check('unlock.a1-blocked', 'Setup', 'A1 locked until A0 cleared', !isAssaultUnlocked(fresh, 0, 1)));
  const afterA0 = createEmptyCampaignProgress();
  afterA0.mapRuns[0] = { nodesCleared: [0], fieldState: null };
  checks.push(check('unlock.a1-after-a0', 'Setup', 'A1 unlocks after A0', isAssaultUnlocked(afterA0, 0, 1)));

  // --- A0–A4 spawn tables ---
  for (let n = 0; n <= 4; n++) {
    const plan = buildNodeWavePlan(0, n);
    checks.push(check(`spawn.a${n}.waves`, `A${n}`, `Wave count matches plan`, plan.waves.length === plan.waveCount));
    for (const wave of plan.waves) {
      const q = buildCampaignNodeSpawnQueue(wave, 0, n);
      checks.push(check(`spawn.a${n}.w${wave.waveInNode}.queue`, `A${n}`, `Wave ${wave.waveInNode} has spawn queue`, q.length > 0));
      if (wave.isBoss) {
        checks.push(check(`spawn.a${n}.boss`, `A${n}`, 'Boss wave ends with node boss', q.at(-1)?.__nodeBoss === true));
      }
    }
  }
  checks.push(check('spawn.a0.raiders', 'A0', 'Six low-HP raiders', (buildFirstSagaSpawnQueue(0, { waveInNode: 1 }) ?? []).length === 6));
  const rosterUnnamed = new Roster();
  rosterUnnamed.defenders.push(new Defender({ defenderId: 'h1', name: '', type: 'berserk' }));
  const campAfterA0 = { campaignProgress: createEmptyCampaignProgress(), chronicle: {}, firstSaga: {} };
  campAfterA0.campaignProgress.mapRuns[0] = { nodesCleared: [0], fieldState: null };
  checks.push(check('naming.offer-a0', 'A0', 'Hero naming offered after A0', shouldOfferHeroNaming(campAfterA0, rosterUnnamed, 0)));
  checks.push(check('naming.validate', 'A0', 'Hero name min 2 chars', validateHeroName('Ulfr') && !validateHeroName('a')));
  applyHeroNaming(campAfterA0, rosterUnnamed, 'h1', 'Gunnar');
  checks.push(check('naming.apply', 'A0', 'Hero naming sets heroNamed', campAfterA0.firstSaga.heroNamed === true));
  checks.push(check('spawn.a1.w2-size', 'A1', 'Wave 2 has four enemies (2+2)', (buildFirstSagaSpawnQueue(1, { waveInNode: 2 }) ?? []).length === 4));

  // --- Prep / horn ---
  checks.push(check('prep.horn-block', 'A0', 'Horn blocked without gate assignment', !!getHornBlockReason({
    pendingAssaultNode: 0,
    postAssignments: {},
    prepMeta: { wood: 0, westGateScarred: false, westGateRepaired: false },
    assaultNodeIndex: 0,
  })?.match(/Assign/i)));
  checks.push(check('prep.horn-ok', 'A0', 'Horn allowed with gate assignment', getHornBlockReason({
    pendingAssaultNode: 0,
    postAssignments: { west_gate: { defenderId: 'h1' } },
    prepMeta: { wood: 0, westGateScarred: false, westGateRepaired: false },
    assaultNodeIndex: 0,
  }) == null));
  checks.push(check('prep.assign-valid', 'A0', 'Single hero assignment valid', validateAssignments({ west_gate: { defenderId: 'h1' } }, { minHeroes: 1 }).ok));

  // --- A2 scar + wood ---
  const fieldAfterA2 = applyFirstSagaAssaultRewards({ towers: [], walls: {} }, 2);
  checks.push(check('a2.scar-wood', 'A2', 'A2 debrief grants scar + 15 wood', fieldAfterA2.westGateScarred && fieldAfterA2.wood === A2_DEBRIEF_WOOD_BUNDLE));

  // --- A3 repair gate ---
  checks.push(check('a3.horn-block-repair', 'A3', 'Horn blocked if gate scarred unrepaired', !!getHornBlockReason({
    pendingAssaultNode: 3,
    postAssignments: { west_gate: { defenderId: 'h1' } },
    prepMeta: { wood: 15, westGateScarred: true, westGateRepaired: false },
    assaultNodeIndex: 3,
  })?.match(/Repair/i)));
  checks.push(check('a3.repair-cost', 'A3', 'Repair costs 10 wood', GATE_REPAIR_WOOD_COST === 10));

  // --- A4 boss ---
  const boss = getFirstSagaBossConfig();
  checks.push(check('a4.boss-config', 'A4', 'Ash-Warden boss defined', boss.name === 'ASH-WARDEN' && boss.hp > 0));

  // --- Settlement ---
  const { campaign: campA4 } = simulateSagaProgress(FIRST_SAGA_A4_NODE);
  checks.push(check('finale.ceremony-offer', 'Finale', 'Ceremony offered after A4', shouldOfferSettlementCeremony(campA4, 0, FIRST_SAGA_A4_NODE)));
  applySettlementComplete(campA4, { recruitType: 'valkyrie', recruitName: 'Test' });
  checks.push(check('finale.recruit-unlock', 'Finale', 'Recruit unlocked after ceremony', isFirstSagaRecruitUnlocked(campA4)));
  checks.push(check('finale.recruit-types', 'Finale', 'Slice recruit pool is Valkyrie + Military', getFirstSagaRecruitTypes().join() === 'valkyrie,military'));
  checks.push(check('finale.settlement-stages', 'Finale', 'Six ceremony stages', SETTLEMENT_STAGE_COUNT === 6));
  checks.push(check('finale.name-validate', 'Finale', 'Settlement name min 2 chars', validateSettlementName('ab') && !validateSettlementName('a')));

  // --- Session phases ---
  for (const phase of ['fortressPrep', 'settlementCeremony', 'heroNamingCeremony', 'debrief', 'nodeMap', 'betweenBattles', 'settlementHub']) {
    checks.push(check(`session.phase.${phase}`, 'Post-slice', `Session accepts phase ${phase}`, validateSessionState({ version: 1, gamePhase: phase }) != null));
  }

  for (const lc of runLoopClarityChecks()) {
    checks.push(check(lc.id, lc.section, lc.label, lc.status === 'pass', lc.detail));
  }

  // --- Balance heuristics ---
  for (let n = 0; n <= 4; n++) {
    const est = estimateAssaultBalance(n);
    checks.push(check(
      `balance.a${n}.heuristic`,
      `A${n}`,
      `One Berserker budget plausible (margin ${est.margin.toFixed(2)})`,
      est.clearable,
      `totalHp=${Math.round(est.totalHp)} shots≈${est.shotsNeeded} lives=${est.lives}`,
    ));
  }
  checks.push(check('balance.a1.heal', 'A1', 'Between-wave heal on A1', getFirstSagaBetweenWaveHealFraction(1) === 0.45));
  checks.push(check('balance.a1.break', 'A1', 'Longer wave break on A1', getFirstSagaWaveBreakFrames(1) >= 120));

  // --- Manual-only (documented for agent report) ---
  checks.push(manual('ui.prep-schematic', 'A0', 'Prep schematic labels and threat arrow', 'Canvas render'));
  checks.push(manual('ui.damage-floaters', 'A1', 'Red -dmg / -GATE floaters visible', 'Canvas combat'));
  checks.push(manual('ui.wave-banner', 'A1', 'WOLF SMOKE · WAVE 2/2 banner', 'Canvas combat'));
  checks.push(manual('ui.heal-floater', 'A1', 'Green +HP between waves', 'Canvas combat'));
  checks.push(manual('ui.debrief-prose', 'A0', 'Debrief prose and routing', 'Canvas debrief'));
  checks.push(manual('ui.naming-ceremony', 'A0', 'Post-A0 naming ceremony modal', 'Canvas heroNamingCeremony'));
  checks.push(manual('ui.stone-flash', 'Finale', 'First Stone white flash', 'Canvas ceremony'));
  checks.push(manual('feel.balance', 'All', 'Assaults feel fair (human)', 'Play feel cannot be unit-tested'));

  const summary = {
    pass: checks.filter(c => c.status === 'pass').length,
    fail: checks.filter(c => c.status === 'fail').length,
    manual: checks.filter(c => c.status === 'manual').length,
  };

  return { checks, summary };
}

export function formatHarnessReport(result) {
  const lines = [
    `# First Saga Harness Report`,
    ``,
    `| Status | Count |`,
    `|--------|-------|`,
    `| pass | ${result.summary.pass} |`,
    `| fail | ${result.summary.fail} |`,
    `| manual (human) | ${result.summary.manual} |`,
    ``,
  ];
  let section = '';
  for (const c of result.checks) {
    if (c.section !== section) {
      section = c.section;
      lines.push(`## ${section}`, '');
    }
    const icon = c.status === 'pass' ? '✅' : c.status === 'fail' ? '❌' : '👤';
    lines.push(`- ${icon} **${c.id}** — ${c.label}${c.detail ? ` (${c.detail})` : ''}`);
  }
  return lines.join('\n');
}
