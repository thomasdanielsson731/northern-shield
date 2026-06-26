# Difficulty Balance — Campaign

*Analysis 2026-06-24. **P1–P3 implemented 2026-06-22** in `campaignMaps.js`. Code: `getWaveBands()` in `game.js` (skirmish).*

## Verdict

| Area | Rating |
|------|--------|
| Mid-map node (field snowball) | ✅ Well balanced |
| Map 0 node 0 (first fight) | ❌ Too hard |
| New map node 0 (field reset) | ❌ Spike |
| Portal tiers (15/40/70) | ⚠️ Steep |
| Boss scaling | ✅ OK |
| Skirmish 100-wave | ✅ Separate curve |

## Root causes

1. **`getNodeDifficulty` floor 0.35** → map 0 node 0 ≈ skirmish wave **29** (HP scale ~2.4×).  
2. **`difficultyToEquivWave`:** `8 + difficulty × 70` — too aggressive early.  
3. **Per-map field reset** — 120g start while `mapIndex` keeps rising.  
4. **Portal cliff** — 2nd portal at map 15 stacks on fresh field.  
5. **No campaign wave events** — skirmish has relief; campaign does not.

## Measured equivalents (current code)

| Situation | Eqv. wave | HP scale |
|-----------|-----------|----------|
| Map 0, nod 0, våg 1 | ~29 | 2.4× |
| Map 0, boss | ~50 | 3.5× |
| Map 40, nod 0 | ~39 | 2.9× |
| Map 99, nod 0 | ~56 | 3.9× |
| Map 99, boss | ~95 | 5.7× |

With 120g and 2–3 heroes, wave 1 spawns ~14 enemies / ~4000 total HP — high leak risk on pathless.

## Recommended fixes (priority)

| P | Change | Effect |
|---|--------|--------|
| **P1** | Lower difficulty base `0.35` → `0.12`; equiv `×70` → `×50` | Softer early curve |
| **P2** | March supplies on new map: `startGold += min(reserve×0.15, 80) + mapIndex×2` | Softer map-start spike |
| **P3** | Tutorial node 0:0 — max 8 enemies, 1 portal, 2 waves | First impression |
| **P4** | Move 2 portals to map 20+ | Less double punishment |
| **P5** | Light campaign node events (10% relief) | Variation |
| **P6** | +20 hero combat HP in campaign | Fewer early casualties |
| **P7** | War Camp composition warnings | Meta, not raw DPS |

## Target win rates

| Phase | Maps | Target |
|-------|------|--------|
| Tutorial | 0, nodes 0–2 | ~90% |
| Learning | 0–10 | ~75% |
| Expansion | 11–30 | ~65% |
| Mastery | 31–60 | ~55% |
| Veteran | 61–90 | ~45% |
| Legend | 91–100 boss | ~35% |

## Three economies (balance together)

- **Field gold** — placement during assault  
- **Gold reserve** — 25% of earned → recruit/fortress  
- **Stars** — Shrine + bosses → star-gates  

Map-start spike threatens field gold most; reserve/stars cannot compensate placement on node 0.
