# Trait System

> **Status:** 13 traits + `traitGameplay.js` hooks (2026-06-22). Target: 50 traits (v2).

**One mechanical hook + one narrative voice per hero.** Today: traits in `chronicle.js` + combat modifiers in `traitGameplay.js`.

## Slots

| Phase | Slots |
|-------|-------|
| MVP | 1 personality (recruit) |
| v2 | +1 flaw/virtue (event/scar) |
| Long-term | +1 legendary mark (boss/legacy) |

## Rarity pools

| Tier | Count | Acquisition |
|------|-------|-------------|
| Positive | 18 | ~55% recruit |
| Negative | 12 | ~30% recruit |
| Rare | 14 | ~12% recruit, events |
| Legendary | 6 | boss feats, map 80+, legacy |

**Caps:** ±5–15% combat; legendary up to +25% in narrow conditions. Stack under talents/equipment.

## Existing eight (keep)

`steadfast`, `devout`, `serene`, `methodical`, `reckless`, `impulsive`, `brooding`, `vengeful`

## Full 50 — summary

### Positive (18)
Steadfast, Devout, Serene, Methodical, Fearless, Builder, Guardian, Lucky, Tactician, Warmhearted, Inspiring, Patient, Hardy, Loyal, Swift, Merciful, Eagle-Eyed, Mender's Touch

### Negative (12)
Reckless, Impulsive, Brooding, Vengeful, Greedy, Cowardly, Proud, Hotheaded, Suspicious, Wasteful, Bitter, Lone Wolf

### Rare (14)
Rune Touched, Veteran, Stubborn, Iron-Willed, Wolf-Friend, Giant-Bane, Draugr-Hunter, Frostborn, Star-Seeker, Bond-Forger, Scar-Bearer, Quiet Leader, Gate-Singer, Quartermaster's Eye

### Legendary (6)
Jarlslayer, Einherjar, Saga-Bound, Fate-Touched, World-Tree Marked, Odin's Watch

Each trait needs: `label`, `desc`, `reportClause`, optional `gameplay` hook in `TRAIT_DEFS`. Chronicle appends trait clause on MVP/last-stand lines.

**Example — Fearless:** +10% gate dmg, Mara fear immune. *"They did not step back from the gate."*

**Example — Stubborn:** once/map survive fatal hit at 1 HP. *"The warband thought them finished. They rose again."*

**Example — Jarlslayer (legendary):** +25% boss dmg, unique title on kill. Saga chapter headings use hero name.
