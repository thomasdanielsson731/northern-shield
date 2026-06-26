# Northern Shield — Economy Flow

*Three layers · many resources · gold is not king*

Economy serves **tension between now and later** and **prevents one-number optimization**. See [economy.md](economy.md) philosophy and [domain_architecture.md](domain_architecture.md) Economy domain.

---

## Layer model

```
┌─────────────────────────────────────────────────────────────┐
│  KINGDOM ECONOMY  — identity, slow, saga-scale               │
│  Reputation · Ancient Knowledge · Relics · Glory             │
└───────────────────────────┬─────────────────────────────────┘
                            │ gates buildings & myth systems
┌───────────────────────────▼─────────────────────────────────┐
│  CAMPAIGN ECONOMY  — fortress growth between assaults          │
│  Wood · Stone · Iron · Food · Workers                          │
└───────────────────────────┬─────────────────────────────────┘
                            │ repairs, build, recruit upkeep
┌───────────────────────────▼─────────────────────────────────┐
│  BATTLE ECONOMY  — assault-time circulation                  │
│  Gold · Emergency repairs · Temporary boosts (rare)          │
└─────────────────────────────────────────────────────────────┘
```

**Flow principle:** Battle earns **liquidity**; Campaign spends **structure**; Kingdom spends **identity**.

---

## Battle Economy

### Gold (◆)

| | |
|--|--|
| **Earned** | Enemy kills; wave clear bonus; Quartermaster aura; gate hold streak |
| **Spent** | *(Campaign target)* minimal in-fight — no shop in assault |
| **Why it exists** | Immediate feedback — *the fight paid*; funds field state between nodes |
| **Anti-gold-dominance** | Cannot buy stone/iron/knowledge; cap flows to Treasury reserve; plunder on breach **removes** gold |

### Stars (✦) — battle performance meta

| | |
|--|--|
| **Earned** | Assault rating (lives left, speed, gate integrity) |
| **Spent** | Runes (via Rune Shrine/Forge) — **not** raw stats on everything |
| **Why it exists** | Rewards **execution quality** without flooding campaign materials |
| **Anti-gold-dominance** | Separate wallet; tied to magic layer, not recruitment |

### Emergency repairs (tokens)

| | |
|--|--|
| **Earned** | Rare wave event; Captain Quartermaster once per region |
| **Spent** | Mid-assault gate patch *(skirmish / optional hard mode only in campaign)* |
| **Why it exists** | Safety valve without making prep irrelevant |
| **Anti-gold-dominance** | Token not gold — scarcity by count |

### Temporary boosts (Age IV+)

| | |
|--|--|
| **Earned** | Kingdom Glory spend; Temple blessing |
| **Spent** | Next assault only — +morale, +intel |
| **Why it exists** | Boss week drama |
| **Anti-gold-dominance** | Consumes Glory/Food, not gold |

---

## Campaign Economy

### Wood

| | |
|--|--|
| **Earned** | Lumber Camp; victory bundles Age II+; event caravan |
| **Spent** | Palisade repair; Granary; Workshop traps; temporary scaffolds |
| **Why it exists** | **Growth and repair** — perishable, local |
| **Anti-gold-dominance** | Gold cannot convert to wood without Market (reputation) |

### Stone

| | |
|--|--|
| **Earned** | Quarry; boss milestones; region clear |
| **Spent** | Curtain wall; Great Hall; gate tier; outer bailey |
| **Why it exists** | **Permanence** — what survives centuries |
| **Anti-gold-dominance** | Quarry requires workers + food, not gold rush |

### Iron

| | |
|--|--|
| **Earned** | Mine; elite kills (bundle); Forge quests |
| **Spent** | Smithy crafts; ballista/catapult; armor; gate fixtures |
| **Why it exists** | **War** — tools of violence |
| **Anti-gold-dominance** | Armory crafts lock recipes behind Scriptorium |

### Food

| | |
|--|--|
| **Earned** | Fields (Granary); event harvest; trade |
| **Spent** | Roster upkeep per assault; workers; Dragon Roost; army morale |
| **Why it exists** | **People cost** — attachment has price |
| **Anti-gold-dominance** | Starving roster blocks recruit even if gold-rich |

### Workers

| | |
|--|--|
| **Earned** | Barracks tiers; refugee events (+pop cap) |
| **Spent** | Assign to Lumber/Quarry/Mine — **opportunity cost** |
| **Why it exists** | Civilization-style **tile-less workforce** |
| **Anti-gold-dominance** | Cannot buy workers with gold — housing + food |

---

## Kingdom Economy

### Reputation

| | |
|--|--|
| **Earned** | Boss victories; diplomacy choices; saga milestones; aid caravans |
| **Spent** | Market unlocks; ally reinforcements; Dragon Roost; trade rates |
| **Why it exists** | **Political capital** — who speaks for the North |
| **Anti-gold-dominance** | Merchants refuse gold without standing |

### Ancient Knowledge

| | |
|--|--|
| **Earned** | Scriptorium; boss lore; rare discoveries; chronicle firsts |
| **Spent** | Research nodes; Rune Hall; Mage Tower; fortress spells |
| **Why it exists** | **Civilization vertical** — what the fortress *knows* |
| **Anti-gold-dominance** | No grind conversion; boss-gated spikes |

### Relics

| | |
|--|--|
| **Earned** | Boss drops; unique events; Age IV+ (one fortress slot) |
| **Spent** | Equip on fortress OR hero — **choice** |
| **Why it exists** | **Artifact fantasy** — named power |
| **Anti-gold-dominance** | Unique, not purchasable |

### Glory

| | |
|--|--|
| **Earned** | Legend ranks; perfect assault; saga chapters completed |
| **Spent** | Cosmetic skyline; temporary boost; epilogue branches |
| **Why it exists** | **Prestige** — Idle Heroes / CoC endgame motivation |
| **Anti-gold-dominance** | Vanity + minor rule — not DPS |

---

## Economy by Age (summary)

| Age | New resources | Primary tension |
|-----|---------------|-----------------|
| I | Gold | Survive today |
| II | Wood, Food | Feed vs repair |
| III | Stone, Iron | Hall vs walls |
| IV | Workers, Reputation, Knowledge | Research vs repair boss week |
| V | Glory, Relics | Magic upkeep vs spell power |
| VI | *(convergence)* | Final sinks — legacy |

---

## Sinks and faucets (health)

| Resource | Faucet control | Sink depth |
|----------|----------------|------------|
| Gold | Kill rate cap | Treasury, recruit, plunder |
| Wood | Camp level | Repairs, traps, events |
| Stone | Quarry workers | Walls, halls — **deep** |
| Iron | Mine + elites | Craft — **deep** |
| Food | Granary | Upkeep — **recurring** |
| Reputation | Boss-limited | Diplomacy — **branching** |
| Knowledge | Scriptorium | Research — **wide but shallow tree** |

**Inflation guard:** Victory bundles scale sub-linearly; upkeep scales with roster; neglected front **taxes** food.

---

## Player-facing wallets per screen

| Screen | Show |
|--------|------|
| Battle | Gold, lives, stars (if earned this assault) |
| Fortress Prep | Field gold, repair material costs |
| War Camp | Reserve gold, wood/stone/iron/food, reputation |
| Research | Knowledge |
| Citadel+ | Glory, relic slot |

Never all wallets on battle HUD.

---

## Exchange rules (anti arbitrage)

- Gold **⇄** wood: Market only, poor rate
- Stars **never** buy stone
- Knowledge **never** from grind — discovery only
- Relics **never** stack — one fortress relic

---

## Prototype mapping

| Resource | Status |
|----------|--------|
| Gold, reserve, stars | ✅ Live |
| Wood–Glory | Design |

---

## See also

- [building_dependency_tree.md](building_dependency_tree.md)
- [unlock_philosophy.md](unlock_philosophy.md)
- [progression_tree.md](progression_tree.md)
