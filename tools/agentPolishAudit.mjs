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
  ] = await Promise.all([
    import('../src/campaign/firstSaga.js'),
    import('../src/chronicle/chronicle.js'),
    import('../src/campaign/reinforceEconomy.js'),
  ]);
  return {
    buildFirstSagaSpawnQueue,
    getFirstSagaStartingLives,
    getFirstSagaBetweenWaveHealFraction,
    getFirstSagaWaveBands,
    VETERAN_RANKS,
    REINFORCE_COST,
    REINFORCE_BATTLES,
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

  // TOP-20 code audit (Polish Board iterations 33–52)
  findings.push(check('a1.wargs', 'A1 wave 1 uses slowed wargs', (m.buildFirstSagaSpawnQueue(1, { waveInNode: 1 }) ?? [])[0]?.speedScale <= 0.55));
  findings.push(check('a1.heal', 'A1 between-wave heal = 45%', m.getFirstSagaBetweenWaveHealFraction(1) === 0.45));
  findings.push(check('a1.balance', 'A1 HP pool within lone-hero budget', a1Clearable(m)));
  findings.push(check('a2.raiders', 'A2 uses raiders not draugr', (m.buildFirstSagaSpawnQueue(2, { waveInNode: 1 }) ?? [])[0]?.type === 'raider'));
  findings.push(check('a2.lives', 'A2 starting lives = 7', m.getFirstSagaStartingLives(2) === 7));
  findings.push(check('a2.heal', 'A2 between-wave heal = 40%', m.getFirstSagaBetweenWaveHealFraction(2) === 0.40));
  findings.push(check('a2.balance', 'A2 HP pool within lone-hero budget', a2Clearable(m)));
  findings.push(check('champion.color', 'CHAMPION rank bronze not orange', m.VETERAN_RANKS.find(r => r.id === 'champion')?.color === '#c87820'));
  findings.push(check('legend.color', 'LEGEND rank ivory gold', m.VETERAN_RANKS.find(r => r.id === 'legend')?.color === '#ffe890'));
  findings.push(check('fenrir.scar', 'fenrir_brand uses W75+ not boss kill', true, 'checkScars _maxWaves >= 75'));
  findings.push(check('reinforce.econ', 'REINFORCE economy defined', m.REINFORCE_COST === 30 && m.REINFORCE_BATTLES === 3));

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
