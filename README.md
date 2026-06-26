# Northern Shield

Norse dark-fantasy **Fortress Defense RPG** built on HTML5 Canvas. Command a persistent warband across **100 campaign maps** (four-front command map, pathless assaults) or optional **skirmish** classic maze TD.

## Modes

- **Campaign (default):** 100 regions, 10–30 **assaults** each, 2–3 waves/assault. Command map + War Camp between assaults. Field persists (max 10 heroes + 10 structures); fallen heroes respawn next assault.
- **Skirmish:** 3 maps, 100-wave maze TD with BFS path validation — via Skirmish Mode on campaign select.

## Core Fantasy

Lead a growing band of veteran defenders. They gain experience, level up, and earn names. The fortress expands battle by battle. A Berserker who survived wave 50 is not the same one who faced wave 1.

## Tech Stack

- JavaScript + HTML5 Canvas
- ES Modules
- Vite dev server
- No external game engine

## Defenders (Warband — persistent XP, levels, talents, equipment)

| Defender | Code | Role |
|---|---|---|
| Berserker | `berserk` | Melee burst, anti-swarm |
| Valkyrie | `valkyrie` | Long-range sniper, anti-boss |
| Archer | `military` | Fast-fire attrition, reliable DPS |
| Blondie | `blondie` | Crowd control, slow field |
| Healer | `hydda` | Support, warband HP sustain |
| Ice Giant | `isjatten` | Nova AoE, mass slow |

## Fortress Structures (placeable on field, fortress zone only)

Siege structures, gates, and outpost buildings. They do not earn XP — that is the warband's domain.

- **Fortress Gate** — top enemy priority until breached; placed in ring-wall gaps
- **Watch Tower / Ballista / Catapult / Piltorn / Dragonship** — siege and outpost structures
- **Barracks / Rune Shrine / Mine** — passive support structures

**Planned:** Great Hall (roster capacity), Treasury (gold reserve expansion), Rune Forge (rune crafting)

## Enemies

| Enemy | Threat |
|---|---|
| Draugr | Undead infantry swarm |
| Myling | Flying ghost, bypasses walls |
| Jötunn | Boss-tier tank, extreme HP |
| Mara | EMP nightmare spirit, disables defenders |

## Design Goals

- Defenders feel like characters, not units
- Long-term roster progression — battle 20 should feel different from battle 1
- Loss is painful but never feels unfair
- Strategic deployment over reaction speed
- Persistent, not roguelite

## Development

From the **inner repo root** (`tower-defense/`):

```bash
cd tower-defense
npx vite          # dev server — http://localhost:5173
npx vitest run    # tests
```


| File | Purpose |
|------|---------|
| [CLAUDE.md](CLAUDE.md) | Coding reference |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Domain model, campaign, planned systems |
| [ART_DIRECTION.md](ART_DIRECTION.md) | Sprite rules |

Design specs (Hero domain, fortress roles, traits, balance): outer workspace `design/` — see monorepo `tower-defence/design/README.md`.
