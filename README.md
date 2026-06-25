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

## Defenders

The warband is the player's primary asset. Defenders persist across battles with XP, levels, talents, and equipment.

| Defender | Role |
|---|---|
| Berserker | Melee burst, anti-swarm |
| Valkyrie | Long-range sniper, anti-boss |
| Archer | Fast-fire attrition, reliable DPS |
| Catapult | AoE siege, anti-cluster |
| Blondie | Crowd control, stun on hit |
| Warden | Balanced ranged, generalist |
| Healer | Support, sustain |
| Ice Giant | Nova AoE, mass slow |
| Dragonship | Heavy siege, long-range splash |

## Fortress Structures

Walls and buildings are strategic assets that grow between battles:

- **Shield Walls** — redirect enemies, create kill-zones
- **Great Hall** — fortress center, sets roster capacity
- **Barracks** — unlocks new defender classes
- **Watch Towers** — passive range/vision bonuses
- **Treasury** — resources and equipment storage
- **Rune Forge** — craft and apply runes to defenders

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

## Documentation

| File | Purpose |
|------|---------|
| [CLAUDE.md](CLAUDE.md) | Coding reference |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Domain model, campaign, planned systems |
| [ART_DIRECTION.md](ART_DIRECTION.md) | Sprite rules |

Design specs (Hero domain, fortress roles, traits, balance): outer workspace `design/` — see monorepo `tower-defence/design/README.md`.
