# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Northern Shield** — a Norse dark fantasy **Fortress Defense RPG** built with vanilla JS, HTML5 Canvas, and ES Modules. No game engine. Goal: fast iteration, simple architecture.

**Two play modes:**
- **Campaign (default):** 100 regions, 10–30 **assaults** each, 2–3 waves per assault, boss on last assault. Pathless combat — no maze path, no BFS on placement. Field persists between assaults (max 10 heroes + 10 structures). **Command map** with four fronts (`campaignFronts.js`).
- **Skirmish (optional):** Classic 3-map / 100-wave maze TD via **Skirmish Mode** on the campaign select screen. BFS path validation, drawn path, `WAVE_EVENTS`, endless mode after wave 100.

## Commands

All commands run from the **repository root** (`tower-defense/` — where `package.json` and `index.html` live):

```
cd tower-defense
npx vite              # start dev server
npm test              # full suite (includes First Saga logic harness)
npm run test:saga     # saga checklist gate only
npx vitest            # watch mode
npx vitest run tests/tower.unit.test.js   # single file
```

There is no build step for development — Vite serves ES modules directly. The `dist/` folder holds a previously built output.

CI (`.github/workflows/ci.yml`) runs `npm run lint --if-present` then `npm test` on every push/PR. `npm test` includes the **First Saga logic harness** (`tests/firstSaga.playtest.harness.test.js`). Agents: see outer repo `agents/hooks/first-saga-logic-gate.md`.

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
    heroMovement.js    — melee advance / ranged positioning for pathless combat; sight range 12 cells; heroes drift back to deploy cell when no enemy in range
    warbandComposition.js — squad presets, deploy hints, composition warnings, structure count warnings
    heroRoles.js       — fortress role zones (gate/wall/core), role damage mult
    traitGameplay.js   — trait combat modifiers (getTraitModifiers)
    talents.js         — TALENT_DEFS, CLASS_TALENTS, getTalentBonuses(); 4 talents per class, auto-unlocked at career levels 3/5/8/10
    heroLevel.js       — MAX_HERO_LEVEL=100, upgrade costs, Hydda heal count scaling
    structureLevel.js  — MAX_STRUCTURE_LEVEL=30, structure HP, passive scaling (~68% of hero growth)
    warbandHeal.js     — Hydda warband HP heal in pathless/campaign
  ui/
    uiTheme.js         — UI_COLORS palette, War Room top bar chrome, stat chips
    assaultPanels.js   — deployed field card HP bars, status labels
    hallOfHeroesView.js — immersive Hall (statues, dossier, glass chips)
    treasuryView.js    — immersive Treasury / settlement fortress hub
    barracksView.js    — immersive Barracks recruit (Hall statues, roster, level card)
    warCampVisual.js   — glass chips, objective guidance, immersive chrome
    hallHeroStatues.js — shared statue draw for Hall + Barracks
    structurePortrait.js — drawProceduralStructureIcon() — procedural icons for build dock
  combat/
    assaultField.js    — ASSAULT_FIELD_ZOOM, world padding, border spawn helpers
    assaultTargeting.js — hasLivingFortressGates(), buildAssaultTargetPriority(); gate-priority for pathless enemies
  campaign/
    save.js            — saveCampaign(), loadCampaign(), migrateLegacySaves(); slot-aware keys via saveSlots
    saveSlots.js       — 10 slots, ns-slots-meta-v1, migrateLegacyToSlots(), deleteSlot(), slot meta summaries
    sessionSave.js     — validateSessionState(), per-slot ns-session-v1-slot-N resume blobs
    events.js          — EVENT_DEFS (8 Named Campaign Events); getAvailableEvent(cs) → one random eligible event or null
    campaignMaps.js    — 100 campaign maps, assault/wave generation, portal tiers, boss tiers, buildNodeWavePlan()
    campaignFronts.js  — four-front command map, assault codenames, per-front unlock, getNextAvailableAssault()
    firstSaga.js       — First Saga linear A0–A4 + settlement; spawn tables, wave bands, balance helpers
    sagaPlaytestHarness.js — automated Sprint 5 checklist (`npm run test:saga`); maps to agents/first-saga-playtest-runner.md
    campaignRun.js     — field persistence (10 heroes + 10 structures), assault casualties, mergeFallenHeroesIntoFieldState, completeNode()
    campaignDeploy.js  — isAssaultDeployPhase(), canUpgradeHeroLevelBetweenAssaults(); prep-only placement rules
    onboarding.js      — ONBOARDING steps enum, getOnboardingHint(), advanceOnboarding(), resolveOnboardingHint()
    saveValidate.js    — validateCampaignState(), verifySaveChecksum(), simpleSaveChecksum()
  fortress/
    fortress.js        — FORTRESS_DEFS (4 upgrade nodes, 3 levels each), getFortressBonuses(); purchased with goldReserve
  preparation/
    fortressPrepArt.js — prep sprites, drawAssaultFortressStructures (structures-only assault fortress)
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
  campaignMaps.unit.test.js
  campaignFronts.unit.test.js
  heroMovement.unit.test.js
  heroLevel.unit.test.js
  structureLevel.unit.test.js
  warbandHeal.unit.test.js
  uiTheme.unit.test.js
  assaultPanels.unit.test.js
  roster.unit.test.js
  saveSlots.unit.test.js
  saveValidate.unit.test.js
  sessionSave.unit.test.js
  onboarding.unit.test.js
  assaultTargeting.unit.test.js
  structurePortrait.unit.test.js
  heroRoles.unit.test.js
  warbandComposition.unit.test.js
  gameImports.smoke.test.js
```

**513 tests** — run `npm test` from repo root.

### Key facts about game.js

`game.js` holds all game state (arrays of enemies/towers/bullets, gold, lives, wave state, UI button regions, drag state, coin particles, screen shake, etc.) and all subsystems: game loop, input handling, wave state machine, HUD, right panel, build bar, toplist, terrain baking, path drawing, and frame overlay.

New systems (roster, fortress, campaign) go in **new files under new subdirectories**. `game.js` calls into them; it does not absorb them.

The game loop runs at 60 fps. Game logic ticks at 30 ticks/sec (every other frame); the ×2 speed button makes it tick every frame instead.

### Canvas layout

| Region | Position |
|---|---|
| Top command bar (War Room) | y=0, h=GRID_TOP (`FRAME_THICK+40` = **56**) |
| Left dock | x=FRAME_THICK=16, w=LEFT_DOCK_W=172 |
| Grid | GRID_LEFT=188, GRID_TOP=**56**, **48×30** cells at CELL_SIZE=14 → 672×420 px |
| Right panel | x=right of grid, w=188 (`RIGHT_PANEL_W`) |
| Ornamental frame | 16 px thick (`FRAME_THICK`), drawn before top bar text |

**Assault combat UI:** Left dock shows **FIELD** panel (deployed units + HP bars) when `isCampaignCombat()` or `waveState === 'active'`. Skirmish prep still uses WARBAND \| STRUCTURES tabs. Right panel sections: INCOMING · FORTRESS · TREASURY · CAMPAIGN · DEFENDER STATS. Palette: `src/ui/uiTheme.js` (see `assets_new/colorsandtopbar.png`).

Key constants: `COLS=48, ROWS=30, CELL_SIZE=14`, `SPAWN={col:0, row:15}`, `GOAL={col:24, row:15}` (fortress at center), `STARTING_GOLD=120`, `STARTING_LIVES=8`, `WALL_COST=12`, `MAX_WAVES=100` (skirmish only). `BASE_W` and `BASE_H` derived from constants; `computeScale()` prefers filling viewport height.

**Campaign combat:** `pathless: true` on campaign presets — no `drawPath()`, no BFS on placement. Heroes place anywhere; structures/gates only in fortress zone (Chebyshev ≤10 from `GOAL`). Enemies use direct targeting (`pickEnemyTarget`, `targetPriority` in `ENEMY_DEFS`). Breach steals gold via `getEnemyGoldSteal()`.

**Scrollable assault world** (`useAssaultScrollWorld()`): padded canvas (`assaultField.js` — +18 cols / +12 rows per side). Enemies spawn on **world border** via `getAssaultBorderSpawnPx()`, not grid col 0. Fortress drawn as **structures only** (`drawAssaultFortressStructures` in `fortressPrepArt.js`) on shared terrain — no circular ground plate. Terrain: `assault_battlefield_bg@2048x1320.png` cover-fills world; `scatterAssaultWilderness` adds trees/stones/water in padding. Zoom `ASSAULT_FIELD_ZOOM = 0.54`; unit scale `ASSAULT_UNIT_SCALE = 0.84`. Minimap + fen mist use border spawn pixel.

**Immersive War Camp buildings** (`betweenBattles`): Hall (`hallOfHeroesView.js`), Treasury (`treasuryView.js`), Barracks (`barracksView.js`) — draw base in `drawBetweenBattles`, return early; overlays after `drawFrames()`. Meta bar carries screen title (`BARRACKS · RECRUIT`, etc.).

**Skirmish combat:** BFS path validation on every tower/wall placement. Path drawn. Multi-portal maps (`multiPortal:true`) reserve extra `CELL.SPAWN` cells; all portal paths validated on placement.

**Multi-portal (campaign + skirmish):** `campaignPortalCount` scales 1→4 by map tier (maps 0–14: 1, 15–39: 2, 40–69: 3, 70+: 4). Extra portals activate on early waves in campaign mode.

### Render order (each frame)

**Campaign assault (scroll world):**
1. `drawCampaignAssaultPlayfieldBackdrop` — light vignette only (terrain visible)
2. Terrain canvas blit at `-padX, -padY`
3. `drawFortressComplex` → `drawAssaultFortressStructures` when grid hidden
4. `grid.draw()` — palisade walls; grid lines alpha 0 when `hideAssaultBattleGrid()`
5. `drawAnimatedSpawnFenMist` at border spawn pixel
6. Towers → enemies → particles → HUD panels
7. `drawFrames()` then immersive overlays if applicable

**Default (skirmish / deploy):**
1. Terrain canvas blit (baked offscreen once at init)
2. `grid.draw()` — cells, spawn portal, goal/hoard
3. `drawPath()` — **skirmish only** (`isPathlessMode()` returns early)
4. Towers → selection ring → bullets → enemies → particles
5. Portal flash, screen shake, vignette
6. Left dock (`drawLeftDock`), right panel, HUD (dossier only)
7. Coins, boss warning, tower detail panel, drag ghost
8. `drawFrames()` — ornamental sprite frame
9. `drawTopBar()` — War Room command strip (**after** frame so gold trim stays visible)

### Pathfinding

BFS in `grid.js`. **Skirmish mode:** enemies follow `currentPath` (SPAWN → GOAL); placement recomputes path and reroutes active enemies. Flying enemies (Myling) move directly toward goal.

**Campaign (pathless) mode:** no path validation on placement. `updateEnemyPathlessTarget()` sets a direct move vector each tick toward `pickEnemyTarget()` result (warband, structures, or goal per `ENEMY_DEFS.targetPriority`). `processEnemyMeleeAttacks()` handles hero/structure/wall damage.

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

**Skirmish:** Towers upgrade to level 10 in-combat: +25% damage, +8% range, −5% cooldown per level.

**Campaign heroes:** Field level up to **100** (`heroLevel.js`). Upgrades spend **gold reserve** in **War Camp only** (`canUpgradeHeroLevelBetweenAssaults`). Not during active assault.

**Campaign structures:** Field level up to **30** (`structureLevel.js`). War Camp upgrade via gold reserve. Structure combat HP scales with level.

Sell = 50% of base cost. High scores persist to `localStorage` under key `northern-shield-hs` (max 8 entries).

### Fortress gate system (campaign)

Campaign build bar exposes **Fortress Gate** only (`TOWER_BUILD_ITEMS` → `CELL.GATE`):

| Constant | Value | Notes |
|---|---|---|
| `GATE_COST` | 28g | Purchased in fortress zone |
| `GATE_HP` | 120 | Gate combat HP |
| `FORTRESS_RING_R` | 5 | Chebyshev radius of pre-placed fortress wall ring |

Gates may be placed only in **ring gap cells** (fixed outer ring with openings). `wallData` still keys `'${col}_${row}'` entries for ring walls and gates (`isGate` flag). Skirmish mode retains legacy player-placed walls (`CELL.WALL`) with BFS validation.

### Wall system (skirmish)

Skirmish / non-pathless presets still use Shield Wall + Reinforce Wall where applicable:

| Type | Key | Cost | Behaviour |
|---|---|---|---|
| Shield Wall | `1` | `WALL_COST=12` | Permanent; 4 upgrade levels; HP `[100,120,140,160,180]` |
| Reinforce Wall | `2` | `REINFORCE_COST=30` | Temporary; crumbles after `REINFORCE_WAVES=3` |

`wallFrostCells` caches cells adjacent to walls (rebuilt when `wallFrostDirty=true`). Wallworks fortress upgrade still reduces wall cost / adds adjacent slow on skirmish walls.

### Rune system

Stars are earned during a run (1 per flawless wave, bonus for boss kills). Stars persist in campaign state (`_campaignState.stars`). **Rune Carver is campaign-only in War Camp** (WARBAND tab, shown when `stars > 0`) — not visible during assault. In skirmish, the chip appears between waves as before. Equipping purchased runes to specific heroes happens via the tower detail panel during the assault deploy phase.

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

`gamePhase`: `'slotSelect' | 'campaignSelect' | 'nodeMap' | 'mapSelect' | 'playing' | 'debrief' | 'betweenBattles'`.

**Boot flow:** `slotSelect` → pick/create/delete slot → `campaignSelect` or resume session → …

**Default campaign flow:** `campaignSelect` → **command map** (`nodeMap`) → `startCampaignNodeBattle()` → `playing` (2–3 waves; waves 2+ auto-advance) → `debrief` → **War Camp** (`betweenBattles`) → command map or next assault. **Skirmish Mode** → `mapSelect` → legacy 3-map skirmish.

**War Camp UI:** Right panel tabs `WAR_CAMP_TABS` — `warband` (roster + equip + **Rune Carver when stars > 0**), `recruit`, `fortress` (field structures + fortress upgrade nodes). Left panel: battle report. Content starts at `META_SCREEN_TOP` (below slim meta bar). No duplicate center meta banner on campaign screens.

**New campaign starter warband:** `activateSlot()` seeds three defenders (Berserker, Archer, Valkyrie) on first slot creation so the first assault is immediately playable.

**Persistence:** `persistCampaign()` writes slot campaign + session; `serializeGameSession()` / `restoreGameSession()` for mid-assault resume. Keys: `ns-slots-meta-v1`, `ns-campaign-v2-slot-{0–9}`, `ns-session-v1-slot-{0–9}`; legacy `ns-campaign-v2` → slot 0 via `migrateLegacyToSlots()`.

Player-facing term: **Assault** (code still uses `nodeIndex` / `nodesCleared` in saves).

Campaign state (`stars`, `runeInventory`, `battlesCompleted`, Roster, `campaignProgress`) persists across boundaries. Combat state resets per assault; field restored from `mapRuns[].fieldState`. Fallen heroes during an assault respawn at their deploy slots on the next assault (`mergeFallenHeroesIntoFieldState` on victory).

Key functions:
- `getFrontLayout()` / `isAssaultUnlocked()` — command map fronts (`campaignFronts.js`)
**Deploy rules (campaign):** Placement, recall, and reposition only during prep (`isAssaultDeployPhase`: `waveNumber === 0 && waveState === 'countdown'`). No hero/structure level upgrades during assault — War Camp only (`campaignDeploy.js`). Recruitment (new roster members) happens between assaults, not from the FIELD panel.

**Hydda:** Heals deployed warband `combatHp` in pathless mode (`warbandHeal.js`). Warband returns to deploy slots between waves (`snapWarbandToDeploy`).

- `startCampaignNodeBattle(mapIndex, nodeIndex)` — snapshots deploy, loads field, `_campaignNodeMode`, `_nodeWavePlan`
- `finishCampaignNodeVictory()` — merges fallen heroes into field, `completeNode()`, `recordBattleResult(..., { skipDebrief: true })`, debrief
- `enterCampaignWarCamp()` — debrief → `betweenBattles` for roster management
- `restoreCampaignField()` — replays saved towers/walls; sets `def.deployed = true`
- `initCampaign(preset)` — loads `ns-campaign-v2` save, restores stars/runes/roster, calls `initBattle`
- `recordBattleResult(result, { skipDebrief })` — XP/chronicle; campaign assaults use `skipDebrief` then custom debrief buttons

**Skirmish maps** (via `mapSelect`):

| Name | Spawn | Goal | Description |
|---|---|---|---|
| MIDGARD | col 0, row 15 | col 24, row 15 | Fortress at center, multi-portal |
| BIFROST PASS | col 0, row 5 | col 47, row 16 | Off-center lanes |
| NIDHOGG'S RUN | col 0, row 1 | col 47, row 20 | Corner crossing |

Auto-starts in 10 s on map select if player doesn't pick. `initGame(map)` calls `initCampaign(map)` for skirmish entry.

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

### Named Campaign Events

`src/campaign/events.js` — 8 trade-off story moments shown between battles. `getAvailableEvent(cs)` returns one random eligible event that hasn't been seen this campaign (`cs.seenEventIds`), or `null`.

Each event has two choices (A costs gold/stars, B is free or cheaper). Effects are applied in `game.js` because they need access to roster/gold/stars. `_campaignState.seenEventIds[]` tracks which events have fired.

| ID | Title | Trigger | Choice A | Choice B |
|---|---|---|---|---|
| `handelsman` | THE TRADER | battle 2+ | Buy equipment (60g) | Pass |
| `volva` | THE SEERESS | battle 3+, 2 stars | Name a hidden trait (2★) | Hospitality (8g) |
| `smeden` | THE ARMORER | battle 2+ | Full commission (35g, +20 XP ×3 vets) | Quick sharpen (12g, +15 XP newest) |
| `skalden` | THE POET | battle 4+, defender 15+ kills | Commission verse (25g, +60 XP MVP) | Let observe (free) |
| `leidangr` | THE SURVIVOR | battle 3+, roster < 8 | Recruit survivor (20g) | Provisions (8g) |
| `blotet` | THE FEAST | battle 6+ | Grand feast (50g, +25 XP all) | Modest feast (20g, +20 XP top rank) |
| `utilegumadr` | THE EXILE | battle 7+, 1 star, roster < 8 | Hire exile (35g+1★) | Turn away |
| `runstenen` | THE RUNE STONE | battle 4+, 3 stars | Draw rune (3★, unlock next talent early) | Leave (gain 1★) |

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

After wave 100 is cleared, `endlessMode = true`. The game continues past `MAX_WAVES=100` indefinitely. An `endlessBanner` countdown shows the "ENDLESS MODE" announcement. Wave events and portal activations stop scaling (the `WAVE_EVENTS` dictionary is finite); enemy stats continue scaling via the normal formula.

### Wave threat coloring

The wave status line in the HUD is colored by threat: boss waves are red (`#ff4020`), waves > 80% through the 100-wave arc are orange (`#ff7020`), > 50% are yellow (`#e8c040`), and earlier waves are green (`#60ee80`). The same colors are used for the progress bar and wave announcement banner.

### Core game rule: path-validity enforcement

**Skirmish / non-pathless presets only:** Before any wall or tower placement, BFS checks that a valid path from `SPAWN` to `GOAL` still exists (and all active portal paths on multi-portal maps). Rejected placements show `pathBlockFlash`.

**Campaign pathless mode:** No BFS check. Structures/gates restricted to fortress zone (`isInFortressZone`). Heroes place anywhere on empty cells. Field caps: max 10 heroes + 10 structures (`campaignRun.js`). Breach plunder: `gold -= getEnemyGoldSteal(enemy, gold)`; tracked as `goldStolen` for debrief.

### Design philosophy

**Northern Shield is a Fortress Defense RPG.** The warband of defenders is the primary gameplay element. Walls, buildings, and towers are supporting systems. See [PRODUCT_DESCRIPTION.md](PRODUCT_DESCRIPTION.md) for the full vision and [ARCHITECTURE.md](ARCHITECTURE.md) for the target technical architecture.

For code work, the relevant constraints:

**Non-negotiable rules:**
- **Path validity (skirmish)** — BFS check before every placement when `!isPathlessMode()`. Never bypass on skirmish presets.
- **Fortress zone (campaign)** — structures/gates only near GOAL; heroes anywhere.
- **Field caps (campaign)** — max 10 heroes + 10 structures on field; persisted in `campaignProgress.mapRuns[].fieldState`.
- **Node casualties** — hero deaths during node assault go to `_nodeCasualties`; cleared on node victory. Roster defender persists.
- **Battle vs. campaign separation** — `initBattle()` resets combat state; field restored via `restoreCampaignField()`. Never add cross-node state to `restartCombatState()` incorrectly.
- **No implicit roguelite resets** — do not silently discard defender state.

**Coding standards for RPG systems:**
- New systems go in new files under new subdirectories (`src/roster/`, `src/fortress/`, `src/campaign/`). `game.js` calls into them; it does not absorb them.
- `saveCampaign()` must never be called synchronously inside `requestAnimationFrame` or the game tick — localStorage serialization blocks the main thread.
- Defender progression state (XP, career level, talents, equipment) lives on the `Defender` entity (`src/roster/defender.js`). The `Tower` class mirrors only what it needs for combat (`_careerLevel`, `name`, `defenderId`).
- The `Tower` class is a **combat instance**; `Defender` is a **character entity**. Keep them separate — `Tower` holds position/firestate; `Defender` holds career/XP.
- `localStorage` writes use per-slot campaign keys (`ns-campaign-v2-slot-N`) and session keys (`ns-session-v1-slot-N`). Include a `version` field. Legacy `ns-campaign-v2` migrates to slot 0.

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
| Watch Tower | Wave event preview +1/2/3 waves ahead | level 3 |
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

**Traits** — 50 traits across 4 rarity tiers, assigned at recruit/link. Affect Chronicle prose (`TRAIT_REPORT_CLAUSE`, `TRAIT_BIO_CLOSE`) and combat (`getTraitModifiers`). Immutable after assignment.

| Rarity | Count | Acquisition | Combat cap |
|--------|-------|-------------|------------|
| positive | 18 | ~55% recruit (class-weighted pool) | ±5–12% |
| negative | 12 | ~30% recruit (class-weighted pool) | ±5–15% |
| rare | 14 | ~10% recruit; events | ±8–20% |
| legendary | 6 | events / boss feats only — not in recruit pool | up to +25% narrow |

`getRandomTrait(type)` — 10% rare roll, else class pool (never legendary). `getLegendaryTrait(id?)` — legendary acquisition via events. `RARE_TRAITS` and `LEGENDARY_TRAITS` exported arrays. New `traitGameplay.js` output fields: `rangeMult` (applied per-tick like synergy range), `cdMult` (temporarily scales `tower.fireRate`), `goldPerWave` (wired into wave-end gold loop).

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

## Design specs (Tactical Squad Management)

Planned systems documented in outer workspace `design/` (relative from monorepo root: `tower-defence/design/`):

| Doc | Topic |
|-----|-------|
| `HERO_DOMAIN.md` | Hero entity, MVP/v2, save schema |
| `FORTRESS_ROLES.md` | 20 roles, zones, synergies |
| `WARBAND_COMPOSITION.md` | Squad archetypes, deploy counts |
| `TRAITS.md` | 50 traits with gameplay + story |
| `DIFFICULTY_BALANCE.md` | Campaign curve analysis + P1–P7 fixes |

See also [ARCHITECTURE.md](ARCHITECTURE.md) §8. **Next code:** difficulty tuning → fortress roles MVP → trait hooks.

## Art direction

See [ART_DIRECTION.md](ART_DIRECTION.md) before generating any sprite. All assets must match the Norse dark fantasy style (top-down 3/4 view, Clash of Clans readability, CoC warmth meets dark Norse mythology). Asset naming: lowercase underscores, `_sprites` suffix for sprite sheets, grouped by `towers/`, `enemies/`, `ui/`, `fx/`, `backgrounds/`.

### Grid zoom

`gridZoom` (1.0–4.0) applies only to the grid/playground area — the frame, top bar, right panel, and build bar are always drawn at `gameScale` (window-fit). Wheel zoom is blocked outside the grid rect. Middle-click drags `gridPanX/gridPanY`. Press `z` to reset. `FRAME_THICK = 16` is a module-level constant shared by `drawFrames`, `drawTopBar`, and `getBuildButtons` — change it in one place only.
