# Northern Shield — Architecture Review

*Last updated: 2026-06-21. Written against the Fortress Defense RPG vision in PRODUCT_DESCRIPTION.md.*

---

## 1. Current State

### Source map

```
src/
  main.js           entry point — imports assets then game
  assets.js         sprite manifest (SPRITES shared object)
  config.js         runtime sprite scale helpers
  core/
    renderer.js     canvas + ctx (DPR scaling)
    game.js         ≈6 000 lines — all state, all subsystems (intentionally monolithic)
    sounds.js       Web Audio API procedural SFX
  entities/
    tower.js        Tower class + TOWER_DEFS + TOWER_TYPES
    enemy.js        Enemy class + ENEMY_DEFS + ENEMY_TYPES
    bullet.js       Bullet class (homing projectiles)
  grid/
    grid.js         Grid class, CELL enum, BFS pathfinding
```

### Current persistence

| localStorage key | Content | Persists |
|---|---|---|
| `northern-shield-hs` | 8-entry leaderboard `{waves, slain, gold, name}` | Cross-session |
| `northern-shield-ach` | Array of earned achievement IDs | Cross-session |
| `northern-shield-map-best` | Per-map `{waves, slain}` records | Cross-session |

No mid-battle save. No campaign state. No defender state. Everything not in those three keys is lost on refresh.

### Current domain model

```
TOWER_DEFS          — static class templates (one per tower type)
Tower (instance)    — placed unit; copies stats from TOWER_DEFS in constructor
  ├── col, row      — grid position
  ├── type          — class key ('berserk', 'valkyrie', …)
  ├── level 1–10    — deployment upgrade level (resets on sell/restart)
  ├── rune          — one equipped rune (from per-run runeInventory)
  ├── damageDealt   — kills, damage tracked per placement
  ├── killCount
  └── goldGenerated
```

There is no persistent Defender entity. When a tower is sold or the game resets, all individual data is discarded. A "Berserker" at wave 50 has no identity that carries to wave 51 or to the next battle.

---

## 2. Domain Concepts That Are Tower-Centric

The following concepts were designed for the original tower defense model. They each require rethinking or renaming under the Fortress Defense RPG direction.

### 2.1 Naming

| Current name | Tower-defense assumption | RPG equivalent |
|---|---|---|
| `TOWER_TYPES` / `TOWER_DEFS` | Towers are build options | Defender classes (archetypes) |
| `towers []` (in game.js) | Placed units are towers | Active warband (deployed defenders) |
| `selectedTowerType` | Select a tower to place | Select a defender class to deploy |
| `BUILD_ITEMS` | Items you build | Defenders you field (and walls) |
| `TOWER_STAR_GATES` | Stars unlock tower types per-run | Stars unlock class access (should persist) |
| `tower.level 1–10` | Tower upgrade level | Deployment enhancement; ≠ character level |

### 2.2 Lifecycle mismatch

The `Tower` class conflates two distinct roles:

- **Blueprint / class template** — what a Berserker *is* (stats, abilities, visuals)  
- **Placed combat instance** — a specific deployed fighter at (col, row)

In a Tower Defense, these are the same thing. In a Fortress Defense RPG, they are not. A specific Berserker *named Ulfr* has a career that outlives any individual battle or placement.

### 2.3 No identity layer

```js
// What a Tower knows about itself today:
this.type = 'berserk';       // which class
this.level = 3;              // current upgrade level (in battle only)
this.damageDealt = 1240;     // this deployment
this.killCount = 17;         // this deployment
// No name. No career history. No talent flags. No unique ID.
// Sell it → all of this is gone.
```

### 2.4 Rune system is placement-scoped

`runeInventory` is per-run and equipping a rune binds it to a `Tower` instance. If the tower is sold, the rune returns to inventory but carries no memory of what it was equipped on. Under the RPG model, runes/equipment should be associated with the Defender character, not the placement slot.

### 2.5 Stars reset per-run

`stars` is a module-level variable reset by `initGame()`. The Rune Forge (the only progression system) resets every battle. This is the single largest inconsistency with the RPG vision. Progress earned by surviving 80 waves disappears at restart.

### 2.6 Sell mechanic

50% sell at any time treats defenders as infrastructure. This is correct for a maze game; it is destructive to character attachment in an RPG. Selling a named veteran to recover gold is a design contradiction.

### 2.7 Synergy system

Synergies are adjacency-based (`military + valkyrie` adjacent = `eagleEye`). This is a tactical placement reward, which is correct. However, synergies as *relationship bonds* between specific named defenders who have fought together would serve the RPG direction much better.

---

## 3. Target Architecture

### 3.1 Defender as first-class entity

```
Defender {
  id:              string     // uuid, generated at recruit time
  class:           string     // maps to TOWER_DEFS key (e.g. 'berserk')
  name:            string     // procedural Viking name, player-renameable
  portraitSeed:    number     // deterministic procedural portrait variation

  // Career progression (cross-battle)
  careerLevel:     number     // 1–20+
  xp:              number
  xpToNext:        number     // function of careerLevel
  talentFlags:     string[]   // unlocked talent IDs
  equipment:       string[]   // equipped item IDs (max 2–3 slots)

  // Career statistics
  careerBattles:   number
  careerKills:     number
  careerDamage:    number
  careerSurvived:  number     // battles survived (not killed)

  // Current battle state (reset each battle)
  deployed:        boolean
  col:             number | null
  row:             number | null
  battleKills:     number
  battleDamage:    number
  rune:            string | null  // equipped rune for this battle
}
```

The `Tower` class becomes a **combat instance** that holds a reference to a `Defender` and applies its stats:

```
TowerInstance (placed in combat)
  defenderId:    string    // → Defender in Roster
  col, row:      number
  // real-time state only:
  fireCooldown, aimAngle, fireFlash, synergy, disabledTimer …
  // NO level, NO career stats — those live on Defender
```

### 3.2 Four-layer model

```
┌─────────────────────────────────────────────────────────┐
│  META PROGRESSION LAYER                                 │
│  Campaign state, save/load, battle history              │
│  src/campaign/  (new)                                   │
├─────────────────────────────────────────────────────────┤
│  ROSTER LAYER                                           │
│  Defender identities, XP, talents, equipment            │
│  src/roster/  (new)                                     │
├─────────────────────────────────────────────────────────┤
│  FORTRESS LAYER                                         │
│  Wall configs, fortress upgrades, structures            │
│  src/fortress/  (new)                                   │
├─────────────────────────────────────────────────────────┤
│  COMBAT LAYER                                           │
│  Active battle: enemies, placed defenders,              │
│  bullets, grid, pathfinding, wave logic                 │
│  src/core/game.js, entities/, grid/  (existing)         │
└─────────────────────────────────────────────────────────┘
```

**Data flows:**

```
Campaign Layer
  → loads Roster, Fortress state before battle starts
  → saves Roster, Fortress state after battle ends

Roster Layer
  → provides available defenders for Combat Layer's deployment
  → receives XP grants and stat updates from Combat Layer

Fortress Layer
  → provides wall costs, bonus modifiers, available structures for Combat Layer
  → persists upgrade purchases

Combat Layer
  → reads from Roster (which defenders are available)
  → reads from Fortress (what bonuses apply)
  → writes XP earned, kills, damage back to Roster after battle end
  → reads/writes Gold (partially from Meta: between-battle treasury)
```

**Layer responsibilities:**

| Layer | Owns | Does NOT own |
|---|---|---|
| Combat | Enemies, bullets, grid, active wave, placement grid | Defender XP, equipment logic, fortress upgrades |
| Roster | Defender identities, XP, talents, equipment slots | Combat positions, bullet trajectories |
| Fortress | Upgrade nodes, structure configs, wall bonuses | Which enemies spawn, which defenders exist |
| Meta/Campaign | Save/load, battle history, campaign arc, gold treasury | Any real-time simulation |

### 3.3 Target save schema

```js
// Key: 'ns-campaign-v2'
{
  version:           2,
  campaignId:        string,       // uuid, stable across saves
  battlesCompleted:  number,
  goldReserve:       number,       // between-battle treasury (new concept)

  defenders: Defender[],           // full roster; see §3.1

  fortressUpgrades: {
    barracks:   number,            // upgrade level
    armory:     number,
    watchtower: number,
    wallworks:  number,
  },

  equipmentInventory: {
    id:       string,              // item definition key
    quantity: number,
  }[],

  achievements: string[],          // IDs of earned achievements

  battleHistory: {
    battleNumber: number,
    mapName:      string,
    wavesCleared: number,
    enemiesSlain: number,
    goldEarned:   number,
    bossesKilled: string[],        // boss IDs
    mvpDefenderId: string,
    timestamp:    number,
  }[],
}

// Key: 'ns-settings' (split from campaign)
{
  muted:       boolean,
  spriteScale: number,
}

// Legacy keys still supported (read on first load, migrated to v2, then deleted)
// 'northern-shield-hs'       → migrated into battleHistory
// 'northern-shield-ach'      → migrated into achievements
// 'northern-shield-map-best' → migrated into battleHistory
```

---

## 4. Scalability Risks

### 4.1 Monolithic game.js will resist new systems

`game.js` is intentionally monolithic at ~6 000 lines. Adding a Roster Layer, Fortress Layer, and Meta Progression Layer as module-level variables inside game.js will push it toward 12 000+ lines, making:
- Feature branches increasingly conflict-prone
- Debugging require reading thousands of lines of context
- Testing nearly impossible (all state is module-global, not injectable)

**Mitigation:** The four-layer model requires extracting state into separate modules. This is the right time to begin separating concerns — not by splitting game.js arbitrarily, but by extracting each new system into its own module from the start.

### 4.2 Tower class conflates template and instance

`Tower` copies all definition fields from `TOWER_DEFS` into `this`. When you add Defender-level properties (career XP, name, talents), these will be awkwardly split between the `TOWER_DEFS` template and the instance — or duplicated. The Tower/DefenderTemplate/TowerInstance split (§3.1) should be introduced before the Defender model grows further.

### 4.3 No save versioning

The three existing localStorage keys have no `version` field. When the schema changes, old saves will silently parse with missing fields and default to zero. A v2 schema should include a `version` field and a migration function from v1 that runs once on first load.

### 4.4 Stars and gold are in-battle only

`stars` and `gold` reset via `initGame()`. As soon as any cross-battle system tries to read them (e.g., "spend 5 stars to unlock a talent between battles"), there is no stable home for that state. The between-battle treasury (`goldReserve` in §3.3) and persistent stars must be introduced before the cross-battle spend systems are built.

### 4.5 Sell mechanic conflicts with defender attachment

The current sell (50% at any time) is incompatible with named defenders who are meant to be irreplaceable. If left unchanged, players will sell veterans when short on gold, which breaks the attachment model. The sell mechanic needs redesign before defenders get names — either remove it, restrict it to "dismiss from roster" with no gold return, or replace it with a "loan to allied fortress" model.

### 4.6 Synergy system is positionally fragile

Synergies recalculate each tick based on current adjacency. As the roster grows, players will want synergies based on defender *relationships* (Ulfr and Bjørn have fought together 10 battles → bond bonus) rather than *grid position*. The current system cannot express this. It works for now but will need rethinking in Phase 4.

### 4.7 `initGame()` is the only reset path

All state is initialized by `initGame()`. There is no concept of "end battle" (keep roster, reset combat) vs "new campaign" (reset everything). Adding this distinction is prerequisite to any cross-battle system.

---

## 5. Migration Roadmap

Ordered by: **value delivered** first, then **risk to existing play** (low to high), then effort.

### Phase 1 — Defender Identity (low risk, medium effort)

*Goal: make each placed defender feel like a character, with no changes to save schema or gameplay.*

- [ ] Add `name` property to `Tower` constructor (procedural Viking name from a table)
- [ ] Display defender name in the tower detail panel (above type label)
- [ ] Track `battleKills` and `battleDamage` separately from future `careerKills` / `careerDamage`
- [ ] Add defender name to the MVP display in the right panel DEFENDERS section
- [ ] Add `defenderId` (uuid) to each Tower instance (no persistence yet; groundwork for Phase 2)
- [ ] Internal rename: `selectedTowerType` → `selectedDefenderClass`, `towers[]` → `warband[]` in comments and new code (keep the variable names stable to avoid touching hundreds of lines; update JSDoc/comments only)

*Deliverable: defenders have names; the MVP berserker is "Ulfr the Fierce", not "Berserker".*

### Phase 2 — Between-Battle Boundary (medium risk, high effort)

*Goal: establish the campaign/battle distinction and a persistent save.*

- [ ] Write `src/campaign/save.js` — functions: `saveCampaign()`, `loadCampaign()`, `migrateLegacySaves()`
- [ ] Introduce `ns-campaign-v2` localStorage key with versioned schema (§3.3)
- [ ] Migrate v1 keys (high scores, achievements, map bests) on first load
- [ ] Split `initGame()` into `initCampaign()` (run once per new game) and `initBattle(map)` (run before each wave sequence)
- [ ] Add `betweenBattles` phase to `gamePhase` state machine: `'mapSelect' | 'playing' | 'betweenBattles'`
- [ ] Persist: `achievements`, `battleHistory`, `battlesCompleted` across the campaign boundary
- [ ] `stars` become a campaign-level resource (not reset by `initBattle`)

*Deliverable: achievements and battle history survive refresh; stars accumulate across battles.*

### Phase 3 — XP and Career Levels (medium risk, medium effort)

*Goal: defenders grow stronger across battles.*

- [ ] Add `src/roster/defender.js` — `Defender` class (§3.1 data model)
- [ ] Add `src/roster/roster.js` — roster management: `add()`, `remove()`, `getAvailable()`, `grantXP()`
- [ ] XP formula: `baseXP * killsThisBattle + waveBonus * wavesCleared`
- [ ] Career level milestones: levels 3, 5, 8, 10 grant stat bonuses applied when deployed
- [ ] When a Defender is deployed (Tower placed), `Tower` reads `careerLevel` to set base stats
- [ ] Show career level (Roman numeral) next to defender name in the build bar and tower panel
- [ ] Show XP progress bar in the right panel DEFENDERS section (post-battle summary)
- [ ] Rune Forge renamed to reflect defenders, not just towers

*Deliverable: Ulfr the Berserker is Level V and hits harder than a freshly recruited Berserker.*

### Phase 4 — Roster Screen (medium risk, high effort)

*Goal: between-battle management of the warband.*

- [ ] Add a Roster screen to the `betweenBattles` phase (new canvas UI)
- [ ] Show: each defender's name, class, career level, XP bar, career stats
- [ ] Recruit new defenders: costs `goldReserve`, creates a Defender with a new name at level 1
- [ ] Dismiss defenders: removes from roster, no gold refund (defender loyalty model)
- [ ] Redesign the sell mechanic: in-battle "dismiss" sends the defender to a "reserve" pool rather than granting gold; reserve pool accessible in Roster screen
- [ ] `goldReserve` (between-battle treasury) introduced as a second gold pool

*Deliverable: the Roster screen is the game's emotional core — players name veterans and choose who fights.*

### Phase 5 — Equipment and Talents (high risk, high effort)

*Goal: vertical progression via customization.*

- [ ] Define equipment item definitions (`src/roster/items.js`)
- [ ] Add equipment slots to Defender (2 slots: one active, one passive)
- [ ] Boss kills drop equipment (per boss configs in boss-design-agent.md)
- [ ] Equipment effects applied as stat multipliers when Defender is deployed
- [ ] Replace or extend Rune system: runes become one category of equipment
- [ ] Define talent trees per defender class (`src/roster/talents.js`)
- [ ] Talent unlock cost: career XP at level milestones
- [ ] Talent effects: flag-based, applied in `Tower._applyLevel()` or equivalent
- [ ] Talent tree UI in Roster screen

*Deliverable: a level-10 Berserker with the Warcry talent and a Skaði's Blade equipped plays completely differently from a fresh recruit.*

### Phase 6 — Fortress Upgrades (low risk, medium effort)

*Goal: the fortress is a home that grows between battles.*

- [ ] Define fortress upgrade nodes: Barracks (unlocks classes), Armory (equipment slots), Watchtower (wave preview), Wallworks (wall cost reduction)
- [ ] Add `src/fortress/fortress.js` — upgrade state and bonus calculators
- [ ] Fortress management panel in `betweenBattles` phase
- [ ] Apply passive fortress bonuses at `initBattle()` time
- [ ] Visual progression: fortress art in `grid.js` goal/hoard rendering could reflect upgrade levels

*Deliverable: the fortress changes visually and mechanically as it develops.*

---

## 6. What Should NOT Change

- **BFS path validity check** — never bypass this; it is the foundation of the maze mechanic.
- **Monolithic `game.js`** — do not break it apart without a specific reason. New systems go in *new* files. game.js calls into them; game.js does not become a thin orchestrator overnight.
- **Canvas/vanilla JS stack** — no frameworks, no engines.
- **30-tick game loop** — performance budget is fixed; new systems must be cheap per tick.
- **Footprint system** — multi-cell towers (catapult 2×2, drakship 3×1) are load-bearing; keep `footprint` on TOWER_DEFS and TowerInstance.
