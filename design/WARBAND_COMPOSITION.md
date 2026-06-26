# Warband Composition

> **Status:** MVP implemented in `src/roster/warbandComposition.js` — presets, deploy hints, composition meter (2026-06-22).

Players build a **squad** in War Camp, then **deploy** a subset per **assault**. Placement is tactics; composition is strategy.

## What makes a good warband?

| Pressure | Question |
|----------|----------|
| Lanes | Cover 1–4 portals? |
| Ramparts | Walls hold while heroes reposition? |
| Pace | Clear 2–3 waves before lives run out? |
| Campaign | Veterans survive across nodes without burnout? |

## Deploy count

`minimum ≈ 3 + portalCount` heroes. Scale up for boss nodes and 3-wave nodes.

| Situation | Deploy |
|-----------|--------|
| Map 0–14, 1 portal | 4–5 |
| Map 15–39, 2 portals | 6–7 |
| Map 40–69, 3 portals | 7–8 |
| Map 70+, 4 portals | 8–9 |
| Boss node | 8–10 |
| Farm / ★ node | 4–6 |

## Role quotas (of deployed heroes)

| Profile | Tank | Support | Control | ST DPS | AOE |
|---------|------|---------|---------|--------|-----|
| Beginner | 2 | 1 | 0–1 | 2 | 0–1 |
| Balanced | 2 | 1 | 1 | 2 | 1 |
| Fortress defense | 3 | 1 | 1 | 1 | 1 |
| Boss hunter | 1 | 1 | 0 | 3–4 | 1 |
| Rune focus | 1 | 1 | 0 | 1 | 1 |

**Soft rules:** ≥1 tank on 2+ portals; ≥1 support or control on 3-wave nodes; max 4 ST DPS without control.

## Five archetypes

1. **The Shield Wall** (Beginner) — Berserker + Valkyrie gate/wall, Healer core. Shield Wall synergy.  
2. **The Northern Line** (Balanced) — full role coverage, Winter Grip (Skald + Ice Giant).  
3. **The Iron Ring** (Fortress) — dual Gatekeepers, structures + Shrine/Barracks cluster.  
4. **The Jarl's Bane** (Boss hunter) — Chieftain Hunters, Eagle Eye, save for boss nodes only.  
5. **The Star Forge** (Rune) — Rune Keeper + Quartermaster, farm ★ between bosses.

## Anti-patterns

Deathball at GOAL · Permadeploy all 10 every node · No economy structures · Ignoring adjacency synergies · Boss comp on farm nodes.
