# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Northern Shield** — a Norse dark fantasy, grid-based maze tower defense game built with vanilla JS, HTML5 Canvas, and ES Modules. No game engine. Goal: fast iteration, simple architecture.

## Commands

All commands run from `c:\dev\tower-defence\tower-defense\tower-defense\` (the nested project root where `package.json` lives).

```
npx vite              # start dev server
npx vitest run        # run all tests once
npx vitest            # run tests in watch mode
npx vitest run tests/tower.unit.test.js   # run a single test file
```

There is no build step for development — Vite serves ES modules directly. The `dist/` folder holds a previously built output.

CI (`.github/workflows/ci.yml`) runs `npm run lint --if-present` then `npm test` on every push/PR.

## Architecture

For the full architecture review, target domain model, four-layer design, scalability risks, and migration roadmap, see [ARCHITECTURE.md](ARCHITECTURE.md).

### Source layout (current)

```
src/
  main.js              — entry point: imports assets.js then game.js
  assets.js            — async sprite manifest; SPRITES shared object, loaded via Image
  config.js            — runtime sprite scale helpers: getSpriteScale/setSpriteScale/changeSpriteScale (clamped 0.4–1.6, default 0.45)
  core/
    renderer.js        — canvas + ctx with DPR scaling; exports canvas and ctx
    game.js            — everything else (intentionally monolithic; do not split without reason)
    sounds.js          — procedural audio via Web Audio API; tone() helper, setMuted(); lazy AudioContext init
  entities/
    tower.js           — Tower class, TOWER_DEFS, TOWER_TYPES; all tower sprites + drawing
    enemy.js           — Enemy class, ENEMY_DEFS, ENEMY_TYPES; all enemy sprites + drawing
    bullet.js          — Bullet class; homing projectiles (orb/spear/rock/stun/arrow shapes)
  grid/
    grid.js            — Grid class, CELL enum, BFS pathfinding, cell drawing
  roster/
    names.js           — Viking name pools (8 names × 9 defender classes); getDefenderName(type)
    defender.js        — Defender class (career XP, careerLevel, career stats); XP/level table; careerBonusForLevel()
    roster.js          — Roster class: link() veteran to a Tower, grantBattleXP(), releaseAll(), load/toJSON
    items.js           — ITEM_DEFS, BOSS_DROP_TABLE, RARITY_COLOR, getItemBonuses(); equipment slots: 'weapon' | 'armor'
    talents.js         — TALENT_DEFS, CLASS_TALENTS, getTalentBonuses(); 4 talents per class, auto-unlocked at career levels 3/5/8/10
  campaign/
    save.js            — saveCampaign(), loadCampaign(), migrateLegacySaves(); injectable storage for tests
  fortress/
    fortress.js        — FORTRESS_DEFS (4 upgrade nodes, 3 levels each), getFortressBonuses(); purchased with goldReserve
  chronicle/
    chronicle.js       — All Chronicle + Defender Legacy exports: TRAIT_DEFS, SCAR_DEFS, VETERAN_RANKS, BOND_NAMES, TITLE_DEFS,
                         getRank(), getRandomTrait(), checkScars(), checkTitles(), generateBio(), generateEpitaph(),
                         generateBattleReport(), generateBondName(), wrapText()
assets/
  towers/              — sprite PNGs for all 9 tower types
  enemies/             — sprite PNGs: draugr, myling, jotunn, mara
  ui/                  — portal_spawn_gate, goal_trelleborg_fort, frame tiles (corner, horiz, vert)
  terrain/             — ground_tile.png, path_tile.png (both 1254×1254)
  bosses/, effects/    — reference/concept art (not loaded in game)
tests/
  tower.unit.test.js
  enemy.unit.test.js
  bullet.unit.test.js
  pathing.functional.test.js
  campaign.unit.test.js
  roster.unit.test.js
```

### Key facts about game.js

`game.js` holds all game state (arrays of enemies/towers/bullets, gold, lives, wave state, UI button regions, drag state, coin particles, screen shake, etc.) and all subsystems: game loop, input handling, wave state machine, HUD, right panel, build bar, toplist, terrain baking, path drawing, and frame overlay.

New systems (roster, fortress, campaign) go in **new files under new subdirectories**. `game.js` calls into them; it does not absorb them.

The game loop runs at 60 fps. Game logic ticks at 30 ticks/sec (every other frame); the ×2 speed button makes it tick every frame instead.

### Canvas layout

| Region | Position |
|---|---|
| Top HUD bar | y=0, h=GRID_TOP=64 |
| Grid | GRID_LEFT=32 (`FRAME_THICK`), GRID_TOP=64, 36×22 cells at CELL_SIZE=14 → 504×308 px |
| Right panel | x=right of grid, w=188 |
| Bottom build bar | below grid, h=62 (`BUILD_BTN.h`) |
| Ornamental frame | 32 px thick (`FRAME_THICK`), drawn last (on top of everything) |

Key constants: `COLS=48, ROWS=22, CELL_SIZE=14`, `SPAWN={col:0, row:11}`, `GOAL={col:24, row:11}` (center — fortress at center design), `STARTING_GOLD=120`, `STARTING_LIVES=8`, `WALL_COST=12`, `MAX_WAVES=100`. `BASE_W` and `BASE_H` are derived from these constants.

**Multi-portal system:** MIDGARD preset has `multiPortal:true`. Three extra portals reserved at game start as `CELL.SPAWN` (east col:47,row:11; north col:24,row:0; south col:24,row:21) — towers can never be placed there. `_extraSpawns[]` tracks them with `active` flag. Portals activate at: W11 east, W21 north, W41 south, W71 NW corner. `spawnEnemy()` distributes enemies across all active portals. ALL portal paths are BFS-validated on every tower/wall placement.

### Render order (each frame)

1. Terrain canvas blit (baked offscreen once at init; rebaked when sprites load)
2. `grid.draw()` — cells, spawn portal, goal/hoard
3. `drawPath()` — stone road (5 layered strokes + joint lines) + will-o'-wisps
4. Towers → selection ring → bullets → enemies → particles
5. Portal flash, screen shake, vignette
6. `drawRightPanel()`, `drawHud()` (build bar + top HUD)
7. Coins, boss warning, wave announcement, tower detail panel, drag ghost
8. `drawFrames()` — ornamental sprite frame, drawn last

### Pathfinding

BFS in `grid.js`. Enemies follow a pixel path (`currentPath`) computed from `SPAWN` to `GOAL`. When a tower or wall is placed, the path is recomputed; active enemies get `setPath()` called to reroute from their current cell. Flying enemies (Myling) ignore the grid and move directly toward the goal.

### Sprite system

Two sprite sheet layouts are supported — the drawing code detects which to use via `sp.rows`:

**Single-direction (rows: 1)** — 4-frame horizontal strip, flips horizontally for left-facing:
- Towers: 512×128 px (128×128 per frame)
- Enemies: 384×96 px (96×96 per frame); Jötunn boss: 768×192 px (192×192)

**Directional (rows: 4)** — 4×4 grid, no horizontal flip; row encodes facing direction:
```
         IDLE  WALK  ATTACK  DEATH
RIGHT  [  0,0   1,0    2,0    3,0  ]
DOWN   [  0,1   1,1    2,1    3,1  ]
LEFT   [  0,2   1,2    2,2    3,2  ]
UP     [  0,3   1,3    2,3    3,3  ]
```
- Towers (directional): 512×512 px (128×128 per frame)
- Enemies (directional): 384×384 px (96×96 per frame)

To activate directional mode for a sprite, set `rows: 4` in its manifest entry in `assets.js`. Towers pick the row from `aimAngle`; enemies pick from their path movement angle.

`assets.js` exports `SPRITES` (a shared object). Each key maps to an `Image` that loads asynchronously. Code checks `img.complete` before drawing; falls back to procedural canvas drawing if sprites haven't loaded.

### Tower types and categories

9 towers in three build-bar categories:

| Category | Types | Notes |
|---|---|---|
| Warriors | berserk, valkyrie, military | berserk=close range brawler, valkyrie=long-range spear, military=fast arrow |
| Siege | catapult, drakship, piltorn | catapult=2×2 splash, drakship=3×1 heavy splash (cost 95), piltorn=fast arrow |
| Mystic | blondie, hydda, isjatten | blondie=slow field, hydda=healer (range/damage=0), isjatten=nova AoE slow |

`footprint` property: catapult is 2×2, drakship is 3×1, all others are 1×1. Multi-cell towers occupy all cells in their footprint.

Two towers are gated behind stars earned in the current run: `isjatten` requires 5 stars, `drakship` requires 3 (`TOWER_STAR_GATES` in game.js).

### Tower upgrades and economy

Towers upgrade to level 10: +25% damage, +8% range, −5% cooldown per level. Sell = 50% of base cost. High scores persist to `localStorage` under key `northern-shield-hs` (max 8 entries).

### Rune system

Stars are earned during a run (1 per flawless wave, bonus for boss kills). Stars now persist across battles as part of campaign state (`_campaignState.stars`). Press `R` between waves to open the Rune Forge overlay (`showRuneMenu`).

Five rune types defined in `RUNE_DEFS`:

| Rune | Cost | Effect | Max |
|---|---|---|---|
| Iron Edge | 3 stars | +25% damage on one tower | 3 |
| Swift Strike | 4 stars | −15% fire cooldown | 2 |
| Frost Rune | 2 stars | Adds/boosts slow on hit | 3 |
| Battle Hymn | 3 stars | +30% range | 1 |
| Valhalla | 5 stars | +50% kill gold | 2 |

Runes are purchased into `runeInventory`, then equipped to individual towers via the tower panel equip button (opens `showRunePicker`). Each tower holds at most one rune (`tower.rune`). Unequipping returns the rune to inventory.

### Synergy system

Pairs of adjacent towers activate automatic stat boosts (detected each tick, applied temporarily around `update()`):

| Pair | Synergy key | Effect |
|---|---|---|
| military + valkyrie | `eagleEye` | +15% range on both |
| berserk + catapult | `siegeFury` | +20% splash damage on both |
| blondie + isjatten | `winterGrip` | +15% damage on both |

Active synergies are shown in the tower detail panel and rendered as a colored glow ring. `tower._synergy` is null or one of the three keys; `tower._synergyDmgBoost` is set to 1.15 (or 1) by game.js before each tower's `update()` call.

### Campaign boundary and game phases

`gamePhase` is `'mapSelect' | 'playing' | 'betweenBattles'`. Campaign state (`stars`, `runeInventory`, `battlesCompleted`, the Roster) persists across the boundary; combat state resets.

Key functions:
- `initCampaign(preset)` — loads `ns-campaign-v2` save (or migrates legacy), restores stars/runes/roster, calls `initBattle`
- `initBattle(preset)` — sets map geometry, calls `restartCombatState()`, sets `gamePhase = 'playing'`
- `restartCombatState()` — clears enemies/towers/bullets/gold; returns equipped runes to inventory; does NOT touch stars or roster
- `recordBattleResult(result)` — grants defender XP, serializes roster into campaign save, increments `battlesCompleted`, transitions to `betweenBattles`

On load (and after `betweenBattles → MAP SELECT`), the game shows a map select screen with three preset maps:

| Name | Spawn | Goal | Description |
|---|---|---|---|
| MIDGARD | col 0, row 11 | col 35, row 11 | Classic fortress (default) |
| BIFROST PASS | col 0, row 5 | col 35, row 16 | Off-center lanes |
| NIDHOGG'S RUN | col 0, row 1 | col 35, row 20 | Corner crossing |

Auto-starts in 10 s (`MAP_AUTO_DELAY`) if the player doesn't pick. `initGame(map)` calls `initCampaign(map)` which is the campaign entry point.

### Wave events

`WAVE_EVENTS` is a dictionary keyed by wave number. When a wave with an event starts, the event's modifier is applied for that wave only (`currentWaveEvent`). Upcoming events are shown in the wave status line one wave in advance.

| Wave | Event | Effect |
|---|---|---|
| 15 | FROST WIND | −25% enemy speed |
| 18 | UNDEAD MARCH | +12 extra Draugr |
| 22 | NIGHT RAID | +20% enemy HP |
| 30 | BERSERKER RAGE | +30% enemy speed |
| 35 | SWARM | +10 extra Myling |
| 40 | IRON HIDE | +30% HP, −15% speed |
| 48 | WRAITH HUNT | +8 extra Myling |
| 60 | FROST STORM | +30% HP, −20% speed |
| 65 | BLITZ | +40% speed |
| 80 | DARK HARVEST | +40% HP, +4 extra Jötunn |
| 90 | FÖRSPELET | +50% HP, +40% speed |

### Achievements

Five achievements defined in `ACH_DEFS`, persisted to `localStorage` under key `northern-shield-ach` (a JSON array of earned IDs). Toast notifications queue in `_achToasts`.

| ID | Title | Trigger |
|---|---|---|
| `firstBoss` | CHIEFTAIN | First boss slain |
| `wave25` | IRON WALL | Survive to wave 25 |
| `wave50` | BULWARK | Survive to wave 50 |
| `wave100` | SHIELD ETERNAL | Clear all 100 waves |
| `flawless5` | GHOST WALKER | 5 flawless waves in one run |

### Wave threat coloring

The wave status line in the HUD is colored by threat: boss waves are red (`#ff4020`), waves > 80% through the 100-wave arc are orange (`#ff7020`), > 50% are yellow (`#e8c040`), and earlier waves are green (`#60ee80`). The same colors are used for the progress bar and wave announcement banner.

### Core game rule: path-validity enforcement

Before any wall or tower placement is applied, BFS is run to check that a valid path from `SPAWN` to `GOAL` still exists. If the placement would block all paths, it is rejected silently. This is the fundamental constraint that makes maze-building safe — never bypass it.

### Design philosophy

**Northern Shield is a Fortress Defense RPG.** The warband of defenders is the primary gameplay element. Walls, buildings, and towers are supporting systems. See [PRODUCT_DESCRIPTION.md](PRODUCT_DESCRIPTION.md) for the full vision and [ARCHITECTURE.md](ARCHITECTURE.md) for the target technical architecture.

For code work, the relevant constraints:

**Non-negotiable rules:**
- **Path validity** — BFS check before every placement. Never bypass this.
- **Battle vs. campaign separation** — `initBattle()` resets only combat state; `initCampaign()` resets everything. Never add cross-battle state to `restartCombatState()`.
- **No implicit roguelite resets** — do not silently discard defender state. If state resets, it must be explicit and intentional.

**Coding standards for RPG systems:**
- New systems go in new files under new subdirectories (`src/roster/`, `src/fortress/`, `src/campaign/`). `game.js` calls into them; it does not absorb them.
- `saveCampaign()` must never be called synchronously inside `requestAnimationFrame` or the game tick — localStorage serialization blocks the main thread.
- Defender progression state (XP, career level, talents, equipment) lives on the `Defender` entity (`src/roster/defender.js`). The `Tower` class mirrors only what it needs for combat (`_careerLevel`, `name`, `defenderId`).
- The `Tower` class is a **combat instance**; `Defender` is a **character entity**. Keep them separate — `Tower` holds position/firestate; `Defender` holds career/XP.
- `localStorage` writes use the `ns-campaign-v2` schema (see ARCHITECTURE.md §3.3). Include a `version` field. Provide a migration path from v1 keys.

### Roster and career system

When a Tower is placed, `game.js` calls `_roster.link(type, id, name)`:
- If an undeployed `Defender` of that class exists in the roster, that veteran is reused (their name/id/careerLevel are applied to the Tower via `tower.applyCareerData()`).
- Otherwise a new `Defender` is registered.

After battle ends, `recordBattleResult()` calls `_roster.grantBattleXP(towers, waveNumber)` then serializes the roster into `_campaignState.defenders`.

Career level thresholds (XP): `[0, 50, 150, 350, 700, 1200, 1800, 2500, 3500, 4800, 6500]` (levels 0–10).
Stat bonuses at milestones: level 3 = +10% dmg; level 5 = +15% dmg/+5% range; level 8 = +25% dmg/+8% range/−7% cooldown; level 10 = +40% dmg/+12% range/−12% cooldown.
Career level shown in tower panel as Roman numeral: `"Ulfr  [III]"`.

**Defender identity:**
- `glowRgb`, per-tower stats (`damageDealt`, `killCount`, `goldGenerated`), and MVP tracking serve the goal of making defenders feel distinct.
- Speed and reaction time are not the skill expression. Strategic roster decisions and placement are.

### Equipment system

10 equipment items in `src/roster/items.js`. Each defender has two slots: `weapon` and `armor`. Items are dropped by bosses (`BOSS_DROP_TABLE`, keyed by wave number) and go into the campaign `equipmentInventory`. Players equip items from the Roster screen; bonuses apply when the defender is deployed.

| Rarity | Color | Examples |
|---|---|---|
| common | `#a8a8a8` | Frost Crystal (+12% dmg), Iron Mantle (+10% dmg, −4% cd) |
| rare | `#4090ff` | Skaði's Blade (+25% dmg), Eagle Eye Lens (+22% rng), Warcry Torc, Storm Cloak |
| epic | `#cc44ff` | Runebane (+35% dmg, −10% cd), Frostborn Shield |
| legendary | `#ff9020` | Surtr's Shard (+50% dmg, −12% cd), Valkyrja Wings (+25% rng, −15% cd) |

`getItemBonuses(itemIds)` → `{ dm, rm, cm }` — multiplicative, stacked on top of career bonuses. The Armory fortress upgrade amplifies `dm` on all items.

Boss drop schedule: wave 10 → common, wave 25 → rare, wave 50 → rare, wave 75 → epic, wave 100 → legendary (one of two options chosen at random per drop).

### Talent system

`src/roster/talents.js` defines 4 talents per defender class (36 total), keyed by `CLASS_TALENTS[class][level]`. Talents auto-unlock when a defender reaches career levels 3, 5, 8, or 10. All bonuses are multiplicative (`dm`, `rm`, `cm`); slow-centric classes (blondie, isjatten) also have a `slowMult` field (lower = deeper slow).

`getTalentBonuses(talentIds)` → `{ dm, rm, cm, slowMult }` — combined from all unlocked talents. Applies on top of career level bonuses and item bonuses.

### Fortress upgrades

`src/fortress/fortress.js` — 4 upgrade nodes, each 3 levels. Purchased between battles with `goldReserve`. `getFortressBonuses(upgrades)` returns the combined effect object consumed by `initBattle()`.

| Node | Bonus | Max |
|---|---|---|
| Barracks | Recruit cost −5/10/15g, +20/40/60g starting gold | level 3 |
| Armory | Equipment damage multiplier ×1.08/1.13/1.20 | level 3 |
| Watchtower | Wave event preview +1/2/3 waves ahead | level 3 |
| Wallworks | Wall cost −1/2/3g, adjacent slow +4/7/10% | level 3 |

### Chronicle system

`src/chronicle/chronicle.js` is the story-generation module. All functions are pure — they receive data and return text/objects. `game.js` calls into them; `chronicle.js` never imports from `game.js`.

**Chronicle data flow:**
1. `_chronicleBattleData` is assembled in `recordBattleResult()` (while `towers[]` is still populated, before `releaseAll()`)
2. `generateBattleReport(battleData)` → produces `{ result, prose, bossKills, mvpName, notableEvents }`
3. Stored in `_campaignState.chronicle.battles[]` (persisted via `saveCampaign()`)
4. Displayed in `drawChronicleOverlay()` — filterable by defender via `_chronicleDefFilter`

**Campaign state additions for Chronicle/Legacy:**
```js
_campaignState = {
  chronicle:     { battles: [], warbandName: '' },
  hallOfFallen:  [],   // dismissed VETERAN+ defenders (epitaph, scars, titles, battles)
  hallOfHonored: [],   // formally retired CHAMPION+ defenders
  bonds:         [],   // active bond records: { defenderIds, name, formed, battleCount }
  coDeployments: {},   // pair-keyed co-deployment counts: '[id1:id2]' → count
  legacyBonuses: {},   // class-keyed bonus from retired defenders: type → { fromName, dm }
}
```

### Defender Legacy System

10 systems that turn defenders from stats into characters. All implemented as of 2026-06-22.

**Traits** — 8 personalities assigned at recruit/link, class-weighted. Affect Chronicle prose via `TRAIT_REPORT_CLAUSE`. Immutable after assignment.

| Trait | Description |
|---|---|
| reckless | Fires into clusters, first to engage |
| steadfast | Holds position, never yields |
| brooding | Dark presence, minimal words |
| serene | Unshakeable calm under pressure |
| methodical | Precise, systematic, no wasted effort |
| impulsive | Acts before the order is given |
| vengeful | Remembers every scar |
| devout | Fights for something beyond the battle |

**Veteran Ranks** — 6 tiers computed from `level + battles + kills + titles`. Display in rank color on roster cards and in Chronicle prose.

| Rank | Requirements | Color |
|---|---|---|
| GREENHORN | fallback | `#706860` |
| WARRIOR | level 3, 5 battles | `#8090c0` |
| VETERAN | level 5, 15 battles, 50 kills | `#90c870` |
| CHAMPION | level 8, 30 battles, 150 kills | `#e89040` |
| IRONGUARD | level 10, 50 battles, 1 title | `#c0a0ff` |
| LEGEND | level 10, 100 battles, 3 titles | `#ffd040` |

**Battle Scars** — 7 scars earned through specific conditions. Maximum 4 per defender. Permanent.

| Scar | Trigger |
|---|---|
| lone_stand | Survived a Last Stand wave as the only deployed defender |
| mark_last_hour | Deployed when fortress had 1 rampart remaining |
| rampart_wound | Deployed during 3+ fortress breaches |
| draugen_scar | 3+ Draugen-Jarl boss battles while deployed |
| jotunn_scar | 3+ Jötun Walker boss battles while deployed |
| fenrir_brand | Survived a Fenrir wave while deployed |
| bond_grief | Bonded partner was dismissed or retired |

**Bonds** — co-deployment tracking via `_campaignState.coDeployments[key]` where `key = [id1,id2].sort().join(':')`. Bond forms at 5+ shared battles. Name is deterministic from defender IDs via `generateBondName()`. Bond grief scar assigned when a bonded partner is dismissed or retired.

**Promotion queue** — `_promotionQueue = []` accumulates `{defenderName, rankLabel, text, type}` entries during `recordBattleResult()`. Shown as acknowledgeable banners at top of roster panel between battles. Cleared on `initBattle()`.

**Retirement** — CHAMPION+ defenders can RETIRE WITH HONOR (modal ceremony). Adds to `hallOfHonored`. Assigns `legacyBonuses[def.type]` for next recruited defender of same class. Bond grief scar assigned to surviving bonded defenders.

**Auto-generated biography** — `generateBio(defender, chronicle, classLabel)` produces a 4-5 sentence biography. Opened via 📜 BIO button on roster cards, also shown in retirement ceremony.

**Hall of Fallen / Hall of Honored** — both visible at bottom of Chronicle overlay. Fallen = dismissed VETERAN+. Honored = formally retired.

## Art direction

See [ART_DIRECTION.md](ART_DIRECTION.md) before generating any sprite. All assets must match the Norse dark fantasy style (top-down 3/4 view, Clash of Clans readability, CoC warmth meets dark Norse mythology). Asset naming: lowercase underscores, `_sprites` suffix for sprite sheets, grouped by `towers/`, `enemies/`, `ui/`, `fx/`, `backgrounds/`.

### Grid zoom

`gridZoom` (1.0–4.0) applies only to the grid/playground area — the frame, top bar, right panel, and build bar are always drawn at `gameScale` (window-fit). Wheel zoom is blocked outside the grid rect. Middle-click drags `gridPanX/gridPanY`. Press `z` to reset. `FRAME_THICK = 32` is a module-level constant shared by `drawFrames`, `drawTopBar`, and `getBuildButtons` — change it in one place only.
