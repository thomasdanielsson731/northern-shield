# Northern Shield — Architecture Review

*Last updated: 2026-06-22. Written against the Fortress Defense RPG vision. For day-to-day coding rules see [CLAUDE.md](CLAUDE.md).*

---

## 1. Current State (2026)

Northern Shield is a **Fortress Defense RPG**: named defenders, persistent campaign, fortress upgrades, and wave defense. The four domain layers below are all implemented.

### Source map

```
src/
  main.js              entry point — imports assets then game
  assets.js            sprite manifest (SPRITES shared object)
  config.js            runtime sprite scale helpers
  core/
    renderer.js        canvas + ctx (DPR scaling)
    game.js            ≈11 000 lines — combat loop, UI, input (intentionally monolithic)
    sounds.js          Web Audio API procedural SFX
  entities/
    tower.js           Tower class + TOWER_DEFS (defender classes + structures)
    enemy.js           Enemy class + ENEMY_DEFS
    bullet.js          Bullet class (homing projectiles)
  grid/
    grid.js            Grid class, CELL enum, BFS pathfinding
  roster/
    defender.js        Defender identity, XP, scars, traits
    roster.js          Roster collection + persistence helpers
    talents.js         Career talent definitions
    items.js           Equipment definitions
    names.js           Procedural Norse name pool
  campaign/
    save.js            Campaign state load/save (localStorage)
    events.js          Named between-battle events
  chronicle/
    chronicle.js       Battle history prose + hall of honored/fallen
  fortress/
    fortress.js        Fortress upgrade nodes + bonus aggregation
```

### Persistence

| Key | Content |
|---|---|
| `northern-shield-campaign` | Full campaign: roster, stars, gold reserve, fortress levels, bonds, chronicle, seen events |
| `northern-shield-hs` | Leaderboard (8 entries) |
| `northern-shield-ach` | Achievement IDs |
| `northern-shield-map-best` | Per-map best records |

Mid-battle state is not saved — refresh during combat resets the current battle.

### Domain model (implemented)

```
Defender (roster)     persistent identity — name, career level, talents, equipment, scars
Tower (combat)        deployed instance linked via defenderId; placement level 1–10 per battle
_campaignState        stars, goldReserve, fortressUpgrades, bonds, legacyBonuses, chronicle
```

`TOWER_DEFS` still names the static class templates (historical naming). `HERO_BUILD_ITEMS` vs `TOWER_BUILD_ITEMS` split warband deploy from structure build in the combat UI.

### Game phases

`mapSelect` → `playing` → `betweenBattles` (with optional campaign event card, retirement ceremony, debrief overlay).

---

## 2. Design priorities (unchanged)

1. **Defender roster** — attachment through names, progression, equipment, retirement
2. **Fortress development** — persistent upgrades between battles
3. **Wave defense** — validates roster and fortress decisions

Roguelite full-reset is not a goal. Speed/reaction is not the primary skill expression.

---

## 3. Monolithic `game.js`

`game.js` holds the render loop, all canvas UI (warband panel, structures bar, dossier, right panel, between-battles screens), and input routing. New **systems** belong in new files; new **UI panels** may stay in `game.js` until extraction is justified by maintenance pain.

`_panelDirty` skips right-panel offscreen cache when static. Chronicle and roster list use chip-width caches.

---

## 4. Scalability notes

| Risk | Mitigation |
|---|---|
| `game.js` size | Extract UI only when a panel stabilizes; avoid splitting combat tick |
| Campaign save growth | Chronicle entries are bounded per battle; filter chips limit render |
| Pathfinding | BFS before every placement; tested in `tests/pathing.test.js` |
| Particle cap | 300 particle ceiling in `spawnParticles` |

---

## 5. Migration status (2026-06-22)

| Planned (original doc) | Status |
|---|---|
| Defender entity + roster | ✅ `src/roster/` |
| Campaign save | ✅ `src/campaign/save.js` |
| Chronicle | ✅ `src/chronicle/` |
| Fortress upgrades | ✅ `src/fortress/` |
| Equipment + talents | ✅ |
| Story systems (bonds, scars, retirement, legacy) | ✅ |
| Combat UI: warband left / structures bottom | ✅ Option B layout |
| Between-battles as primary roster home | 🟡 partial — roster panel exists, combat HUD still dense |

---

## 6. Testing

Run from `tower-defense/tower-defense/`:

```
npx vitest run
```

Covers towers, enemies, bullets, pathing, campaign save, roster logic.
