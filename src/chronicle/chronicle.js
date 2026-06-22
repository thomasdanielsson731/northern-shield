// Chronicle — transforms gameplay events into persistent battle stories.
// All prose is generated from structured event data; no manual writing required.

// ── Ordinal helpers ───────────────────────────────────────────────────────────
const ORDINALS = ['first','second','third','fourth','fifth','sixth','seventh',
                  'eighth','ninth','tenth','eleventh','twelfth','thirteenth',
                  'fourteenth','fifteenth'];
export function ordinal(n) { return ORDINALS[n - 1] ?? `${n}th`; }

// ── Title definitions ─────────────────────────────────────────────────────────
export const TITLE_DEFS = {
  battle_marked:   { id: 'battle_marked',   label: 'Battle-Marked',      desc: '5 battles survived' },
  the_blooded:     { id: 'the_blooded',     label: 'The Blooded',        desc: '50 career kills' },
  the_reaper:      { id: 'the_reaper',      label: 'The Reaper',         desc: '150 career kills' },
  the_wall:        { id: 'the_wall',        label: 'The Wall',           desc: 'MVP in 5 battles' },
  ironsworn:       { id: 'ironsworn',       label: 'Ironsworn',          desc: '20 battles deployed' },
  unbroken:        { id: 'unbroken',        label: 'The Unbroken',       desc: '10 battles, fortress never breached while deployed' },
  the_last:        { id: 'the_last',        label: 'The Last',           desc: 'Held alone; wave survived' },
  veteran:         { id: 'veteran',         label: 'The Veteran',        desc: 'Career level X' },
  chieftains_bane: { id: 'chieftains_bane', label: "Chieftain's Bane",   desc: 'Killing blow on 3 chieftains' },
  draugen_slayer:  { id: 'draugen_slayer',  label: 'Draugen-Slayer',     desc: 'Killed the DRAUGEN-JARL' },
  jotunn_breaker:  { id: 'jotunn_breaker',  label: 'Jötun-Breaker',      desc: 'Killed the JÖTUNHELM WALKER' },
  mara_bane:       { id: 'mara_bane',       label: 'Mara-Bane',          desc: 'Killed the MARA-VOID' },
  fenrir_foe:      { id: 'fenrir_foe',      label: 'Fenrir-Foe',         desc: 'Killed FENRIR' },
  surtr_end:       { id: 'surtr_end',       label: 'Surtr-Ender',        desc: 'Killed SURTR' },
};

// Boss name → title ID
const BOSS_TITLE = {
  'DRAUGEN-JARL':       'draugen_slayer',
  'JÖTUNHELM WALKER':   'jotunn_breaker',
  'MARA-VOID':          'mara_bane',
  'FENRIR':             'fenrir_foe',
  'SURTR':              'surtr_end',
};

// Display priority — highest prestige first
const TITLE_PRIORITY = [
  'surtr_end', 'fenrir_foe', 'mara_bane', 'jotunn_breaker', 'draugen_slayer',
  'chieftains_bane', 'the_last', 'veteran', 'the_wall', 'unbroken',
  'the_reaper', 'ironsworn', 'the_blooded', 'battle_marked',
];

export function getPrimaryTitle(defender) {
  if (!defender.titles?.length) return null;
  for (const id of TITLE_PRIORITY) {
    if (defender.titles.includes(id)) return TITLE_DEFS[id] ?? null;
  }
  return TITLE_DEFS[defender.titles.at(-1)] ?? null;
}

// ── Chronicle factory ─────────────────────────────────────────────────────────
export function createChronicle() {
  return { battles: [], warbandName: '' };
}

// ── Title checking ────────────────────────────────────────────────────────────
// Returns array of newly earned title IDs (not already in defender.titles).
export function checkTitles(defender, chronicleBattles) {
  const has      = (id) => defender.titles?.includes(id) ?? false;
  const earned   = [];
  const battles  = chronicleBattles ?? [];

  // Milestone: battles played
  if (!has('battle_marked') && defender.battlesPlayed >= 5)  earned.push('battle_marked');
  if (!has('ironsworn')     && defender.battlesPlayed >= 20) earned.push('ironsworn');

  // Milestone: career kills
  if (!has('the_blooded') && defender.careerKills >= 50)  earned.push('the_blooded');
  if (!has('the_reaper')  && defender.careerKills >= 150) earned.push('the_reaper');

  // Milestone: career level
  if (!has('veteran') && defender.careerLevel >= 10) earned.push('veteran');

  // Per-chronicle-battle checks
  const myBattles = battles.filter(b =>
    b.defenders?.some(d => d.defenderId === defender.defenderId)
  );

  // MVP count
  if (!has('the_wall')) {
    const mvpCount = myBattles.filter(b => b.mvpId === defender.defenderId).length;
    if (mvpCount >= 5) earned.push('the_wall');
  }

  // Last stand survived
  if (!has('the_last')) {
    const hadLS = myBattles.some(b =>
      b.lastStand?.defenderId === defender.defenderId && b.lastStand.survived
    );
    if (hadLS) earned.push('the_last');
  }

  // Unbroken: 10+ battles, fortress never breached while they were deployed
  if (!has('unbroken') && defender.battlesPlayed >= 10) {
    const breachedWhileDeployed = myBattles.some(b => b.breach);
    if (!breachedWhileDeployed) earned.push('unbroken');
  }

  // Boss-specific titles
  const myBossKills = myBattles.flatMap(b => b.bossKills ?? [])
    .filter(bk => bk.killerId === defender.defenderId);

  const uniqueBossTypes = new Set(myBossKills.map(bk => bk.boss));
  if (!has('chieftains_bane') && uniqueBossTypes.size >= 3) earned.push('chieftains_bane');

  for (const [bossName, titleId] of Object.entries(BOSS_TITLE)) {
    if (!has(titleId) && myBossKills.some(bk => bk.boss === bossName)) {
      earned.push(titleId);
    }
  }

  return earned;
}

// ── Battle report generation ──────────────────────────────────────────────────
// battleData shape:
//   { battleNumber, mapName, result, wavesCleared, enemiesSlain,
//     rampartsEnd, rampartsStart, breach, mvpId, mvpName, mvpKills,
//     bossKills: [{boss, killerName, killerId}],
//     lastStand: null | {defenderName, defenderId, survived, ramparts},
//     defenders: [{defenderId, name, kills}]  }
// chronicle: the chronicle state (for looking up prior MVP history)

export function generateBattleReport(battleData, chronicle) {
  const {
    battleNumber, mapName, result, wavesCleared, enemiesSlain,
    rampartsEnd, rampartsStart, breach, mvpName, mvpId, mvpKills,
    bossKills, lastStand,
  } = battleData;

  const prior      = chronicle?.battles ?? [];
  const isVictory  = result === 'victory';
  const loc        = mapName || 'the pass';
  const num        = ordinal(battleNumber);
  const rampsLost  = (rampartsStart ?? 8) - (rampartsEnd ?? 8);

  const lines = [];

  // ── Opening ───────────────────────────────────────────────────────────────
  if (battleNumber === 1) {
    if (isVictory) {
      lines.push(`The warband held ${loc} for the first time.`);
    } else {
      lines.push(`The warband met ${loc} for the first time and found the line wanting.`);
    }
  } else if (!isVictory) {
    lines.push(`The ${num} battle at ${loc} was a dark hour.`);
  } else if (bossKills?.length) {
    lines.push(`A chieftain came to ${loc} in the ${num} battle.`);
  } else if (rampsLost === 0) {
    lines.push(`The ${num} battle at ${loc} was the cleanest the fortress had seen.`);
  } else if (rampsLost >= 3) {
    lines.push(`The ${num} battle at ${loc} was hard-won.`);
  } else {
    lines.push(`The ${num} battle at ${loc}.`);
  }

  // ── Wave count (only if > 1) ──────────────────────────────────────────────
  if (wavesCleared > 1 && battleNumber > 1) {
    const assaultWord = wavesCleared === 1 ? 'assault' : 'assaults';
    lines.push(`${wavesCleared} ${assaultWord} came.`);
  }

  // ── Boss kill ─────────────────────────────────────────────────────────────
  if (bossKills?.length) {
    for (const { boss, killerName } of bossKills) {
      if (killerName) {
        // Check if this killer has beaten this boss before
        const priorBossKill = prior.some(b =>
          b.bossKills?.some(bk => bk.boss === boss && bk.killerName === killerName)
        );
        if (priorBossKill) {
          lines.push(`${killerName} has faced the ${boss} before. It fell again.`);
        } else {
          lines.push(`${killerName} struck the final blow against the ${boss}.`);
        }
      } else {
        lines.push(`The ${boss} fell to the warband.`);
      }
    }
  }

  // ── Last Stand ────────────────────────────────────────────────────────────
  if (lastStand) {
    const { defenderName, survived, ramparts } = lastStand;
    if (survived) {
      const rStr = ramparts === 1 ? 'one rampart' : `${ramparts} ramparts`;
      lines.push(`${defenderName} stood alone when the others had fallen. The fortress held by ${rStr}.`);
    } else {
      lines.push(`${defenderName} was the last to stand. It was not enough.`);
    }
  }

  // ── MVP ───────────────────────────────────────────────────────────────────
  if (mvpName && mvpKills > 0) {
    const priorMvpCount = prior.filter(b => b.mvpId === mvpId).length;
    if (priorMvpCount >= 2) {
      lines.push(`${mvpName} was named defender of the battle again. ${mvpKills} ${mvpKills === 1 ? 'enemy' : 'enemies'} fell.`);
    } else if (bossKills?.some(bk => bk.killerName === mvpName)) {
      // MVP also killed the boss — don't repeat the kill detail
      lines.push(`${mvpName} was named defender of the battle.`);
    } else {
      lines.push(`${mvpName} was named defender of the battle. ${mvpKills} ${mvpKills === 1 ? 'enemy' : 'enemies'} fell.`);
    }
  }

  // ── Breach note ───────────────────────────────────────────────────────────
  if (breach && rampsLost > 0) {
    if (rampartsEnd <= 1) {
      lines.push(`The ramparts fell to one before the assault broke.`);
    } else if (rampsLost === 1) {
      lines.push(`One rampart fell before the line held.`);
    } else {
      lines.push(`${rampsLost} ramparts fell before the fortress steadied.`);
    }
  }

  // ── Closing ───────────────────────────────────────────────────────────────
  if (isVictory) {
    if (rampsLost === 0) {
      lines.push(`All ramparts stand.`);
    } else if (rampartsEnd === 1) {
      lines.push(`One rampart remains.`);
    } else {
      lines.push(`${rampartsEnd} ramparts remain.`);
    }
  } else {
    lines.push(`The Chronicle does not record this as a victory.`);
  }

  return lines.join(' ');
}

// ── Canvas word-wrap helper ───────────────────────────────────────────────────
// Splits `text` into lines no wider than `maxWidth` using ctx.measureText.
export function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}
