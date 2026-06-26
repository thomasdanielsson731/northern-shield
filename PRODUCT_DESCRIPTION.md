# Northern Shield

## Genre

**Fortress Commander RPG** — a Norse dark-fantasy strategy game focused on:

- Persistent defender roster management
- **Fortress preparation** — assign veterans to gates, walls, and siege posts
- Long-term character progression across battles
- Tactical wave defense as the proving ground for your plan

Draws from character attachment of RPGs, strategic preparation of squad tactics games, and Norse dark-fantasy tone — evolved from classic maze TD roots (skirmish mode retains TD).

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

### Campaign (primary — Fortress Commander)

```
Command map — pick assault (intel only)
↓
War Camp (optional) — roster, recruit, equip, meta fortress
↓
Fortress Preparation — assign heroes to defensive posts, repairs, siege
↓
Battle — execution only (no build docks in campaign)
↓
After Action — prose-first consequences
↓
War Camp or next assault
```

Field persists between assaults on a region. **Preparation** (who holds which gate) is the primary skill expression; grid coordinates are simulation detail.
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

| Class | Code ID | Role | Strength | Style |
|---|---|---|---|---|
| Berserker | `berserk` | Melee burst | Clustered enemies, kill-zones | High-risk frontline brawler |
| Valkyrie | `valkyrie` | Long-range sniper | High-HP single targets, bosses | Precision from safety |
| Archer | `military` | Fast-fire attrition | Swarms, fast enemies | Reliable sustained DPS |
| Blondie | `blondie` | Crowd control | Fast, priority targets | Enables other defenders |
| Healer | `hydda` | Support | Sustain in long engagements | Keeps defenders alive |
| Ice Giant | `isjatten` | Nova AoE | Mass slow, zone control | Wave-shaping specialist |

No defender should be replaceable by another. Each has a role in the roster that cannot be fully covered by alternatives.

> **Catapult, Ballista, Dragonship, and Piltorn are siege structures** — they are built in the fortress zone but are not warband members and do not earn XP or equipment.

---

## Fortress and Walls

Walls and structures are **strategic assets**, not simple obstacles. The fortress should feel like a home that grows — not a generic build grid.

### Implemented structures (fortress zone, placeable on field)

| Structure | Purpose |
|---|---|
| **Fortress Gate** | Reinforced gate in the fortress ring wall — top enemy priority until breached |
| **Watch Tower** | Passive range/vision bonuses for nearby defenders |
| **Ballista** | Long-range siege bolt, single target |
| **Catapult** | AoE splash, anti-cluster |
| **Mine** | Area-denial trap |
| **Barracks** | Passive combat bonus for warband in range |
| **Rune Shrine** | Earns stars per wave — fuels the rune system |
| **Piltorn** | Fast-fire arrow tower |
| **Dragonship** | Heavy splash, long range, high cost |

### Planned fortress expansions

| Structure | Purpose |
|---|---|
| **Great Hall** *(planned)* | The mead hall at the fortress heart — determines warband capacity and unlock gates for advanced roles |
| **Treasury** *(planned)* | Visible gold vault on the field — raises the gold reserve cap; higher tiers generate passive income from plundered gold |
| **Rune Forge** *(planned)* | Upgrades the Rune Shrine's output — unlocks more powerful rune types and reduces their star cost |

### Fortress upgrade nodes (War Camp, purchased with gold reserve)

| Node | Max Bonus |
|---|---|
| **Barracks** | Recruit cost −15g / +60g starting gold |
| **Armory** | Equipment damage ×1.20 |
| **Watch Tower** | Wave event preview +3 waves ahead |
| **Wallworks** | Wall cost −3g, adjacent slow +10% |

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
