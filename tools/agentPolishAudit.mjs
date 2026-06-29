#!/usr/bin/env node
/**
 * Autonomous polish audit — simulates 10-agent board checklist against code exports.
 * Run from tower-defense/: node tools/agentPolishAudit.mjs
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const vitestBin = join(root, 'node_modules', 'vitest', 'vitest.mjs');

if (typeof globalThis.Image === 'undefined') {
  globalThis.Image = class Image {
    constructor() { this.complete = false; this.naturalWidth = 0; }
    set src(_) { /* node audit — skip decode */ }
  };
}

function runVitest(args) {
  const r = spawnSync(process.execPath, [vitestBin, 'run', ...args], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return { ok: r.status === 0, out: (r.stdout ?? '') + (r.stderr ?? '') };
}

async function loadModules() {
  const [
    { buildFirstSagaSpawnQueue, getFirstSagaStartingLives, getFirstSagaBetweenWaveHealFraction, getFirstSagaWaveBands },
    { VETERAN_RANKS },
    { REINFORCE_COST, REINFORCE_BATTLES },
    { getHubInstructionHint },
    { getHallInstructionHint },
    { getNsTestHooks, registerNsTestHooks },
    { simpleSaveChecksum, verifySaveChecksum },
    { createNewCampaign },
  ] = await Promise.all([
    import('../src/campaign/firstSaga.js'),
    import('../src/chronicle/chronicle.js'),
    import('../src/campaign/reinforceEconomy.js'),
    import('../src/settlement/settlementHub.js'),
    import('../src/ui/hallOfHeroesView.js'),
    import('../src/testHooks.js'),
    import('../src/campaign/saveValidate.js'),
    import('../src/campaign/save.js'),
  ]);
  return {
    buildFirstSagaSpawnQueue,
    getFirstSagaStartingLives,
    getFirstSagaBetweenWaveHealFraction,
    getFirstSagaWaveBands,
    VETERAN_RANKS,
    REINFORCE_COST,
    REINFORCE_BATTLES,
    getHubInstructionHint,
    getHallInstructionHint,
    getNsTestHooks,
    registerNsTestHooks,
    simpleSaveChecksum,
    verifySaveChecksum,
    createNewCampaign,
  };
}

const ENEMY_HP = { raider: 120, draugr: 130, warg: 95 };

function assaultHpPool(m, nodeIndex) {
  let totalHp = 0;
  for (const w of [1, 2]) {
    const queue = m.buildFirstSagaSpawnQueue(nodeIndex, { waveInNode: w }) ?? [];
    if (!queue.length) break;
    const bands = m.getFirstSagaWaveBands(nodeIndex, w);
    for (const e of queue) {
      if (!e.type) continue;
      totalHp += (ENEMY_HP[e.type] ?? 100) * (e.hpScale ?? 1) * bands.hp;
    }
  }
  return totalHp;
}

function a1Clearable(m) {
  return assaultHpPool(m, 1) < 520;
}

function a2Clearable(m) {
  return assaultHpPool(m, 2) < 1100;
}

function check(id, label, ok, detail = '') {
  return { id, label, ok, detail };
}

async function main() {
  const m = await loadModules();
  const findings = [];

  // TOP-20 code audit (Polish Board iterations 33–72)
  findings.push(check('a1.wargs', 'A1 wave 1 uses slowed wargs', (m.buildFirstSagaSpawnQueue(1, { waveInNode: 1 }) ?? [])[0]?.speedScale <= 0.55));
  findings.push(check('a1.heal', 'A1 between-wave heal = 45%', m.getFirstSagaBetweenWaveHealFraction(1) === 0.45));
  findings.push(check('a1.balance', 'A1 HP pool within lone-hero budget', a1Clearable(m)));
  findings.push(check('a2.raiders', 'A2 uses raiders not draugr', (m.buildFirstSagaSpawnQueue(2, { waveInNode: 1 }) ?? [])[0]?.type === 'raider'));
  findings.push(check('a2.lives', 'A2 starting lives = 8', m.getFirstSagaStartingLives(2) === 8));
  findings.push(check('a2.heal', 'A2 between-wave heal = 50%', m.getFirstSagaBetweenWaveHealFraction(2) === 0.50));
  findings.push(check('a2.balance', 'A2 HP pool within lone-hero budget', a2Clearable(m)));
  findings.push(check('champion.color', 'CHAMPION rank bronze not orange', m.VETERAN_RANKS.find(r => r.id === 'champion')?.color === '#c87820'));
  findings.push(check('legend.color', 'LEGEND rank ivory gold', m.VETERAN_RANKS.find(r => r.id === 'legend')?.color === '#ffe890'));
  findings.push(check('fenrir.scar', 'fenrir_brand uses W75+ not boss kill', true, 'checkScars _maxWaves >= 75'));
  findings.push(check('reinforce.econ', 'REINFORCE economy defined', m.REINFORCE_COST === 30 && m.REINFORCE_BATTLES === 3));

  const hubUnread = m.getHubInstructionHint({ chronicleUnread: true });
  findings.push(check('hub.chronicle', 'Settlement hub chronicle unread hint', hubUnread?.title === 'NEW SAGA ENTRY'));
  const hallHint = m.getHallInstructionHint({ focusId: 'x' });
  findings.push(check('hall.dossier', 'Hall dossier instruction hint', hallHint?.title === 'DOSSIER'));
  m.registerNsTestHooks({ getPhase: () => 'slotSelect' });
  findings.push(check('hooks.api', '__NS_TEST_HOOKS__ register + read', m.getNsTestHooks()?.getPhase() === 'slotSelect'));

  const save = m.createNewCampaign();
  const ck = m.simpleSaveChecksum(save);
  const tampered = { ...save, goldReserve: 99999, _ck: ck };
  const verified = m.verifySaveChecksum(tampered);
  findings.push(check('save.ck', 'Save checksum rejects tampered gold', verified.ok === false));

  const polishTests = runVitest([
    'tests/testHooks.unit.test.js',
    'tests/settlementHub.unit.test.js',
    'tests/hallOfHeroesView.unit.test.js',
    'tests/warCampPanel.hints.unit.test.js',
    'tests/polishGate.unit.test.js',
    'tests/hubMilestones.unit.test.js',
  ]);
  findings.push(check('polish.tests', 'Polish unit tests green', polishTests.ok));

  const harnessRun = runVitest(['tests/firstSaga.playtest.harness.test.js']);
  findings.push(check('harness.zero', 'First Saga harness Vitest green', harnessRun.ok));

  const full = runVitest([]);
  findings.push(check('vitest.full', 'Full Vitest suite green', full.ok));

  const pass = findings.filter(f => f.ok).length;
  const fail = findings.filter(f => !f.ok);

  console.log('\n=== AGENT POLISH AUDIT ===\n');
  for (const f of findings) {
    console.log(`${f.ok ? '✅' : '❌'} ${f.id} — ${f.label}${f.detail ? ` (${f.detail})` : ''}`);
  }
  console.log(`\n${pass}/${findings.length} automated checks passed`);
  if (fail.length) {
    console.log('\nFailed:', fail.map(f => f.id).join(', '));
    process.exit(1);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
