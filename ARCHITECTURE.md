# Northern Shield — Architecture Review

*Last updated: 2026-06-24 (design specs session). Written against the Fortress Defense RPG vision. For day-to-day coding rules see [CLAUDE.md](CLAUDE.md).*

---

## 1. Current State (2026-06-24)

Northern Shield is a **Fortress Defense RPG** with two combat modes:

1. **Campaign (primary):** 100 procedural maps, node chains, pathless assaults, persistent field state between nodes.
2. **Skirmish (secondary):** 3 preset maps, 100-wave maze TD, BFS pathfinding, endless mode.

All four domain layers (Combat / Roster / Fortress / Meta Progression) are implemented.

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
    names.js           Procedural Norse name pool
  campaign/
    save.js            Campaign state load/save (ns-campaign-v2)
    events.js          Named between-battle events
    campaignMaps.js    100 maps, nodes, waves, portal/boss tiers
    campaignRun.js     Field persistence, node casualties, completeNode()
  chronicle/
    chronicle.js       Battle history prose + hall of honored/fallen
  fortress/
    fortress.js        Fortress upgrade nodes + bonus aggregation
```

### Persistence

| Key | Content |
|---|---|
| `ns-campaign-v2` | Full campaign: roster, stars, gold reserve, fortress levels, bonds, chronicle, **`campaignProgress`** |
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

Mid-battle state is not saved — refresh during a node assault resets that assault. Field state between nodes is saved on node victory.

### Domain model (implemented)

```
Defender (roster)     persistent identity — name, career level, talents, equipment, scars
Tower (combat)        deployed instance linked via defenderId; combatHp for node casualties
_campaignState        stars, goldReserve, fortressUpgrades, bonds, legacyBonuses, chronicle
campaignProgress      map/node unlocks, per-map field persistence
```

`HERO_BUILD_ITEMS` vs `TOWER_BUILD_ITEMS` split warband deploy from structure build in the left dock (WARBAND | STRUCTURES tabs).

### Game phases

```
campaignSelect → nodeMap → playing → debrief → nodeMap
                    ↓
              betweenBattles (War Camp — recruit, upgrade, equip)
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
| Wave count | 2–3 per node | Up to 100 + endless |
| Wave events | Disabled | `WAVE_EVENTS` |

---

## 4. Monolithic `game.js`

`game.js` holds the render loop, all canvas UI (left dock, right panel, campaign select, node map, between-battles screens), and input routing. New **systems** belong in new files under `src/campaign/` etc.; new **UI panels** may stay in `game.js` until extraction is justified.

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

## 6. Migration status (2026-06-24)

| Planned (original doc) | Status |
|---|---|
| Defender entity + roster | ✅ `src/roster/` |
| Campaign save | ✅ `src/campaign/save.js` |
| **100-map campaign** | ✅ `campaignMaps.js`, `campaignRun.js` |
| Chronicle | ✅ `src/chronicle/` |
| Fortress upgrades | ✅ `src/fortress/` |
| Equipment + talents | ✅ |
| Story systems (bonds, scars, retirement, legacy) | ✅ |
| Combat UI: left dock tabs | ✅ WARBAND \| STRUCTURES |
| Pathless campaign combat | ✅ |
| Between-battles as roster home | ✅ War Camp from node map |

---

## 7. Testing

Run from `tower-defense/tower-defense/`:

```
npx vitest run
```

Covers towers, enemies, bullets, pathing, campaign save, **campaign maps**, roster logic (66 tests).

---

## 8. Planned domain extensions (design specs)

*Tactical Squad Management — specs in outer workspace `design/` (also summarized here).*

| System | Status | Key file (when built) |
|--------|--------|------------------------|
| **Hero domain** | Spec | `src/roster/hero.js` — rename Defender; fortress role slot |
| **Fortress roles** | Spec | `src/roster/heroRoles.js` — 6 MVP roles, zone bonuses |
| **Warband composition** | Spec | War Camp presets + deploy hints |
| **Traits (50)** | Spec | Extend `chronicle.js` `TRAIT_DEFS` + gameplay hooks |
| **Difficulty tuning** | Spec | `campaignMaps.js` — lower early curve (see below) |

### Difficulty balance (known issues)

- Map 0 node 0 fights at ~skirmish wave 29 equivalent — **too hard** for 120g / no veterans.
- Each new map resets `fieldState` while difficulty rises with `mapIndex` — **map-start spike**.
- Portal count jumps at maps 15 / 40 / 70 — stacks with above.

**Recommended P1:** `getNodeDifficulty` base `0.12`; `difficultyToEquivWave` use `×50` not `×70`. **P2:** march supplies on map start. **P3:** tutorial cap on map 0 node 0.

Full analysis: outer repo `design/DIFFICULTY_BALANCE.md`.

### Implementation order

1. Difficulty P1–P3  
2. Fortress roles MVP (6) + War Camp picker  
3. Hero UI rename + composition meter  
4. Trait gameplay (expand from 8 → 20, then 50)
