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

### Source layout

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
```

### Key facts about game.js

`game.js` holds all game state (arrays of enemies/towers/bullets, gold, lives, wave state, UI button regions, drag state, coin particles, screen shake, etc.) and all subsystems: game loop, input handling, wave state machine, HUD, right panel, build bar, toplist, terrain baking, path drawing, and frame overlay.

The game loop runs at 60 fps. Game logic ticks at 30 ticks/sec (every other frame); the ×2 speed button makes it tick every frame instead.

### Canvas layout

| Region | Position |
|---|---|
| Top HUD bar | y=0, h=GRID_TOP=64 |
| Grid | GRID_LEFT=32 (`FRAME_THICK`), GRID_TOP=64, 36×22 cells at CELL_SIZE=14 → 504×308 px |
| Right panel | x=right of grid, w=188 |
| Bottom build bar | below grid, h=62 (`BUILD_BTN.h`) |
| Ornamental frame | 32 px thick (`FRAME_THICK`), drawn last (on top of everything) |

Key constants: `COLS=36, ROWS=22, CELL_SIZE=14`, `SPAWN={col:0, row:11}`, `GOAL={col:35, row:11}`, `STARTING_GOLD=80`, `STARTING_LIVES=8`, `WALL_COST=12`, `MAX_WAVES=100`. `BASE_W` and `BASE_H` are derived from these constants.

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

Stars are earned during a run (1 per flawless wave, bonus for boss kills). Stars persist for the run and reset on restart. Press `R` between waves to open the Rune Forge overlay (`showRuneMenu`).

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

### Map selection and game phases

`gamePhase` is either `'mapSelect'` or `'playing'`. On load (and after death/restart), the game shows a map select screen with three preset maps:

| Name | Spawn | Goal | Description |
|---|---|---|---|
| MIDGARD | col 0, row 11 | col 35, row 11 | Classic fortress (default) |
| BIFROST PASS | col 0, row 5 | col 35, row 16 | Off-center lanes |
| NIDHOGG'S RUN | col 0, row 1 | col 35, row 20 | Corner crossing |

Auto-starts in 10 s (`MAP_AUTO_DELAY`) if the player doesn't pick. `initGame(map)` applies the chosen spawn/goal and resets all state.

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

### Endless mode

After wave 100 is cleared: `endlessMode` flips to `true`, a victory banner plays, the run score is saved, and the game continues beyond `MAX_WAVES` with escalating difficulty. Waves past 100 still earn stars and gold.

### Wave threat coloring

The wave status line in the HUD is colored by threat: boss waves are red (`#ff4020`), waves > 80% through the 100-wave arc are orange (`#ff7020`), > 50% are yellow (`#e8c040`), and earlier waves are green (`#60ee80`). The same colors are used for the progress bar and wave announcement banner.

### Core game rule: path-validity enforcement

Before any wall or tower placement is applied, BFS is run to check that a valid path from `SPAWN` to `GOAL` still exists. If the placement would block all paths, it is rejected silently. This is the fundamental constraint that makes maze-building safe — never bypass it.

### Design philosophy

Maze-building is the primary mechanic. Players win by routing enemies through kill-zones they control, not by reaction speed. Preserve this in all balance and feature work: more emphasis on placement decisions and path control, less on clicking fast.

## Art direction

See [ART_DIRECTION.md](ART_DIRECTION.md) before generating any sprite. All assets must match the Norse dark fantasy style (top-down 3/4 view, Clash of Clans readability, CoC warmth meets dark Norse mythology). Asset naming: lowercase underscores, `_sprites` suffix for sprite sheets, grouped by `towers/`, `enemies/`, `ui/`, `fx/`, `backgrounds/`.

### Grid zoom

`gridZoom` (1.0–4.0) applies only to the grid/playground area — the frame, top bar, right panel, and build bar are always drawn at `gameScale` (window-fit). Wheel zoom is blocked outside the grid rect. Middle-click drags `gridPanX/gridPanY`. Press `z` to reset. `FRAME_THICK = 32` is a module-level constant shared by `drawFrames`, `drawTopBar`, and `getBuildButtons` — change it in one place only.
