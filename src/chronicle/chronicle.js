// Chronicle — transforms gameplay events into persistent battle stories.

// ── Ordinal helpers ───────────────────────────────────────────────────────────
const ORDINALS = ['first','second','third','fourth','fifth','sixth','seventh',
                  'eighth','ninth','tenth','eleventh','twelfth','thirteenth',
                  'fourteenth','fifteenth'];
export function ordinal(n) { return ORDINALS[n - 1] ?? `${n}th`; }

// ── Trait definitions ─────────────────────────────────────────────────────────
export const TRAIT_DEFS = {
  reckless:   { id: 'reckless',   label: 'Reckless',   desc: 'Fights without restraint' },
  steadfast:  { id: 'steadfast',  label: 'Steadfast',  desc: 'Holds ground without yielding' },
  brooding:   { id: 'brooding',   label: 'Brooding',   desc: 'Darkens after defeat, sharpens after' },
  serene:     { id: 'serene',     label: 'Serene',     desc: 'Unshaken by chaos' },
  methodical: { id: 'methodical', label: 'Methodical', desc: 'Measured and precise' },
  impulsive:  { id: 'impulsive',  label: 'Impulsive',  desc: 'Strikes before planning' },
  vengeful:   { id: 'vengeful',   label: 'Vengeful',   desc: 'Remembers every loss' },
  devout:     { id: 'devout',     label: 'Devout',     desc: 'Draws strength from faith' },
};

// Weighted trait pools per class — more common traits listed multiple times
const TRAIT_BY_CLASS = {
  berserk:  ['reckless','reckless','impulsive','vengeful','brooding'],
  valkyrie: ['steadfast','devout','serene','methodical','steadfast'],
  military: ['methodical','impulsive','reckless','steadfast','methodical'],
  catapult: ['methodical','brooding','serene','steadfast','methodical'],
  drakship: ['reckless','impulsive','vengeful','brooding','reckless'],
  piltorn:  ['methodical','serene','steadfast','devout','methodical'],
  blondie:  ['serene','devout','methodical','serene','serene'],
  hydda:    ['devout','serene','devout','methodical','devout'],
  isjatten: ['serene','methodical','brooding','devout','serene'],
};

export function getRandomTrait(type) {
  const pool = TRAIT_BY_CLASS[type] ?? Object.keys(TRAIT_DEFS);
  return pool[Math.floor(Math.random() * pool.length)];
}

// Closing bio sentence per trait (uses {name} placeholder)
const TRAIT_BIO_CLOSE = {
  reckless:   '{name} is Reckless by nature, and the warband has learned not to place them where retreat is the plan.',
  steadfast:  '{name} is Steadfast. The warband places them where the line cannot break.',
  brooding:   '{name} is Brooding. After defeat, something in them sharpens.',
  serene:     '{name} is Serene, untroubled by the chaos around them.',
  methodical: '{name} is Methodical. They do not rush. The enemy learns this too late.',
  impulsive:  '{name} is Impulsive, and the warband relies on this.',
  vengeful:   '{name} is Vengeful. They do not forget.',
  devout:     '{name} is Devout, and draws strength from a source the warband cannot name.',
};

// Short trait clause for battle reports (appended to MVP/last-stand sentences)
const TRAIT_REPORT_CLAUSE = {
  reckless:   ' They did not hold back.',
  steadfast:  ' They did not yield.',
  brooding:   ' Something in them had sharpened.',
  serene:     ' They were untroubled.',
  methodical: ' Every kill was deliberate.',
  impulsive:  ' They struck before the order came.',
  vengeful:   ' They had not forgotten.',
  devout:     ' Their faith held with them.',
};

// ── Scar definitions ──────────────────────────────────────────────────────────
export const SCAR_DEFS = {
  lone_stand:     { id: 'lone_stand',     label: 'The Lone Stand',            desc: 'Held alone when others fell' },
  mark_last_hour: { id: 'mark_last_hour', label: 'Mark of the Last Hour',     desc: 'Present when one rampart remained' },
  rampart_wound:  { id: 'rampart_wound',  label: 'Rampart Wound',             desc: 'Deployed during 3+ fortress breaches' },
  draugen_scar:   { id: 'draugen_scar',   label: 'Scar of the Draugen-Jarl', desc: 'Survived three Draugen-Jarl assaults' },
  jotunn_scar:    { id: 'jotunn_scar',    label: 'Scar of the Jötun',         desc: 'Survived three Jötunhelm Walker assaults' },
  fenrir_brand:   { id: 'fenrir_brand',   label: "Fenrir's Brand",            desc: 'Survived a Fenrir wave' },
  bond_grief:     { id: 'bond_grief',     label: 'Bond Grief',                desc: 'Lost a bonded shield-brother' },
};
const MAX_SCARS = 4;

// ── Scar checking ─────────────────────────────────────────────────────────────
// Returns array of newly earned scar IDs for a defender after a battle.
export function checkScars(defender, battleData, allBattles) {
  const has    = (id) => defender.scars?.includes(id) ?? false;
  const earned = [];
  const cap    = MAX_SCARS - (defender.scars?.length ?? 0);
  if (cap <= 0) return earned;

  const id = defender.defenderId;
  const wasDeployed = battleData.defenders?.some(d => d.defenderId === id);
  if (!wasDeployed) return earned;

  if (!has('lone_stand') && battleData.lastStand?.defenderId === id && battleData.lastStand.survived) {
    earned.push('lone_stand');
  }
  if (!has('mark_last_hour') && battleData.rampartsEnd === 1) {
    earned.push('mark_last_hour');
  }
  if (!has('rampart_wound') && (defender.breachesDeployed ?? 0) >= 3) {
    earned.push('rampart_wound');
  }

  // Boss-encounter scars (based on full battle history)
  const myBattles = allBattles.filter(b => b.defenders?.some(d => d.defenderId === id));
  if (!has('draugen_scar')) {
    const n = myBattles.filter(b => b.bossKills?.some(bk => bk.boss === 'DRAUGEN-JARL')).length;
    if (n >= 3) earned.push('draugen_scar');
  }
  if (!has('jotunn_scar')) {
    const n = myBattles.filter(b => b.bossKills?.some(bk => bk.boss === 'JÖTUNHELM WALKER')).length;
    if (n >= 3) earned.push('jotunn_scar');
  }
  if (!has('fenrir_brand')) {
    const hadFenrir = myBattles.some(b => b.bossKills?.some(bk => bk.boss === 'FENRIR'));
    if (hadFenrir) earned.push('fenrir_brand');
  }

  return earned.slice(0, cap);
}

// ── Veteran ranks ─────────────────────────────────────────────────────────────
// Listed highest-first; getRank returns the first one the defender qualifies for.
export const VETERAN_RANKS = [
  { id: 'legend',    label: 'LEGEND',    color: '#ffd040', minLevel: 10, minBattles: 100, minKills: 0,   minTitles: 3 },
  { id: 'ironguard', label: 'IRONGUARD', color: '#c0a0ff', minLevel: 10, minBattles: 50,  minKills: 0,   minTitles: 1 },
  { id: 'champion',  label: 'CHAMPION',  color: '#e89040', minLevel: 8,  minBattles: 30,  minKills: 150, minTitles: 0 },
  { id: 'veteran',   label: 'VETERAN',   color: '#90c870', minLevel: 5,  minBattles: 15,  minKills: 50,  minTitles: 0 },
  { id: 'warrior',   label: 'WARRIOR',   color: '#8090c0', minLevel: 3,  minBattles: 5,   minKills: 0,   minTitles: 0 },
  { id: 'greenhorn', label: 'GREENHORN', color: '#706860', minLevel: 0,  minBattles: 0,   minKills: 0,   minTitles: 0 },
];

export function getRank(defender) {
  for (const rank of VETERAN_RANKS) {
    if (defender.careerLevel   >= rank.minLevel   &&
        defender.battlesPlayed >= rank.minBattles  &&
        defender.careerKills   >= rank.minKills    &&
        (defender.titles?.length ?? 0) >= rank.minTitles) {
      return rank;
    }
  }
  return VETERAN_RANKS[VETERAN_RANKS.length - 1];
}

// ── Bond name generation ──────────────────────────────────────────────────────
const BOND_NAMES = [
  'The Unbroken Pair', 'Shield-Brothers', 'The Fortress Bond',
  'Defenders of the Pass', 'The Last Two', 'Brothers of the Wall',
  'The Standing Pair', 'Children of the Shield', 'The Iron Pact',
  'Keepers of the Gate',
];

export function generateBondName(defA, defB) {
  // Deterministic from defender IDs so it never changes
  const seed = [...(defA.defenderId + defB.defenderId)]
    .reduce((a, c) => a + c.charCodeAt(0), 0);
  return BOND_NAMES[seed % BOND_NAMES.length];
}

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

const BOSS_TITLE = {
  'DRAUGEN-JARL':     'draugen_slayer',
  'JÖTUNHELM WALKER': 'jotunn_breaker',
  'MARA-VOID':        'mara_bane',
  'FENRIR':           'fenrir_foe',
  'SURTR':            'surtr_end',
};

const TITLE_PRIORITY = [
  'surtr_end','fenrir_foe','mara_bane','jotunn_breaker','draugen_slayer',
  'chieftains_bane','the_last','veteran','the_wall','unbroken',
  'the_reaper','ironsworn','the_blooded','battle_marked',
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
export function checkTitles(defender, chronicleBattles) {
  const has    = (id) => defender.titles?.includes(id) ?? false;
  const earned = [];
  const battles = chronicleBattles ?? [];

  if (!has('battle_marked') && defender.battlesPlayed >= 5)  earned.push('battle_marked');
  if (!has('ironsworn')     && defender.battlesPlayed >= 20) earned.push('ironsworn');
  if (!has('the_blooded')   && defender.careerKills >= 50)   earned.push('the_blooded');
  if (!has('the_reaper')    && defender.careerKills >= 150)  earned.push('the_reaper');
  if (!has('veteran')       && defender.careerLevel >= 10)   earned.push('veteran');

  const myBattles = battles.filter(b =>
    b.defenders?.some(d => d.defenderId === defender.defenderId)
  );

  if (!has('the_wall')) {
    const mvpCount = myBattles.filter(b => b.mvpId === defender.defenderId).length;
    if (mvpCount >= 5) earned.push('the_wall');
  }
  if (!has('the_last')) {
    const hadLS = myBattles.some(b =>
      b.lastStand?.defenderId === defender.defenderId && b.lastStand.survived
    );
    if (hadLS) earned.push('the_last');
  }
  if (!has('unbroken') && defender.battlesPlayed >= 10) {
    const breachedWhileDeployed = myBattles.some(b => b.breach);
    if (!breachedWhileDeployed) earned.push('unbroken');
  }

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

// ── Epitaph generation ────────────────────────────────────────────────────────
export function generateEpitaph(defender) {
  const n    = defender.name;
  const pt   = getPrimaryTitle(defender);
  const rank = getRank(defender);

  if (pt?.id === 'surtr_end')       return `${n} ended what could not be ended.`;
  if (pt?.id === 'fenrir_foe')      return `${n} faced the wolf and the wolf fled.`;
  if (pt?.id === 'the_last')        return `${n} stood alone and the fortress held.`;
  if (pt?.id === 'chieftains_bane') return `Three chieftains fell to ${n}.`;
  if (pt?.id === 'veteran')         return `${n} reached the heights of their calling.`;
  if (pt?.id === 'unbroken')        return `${n} served without a single breach. The record stands.`;
  if (pt?.id === 'the_wall')        return `${n} was named defender of the battle five times.`;
  if (pt?.id === 'the_reaper')      return `${n} slew without mercy. 150 enemies. The warband remembers.`;

  if (defender.scars?.includes('lone_stand'))     return `${n} stood alone. The warband remembers.`;
  if (defender.scars?.includes('rampart_wound'))  return `${n} endured when the ramparts fell.`;
  if (defender.scars?.includes('bond_grief'))     return `${n} outlasted a shield-brother. That was the harder battle.`;

  if (rank.id === 'legend')    return `${n} was a Legend. That is enough.`;
  if (rank.id === 'ironguard') return `${n} served until iron itself bent.`;
  if (rank.id === 'champion')  return `${n} was a Champion of the Northern Shield.`;
  if (rank.id === 'veteran')   return `${n} was a Veteran in every sense.`;

  return `${n} served ${defender.battlesPlayed} battle${defender.battlesPlayed !== 1 ? 's' : ''} for the Northern Shield.`;
}

// ── Defender biography ────────────────────────────────────────────────────────
// classLabel should be passed from game.js (e.g. TOWER_DEFS[def.type]?.label ?? def.type)
export function generateBio(defender, chronicle, classLabel) {
  const n       = defender.name;
  const rank    = getRank(defender);
  const battles = defender.battlesPlayed ?? 0;
  const kills   = defender.careerKills ?? 0;
  const lvl     = defender.careerLevel ?? 0;
  const cls     = classLabel ?? defender.type;
  const prior   = chronicle?.battles ?? [];
  const lines   = [];

  // Line 1: Class, rank, battles
  if (battles === 0) {
    lines.push(`${n} is a ${cls} of the ${rank.label} rank, newly arrived at the Northern Shield.`);
  } else if (battles === 1) {
    lines.push(`${n} is a ${cls} of the ${rank.label} rank, who has fought in one battle for the Northern Shield.`);
  } else {
    lines.push(`${n} is a ${cls} of the ${rank.label} rank, who has fought in ${battles} battles for the Northern Shield.`);
  }

  // Line 2: Most notable title or scar
  const pt = getPrimaryTitle(defender);
  const scar = defender.scars?.length ? SCAR_DEFS[defender.scars[0]] : null;
  if (pt && scar) {
    lines.push(`${n} carries the ${scar.label} and holds the title of ${pt.label}.`);
  } else if (pt) {
    lines.push(`${n} holds the title of ${pt.label}. ${TITLE_DEFS[pt.id]?.desc ?? ''}`);
  } else if (scar) {
    lines.push(`${n} carries the ${scar.label}.`);
  } else if (lvl >= 5) {
    lines.push(`${n} has reached career level ${lvl > 0 ? ['I','II','III','IV','V','VI','VII','VIII','IX','X'][lvl-1] ?? lvl : 0}.`);
  }

  // Line 3: Notable deeds
  const myBattles = prior.filter(b => b.defenders?.some(d => d.defenderId === defender.defenderId));
  const mvpCount  = myBattles.filter(b => b.mvpId === defender.defenderId).length;
  const myBossKills = myBattles.flatMap(b => b.bossKills ?? [])
    .filter(bk => bk.killerId === defender.defenderId);
  const uniqueBosses = [...new Set(myBossKills.map(bk => bk.boss))];

  if (uniqueBosses.length > 0 && mvpCount > 0) {
    lines.push(`${n} has slain ${uniqueBosses.length === 1 ? `the ${uniqueBosses[0]}` : `${uniqueBosses.length} chieftains`} and been named defender of the battle ${mvpCount} time${mvpCount !== 1 ? 's' : ''}, felling ${kills} enemies across their career.`);
  } else if (uniqueBosses.length > 0) {
    lines.push(`${n} has struck the killing blow against ${uniqueBosses.length === 1 ? `the ${uniqueBosses[0]}` : `${uniqueBosses.length} different chieftains`}.`);
  } else if (mvpCount > 0) {
    lines.push(`${n} was named defender of the battle ${mvpCount} time${mvpCount !== 1 ? 's' : ''}, felling ${kills} enemies across their career.`);
  } else if (kills > 0) {
    lines.push(`${n} has felled ${kills} enemies across their career.`);
  }

  // Line 4: Bond mention
  const bond = chronicle?._bonds?.find(b => b.defenderIds.includes(defender.defenderId));
  if (bond) {
    lines.push(`${n} fights beside a bonded shield-brother: "${bond.name}."`);
  }

  // Line 5: Trait closing
  const trait = defender.trait;
  if (trait && TRAIT_BIO_CLOSE[trait]) {
    lines.push(TRAIT_BIO_CLOSE[trait].replace('{name}', n));
  }

  return lines.join(' ');
}

// ── Battle report generation ──────────────────────────────────────────────────
export function generateBattleReport(battleData, chronicle) {
  const {
    battleNumber, mapName, result, wavesCleared, enemiesSlain,
    rampartsEnd, rampartsStart, breach, mvpName, mvpId, mvpKills,
    bossKills, lastStand, defenderTraits,
  } = battleData;

  const prior     = chronicle?.battles ?? [];
  const isVictory = result === 'victory';
  const loc       = mapName || 'the pass';
  const num       = ordinal(battleNumber);
  const rampsLost = (rampartsStart ?? 8) - (rampartsEnd ?? 8);
  const traits    = defenderTraits ?? {};

  const lines = [];

  // Opening
  if (battleNumber === 1) {
    lines.push(isVictory
      ? `The warband held ${loc} for the first time.`
      : `The warband met ${loc} for the first time and found the line wanting.`);
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

  // Wave count
  if (wavesCleared > 1 && battleNumber > 1) {
    lines.push(`${wavesCleared} assault${wavesCleared === 1 ? '' : 's'} came.`);
  }

  // Boss kills — with scar-awareness via defenderTraits
  if (bossKills?.length) {
    for (const { boss, killerName, killerId } of bossKills) {
      const killerTrait = killerId ? traits[killerId] : null;
      const traitClause = killerTrait ? (TRAIT_REPORT_CLAUSE[killerTrait] ?? '') : '';
      if (killerName) {
        const priorKill = prior.some(b =>
          b.bossKills?.some(bk => bk.boss === boss && bk.killerName === killerName)
        );
        if (priorKill) {
          lines.push(`${killerName} has faced the ${boss} before. It fell again.${traitClause}`);
        } else {
          lines.push(`${killerName} struck the final blow against the ${boss}.${traitClause}`);
        }
      } else {
        lines.push(`The ${boss} fell to the warband.`);
      }
    }
  }

  // Last Stand — with trait clause
  if (lastStand) {
    const { defenderName, defenderId, survived, ramparts } = lastStand;
    const lsTrait = defenderId ? traits[defenderId] : null;
    const traitClause = lsTrait ? (TRAIT_REPORT_CLAUSE[lsTrait] ?? '') : '';
    if (survived) {
      const rStr = ramparts === 1 ? 'one rampart' : `${ramparts} ramparts`;
      lines.push(`${defenderName} stood alone when the others had fallen. The fortress held by ${rStr}.${traitClause}`);
    } else {
      lines.push(`${defenderName} was the last to stand. It was not enough.`);
    }
  }

  // MVP — with trait clause
  if (mvpName && mvpKills > 0) {
    const priorMvpCount = prior.filter(b => b.mvpId === mvpId).length;
    const mvpTrait      = mvpId ? traits[mvpId] : null;
    const traitClause   = mvpTrait ? (TRAIT_REPORT_CLAUSE[mvpTrait] ?? '') : '';
    if (priorMvpCount >= 2) {
      lines.push(`${mvpName} was named defender of the battle again. ${mvpKills} ${mvpKills === 1 ? 'enemy' : 'enemies'} fell.${traitClause}`);
    } else if (bossKills?.some(bk => bk.killerName === mvpName)) {
      lines.push(`${mvpName} was named defender of the battle.${traitClause}`);
    } else {
      lines.push(`${mvpName} was named defender of the battle. ${mvpKills} ${mvpKills === 1 ? 'enemy' : 'enemies'} fell.${traitClause}`);
    }
  }

  // Breach note
  if (breach && rampsLost > 0) {
    if (rampartsEnd <= 1) {
      lines.push(`The ramparts fell to one before the assault broke.`);
    } else if (rampsLost === 1) {
      lines.push(`One rampart fell before the line held.`);
    } else {
      lines.push(`${rampsLost} ramparts fell before the fortress steadied.`);
    }
  }

  // Closing
  if (isVictory) {
    if (rampsLost === 0)      lines.push(`All ramparts stand.`);
    else if (rampartsEnd === 1) lines.push(`One rampart remains.`);
    else                      lines.push(`${rampartsEnd} ramparts remain.`);
  } else {
    lines.push(`The Chronicle does not record this as a victory.`);
  }

  return lines.join(' ');
}

// ── Canvas word-wrap helper ───────────────────────────────────────────────────
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
