# Northern Shield

## Genre

**Fortress Defense RPG** — a Norse dark-fantasy strategy game focused on:

- Persistent defender roster management
- Fortress construction and expansion
- Long-term character progression across battles
- Tactical wave defense as the proving ground for your defenders

Draws from the strategic depth of classic maze TD games, the character attachment of RPGs, and the dark-fantasy aesthetic of Clash of Clans — all filtered through a Norse mythology lens.

---

## Core Fantasy

> "Lead a growing band of veteran defenders protecting and expanding their fortress over many battles."

The player commands a living warband. Defenders earn names, experience, and scars. The fortress grows battle by battle. A Berserker who survived wave 50 is not the same Berserker who faced wave 1 — and the player should feel that difference. Victory is not about optimal tower placement; it is about the bond between the player and the veterans who held the line.

---

## Primary Gameplay Elements (in order of importance)

1. **Defender Roster** — The warband is the player's core asset. Defenders are recruited, developed, equipped, and named. Player attachment to individual defenders is a primary design goal.
2. **Fortress Development** — Walls, buildings, and structures are strategic assets. The fortress expands between battles and reflects the player's choices.
3. **Wave Defense** — Enemies arrive in escalating waves. The player deploys defenders and manages the fortress to survive. This is where progression is tested.
4. **Economy** — Resources fund recruitment, equipment, construction, and defender advancement.

---

## Core Gameplay Loop

### Campaign (primary)

```
Select region (1–100 maps)
↓
Command map — four fronts (W/N/E/S), pick assault
↓
Assault (2–3 waves; waves 2+ auto-advance)
↓
Debrief → War Camp (recruit, upgrade, equip, XP)
↓
Next assault or return to command map
↓
Field persists (max 10 heroes + 10 structures; fallen heroes respawn next assault)
↓
Clear map → unlock next region
```

**Combat:** Pathless — warband places anywhere and **moves** (melee advance, ranged positioning); structures/walls only near fortress.

**Meta UI:** Procedural assault names (e.g. Draugr Incursion). Per-front unlock chains. Boss on south front.

**Implemented (2026-06-22):** Fortress roles MVP, warband composition meter, difficulty P1–P3, trait gameplay hooks — see `design/README.md`.

### Skirmish (optional — classic maze TD)

```
Deploy defenders
↓
Shape enemy path (walls + structures) — BFS-validated maze
↓
Survive up to 100 waves (+ endless)
↓
Earn resources → advance warband → next skirmish
```

---

## Persistent Progression (cross-battle)

Players develop a roster that carries forward:

- **Experience and leveling** — Defenders gain XP from kills and survive waves. Higher levels unlock stat improvements.
- **Talent trees** — Each defender class has branching talents that create build identity.
- **Equipment** — Weapons, armor, and relics drop from enemies and bosses. Equipped per defender.
- **Named survivors** — Defenders who survive difficult waves gain unique epithets that display on their portrait.
- **Fortress upgrades** — Buildings unlock new abilities, passive bonuses, and roster slots.

---

## Defender Classes

| Class | Role | Strength | Style |
|---|---|---|---|
| Berserker | Melee burst | Clustered enemies, kill-zones | High-risk frontline brawler |
| Valkyrie | Long-range sniper | High-HP single targets, bosses | Precision from safety |
| Archer | Fast-fire attrition | Swarms, fast enemies | Reliable sustained DPS |
| Catapult | Siege AoE | Clustered groups | Area denial, high setup cost |
| Blondie | Crowd control | Fast, priority targets | Enables other defenders |
| Warden | Balanced ranged | Mixed threats | Adaptable generalist |
| Healer | Support | Sustain in long engagements | Keeps defenders alive |
| Ice Giant | Nova AoE | Mass slow, zone control | Wave-shaping specialist |
| Dragonship | Heavy siege | Large splash, long range | High-cost elite damage |

No defender should be replaceable by another. Each has a role in the roster that cannot be fully covered by alternatives.

---

## Fortress and Walls

Walls and structures are **strategic assets**, not simple obstacles:

- **Shield Walls** — Block and redirect enemy paths; create kill-zones
- **Great Hall** — Fortress center; determines roster capacity
- **Barracks** — Unlocks new defender classes and recruitment
- **Watch Towers** — Passive vision and range bonuses for nearby defenders
- **Treasury** — Stores resources; higher tiers unlock equipment and talents
- **Rune Forge** — Crafts and upgrades equipment; applies runes to defenders

The fortress should feel like a home that grows — not a generic build grid.

---

## Enemy Types

| Enemy | Threat | Counter |
|---|---|---|
| Draugr | Swarms, numbers | AoE defenders, kill-zones |
| Myling | Flying, bypasses walls | Ranged defenders with high fire rate |
| Jötunn | Extreme HP, boss-tier | High single-target damage, slows |
| Mara | Disables defenders, EMP | Spread placement, Healer support |

---

## Bosses

Boss encounters are **events** that test the entire warband. Each boss:

- Has mechanics that require specific defender compositions
- Introduces a narrative beat (the warband faces a legendary threat)
- Rewards rare equipment and fortress upgrades on defeat
- Leaves a permanent mark on the fortress (environmental story)

---

## Long-Term Progression Design Goals

- A player 20 battles in should have a fundamentally different and more powerful warband than at battle 1
- Loss should be painful but never feel unfair — defender death is meaningful, not random
- Endgame players should be making **roster curation** decisions (which veterans to bring), not just gold-spending decisions
- The fortress at battle 50 should look visually distinct from battle 1

---

## What This Game Is NOT

- **Not roguelite** — Progression is persistent. Restarting does not wipe the warband.
- **Not a reaction game** — Speed is not rewarded. Strategic deployment and long-term roster decisions are the skill expression.
- **Not tower-placement-centric** — Where you place a wall matters. Which defender stands there matters more.

---

## Identified Pre-Transition Inconsistencies (to resolve in implementation)

The following assumptions from the original Tower Defense design no longer apply:

1. **"Maze-building is the primary mechanic"** — maze building is a supporting mechanic; roster management is primary.
2. **"No single tower clears waves solo"** — becomes "no single defender class covers all threats"; the constraint is the same but the framing is about roles, not tower types.
3. **"Stars reset each run"** — stars should persist or convert to a cross-battle currency that funds defender progression.
4. **"Sell tower for 50%"** — defenders should not be "sold"; they retire, are injured, or are lost. The sell mechanic applies only to buildings and equipment.
5. **"100 waves, then endless"** — the battle structure needs to define what a "battle" is versus a "campaign", and how the roster carries between them.
6. **Tower upgrade per level 1-10** — tower upgrades are replaced by defender leveling with talent trees. The upgrade system needs a full redesign pass.

---

## Technical Vision

- Vanilla JS + HTML5 Canvas, ES Modules via Vite — fast iteration, no engine overhead
- `src/core/game.js` — intentionally monolithic; expand with defender persistence model
- Target 60fps rendering; 30 tick/sec game logic
- Persistent data via `localStorage` (defender roster, fortress state, equipment)

---

## Visual Style

Dark Norse fantasy. Clash of Clans readability. Character-forward design:

- Defenders should be visually distinct and recognizable at small sizes (silhouette test)
- The fortress should feel like a living settlement, not a build grid
- Each defender class has a signature **glow color** that appears on both the defender on the battlefield and their card in the roster UI — visual identity is consistent
- Boss encounters should feel cinematic within the canvas constraints

See [ART_DIRECTION.md](ART_DIRECTION.md) for full sprite rules and palette.
