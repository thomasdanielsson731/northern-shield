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
  towers/              — sprite PNGs: berserker, valkyrie, archer, catapult, blondie, ismaciker, vildeman
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

### Canvas layout (BASE_W=692, BASE_H=488)

| Region | Position |
|---|---|
| Top HUD bar | y=0, h=GRID_TOP=48 |
| Grid | GRID_LEFT=32, GRID_TOP=48, 36×22 cells at CELL_SIZE=14 → 504×308 px |
| Right panel | x=right of grid, w=188 |
| Bottom build bar | below grid, ~98 px tall |
| Ornamental frame | 32 px thick (`FRAME_THICK`), drawn last (on top of everything) |

Key constants: `COLS=36, ROWS=22, CELL_SIZE=14`, `SPAWN={col:0, row:11}`, `GOAL={col:35, row:11}`, `STARTING_GOLD=85`, `STARTING_LIVES=15`, `WALL_COST=5`, `MAX_WAVES=100`.

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

All sprites are 4-frame horizontal strips: `IDLE | WALK | ATTACK | DEATH`.

- Towers: 512×128 px (128×128 per frame)
- Enemies: 384×96 px (96×96 per frame); Jötunn boss: 768×192 px (192×192)

`assets.js` exports `SPRITES` (a shared object). Each key maps to an `Image` that loads asynchronously. Code checks `img.complete` before drawing; falls back to procedural canvas drawing if sprites haven't loaded.

### Tower upgrades and economy

Towers upgrade to level 10: +25% damage, +8% range, −5% cooldown per level. Sell = 50% of base cost. High scores persist to `localStorage` under key `northern-shield-hs` (max 8 entries).

### Core game rule: path-validity enforcement

Before any wall or tower placement is applied, BFS is run to check that a valid path from `SPAWN` to `GOAL` still exists. If the placement would block all paths, it is rejected silently. This is the fundamental constraint that makes maze-building safe — never bypass it.

### Design philosophy

Maze-building is the primary mechanic. Players win by routing enemies through kill-zones they control, not by reaction speed. Preserve this in all balance and feature work: more emphasis on placement decisions and path control, less on clicking fast.

## Art direction

See [ART_DIRECTION.md](ART_DIRECTION.md) before generating any sprite. All assets must match the Norse dark fantasy style (top-down 3/4 view, Clash of Clans readability, CoC warmth meets dark Norse mythology). Asset naming: lowercase underscores, `_sprites` suffix for sprite sheets, grouped by `towers/`, `enemies/`, `ui/`, `fx/`, `backgrounds/`.

### Grid zoom

`gridZoom` (1.0–4.0) applies only to the grid/playground area — the frame, top bar, right panel, and build bar are always drawn at `gameScale` (window-fit). Wheel zoom is blocked outside the grid rect. Middle-click drags `gridPanX/gridPanY`. Press `z` to reset. `FRAME_THICK = 32` is a module-level constant shared by `drawFrames`, `drawTopBar`, and `getBuildButtons` — change it in one place only.
