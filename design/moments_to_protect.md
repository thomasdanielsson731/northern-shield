# Northern Shield — Moments to Protect

*Sacred beats · identity over convenience*

If implementation threatens a moment on this list, **redesign the feature** — do not ship the feature at the moment's expense. These are Northern Shield's identity, not nice-to-have polish.

Authority: [north_star.md](north_star.md) · [player_journey.md](player_journey.md)

---

## Tier 1 — Existential (game is wrong without these)

### 1. The First Night — one hero, one gate

**Threat:** Multi-hero deploy tutorial; grid placement; skirmish-first onboarding.  
**Protect:** Single assignment, total vulnerability, sparse audio.

### 2. Naming matters before stats matter

**Threat:** Auto-generated names only; class labels in UI; skip naming.  
**Protect:** Ceremony, player-chosen or confirmed name before second assault.

### 3. Preparation wins — battle does not shop

**Threat:** Build dock in campaign combat; mid-assault recruit; rune shop in wave.  
**Protect:** Locked plan at horn; verdict fantasy.

### 4. The fortress can be wounded

**Threat:** Walls reset every assault; breach = instant fail only.  
**Protect:** Persistent gate damage; visible scar; repair verb.

### 5. After Action is story, not spreadsheet

**Threat:** Stats-only debrief; skip button default; no MVP name.  
**Protect:** Prose first; who held, what broke; chronicle seed.

### 6. War Camp is people — no battlefield

**Threat:** Field grid in roster screen; deploy from War Camp.  
**Protect:** One screen, one question — who are we?

### 7. Heroes are not interchangeable tiles

**Threat:** Anonymous towers; no defenderId attachment; respawn without memory.  
**Protect:** Names in combat, debrief, chronicle; empty post grief.

---

## Tier 2 — Chapter pillars (Ages feel the same without these)

### 8. First victory relief

**Threat:** Victory fanfare before player reads outcome; instant next assault button.  
**Protect:** Breath; gold tally; skald line.

### 9. Settlement chapter — refugees / belonging

**Threat:** Skip straight to stone age; no emotional bridge from village.  
**Protect:** Event + visual hamlet growth.

### 10. Stone wall ceremony

**Threat:** Silent stat upgrade; same silhouette.  
**Protect:** Construction beat; four gates; map icon change.

### 11. Great Hall as heart

**Threat:** Hall as +cap only; invisible on field.  
**Protect:** Center structure; promotion ceremonies tied to Hall tier.

### 12. Captain title — place + person

**Threat:** Rank as number; no post binding.  
**Protect:** *"Captain of the West Gate"*; named gate in UI.

### 13. Boss as punctuation

**Threat:** Boss as reskin grunt; no intel; no phase read.  
**Protect:** Unique silhouette, telegraph, chronicle chapter.

### 14. First fall that hurts

**Threat:** Death is free; no epitaph; instant replace.  
**Protect:** Chronicle line; memorial hook; prep weight forever after.

### 15. Treasury as vault fantasy

**Threat:** Gold is infinite; reserve meaningless.  
**Protect:** Cap visible; plunder hurts; passive income celebration.

---

## Tier 3 — Long-term soul (100h game without these is hollow)

### 16. Visual tier per Age

**Threat:** UI skin only; same fortress art at hour 50.  
**Protect:** Panorama, command map, prep schematic all evolve.

### 17. Chronicle as memory hub

**Threat:** Battle log buried; no titles; no export.  
**Protect:** Hall of honored; MVP streak; saga book at end.

### 18. Fortress spell from the wall

**Threat:** Hero hotbar MMORPG; magic on individuals only.  
**Protect:** Prep loadout on **place**; wall glow; geas cost.

### 19. Dragon as myth — not pet grind

**Threat:** Dragon collector; gacha dragons.  
**Protect:** One bond; sky lane; roost on skyline; food upkeep.

### 20. Jarl as saga protagonist

**Threat:** Level 20 = spell; no ceremony.  
**Protect:** Great Hall oath; hero spell; chronicle chapter header.

### 21. Last assault gravity

**Threat:** Region 100 = stat check only.  
**Protect:** Citadel glow; coalition intel; memorial avenue; epilogue branch.

### 22. Unlock because fortress evolved

**Threat:** Player level 15 gates; generic XP wall.  
**Protect:** Building, boss, discovery language in UI — see [unlock_philosophy.md](unlock_philosophy.md).

---

## Tier 4 — WOW quotes (marketing is honest)

These sentences must remain **true in play**:

| Quote | Protected beat |
|-------|----------------|
| *"I only had one Berserker..."* | First night |
| *"The gate almost fell..."* | Breach tension |
| *"Gunnar became Captain."* | Promotion |
| *"The first stone wall was completed."* | Age III ceremony |
| *"The treasury finally became a vault."* | Economic pride |
| *"The first Dragonship arrived."* | Citadel myth |
| *"The fortress cast its first spell."* | Rune wall |
| *"The final Citadel glowed before the last battle."* | Endgame |

If a patch makes any quote a lie, revert or redesign.

---

## Feature threat checklist

Before shipping any feature, ask:

1. Does it add **battle UI** during campaign assault? → violates #3  
2. Does it skip **naming or prose**? → violates #2, #5  
3. Does it reset **fortress scars** silently? → violates #4  
4. Does it show **battlefield in War Camp**? → violates #6  
5. Does it unlock on **player level** only? → violates #22  
6. Does it add **complexity without ceremony**? → violates #10, #16  

Two or more yes → redesign.

---

## What we can sacrifice (explicitly not sacred)

- Skirmish maze complexity
- Leaderboard rank animation
- Maximum DPS build variety in hour 1
- Simultaneous all-resource tutorials
- Perfect balance on first boss attempt
- Every trait referenced in tutorial

Sacrificing these must **not** damage Tier 1–3.

---

## Minimum viable Northern Shield

If we stripped to moments only, the following **systems** remain necessary:

| System | Serves moment |
|--------|----------------|
| Command map + assault pick | Stakes, intel |
| Fortress Prep + one post → many | Preparation wins |
| Named roster (1→N) | Attachment |
| Battle execution (readable) | Verdict |
| After Action prose | Story |
| Gate HP + breach + repair | Fortress character |
| War Camp (people only) | Screen law |
| Visual fortress tier (≥3 beats) | Age feeling |
| Chronicle (minimal) | Memory |
| One boss punctuation | Chapter end |

Everything else — runes, dragon, research, market — **amplifies** but is not required for **first 10 hours** identity.

---

## Final question

> **If we removed every system except the ones necessary to create these moments… would Northern Shield still feel like Northern Shield?**

**Answer: Yes — for the first saga chapter.**

A player with one gate, three names, a scarred palisade, prose debriefs, and a stone wall ceremony would still say *"Northern Shield"* — not *"another TD."* They would miss the citadel, the dragon, the research — but they would **feel the genre**.

If we removed the **moments** and kept all systems, we would have mechanics without memory — a spreadsheet with Norse fonts.

**Therefore:**

- **Protect moments first.**  
- **Add systems only when they create or deepen a protected moment.**  
- **When scope fights identity, cut scope.**

Northern Shield is not remembered for how many towers it has. It is remembered for **the night Gunnar held the gate**, and for **the citadel that still bore the mark** when the last assault came.

---

## See also

- [player_journey.md](player_journey.md) — full chapter breakdown + 35 WOW beats
- [player_motivation.md](player_motivation.md) — retention by time horizon
- [north_star.md](north_star.md) — feature gate
