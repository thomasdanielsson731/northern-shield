// Named campaign events — trade-off story moments shown between battles.
// Definitions only; effects are applied in game.js (needs roster/gold/star access).

export const EVENT_DEFS = [
  // ── 1. THE TRADER ──────────────────────────────────────────────────────────
  {
    id:       'handelsman',
    title:    'THE TRADER',
    subtitle: 'Handelsman frå söder',
    icon:     '⚖',
    flavor:   'A merchant caravan arrives at the fortress gates, laden with arms and provisions from the southern holds. Their stock will not wait long.',
    choiceA: { label: 'Purchase arms',  costText: '60g', desc: 'Gain a random piece of equipment from their stock.' },
    choiceB: { label: 'Send them on',   costText: '—',   desc: 'The caravan moves on without trading.' },
    trigger:     (cs) => cs.battlesCompleted >= 2,
    canAffordA:  (cs) => (cs.goldReserve ?? 0) >= 60,
    canAffordB:  ()   => true,
  },

  // ── 2. THE SEERESS ─────────────────────────────────────────────────────────
  {
    id:       'volva',
    title:    'THE SEERESS',
    subtitle: 'Völvan',
    icon:     '◈',
    flavor:   'A völva has traveled far to read the fate-threads of your warband. She sees something hidden in one of your defenders — a nature not yet named.',
    choiceA: { label: 'Consult her',        costText: '2 ✦', desc: 'She names the hidden nature of a defender — granting them a trait.' },
    choiceB: { label: 'Offer hospitality',  costText: '8g',  desc: 'She rests at the fortress but shares no visions.' },
    trigger:     (cs) => cs.battlesCompleted >= 3 && (cs.stars ?? 0) >= 2,
    canAffordA:  (cs) => (cs.stars ?? 0) >= 2,
    canAffordB:  (cs) => (cs.goldReserve ?? 0) >= 8,
  },

  // ── 3. THE ARMORER ─────────────────────────────────────────────────────────
  {
    id:       'smeden',
    title:    'THE ARMORER',
    subtitle: 'Smeden',
    icon:     '⚙',
    flavor:   'A wandering smith sets up a forge at the gatehouse. Three days of work, they say, and your defenders will fight sharper than they ever have.',
    choiceA: { label: 'Full commission',  costText: '35g', desc: 'Your three most veteran defenders each gain 20 XP from improved kit.' },
    choiceB: { label: 'Quick sharpening', costText: '12g', desc: 'Your newest recruit gains 15 XP — a focused session with the smith.' },
    trigger:     (cs) => cs.battlesCompleted >= 2,
    canAffordA:  (cs) => (cs.goldReserve ?? 0) >= 35,
    canAffordB:  (cs) => (cs.goldReserve ?? 0) >= 12,
  },

  // ── 4. THE POET ────────────────────────────────────────────────────────────
  {
    id:       'skalden',
    title:    'THE POET',
    subtitle: 'Skálden',
    icon:     '✦',
    flavor:   "A wandering skáld has witnessed your warband's deeds and offers to compose a verse for your greatest warrior. Stories last longer than iron.",
    choiceA: { label: 'Commission the verse', costText: '25g', desc: 'The honored defender gains 60 XP — their deeds recorded for all time.' },
    choiceB: { label: 'Let them observe',     costText: '—',   desc: 'They will write of what they saw. No gold changes hands.' },
    trigger:     (cs) => cs.battlesCompleted >= 4 && (cs.defenders ?? []).some(d => (d.careerKills ?? 0) >= 15),
    canAffordA:  (cs) => (cs.goldReserve ?? 0) >= 25,
    canAffordB:  ()   => true,
  },

  // ── 5. THE SURVIVOR ────────────────────────────────────────────────────────
  {
    id:       'leidangr',
    title:    'THE SURVIVOR',
    subtitle: 'Leiðangr-maðr',
    icon:     '⚑',
    flavor:   'A lone warrior stumbles from the eastern forest, battle-worn but alive. Their settlement is gone. They seek a place among your warband.',
    choiceA: { label: 'Take them in',    costText: '20g', desc: 'The survivor joins your warband. A new defender, ready for their first battle.' },
    choiceB: { label: 'Give provisions', costText: '8g',  desc: 'You offer food and safe passage. They leave a token of gratitude.' },
    trigger:     (cs) => cs.battlesCompleted >= 3 && (cs.defenders ?? []).length < 8,
    canAffordA:  (cs) => (cs.goldReserve ?? 0) >= 20,
    canAffordB:  (cs) => (cs.goldReserve ?? 0) >= 8,
  },

  // ── 6. THE FEAST ───────────────────────────────────────────────────────────
  {
    id:       'blotet',
    title:    'THE FEAST',
    subtitle: 'Blótet',
    icon:     '◆',
    flavor:   'The warband calls for a blót — a ritual feast to honor the gods and renew bonds before the battles ahead. Fire, mead, and old songs.',
    choiceA: { label: 'Grand feast',   costText: '50g', desc: 'All defenders share in the blót. Each gains 25 XP from ceremony and brotherhood.' },
    choiceB: { label: 'Modest feast',  costText: '20g', desc: 'A quieter gathering. Your highest-ranked defender gains 20 XP.' },
    trigger:     (cs) => cs.battlesCompleted >= 6,
    canAffordA:  (cs) => (cs.goldReserve ?? 0) >= 50,
    canAffordB:  (cs) => (cs.goldReserve ?? 0) >= 20,
  },

  // ── 7. THE EXILE ───────────────────────────────────────────────────────────
  {
    id:       'utilegumadr',
    title:    'THE EXILE',
    subtitle: 'Útilegumaðr',
    icon:     '⚔',
    flavor:   'A notorious exile from the northern holds arrives at the gate. They carry the marks of many battles — and many defeats. Dangerous, but experienced.',
    choiceA: { label: 'Hire them',    costText: '35g + 1 ✦', desc: 'A scarred veteran joins at career level I — already marked by battle.' },
    choiceB: { label: 'Turn them away', costText: '—',       desc: 'Some paths are better left untaken.' },
    trigger:     (cs) => cs.battlesCompleted >= 7 && (cs.stars ?? 0) >= 1 && (cs.defenders ?? []).length < 8,
    canAffordA:  (cs) => (cs.goldReserve ?? 0) >= 35 && (cs.stars ?? 0) >= 1,
    canAffordB:  ()   => true,
  },

  // ── 8. THE RUNE STONE ──────────────────────────────────────────────────────
  {
    id:       'runstenen',
    title:    'THE RUNE STONE',
    subtitle: 'Runstenen',
    icon:     '᚛',
    flavor:   'Your scouts found an ancient carved runestone on the north road. Its power hums in the cold air — it can be drawn into a defender, or left to accumulate.',
    choiceA: { label: 'Draw the rune',        costText: '3 ✦', desc: "Channel the stone's power — your strongest defender unlocks their next talent early." },
    choiceB: { label: 'Leave undisturbed',    costText: '—',   desc: 'The ley power flows back through the land — and to you. Gain 1 star.' },
    trigger:     (cs) => cs.battlesCompleted >= 4 && (cs.stars ?? 0) >= 3,
    canAffordA:  (cs) => (cs.stars ?? 0) >= 3,
    canAffordB:  ()   => true,
  },
];

// Returns one random eligible event not yet seen this campaign, or null.
export function getAvailableEvent(cs) {
  if (!cs) return null;
  const seen     = cs.seenEventIds ?? [];
  const eligible = EVENT_DEFS.filter(e => !seen.includes(e.id) && e.trigger(cs));
  if (eligible.length === 0) return null;
  return eligible[Math.floor(Math.random() * eligible.length)];
}
