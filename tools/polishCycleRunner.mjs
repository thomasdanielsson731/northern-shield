#!/usr/bin/env node
/**
 * Autonomous polish cycle runner — audit + vitest gate for board iterations.
 * Usage (from tower-defense/): node tools/polishCycleRunner.mjs [iteration-label]
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const label = process.argv[2] ?? 'polish-cycle';

function run(cmd, args) {
  const r = spawnSync(cmd, args, { cwd: root, encoding: 'utf8', stdio: 'inherit', shell: process.platform === 'win32' });
  return r.status === 0;
}

console.log(`\n=== Polish cycle: ${label} ===\n`);
const auditOk = run(process.execPath, ['tools/agentPolishAudit.mjs']);
if (!auditOk) process.exit(1);
console.log(`\n✅ ${label} passed RC gate\n`);
