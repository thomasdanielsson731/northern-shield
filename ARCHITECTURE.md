# Northern Shield — Architecture Review

*Last updated: 2026-06-25 (Fortress Commander pivot). Written against the Fortress Commander RPG vision. For day-to-day coding rules see [CLAUDE.md](CLAUDE.md).*

---

## 1. Current State (2026-06-25)

Northern Shield is a **Fortress Commander RPG** (evolved from Fortress Defense RPG) with two combat modes:

1. **Campaign (primary):** 100 procedural maps, **assault** chains on a four-front command map, pathless combat, persistent field state between assaults. **UX pivot:** grid deploy → **defensive posts** in `fortressPrep` phase (see `../../design/DEFENSIVE_POSTS.md`).
2. **Skirmish (secondary):** 3 preset maps, 100-wave maze TD, BFS pathfinding, endless mode — unchanged TD loop.

All four domain layers (Combat / Roster / Fortress / Meta Progression) are implemented. **Phase separation** (War Camp / Fortress Prep / Battle / After Action) is the active architecture migration.

### Source map

```
src/
  main.js              entry point — imports assets then game
  assets.js            sprite manifest (SPRITES shared object)
  config.js            runtime sprite scale helpers
  core/
    renderer.js        canvas + ctx (DPR scaling)
    game.js            ≈12 600 lines — combat loop, UI, input (intentionally monolithic)
    sounds.js          Web Audio API procedural SFX
  entities/
    tower.js           Tower class + TOWER_DEFS (defender classes + structures)
    enemy.js           Enemy class + ENEMY_DEFS (+ targetPriority for pathless AI)
    bullet.js          Bullet class (homing projectiles)
  grid/
    grid.js            Grid class, CELL enum, BFS pathfinding (skirmish)
  roster/
    defender.js        Defender identity, XP, scars, traits
    roster.js          Roster collection + persistence helpers
    talents.js         Career talent definitions
    items.js           Equipment definitions
    heroMovement.js    pathless hero advance / ranged positioning
    heroRoles.js       fortress placement roles + zone bonuses
    warbandComposition.js  deploy hints, squad presets
    traitGameplay.js   trait combat hooks
    names.js           Procedural Norse name pool
  campaign/
    save.js            Campaign state load/save (slot-aware)
    saveSlots.js       10 slots, meta, legacy migration, delete
    sessionSave.js     Per-slot session resume blobs
    events.js          Named between-battle events
    campaignMaps.js    100 maps, assaults, waves, portal/boss tiers
    campaignFronts.js  four-front command map, assault names, per-front unlock
    campaignRun.js     Field persistence, assault casualties, mergeFallenHeroesIntoFieldState, completeNode()
  chronicle/
    chronicle.js       Battle history prose + hall of honored/fallen
  fortress/
    defensivePosts.js  post assignments → grid placements (Fortress Prep)
    fortressUpgrades.js
    fortress.js        Fortress upgrade nodes + bonus aggregation
```

### Persistence (localStorage)

| Key | Purpose |
|-----|---------|
| `ns-slots-meta-v1` | 10-slot summary metadata |
| `ns-campaign-v2-slot-{0–9}` | Full campaign per slot: roster, stars, gold reserve, fortress, bonds, chronicle, **`campaignProgress`** |
| `ns-session-v1-slot-{0–9}` | Resume blob (gamePhase, map, node, combat) per slot |
| `ns-campaign-v2` | Legacy single save — migrated to slot 0 once |
| `northern-shield-hs` | Leaderboard (8 entries) — skirmish |
| `northern-shield-ach` | Achievement IDs |
| `northern-shield-map-best` | Per-map best records — skirmish |

**`campaignProgress` schema:**
```js
{
  mapsUnlocked: number,       // starts at 1
  clearedMaps: number[],
  currentMapIndex: number|null,
  currentNodeIndex: number|null,
  mapRuns: {
    [mapIndex]: {
      nodesCleared: number[],
      fieldState: { gold, towers[], walls{} } | null
    }
  }
}
```

Mid-battle state **can** be resumed via `sessionSave.js` per slot (`beforeunload` + phase transitions). Refresh without session blob still resets the current assault. Field state between assaults is saved on assault victory (fallen heroes' slots merged back into `fieldState`).

### Domain model (implemented)

```
Defender (roster)     persistent identity — name, career level, talents, equipment, scars
Tower (combat)        deployed instance linked via defenderId; combatHp for assault casualties (respawn next assault)
_campaignState        stars, goldReserve, fortressUpgrades, bonds, legacyBonuses, chronicle
campaignProgress      map/assault unlocks, per-map field persistence
campaignFronts        procedural assault layout per map (four fronts, boss on south)
```

`HERO_BUILD_ITEMS` vs `TOWER_BUILD_ITEMS` split warband deploy from structure build in the left dock (WARBAND | STRUCTURES tabs).

### Game phases

```
slotSelect → campaignSelect → nodeMap (command map) → playing → debrief → betweenBattles (War Camp) → nodeMap
     ↑ SAVES button / boot
                    ↓ (optional anytime)
              betweenBattles (WAR CAMP button on command map)
                    ↓
              mapSelect (Skirmish Mode only)
```

---

## 2. Design priorities (unchanged)

1. **Defender roster** — attachment through names, progression, equipment, retirement
2. **Fortress development** — persistent upgrades between battles
3. **Wave defense** — validates roster and fortress decisions (per node or per skirmish run)

Roguelite full-reset is not a goal. Maze-building is **skirmish-only**; campaign uses positioning + fortress zone.

---

## 3. Dual combat subsystems

| Aspect | Campaign (pathless) | Skirmish |
|---|---|---|
| Path drawing | No (`isPathlessMode()`) | Yes (`drawPath()`) |
| Placement validation | Fortress zone + field caps | BFS path validity |
| Hero placement | Anywhere on grid | Path-dependent (legacy) |
| Enemy movement | Direct targeting + melee | Path follow |
| Wave count | 2–3 per assault (auto-advance waves 2+) | Up to 100 + endless |
| Hero movement | `heroMovement.js` — melee advance, ranged stop distance | Stationary towers on path |
| Wave events | Disabled | `WAVE_EVENTS` |

---

## 4. Monolithic `game.js`

`game.js` holds the render loop, all canvas UI (left dock, right panel, campaign select, **command map**, between-battles screens), and input routing. New **systems** belong in new files under `src/campaign/` etc.; new **UI panels** may stay in `game.js` until extraction is justified.

---

## 5. Scalability notes

| Risk | Mitigation |
|---|---|
| `game.js` size | Extract UI only when a panel stabilizes; avoid splitting combat tick |
| Campaign save growth | `fieldState` per map; chronicle bounded per battle |
| Pathfinding | BFS only on skirmish; campaign skips placement BFS |
| `mapRuns` size | 100 maps max; procedural metadata, lazy field state |
| Particle cap | 300 particle ceiling in `spawnParticles` |

---

## 6. Migration status (2026-06-25)

| Planned (original doc) | Status |
|---|---|
| Defender entity + roster | ✅ `src/roster/` |
| Campaign save | ✅ `src/campaign/save.js` |
| **10 save slots + session resume** | ✅ `saveSlots.js`, `sessionSave.js` |
| **100-map campaign** | ✅ `campaignMaps.js`, `campaignRun.js` |
| Chronicle | ✅ `src/chronicle/` |
| Fortress upgrades | ✅ `src/fortress/` |
| Equipment + talents | ✅ |
| Story systems (bonds, scars, retirement, legacy) | ✅ |
| Combat UI: left dock tabs | ✅ WARBAND \| STRUCTURES |
| Pathless campaign combat | ✅ |
| Between-battles as roster home | ✅ War Camp mandatory; tabbed Warband/Recruit/Fortress |
| Fortress gates (campaign) | ✅ `CELL.GATE` in ring gaps; skirmish walls unchanged |
| Gold plunder on breach | ✅ `getEnemyGoldSteal()` |
| Command map (four fronts) | ✅ `campaignFronts.js` |
| Assault casualty respawn | ✅ `mergeFallenHeroesIntoFieldState` |
| Hero movement (pathless) | ✅ `heroMovement.js` |

---

## 7. Testing

Run from `tower-defense/` (repo root):

```
npx vitest run
```

Covers towers, enemies, bullets, pathing, campaign save, **save slots**, campaign maps/fronts, hero movement, roster logic, hero/structure levels, UI theme, gold plunder (**133 tests**).

---

## 8. Planned domain extensions (design specs)

*Tactical Squad Management — specs in outer workspace `design/` (also summarized here).*

| System | Status | Key file (when built) |
|--------|--------|------------------------|
| **Hero domain** | Partial | `defender.js` + `fortressRole`; UI says Hero |
| **Fortress roles** | MVP ✅ | `src/roster/heroRoles.js` — 6 roles, zone bonuses |
| **Warband composition** | MVP ✅ | `src/roster/warbandComposition.js` — presets, deploy hints, structure warnings |
| **UI theme / assault panels** | ✅ | `src/ui/uiTheme.js`, `src/ui/assaultPanels.js` — War Room topbar, FIELD dock |
| **Hero / structure levels** | ✅ | L100 heroes, L30 structures; War Camp upgrades only |
| **Traits (50)** | Partial | `traitGameplay.js` + 13 traits in `TRAIT_DEFS` |
| **Difficulty tuning** | P1–P3 ✅ | `campaignMaps.js` — softer curve, tutorial, march supplies |

### Difficulty balance (2026-06-25)

- Tutorial node 0:0 — capped spawns, 2 waves, lower difficulty curve.
- `getNodeDifficulty` base `0.12`; `difficultyToEquivWave` uses `×50`.
- March supplies on fresh map start (`getMarchSuppliesGold`).
- Portals: 2nd at map 20, 3rd at 50, 4th at 70.

### Implementation order

1. ~~Difficulty P1–P3~~ ✅  
2. ~~Fortress roles MVP (6) + War Camp picker~~ ✅  
3. ~~Hero UI + composition meter~~ ✅  
4. Trait gameplay expand to 50 (v2)  
5. 6 active + 4 reserve squad (v2)
