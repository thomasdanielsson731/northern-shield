# Northern Shield — Unlock Philosophy

*The fortress evolved — therefore you may*

---

## The one rule

> **Nothing unlocks because the player reached Level X.**

Unlocks happen because the **fortress changed**, the **story advanced**, or the **jarl proved something**. Numbers may track progress internally, but the **player-facing reason** is always world fiction.

Bad: *"Reach player level 15 to unlock Mage Tower."*  
Good: *"Raise the Rune Hall after the Ash King falls — the walls are ready to learn."*

---

## Unlock channels (exhaustive)

| Channel | What it gates | Example |
|---------|---------------|---------|
| **Fortress Age / tier** | Building types, post count, visual tier | Stone Curtain → four gates |
| **Building dependencies** | Systems, crafting, research | Scriptorium requires Great Hall II |
| **Research** | Rule extensions, spell schools | Knowledge → fortress frost ward |
| **Hero promotions** | Abilities, spells, titles | Captain → post aura |
| **Story / campaign** | Regions, fronts, assault types | Region 26 → iron bundles |
| **Boss victories** | Myth systems, star hauls, relics | South boss → Isjätten offer |
| **Rare discoveries** | One-offs, relics, omen events | Buried rune in Region 44 |
| **Reputation thresholds** | Diplomacy, market, dragon | Ally caravan at Rep 3 |
| **Chronicle milestones** | Glory, memorial, legacy | Fallen Jarl → succession |

**Explicitly deprecated:** arbitrary account level, total playtime, pay-to-skip tier.

---

## Fortress tier as master gate

Ages I–VI ([progression_tree.md](progression_tree.md)) set **ceilings**:

| Age | Hard ceiling (design) |
|-----|------------------------|
| I | 1 gate, 3 heroes, gold only |
| II | 2 active fronts, wood/food, 6 heroes |
| III | 4 gates, stone/iron, runes |
| IV | Research, crafting, reputation |
| V | Spells, dragon, glory |
| VI | Payoff only — no new ceilings |

**Soft gates** within an age use buildings and bosses, not XP bars.

---

## Building dependencies

Primary unlock grammar — see [building_dependency_tree.md](building_dependency_tree.md).

Rules:

1. Every system has a **building face** (even passive: Scriptorium = research)
2. Tier II of a building **refines**, rarely invents, a system
3. Fork choices (walls vs hall) are **optional drama**, not hard softlocks

Player message on locked blueprint:

> *"Requires: Quarry running, Great Hall II, defeat of the Iron March boss."*

Never:

> *"Requires: Level 12."*

---

## Research

- Unlocks **rules**, not +5% stat dumps
- Nodes cost **Ancient Knowledge** — boss and discovery sourced
- Research **reveals** building blueprints already logically built (Forge II runes)
- Max **one active research** early; queue later at Scriptorium III

---

## Hero promotions

- **Veteran** — survival + XP milestone **and** Great Hall I
- **Captain** — hold post across full assault chain **and** Hall II
- **Jarl** — boss kill participation + chronicle entry
- **High King** — Age VI capstone choice — **one** per campaign

Promotion blocked message:

> *"The Hall is not great enough to swear a Jarl's oath."*

Not:

> *"Hero level too low."*

---

## Story progression

- **Region bands** suggest enemy tone, not hard gear checks
- **Front unlock** — narrative: *"Scouts report north road active"*
- **Assault tier** (Raid / Siege / Boss) — telegraphed on command map
- **Events** — choice gates reputation and food

---

## Boss victories

Bosses are **punctuation marks**:

| Boss role | Typical unlock |
|-----------|----------------|
| Age boundary boss | Next age material (stone, iron) |
| South-front boss | Star haul, myth unit, roster offer |
| Region finale | Knowledge spike, relic roll |
| Last boss | Epilogue branch |

Retry is allowed; **unlock is permanent on first kill** to respect time.

---

## Rare discoveries

- Hidden nodes on command map (scouted after Watch Tower III)
- Post-assault chronicle **"strange find"** roll
- One-per-campaign relics

Discoveries **skip grind** but never **skip age** — Age V magic won't drop in Age II.

---

## What about career level / XP?

**Internal** progression tracks power for combat sim. **External** presentation ties unlocks to:

- Hall upgrade → *"Veteran oaths available"*
- Boss → *"Talent choice on next rest"*

Career level 7 with Campfire Hall still capped at Veteran narrative until Hall built.

---

## UI principles

- Locked items show **requirement chain**, not hidden level
- Advisor skald explains **why** in one sentence
- "Almost there" — one missing link highlighted (Quarry not built)

---

## Anti-patterns

| Pattern | Why reject |
|---------|------------|
| Player level 1–100 | MMO noise |
| Pay gold to skip age | Breaks fortress fantasy |
| Unlock all on day 1 via grind | No chapters |
| Same requirement on everything | No dependency web |

---

## Checklist before shipping any unlock

1. Can I name the **fortress change** that caused this?
2. Is there a **building or boss** the player can point at?
3. Does it respect **Age ceiling**?
4. Does chronicle record it?

Four yes → ship. Any no → redesign.

---

## See also

- [progression_tree.md](progression_tree.md)
- [system_dependency_map.md](system_dependency_map.md)
- [north_star.md](north_star.md) — principle 5: buildings unlock systems
