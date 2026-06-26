# Northern Shield — System Dependency Map

*Every system reinforces another — no orphans*

When a system appears, what unlocks it, what it needs, and what it strengthens. Timelines reference [progression_tree.md](progression_tree.md) Ages.

---

## Master reinforcement graph

```mermaid
flowchart LR
  subgraph core [Core Loop]
    PREP[Fortress Prep]
    BTL[Battle]
    CHR[Chronicle]
  end

  subgraph growth [Growth]
    BLD[Buildings]
    ECO[Economy]
    RES[Research]
  end

  subgraph people [People]
    HRO[Heroes]
    EQ[Equipment]
    LEG[Legend Ranks]
  end

  subgraph power [Power]
    RUN[Runes]
    HSP[Hero Spells]
    FSP[Fortress Spells]
    DRG[Dragon Defense]
  end

  subgraph place [Place]
    WUP[Wall Upgrades]
    ENG[Engineering]
    MAG[Magic Layer]
    FTH[Faith]
  end

  BLD --> PREP
  BLD --> ECO
  ECO --> BLD
  RES --> BLD
  RES --> MAG

  HRO --> PREP
  HRO --> BTL
  LEG --> HSP
  EQ --> HRO
  RUN --> HRO
  RUN --> WUP

  PREP --> BTL
  BTL --> CHR
  CHR --> LEG
  CHR --> RES

  WUP --> BTL
  ENG --> PREP
  FSP --> BTL
  HSP --> BTL
  DRG --> BTL

  FTH --> HRO
  MAG --> FSP
  MAG --> HSP
```

---

## System reference table

| System | Appears (Age) | Unlocked by | Depends on | Strengthens |
|--------|---------------|-------------|------------|-------------|
| **Defensive posts** | II | Watch Tower + multi-gate | Heroes roster, Fortress tier | Prep, Battle readability |
| **Fortress roles** | II | Barracks II | Hero assignment | Prep advisor, Battle zones |
| **Traits** | II | Recruit / naming | Heroes | Chronicle, Battle hooks |
| **Wood economy** | II | Lumber Camp | Barracks | Palisade, Workshop |
| **Food economy** | II | Granary | Lumber Camp | Roster, Dragon upkeep |
| **Stone economy** | III | Quarry + boss | Workers, food | Walls, Great Hall |
| **Iron economy** | III | Mine + region | Quarry | Smithy, siege |
| **Great Hall promotions** | III | Stone Curtain | Stone, gold | Legend ranks, caps |
| **Chronicle titles** | III | Great Hall I | Battle results | Glory, Research gates |
| **Runes** | III | Rune Shrine + stars | Boss stars, Hall II | Heroes, gates |
| **Crafting** | III–IV | Smithy → Forge | Iron, Armory | Equipment, siege |
| **Equipment** | III | Armory | Crafting, bosses | Heroes, Battle |
| **Weapons** | III | Armory I | Iron | Hero identity, Engineer |
| **Armor** | IV | Forge I | Iron, knowledge | Tank path, injuries |
| **Amulets** | IV | Temple + Market | Reputation, relics | Support, Mage |
| **Research** | IV | Scriptorium | Knowledge, Hall II | All Age V systems |
| **Reputation** | II–IV | Boss, events | Chronicle | Market, Dragon, diplomacy |
| **Ancient Knowledge** | IV | Scriptorium | Boss lore | Research, Rune Hall |
| **Engineering** | IV | Workshop | Smithy, research | Walls, catapult, traps |
| **Wall upgrades** | II–V | Stone → rune walls | Stone, knowledge | Fortress survival, visuals |
| **Faith** | IV | Temple | Healing Lodge, memorial | Morale, geas, heals |
| **Hero Spells** | V | Mage Tower + Jarl | Knowledge, legend rank | Battle clutch, saga |
| **Fortress Spells** | V | Rune Hall | Knowledge, rune walls | Prep depth, Battle awe |
| **Magic layer** | V | Rune Hall + Tower | Research myth branch | Runes, spells, walls |
| **Dragon defense** | V | Dragon Roost | Reputation, boss | Sky lane, Rider class |
| **Diplomacy** | IV | Market II | Reputation | Events, assault relief |
| **Injuries** | IV | Healing Lodge | Battle falls | Prep choices, Faith |
| **Legacy succession** | VI | High King fall | Chronicle | Heroes, Glory |
| **Glory** | V–VI | Saga milestones | Chronicle | Cosmetics, boosts |
| **Relics** | IV+ | Boss, discovery | Reputation | Equipment, fortress |

---

## Equipment cluster

```mermaid
flowchart TB
  IRON[Iron Economy]
  SM[Smithy]
  ARM[Armory]
  FRG[Forge]
  RES[Research recipes]

  IRON --> SM
  SM --> ARM
  SM --> FRG
  RES --> FRG

  ARM --> WPN[Weapons]
  ARM --> ARMOR[Armor]
  TMP[Temple] --> AMU[Amulets]
  REL[Relics] --> AMU

  WPN --> HRO[Heroes]
  ARMOR --> HRO
  AMU --> HRO
  HRO --> BTL[Battle]
  HRO --> CHR[Chronicle legendary lines]
```

**When:** Weapons Age III; Armor Age IV; Amulets Age IV; Relics boss-gated.

---

## Magic cluster

```mermaid
flowchart TB
  STARS[Stars]
  RS[Rune Shrine]
  RH[Rune Hall]
  SCR[Scriptorium]
  MT[Mage Tower]

  STARS --> RS
  RS --> RUN[Runes on heroes/gates]
  SCR --> RH
  RH --> FSP[Fortress Spells]
  RH --> WUP[Rune Walls]
  MT --> HSP[Hero Spells]
  LEG[Jarl rank] --> HSP
  RUN --> BTL[Battle]
  FSP --> BTL
  HSP --> BTL
```

**When:** Runes Age III; Fortress spells Age V; Hero spells Age V.

**Depends on:** Knowledge myth branch; never before Citadel emotional beat.

---

## Engineering & walls cluster

```mermaid
flowchart TB
  WOOD[Wood]
  STONE[Stone]
  WKS[Workshop]
  ENG[Engineering research]

  WOOD --> PAL[Palisade repair]
  STONE --> CUR[Stone Curtain]
  CUR --> WUP[Wall tier upgrades]
  WKS --> TRP[Traps]
  ENG --> TRP
  TRP --> PREP[Fortress Prep]
  WUP --> BTL[Gate HP / breach]
  CAT[Catapult Platform] --> ENG
```

**Strengthens:** Siege Specialist heroes; Preparation; reduces gold-only repair fantasy.

---

## Faith cluster

```mermaid
flowchart TB
  HL[Healing Lodge]
  TMP[Temple]
  INJ[Injuries]
  MOR[Morale events]

  HL --> TMP
  BTL[Battle falls] --> INJ
  INJ --> HL
  TMP --> FTH[Faith abilities]
  TMP --> GEAS[Geas costs for magic]
  FTH --> HRO[Hero recovery]
  GEAS --> FSP[Fortress Spells risk]
```

**When:** Lodge Age II; Temple Age IV; geas pairs with Age V magic sacrifice.

---

## Dragon cluster

```mermaid
flowchart TB
  REP[Reputation peak]
  MKT[Market III]
  BOSS[Dragon omen boss]
  ROOST[Dragon Roost]
  RIDER[Drakship class]
  SKY[Sky lane assaults]

  REP --> ROOST
  MKT --> ROOST
  BOSS --> ROOST
  ROOST --> RIDER
  ROOST --> DRG[Dragon defense]
  DRG --> SKY
  SKY --> BTL[Battle]
  FOOD[Food upkeep] --> ROOST
```

**Strengthens:** Age V awe; Glory; chronicle myth chapters.

**Not:** pet collection; parallel to heroes not replacement.

---

## Crafting cluster

| Input | Process | Output strengthens |
|-------|---------|-------------------|
| Iron + wood | Smithy I | Gate fixtures, basic arms |
| Iron + knowledge | Forge II | Named weapons, armor tiers |
| Iron + stars | Rune Forge | Rune upgrades |
| Food + iron | Workshop | Trap ammo, fire pots |

**Unlock:** Smithy III; Forge IV; always **building + recipe**, not level.

---

## Chronicle as hub

Chronicle does not power combat directly — it **unlocks permissions**:

- Titles → Glory
- Fallen Jarl → Legacy succession
- Boss first kill → Knowledge
- MVP streak → Reputation
- Saga chapter → Epilogue branch

**Every system reports facts to Chronicle; Chronicle gates kingdom resources.**

---

## Skirmish isolation

| System | Campaign | Skirmish |
|--------|----------|----------|
| Posts | ✓ | — |
| Maze walls | — | ✓ |
| Legend ranks | ✓ | partial |
| Kingdom economy | ✓ | — |

Skirmish **feeds** combat testing only — no reputation, no dragon.

---

## Orphan detection (design QA)

| System | Orphan risk? | Mitigation |
|--------|--------------|------------|
| Glory | Vanity only | Boosts + skyline + epilogue |
| Workers | Hidden | Advisor always shows assignment |
| Faith | Niche | Pairs with magic geas + heal |
| Diplomacy | Off-map | Command map events |
| Traits | Flavor | Gameplay hooks + chronicle |

---

## See also

- [domain_architecture.md](domain_architecture.md)
- [future_systems.md](future_systems.md)
- [unlock_philosophy.md](unlock_philosophy.md)
- [building_dependency_tree.md](building_dependency_tree.md)
