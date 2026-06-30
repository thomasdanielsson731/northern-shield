/**
 * Campaign assault debrief — prose-first copy and fortress damage report.
 * @see design/the_first_saga.md §14–16 · IMPLEMENTATION_ROADMAP Phase 5
 */

import { getPrimaryGateForFront, resolvePostCell } from '../fortress/defensivePosts.js';

const SAGA_VICTORY_PROSE = {
  0: '{name} held the west gate alone. The fire still burns.',
  1: 'Wolves tested the palisade. {name} did not yield.',
  2: 'The gate cracked. We learned the wall can bleed.',
  3: '{name} is Veteran. The gate bears a patch like a scar.',
  4: 'The Ash-Warden fell. Stone was ours by right of victory.',
  5: 'Refugees came. {name} and {name2} stand watch. The west face is stone.',
};

const SAGA_DEFEAT_PROSE = {
  0: 'The gate is the kingdom. Hold it again.',
  1: 'They broke through the smoke. The west still needs you.',
  2: 'The palisade splintered — mend the scar before the next horn.',
  3: 'Veterans do not quit at a patched gate. Sound the horn once more.',
  4: 'The Ash-Warden still breathes. The stone waits.',
};

const SAGA_TITLES = {
  0: 'First Night',
  1: 'Wolf Smoke',
  2: 'Splinter',
  3: 'Mended Wood',
  4: 'Ash-Warden',
  5: 'Saga I — The Settlement',
};

/** Chronicle-style prose for campaign assault debrief. */
export function getSagaDebriefProse(nodeIndex, isVictory, { gateHeroName, secondHeroName, chronicleProse } = {}) {
  if (chronicleProse) return chronicleProse;
  const table = isVictory ? SAGA_VICTORY_PROSE : SAGA_DEFEAT_PROSE;
  let prose = table[nodeIndex] ?? (isVictory
    ? 'The north holds. The saga continues.'
    : 'The line broke. The fortress remembers.');
  const name = gateHeroName || 'A defender';
  const name2 = secondHeroName || 'another';
  prose = prose.replace(/\{name2\}/g, name2).replace(/\{name\}/g, name);
  return prose;
}

export function getSagaDebriefTitle(nodeIndex) {
  return SAGA_TITLES[nodeIndex] ?? 'After the assault';
}

/** West-front gate integrity from live wall data at assault end. */
export function buildFortressDamageReport(wallData, fieldState, options = {}) {
  const {
    frontId = 'west',
    goal = { col: 24, row: 15 },
    ringR = 5,
    lives = 20,
    breachFlag = false,
  } = options;

  const gatePost = getPrimaryGateForFront(frontId);
  const gateCell = resolvePostCell(gatePost, goal, ringR);
  const gateKey = `${gateCell.col}_${gateCell.row}`;

  let gateHp = null;
  let gateMax = null;
  const gateWall = wallData?.[gateKey];
  if (gateWall) {
    gateMax = gateWall.maxHp ?? gateWall.hp ?? 100;
    gateHp = gateWall.hp ?? gateMax;
  } else {
    for (const [key, w] of Object.entries(wallData ?? {})) {
      if (!w?.isGate) continue;
      const [c, r] = key.split('_').map(Number);
      if (c <= goal.col) {
        gateHp = w.hp ?? w.maxHp ?? 100;
        gateMax = w.maxHp ?? gateHp;
        break;
      }
    }
  }

  const gateHpPct = gateHp != null && gateMax > 0
    ? Math.round((gateHp / gateMax) * 100)
    : null;

  const breached = breachFlag || lives <= 0 || gateHpPct === 0;

  const lines = [];
  const facing = frontId.toUpperCase();

  if (gateHpPct != null) {
    const hpColor = gateHpPct > 60 ? 'hold' : gateHpPct > 25 ? 'wounded' : 'critical';
    lines.push({
      label: `${facing} GATE`,
      value: `${gateHpPct}% integrity`,
      tone: hpColor,
    });
  }

  if (!breached && gateHpPct != null && gateHpPct >= 90) {
    lines.push({ label: 'WALL', value: 'Unbroken this assault', tone: 'hold' });
  } else if (!breached && gateHpPct != null && gateHpPct < 90) {
    lines.push({ label: 'WALL', value: 'Masonry will mend before the next horn', tone: 'mended' });
  }

  if (breached) {
    lines.push({ label: 'BREACH', value: 'The threshold was crossed', tone: 'critical' });
  }

  return {
    facing,
    gateHpPct,
    breached,
    lines,
    summary: lines.map(l => `${l.label}: ${l.value}`).join(' · '),
  };
}

/** One-line compact stats for prose-first debrief footer. */
export function formatDebriefCompactStats({
  waveNumber,
  waveTotal,
  slain,
  goldEarned,
  lives,
  maxLives,
  mvpName,
  goldStolen = 0,
  casualties = 0,
}) {
  const parts = [];
  if (waveTotal != null) parts.push(`${waveNumber}/${waveTotal} waves`);
  else if (waveNumber != null) parts.push(`${waveNumber} waves`);
  parts.push(`${slain ?? 0} slain`);
  parts.push(`◆${goldEarned ?? 0}g`);
  if (goldStolen > 0) parts.push(`−${goldStolen}g raided`);
  parts.push(`${Math.max(0, lives ?? 0)}/${maxLives ?? 20} ramparts`);
  if (casualties > 0) parts.push(`${casualties} fallen`);
  if (mvpName) parts.push(`MVP ${mvpName}`);
  return parts.join(' · ');
}

/** One-line boss loot callout for parchment debrief. */
export function formatBossLootParchmentLine(itemDef) {
  if (!itemDef?.name) return null;
  return `⚔ Boss loot: ${itemDef.name}`;
}
