// Chronicle — transforms gameplay events into persistent battle stories.

// ── Ordinal helpers ───────────────────────────────────────────────────────────
const ORDINALS = ['first','second','third','fourth','fifth','sixth','seventh',
                  'eighth','ninth','tenth','eleventh','twelfth','thirteenth',
                  'fourteenth','fifteenth'];
export function ordinal(n) { return ORDINALS[n - 1] ?? `${n}th`; }

// ── Trait definitions ─────────────────────────────────────────────────────────
// rarity: 'positive' | 'negative' | 'rare' | 'legendary'
export const TRAIT_DEFS = {
  // Positive (18)
  steadfast:           { id: 'steadfast',           label: 'Steadfast',           desc: 'Holds ground without yielding',              rarity: 'positive' },
  devout:              { id: 'devout',              label: 'Devout',              desc: 'Draws strength from faith',                   rarity: 'positive' },
  serene:              { id: 'serene',              label: 'Serene',              desc: 'Unshaken by chaos',                           rarity: 'positive' },
  methodical:          { id: 'methodical',          label: 'Methodical',          desc: 'Measured and precise',                        rarity: 'positive' },
  fearless:            { id: 'fearless',            label: 'Fearless',            desc: 'Holds the gate without flinching',            rarity: 'positive' },
  builder:             { id: 'builder',             label: 'Builder',             desc: 'Thinks in stone and timber',                  rarity: 'positive' },
  guardian:            { id: 'guardian',            label: 'Guardian',            desc: 'The hoard is their oath',                     rarity: 'positive' },
  lucky:               { id: 'lucky',               label: 'Lucky',               desc: 'Fortune favors them',                         rarity: 'positive' },
  tactician:           { id: 'tactician',           label: 'Tactician',           desc: 'Reads the battle early',                      rarity: 'positive' },
  warmhearted:         { id: 'warmhearted',         label: 'Warm-Hearted',        desc: "Cares for the warband's wellbeing",           rarity: 'positive' },
  inspiring:           { id: 'inspiring',           label: 'Inspiring',           desc: 'Lifts the warband by example',                rarity: 'positive' },
  patient:             { id: 'patient',             label: 'Patient',             desc: 'Finds the moment, then acts decisively',      rarity: 'positive' },
  hardy:               { id: 'hardy',               label: 'Hardy',               desc: 'Shrugs off wounds that would fell others',    rarity: 'positive' },
  loyal:               { id: 'loyal',               label: 'Loyal',               desc: 'Fights hardest for those they stand beside',  rarity: 'positive' },
  swift:               { id: 'swift',               label: 'Swift',               desc: 'Strikes faster than the eye follows',         rarity: 'positive' },
  merciful:            { id: 'merciful',            label: 'Merciful',            desc: 'Inclined toward mercy, even in battle',       rarity: 'positive' },
  eagle_eyed:          { id: 'eagle_eyed',          label: 'Eagle-Eyed',          desc: 'Sees further than most',                      rarity: 'positive' },
  menders_touch:       { id: 'menders_touch',       label: "Mender's Touch",      desc: 'Wounds heal faster in their presence',        rarity: 'positive' },
  // Negative (12)
  reckless:            { id: 'reckless',            label: 'Reckless',            desc: 'Fights without restraint',                    rarity: 'negative' },
  impulsive:           { id: 'impulsive',           label: 'Impulsive',           desc: 'Strikes before planning',                     rarity: 'negative' },
  brooding:            { id: 'brooding',            label: 'Brooding',            desc: 'Darkens after defeat, sharpens after',        rarity: 'negative' },
  vengeful:            { id: 'vengeful',            label: 'Vengeful',            desc: 'Remembers every loss',                        rarity: 'negative' },
  greedy:              { id: 'greedy',              label: 'Greedy',              desc: 'Fights harder for personal gain',             rarity: 'negative' },
  cowardly:            { id: 'cowardly',            label: 'Cowardly',            desc: 'Loses heart when the fortress weakens',       rarity: 'negative' },
  proud:               { id: 'proud',               label: 'Proud',               desc: 'Pride comes before the fall',                 rarity: 'negative' },
  hotheaded:           { id: 'hotheaded',           label: 'Hotheaded',           desc: 'Volatile and hard to steady',                 rarity: 'negative' },
  suspicious:          { id: 'suspicious',          label: 'Suspicious',          desc: 'Trusts no one, fights with caution',          rarity: 'negative' },
  wasteful:            { id: 'wasteful',            label: 'Wasteful',            desc: 'Spends more effort than the task requires',   rarity: 'negative' },
  bitter:              { id: 'bitter',              label: 'Bitter',              desc: 'Old wounds, old anger',                       rarity: 'negative' },
  lone_wolf:           { id: 'lone_wolf',           label: 'Lone Wolf',           desc: 'Better alone than in a pack',                 rarity: 'negative' },
  // Rare (14)
  rune_touched:        { id: 'rune_touched',        label: 'Rune-Touched',        desc: 'Marked by elder runes, inside and out',       rarity: 'rare' },
  veteran_trait:       { id: 'veteran_trait',       label: 'Veteran',             desc: 'Forged by a hundred battles',                 rarity: 'rare' },
  stubborn:            { id: 'stubborn',            label: 'Stubborn',            desc: 'Will not yield while breath remains',         rarity: 'rare' },
  iron_willed:         { id: 'iron_willed',         label: 'Iron-Willed',         desc: 'Cannot be broken in spirit',                  rarity: 'rare' },
  wolf_friend:         { id: 'wolf_friend',         label: 'Wolf-Friend',         desc: 'Has the trust of wild things',                rarity: 'rare' },
  giant_bane:          { id: 'giant_bane',          label: 'Giant-Bane',          desc: 'Knows how to bring down the very large',      rarity: 'rare' },
  draugr_hunter:       { id: 'draugr_hunter',       label: 'Draugr-Hunter',       desc: 'Knows the walking dead by name',              rarity: 'rare' },
  frostborn:           { id: 'frostborn',           label: 'Frostborn',           desc: 'At home in the bitter cold',                  rarity: 'rare' },
  star_seeker:         { id: 'star_seeker',         label: 'Star-Seeker',         desc: 'Chases glory and fortune in equal measure',   rarity: 'rare' },
  bond_forger:         { id: 'bond_forger',         label: 'Bond-Forger',         desc: 'Builds trust faster than others',             rarity: 'rare' },
  scar_bearer:         { id: 'scar_bearer',         label: 'Scar-Bearer',         desc: 'Each wound made them stronger',               rarity: 'rare' },
  quiet_leader:        { id: 'quiet_leader',        label: 'Quiet Leader',        desc: 'Leads without words, by example',             rarity: 'rare' },
  gate_singer:         { id: 'gate_singer',         label: 'Gate-Singer',         desc: 'The old songs bind the stones',               rarity: 'rare' },
  quartermasters_eye:  { id: 'quartermasters_eye',  label: "Quartermaster's Eye", desc: 'Wastes nothing, misses nothing',              rarity: 'rare' },
  // Legendary (6) — not in recruit pool; acquired via events or feats
  jarlslayer:          { id: 'jarlslayer',          label: 'Jarlslayer',          desc: 'Has slain a Jarl in single combat',           rarity: 'legendary' },
  einherjar:           { id: 'einherjar',           label: 'Einherjar',           desc: 'Chosen for Valhalla but returned',            rarity: 'legendary' },
  saga_bound:          { id: 'saga_bound',          label: 'Saga-Bound',          desc: 'Their deeds will outlast them',               rarity: 'legendary' },
  fate_touched:        { id: 'fate_touched',        label: 'Fate-Touched',        desc: 'Fate intercedes on their behalf',             rarity: 'legendary' },
  world_tree_marked:   { id: 'world_tree_marked',   label: 'World-Tree Marked',   desc: 'Blessed by Yggdrasil itself',                 rarity: 'legendary' },
  odins_watch:         { id: 'odins_watch',         label: "Odin's Watch",        desc: 'The Allfather sees through their eyes',       rarity: 'legendary' },
};

// Convenience sets (used by getRandomTrait, getLegendaryTrait, and tests)
export const RARE_TRAITS = [
  'rune_touched','veteran_trait','stubborn','iron_willed','wolf_friend','giant_bane',
  'draugr_hunter','frostborn','star_seeker','bond_forger','scar_bearer','quiet_leader',
  'gate_singer','quartermasters_eye',
];
export const LEGENDARY_TRAITS = [
  'jarlslayer','einherjar','saga_bound','fate_touched','world_tree_marked','odins_watch',
];

// Weighted class pools — positive/negative mix weighted by archetype; rare traits appear occasionally
const TRAIT_BY_CLASS = {
  berserk:  ['reckless','reckless','impulsive','vengeful','brooding','hardy','fearless','hotheaded','lone_wolf'],
  valkyrie: ['steadfast','steadfast','devout','serene','methodical','loyal','inspiring','patient','devout'],
  military: ['methodical','methodical','impulsive','reckless','steadfast','eagle_eyed','tactician','swift','proud'],
  catapult: ['methodical','methodical','brooding','serene','steadfast','patient','guardian','suspicious','scar_bearer'],
  drakship: ['reckless','reckless','impulsive','vengeful','brooding','hotheaded','lone_wolf','swift','greedy'],
  piltorn:  ['methodical','methodical','serene','steadfast','devout','eagle_eyed','patient','rune_touched','stubborn'],
  blondie:  ['serene','serene','devout','methodical','serene','frostborn','menders_touch','inspiring','warmhearted'],
  hydda:    ['devout','devout','serene','devout','methodical','warmhearted','menders_touch','merciful','loyal'],
  isjatten: ['serene','serene','methodical','brooding','devout','iron_willed','giant_bane','frostborn','stubborn'],
};

// 10% chance of a rare trait on recruit; legendary never from standard recruit
export function getRandomTrait(type) {
  if (Math.random() < 0.10) {
    return RARE_TRAITS[Math.floor(Math.random() * RARE_TRAITS.length)];
  }
  const pool = TRAIT_BY_CLASS[type] ?? Object.keys(TRAIT_DEFS).filter(k => {
    const r = TRAIT_DEFS[k].rarity;
    return r === 'positive' || r === 'negative';
  });
  return pool[Math.floor(Math.random() * pool.length)];
}

// Acquire a legendary trait via event or feat (pass specific ID or get random)
export function getLegendaryTrait(specificId = null) {
  if (specificId && LEGENDARY_TRAITS.includes(specificId)) return specificId;
  return LEGENDARY_TRAITS[Math.floor(Math.random() * LEGENDARY_TRAITS.length)];
}

// Closing bio sentence per trait (uses {name} placeholder)
const TRAIT_BIO_CLOSE = {
  // positive
  reckless:           '{name} is Reckless by nature, and the warband has learned not to place them where retreat is the plan.',
  steadfast:          '{name} is Steadfast. The warband places them where the line cannot break.',
  brooding:           '{name} is Brooding. After defeat, something in them sharpens.',
  serene:             '{name} is Serene, untroubled by the chaos around them.',
  methodical:         '{name} is Methodical. They do not rush. The enemy learns this too late.',
  impulsive:          '{name} is Impulsive, and the warband relies on this.',
  vengeful:           '{name} is Vengeful. They do not forget.',
  devout:             '{name} is Devout, and draws strength from a source the warband cannot name.',
  fearless:           '{name} is Fearless. The gate does not need to be safe. It needs to hold.',
  builder:            '{name} is a Builder. The walls stand because they thought of them first.',
  guardian:           '{name} is a Guardian. The hoard is their oath. The warband trusts this.',
  lucky:              '{name} is Lucky. The warband has stopped questioning it.',
  tactician:          '{name} is a Tactician. They read the battle before it begins.',
  warmhearted:        '{name} is Warm-Hearted. The warband does not always say so. But they notice.',
  inspiring:          '{name} is Inspiring. They do not try to be. The warband fights harder regardless.',
  patient:            '{name} is Patient. Late in the battle, this tells.',
  hardy:              '{name} is Hardy. What would kill others only slows them.',
  loyal:              '{name} is Loyal. Leave them behind and they notice.',
  swift:              '{name} is Swift. The enemy does not realize they have been hit.',
  merciful:           '{name} is Merciful. They fight when they must, and no more.',
  eagle_eyed:         '{name} is Eagle-Eyed. They see what others miss.',
  menders_touch:      "{name} has the Mender's Touch. Small hurts close quickly around them.",
  // negative
  greedy:             '{name} is Greedy. The warband accepts this. So far, the gold comes back.',
  cowardly:           '{name} is Cowardly. The warband does not speak of it. They still stand.',
  proud:              '{name} is Proud. The warband has learned not to remind them of their failures.',
  hotheaded:          '{name} is Hotheaded. The warband has learned to stay out of the way.',
  suspicious:         '{name} is Suspicious. They trust the warband — on good days.',
  wasteful:           '{name} is Wasteful. The warband has learned to resupply them early.',
  bitter:             '{name} is Bitter. The warband does not ask about it.',
  lone_wolf:          '{name} is a Lone Wolf. The warband respects the distance.',
  // rare
  rune_touched:       '{name} is Rune-Touched. The marks came with them. No one asks from where.',
  veteran_trait:      '{name} is a Veteran. The warband recognizes this without being told.',
  stubborn:           '{name} is Stubborn. The warband has watched them refuse to fall.',
  iron_willed:        '{name} is Iron-Willed. The warband has seen what cannot break them.',
  wolf_friend:        '{name} has the trust of wild things. The warband does not question it.',
  giant_bane:         '{name} is a Giant-Bane. They have done this before. The warband stays back.',
  draugr_hunter:      '{name} is a Draugr-Hunter. They know the dead. The warband is grateful.',
  frostborn:          '{name} is Frostborn. Cold is an old companion. The warband wears more layers.',
  star_seeker:        '{name} is a Star-Seeker. They fight for what comes after.',
  bond_forger:        '{name} is a Bond-Forger. The warband trusts quickly around them.',
  scar_bearer:        '{name} is a Scar-Bearer. The warband counts the marks and does not ask.',
  quiet_leader:       '{name} is a Quiet Leader. No speeches. The warband follows anyway.',
  gate_singer:        '{name} is a Gate-Singer. They hum before battle. The stones seem to listen.',
  quartermasters_eye: "{name} has the Quartermaster's Eye. Nothing is wasted. The warband eats well.",
  // legendary
  jarlslayer:         '{name} has killed a Jarl. The warband does not need to ask how.',
  einherjar:          '{name} is Einherjar. The warband has seen them fall and stand again.',
  saga_bound:         '{name} is Saga-Bound. The skald follows them. The warband understands why.',
  fate_touched:       '{name} is Fate-Touched. What should have killed them, did not.',
  world_tree_marked:  '{name} is World-Tree Marked. The warband has learned not to stand too close during storms.',
  odins_watch:        "{name} is under Odin's Watch. The warband is not sure how they feel about this.",
};

// Combat style sentence per class (uses {name} placeholder)
const CLASS_BIO_STYLE = {
  berserk:  '{name} fights with two hands and no caution. The warband gets out of the way.',
  valkyrie: '{name} fights in the shield wall, where the line is thinnest and the pressure hardest.',
  military: '{name} fights with discipline — each movement deliberate, each kill measured.',
  catapult: '{name} keeps to the high ground, lobbing ruin from beyond the reach of the melee.',
  drakship: '{name} directs fire from the water\'s edge, choosing the moment the enemy bunches.',
  piltorn:  '{name} is never hurried. They choose the moment, then act, and nothing remains after.',
  blondie:  '{name} moves through the line like smoke — never where expected, always where it hurts.',
  hydda:    '{name} speaks old words to the deep water, and something in the deep answers.',
  isjatten: '{name} stands a full head taller than most. The enemy learns what this means.',
};

// Short trait clause for battle reports (appended to MVP/last-stand sentences)
const TRAIT_REPORT_CLAUSE = {
  // positive
  steadfast:          ' They did not yield.',
  devout:             ' Their faith held with them.',
  serene:             ' They were untroubled.',
  methodical:         ' Every kill was deliberate.',
  fearless:           ' They did not step back from the gate.',
  builder:            ' They had planned for this.',
  guardian:           ' The hoard held. So did they.',
  lucky:              ' Fortune had not abandoned them.',
  tactician:          ' They had seen this coming.',
  warmhearted:        ' Their warmth steadied those around them.',
  inspiring:          ' Others fought harder watching them.',
  patient:            ' They had waited for this.',
  hardy:              ' They endured more than should be possible.',
  loyal:              ' They fought for those beside them.',
  swift:              ' They were too fast to stop.',
  merciful:           ' They did not pursue the broken.',
  eagle_eyed:         ' Nothing moved beyond their sight.',
  menders_touch:      ' They were already mending between volleys.',
  // negative
  reckless:           ' They did not hold back.',
  impulsive:          ' They struck before the order came.',
  brooding:           ' Something in them had sharpened.',
  vengeful:           ' They had not forgotten.',
  greedy:             ' They took what they were owed.',
  cowardly:           ' They held their ground — barely.',
  proud:              ' Their pride would not let them fall.',
  hotheaded:          ' They struck before thinking. It worked.',
  suspicious:         ' They trusted the outcome to no one.',
  wasteful:           ' They spent every edge they had.',
  bitter:             ' Old anger is still anger.',
  lone_wolf:          ' They needed no one. No one helped.',
  // rare
  rune_touched:       ' The runes in their skin answered.',
  veteran_trait:      ' They had been here before.',
  stubborn:           ' The warband thought them finished. They rose again.',
  iron_willed:        ' Their spirit did not bend.',
  wolf_friend:        ' Something in the dark answered their call.',
  giant_bane:         ' They knew where to strike.',
  draugr_hunter:      ' They knew this enemy.',
  frostborn:          ' Cold was their oldest companion.',
  star_seeker:        ' They were looking for this moment.',
  bond_forger:        ' Beside their shield-kin, they found another gear.',
  scar_bearer:        ' Each old wound had earned this.',
  quiet_leader:       ' No words. The warband understood.',
  gate_singer:        ' The gate held. They knew it would.',
  quartermasters_eye: ' Not a stroke wasted.',
  // legendary
  jarlslayer:         ' A Jarl-killer does not fall easily.',
  einherjar:          ' Odin sent them back for this.',
  saga_bound:         ' The skald will remember this.',
  fate_touched:       ' Something watched over them.',
  world_tree_marked:  ' Yggdrasil shelters its own.',
  odins_watch:        ' The Allfather did not look away.',
};

// ── Scar definitions ──────────────────────────────────────────────────────────
export const SCAR_DEFS = {
  lone_stand:     { id: 'lone_stand',     label: 'The Lone Stand',            desc: 'Held alone when others fell' },
  mark_last_hour: { id: 'mark_last_hour', label: 'Mark of the Last Hour',     desc: 'Present when one rampart remained' },
  rampart_wound:  { id: 'rampart_wound',  label: 'Rampart Wound',             desc: 'Deployed during 3+ fortress breaches' },
  draugen_scar:   { id: 'draugen_scar',   label: 'Scar of the Draugen-Jarl', desc: 'Survived three Draugen-Jarl assaults' },
  jotunn_scar:    { id: 'jotunn_scar',    label: 'Scar of the Jötun',         desc: 'Survived three Jötunhelm Walker assaults' },
  fenrir_brand:   { id: 'fenrir_brand',   label: "Fenrir's Brand",            desc: 'Survived a Fenrir wave' },
  surtr_brand:    { id: 'surtr_brand',    label: "Surtr's Brand",             desc: 'Survived the World Fire' },
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
  // Pre-count boss kills and max waves in a single pass
  let _draugenKills = 0, _jotunnKills = 0, _maxWaves = 0;
  for (const b of myBattles) {
    if ((b.wavesCleared ?? 0) > _maxWaves) _maxWaves = b.wavesCleared ?? 0;
    if (b.bossKills) {
      for (const bk of b.bossKills) {
        if (bk.boss === 'DRAUGEN-JARL')     _draugenKills++;
        if (bk.boss === 'JÖTUNHELM WALKER') _jotunnKills++;
      }
    }
  }
  if (!has('draugen_scar') && _draugenKills >= 3) earned.push('draugen_scar');
  if (!has('jotunn_scar')  && _jotunnKills  >= 3) earned.push('jotunn_scar');
  if (!has('fenrir_brand') && _maxWaves >= 75)     earned.push('fenrir_brand');
  if (!has('surtr_brand')  && _maxWaves >= 100)    earned.push('surtr_brand');

  return earned.slice(0, cap);
}

// ── Veteran ranks ─────────────────────────────────────────────────────────────
// Listed highest-first; getRank returns the first one the defender qualifies for.
export const VETERAN_RANKS = [
  { id: 'legend',    label: 'LEGEND',    color: '#ffe890', minLevel: 10, minBattles: 100, minKills: 0,   minTitles: 3 },
  { id: 'ironguard', label: 'IRONGUARD', color: '#c0a0ff', minLevel: 10, minBattles: 50,  minKills: 0,   minTitles: 1 },
  { id: 'champion',  label: 'CHAMPION',  color: '#c87820', minLevel: 8,  minBattles: 30,  minKills: 150, minTitles: 0 },
  { id: 'veteran',   label: 'VETERAN',   color: '#90c870', minLevel: 5,  minBattles: 15,  minKills: 50,  minTitles: 0 },
  { id: 'warrior',   label: 'WARRIOR',   color: '#8090c0', minLevel: 3,  minBattles: 5,   minKills: 0,   minTitles: 0 },
  { id: 'greenhorn', label: 'GREENHORN', color: '#9e8e7e', minLevel: 0,  minBattles: 0,   minKills: 0,   minTitles: 0 },
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
  const trait   = defender.trait;
  const scars   = defender.scars ?? [];
  const equip   = (defender.equipment ?? []).filter(Boolean);
  const prior   = chronicle?.battles ?? [];
  const lines   = [];

  // Line 1: Intro — varied by battle count
  if (battles === 0) {
    lines.push(`${n} is a ${cls} of the ${rank.label} rank, newly arrived at the Northern Shield.`);
  } else if (battles === 1) {
    lines.push(`${n} is a ${cls} of the ${rank.label} rank, who has fought one battle for the Northern Shield. The blood on their blade is recent.`);
  } else if (battles <= 3) {
    lines.push(`${n} is a ${cls} of the ${rank.label} rank, who has stood in the line ${battles} times for the Northern Shield. The warband has begun to know their face.`);
  } else if (battles <= 8) {
    lines.push(`${n} is a ${cls} of the ${rank.label} rank, who has fought through ${battles} battles for the Northern Shield. They are known to the warband now.`);
  } else {
    lines.push(`${n} is a ${cls} of the ${rank.label} rank, who has held the line through ${battles} battles for the Northern Shield. Few in the warband have seen as much.`);
  }

  if (lvl >= 1) {
    const _roman = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
    lines.push(`The Roman numeral ${_roman[lvl] ?? lvl} marks ${lvl} campaign${lvl > 1 ? 's' : ''} of service — each battle survived deepens their legend.`);
  }

  // Line 2: Class combat style (personality-specific fighting voice)
  const styleTemplate = CLASS_BIO_STYLE[defender.type];
  if (styleTemplate) lines.push(styleTemplate.replace('{name}', n));

  // Line 3: Most notable title and/or scar(s)
  const pt = getPrimaryTitle(defender);
  if (pt && scars.length > 0) {
    const scarLabel = scars.length > 1
      ? `${SCAR_DEFS[scars[0]]?.label ?? scars[0]} and ${SCAR_DEFS[scars[1]]?.label ?? scars[1]}`
      : (SCAR_DEFS[scars[0]]?.label ?? scars[0]);
    lines.push(`${n} carries the ${scarLabel}, and holds the title of ${pt.label}.`);
  } else if (pt) {
    lines.push(`${n} holds the title of ${pt.label}. ${TITLE_DEFS[pt.id]?.desc ?? ''}`);
  } else if (scars.length >= 2) {
    const s1 = SCAR_DEFS[scars[0]]?.label ?? scars[0];
    const s2 = SCAR_DEFS[scars[1]]?.label ?? scars[1];
    lines.push(`${n} carries two marks: the ${s1} and the ${s2}.`);
  } else if (scars.length === 1) {
    lines.push(`${n} carries the ${SCAR_DEFS[scars[0]]?.label ?? scars[0]}.`);
  } else if (lvl >= 5) {
    const _lvlRoman = ['I','II','III','IV','V','VI','VII','VIII','IX','X'][lvl - 1] ?? `${lvl}`;
    lines.push(`${n} carries rank ${_lvlRoman}, the mark of sustained service across many campaigns.`);
  }

  // Line 4: Notable deeds — scaled by magnitude
  const myBattles    = prior.filter(b => b.defenders?.some(d => d.defenderId === defender.defenderId));
  const mvpCount     = myBattles.filter(b => b.mvpId === defender.defenderId).length;
  const myBossKills  = myBattles.flatMap(b => b.bossKills ?? []).filter(bk => bk.killerId === defender.defenderId);
  const uniqueBosses = [...new Set(myBossKills.map(bk => bk.boss))];

  if (uniqueBosses.length > 0 && mvpCount > 0) {
    lines.push(`${n} has slain ${uniqueBosses.length === 1 ? `the ${uniqueBosses[0]}` : `${uniqueBosses.length} chieftains`} and been named defender of the battle ${mvpCount} time${mvpCount !== 1 ? 's' : ''}, felling ${kills} enemies across their career.`);
  } else if (uniqueBosses.length > 0) {
    lines.push(`${n} has struck the killing blow against ${uniqueBosses.length === 1 ? `the ${uniqueBosses[0]}` : `${uniqueBosses.length} different chieftains`}.`);
  } else if (mvpCount > 0) {
    lines.push(`${n} was named defender of the battle ${mvpCount} time${mvpCount !== 1 ? 's' : ''}, felling ${kills} enemies across their career.`);
  } else if (kills >= 100) {
    lines.push(`${n} has felled ${kills} enemies — a count the warband does not forget.`);
  } else if (kills > 0) {
    lines.push(`${n} has felled ${kills} enemies across their career.`);
  }

  // Line 4b: Legacy bonus — predecessor's gift to newly recruited defender
  if (defender.legacyBonus?.fromName && battles === 0) {
    const _legLabel = defender.legacyBonus.stat === 'dm' ? 'strikes harder' : defender.legacyBonus.stat === 'rm' ? 'reaches further' : 'acts faster';
    lines.push(`${n} carries the legacy of ${defender.legacyBonus.fromName} — a ${defender.legacyBonus.fromRank ?? 'veteran'} who came before. Their presence means ${n} ${_legLabel} in the line.`);
  }

  // Line 5: Equipment — brief note if well-outfitted
  if (equip.length >= 2) {
    lines.push(`${n} goes into battle well-equipped. The warband has seen to it.`);
  } else if (equip.length === 1) {
    lines.push(`${n} carries a piece of equipment earned in service.`);
  }

  // Line 6: Bond mention — richer if long-standing
  const bond = chronicle?._bonds?.find(b => b.defenderIds.includes(defender.defenderId));
  if (bond) {
    const together = myBattles.length;
    if (together > 5) {
      lines.push(`${n} has long fought beside a bonded shield-brother: "${bond.name}." The warband has learned not to separate them.`);
    } else {
      lines.push(`${n} fights beside a bonded shield-brother: "${bond.name}."`);
    }
  }

  // Line 7: Trait closing — unchanged
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
