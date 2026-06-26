# Northern Shield — Future Systems

*Placeholders · how they fit · not implementation tasks*

This document maps **later systems** to the fortress vision. Nothing here is approved for immediate coding. Check [north_star.md](north_star.md) before promoting any item to a sprint.

---

## How to read this doc

| Column | Meaning |
|--------|---------|
| **Fortress phase** | Earliest era that fits emotionally |
| **Unlock building** | Typical building gate |
| **Player fantasy** | Why it exists |
| **Depends on** | Prerequisite systems |

---

## Runes

| | |
|--|--|
| **Phase** | Fortress → Citadel |
| **Building** | Rune Shrine (field) + Rune Forge (meta) |
| **Fantasy** | Weave magic into steel and stone |
| **Depends on** | Stars economy, siege posts |

**Fit:** Runes modify **named heroes** and **gates**, not anonymous tiles. Citadel tier adds fortress-scale runes (wall veins).

**Prototype:** Star-purchased runes on towers — migrate toward Forge + legend rank.

---

## Hero equipment — weapons & armor

| | |
|--|--|
| **Phase** | Stronghold |
| **Building** | Armory, Forge |
| **Fantasy** | Gunnar carries **Jarl’s axe** — seen in chronicle |
| **Depends on** | Iron economy, crafting |

**Fit:** Equipment changes **silhouette** and **one signature rule**, not ten stat lines. Legendary gear is **named** and **scarce**.

**Prototype:** Two equipment slots + item runes — expand with tiers and visuals.

---

## Fortress spells

| | |
|--|--|
| **Phase** | Citadel |
| **Building** | Ritual circle / Rune Forge III |
| **Fantasy** | The wall **answers** the jarl’s call |
| **Depends on** | Ancient knowledge, rune walls |

**Fit:** Loaded in **Fortress Prep**; fired in battle with long cooldown and **cost** (knowledge, gate integrity, food). Never a row of hotbar skills.

Examples: Frost Ward on west face, Ancestral Spears, Earthshake under siege tower.

---

## Hero spells

| | |
|--|--|
| **Phase** | Citadel |
| **Building** | Great Hall II+ |
| **Fantasy** | Captain becomes **myth** on the field |
| **Depends on** | Jarl rank, legend ladder |

**Fit:** One **signature** ability per hero at high rank — automatic or single manual trigger. Tied to saga (*“since the breach of wave 40”*).

---

## Research

| | |
|--|--|
| **Phase** | Stronghold |
| **Building** | Scriptorium |
| **Fantasy** | Recover what the old kings knew |
| **Depends on** | Ancient knowledge resource |

**Fit:** Branching tree with **fewer, fatter** nodes — not 200 +1% perks. Nodes unlock **systems** (crafting tier, diplomacy, spell school).

---

## Crafting

| | |
|--|--|
| **Phase** | Stronghold |
| **Building** | Forge |
| **Fantasy** | We make what merchants won’t sell |
| **Depends on** | Iron, optional recipes from research |

**Fit:** Craft between assaults; queue optional. Outcomes feed equipment and **siege ammo** choices in prep.

---

## Dragon defense

| | |
|--|--|
| **Phase** | Citadel |
| **Building** | Dragon perch (district) |
| **Fantasy** | Even myths guard the last bastion |
| **Depends on** | Reputation peak, boss arc |

**Fit:** Not a pet collector — **one** dragon bond per campaign path. Defends a **face** or **sky lane**; costs food and reputation upkeep.

---

## Diplomacy

| | |
|--|--|
| **Phase** | Stronghold |
| **Building** | Market + envoy camp |
| **Fantasy** | The fortress is a **political** entity |
| **Depends on** | Reputation, command map events |

**Fit:** Light at first — aid caravan, tribute demand, choose ally for boss week. No 4X map — **events on command map**.

---

## World map

| | |
|--|--|
| **Phase** | Stronghold → Last Bastion |
| **Building** | N/A (meta screen) |
| **Fantasy** | The North is **larger** than our hill |
| **Depends on** | 100-region campaign scaffold |

**Fit:** Epilogue states per region cleared; optional **strategic** layer for NG+ (fog, allied forts). Current 100-map campaign is **seed** for this.

---

## Traits & chronicle (extend, don’t replace)

| | |
|--|--|
| **Phase** | Settlement+ |
| **Status** | ✅ 50 traits live |

**Future:** Traits interact with diplomacy and injuries; chronicle exports **book** at Last Bastion.

---

## Defensive posts (in flight)

| | |
|--|--|
| **Phase** | Settlement |
| **Status** | 🟡 `defensivePosts.js` + `fortressPrep` |

See [DEFENSIVE_POSTS.md](DEFENSIVE_POSTS.md) — implementation spec parallel to this foundation doc.

---

## Systems explicitly deferred

| System | Why wait |
|--------|----------|
| PvP | Breaks attachment pacing |
| Infinite endless as primary | Roguelite reset conflicts with fortress character |
| Maze building in campaign | Violates preparation / execution split |
| More tower types | Heroes + buildings carry fantasy |

---

## Promotion path (doc → sprint)

1. Idea lands in this file
2. Check [north_star.md](north_star.md) gate
3. Add slice to [roadmap.md](roadmap.md) phase
4. Write implementation spec (like `DEFENSIVE_POSTS.md`)
5. Code + tests

---

## Legacy implementation specs

These predate the Foundation Phase but remain valid **engineering references**:

- [FORTRESS_COMMANDER.md](FORTRESS_COMMANDER.md)
- [DEFENSIVE_POSTS.md](DEFENSIVE_POSTS.md)
- [IMPLEMENTATION_ROADMAP.md](IMPLEMENTATION_ROADMAP.md)
- [HERO_DOMAIN.md](HERO_DOMAIN.md)
- [FORTRESS_ROLES.md](FORTRESS_ROLES.md)
- [TRAITS.md](TRAITS.md)
- [WARBAND_COMPOSITION.md](WARBAND_COMPOSITION.md)
- [DIFFICULTY_BALANCE.md](DIFFICULTY_BALANCE.md)

When legacy specs conflict with **vision.md** or **north_star.md**, update the legacy spec or mark it deprecated.

---

## See also

- [roadmap.md](roadmap.md)
- [economy.md](economy.md)
- [buildings.md](buildings.md)
