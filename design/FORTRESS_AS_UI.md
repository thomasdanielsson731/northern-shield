# Fortress as the User Interface

*Northern Shield · Places, People, Ceremonies — not menus*

**Status:** Creative direction proposal · supersedes panel-first Fortress Prep  
**Authority:** [north_star.md](north_star.md) · [FORTRESS_COMMANDER.md](FORTRESS_COMMANDER.md) · [the_first_saga.md](the_first_saga.md) · [moments_to_protect.md](moments_to_protect.md)  
**Replaces:** Menu/panel navigation in [FORTRESS_PREP_REDESIGN.md](FORTRESS_PREP_REDESIGN.md) (schematic + ceremony beats may carry forward)

---

## Executive thesis

> **The fortress is not a screen you open. It is how you play.**

Northern Shield stops asking players to operate **abstract UI** (tabs, lists, context panels, chips). Players **inhabit** a Viking stronghold: they walk to the gate, speak with the captain, hear the quartermaster at the treasury chest, mend the wall with builders, and blow the war horn from the battlement.

**North star §1:** The fortress is the main character — it must also be the **primary interface**.  
**North star §9** evolves: not "one screen, one question" but **one place, one purpose**.

---

# 1. Fortress Navigation Philosophy

## 1.1 Core rule

**Navigate by moving through space, not by opening menus.**

| Old grammar | New grammar |
|-------------|-------------|
| Open War Camp tab | Walk to **Longhouse** |
| Open Fortress Prep | Walk the **walls** and **gates** |
| Click Assign in panel | Speak with **Captain** at the gate |
| Open Treasury UI | Visit **Quartermaster** at the chest |
| Press Begin Assault | **Blow the war horn** on the wall |
| Confirm dialog | **Ceremony** at the fire / hall |

## 1.2 The fortress as map

One persistent **Fortress Homestead** view — a compound the camera travels across. No left rail. No right context panel. No category accordion.

```
PLAYER POSITION = CAMERA FOCUS = CURRENT "PLACE"
```

**Places** are click targets or walk-to hotspots on the homestead:
- **Destinations** (buildings with interiors: Longhouse, Treasury yard, future Barracks)
- **Defensive sites** (West Gate, Watch Tower, wall segments)
- **Thresholds** (horn platform, courtyard, command pole for assault intel)

## 1.3 Interaction verbs (physical)

| Verb | Meaning |
|------|---------|
| **Walk** | Camera pans/zooms to a place (0.4–0.8s) |
| **Enter** | Cross building threshold → interior scene |
| **Inspect** | Close-up on damage, hero at post, resource pile |
| **Speak** | Advisor dialogue at that place |
| **Act** | In-world action (hammer repair, assign defender, slot rune) |
| **Return** | Camera pulls back to homestead overview |
| **Sound the horn** | Ceremony at gate — commits assault |

## 1.4 What navigation is NOT

- Scrolling lists of posts
- Tabs (Warband | Structures | Fortress)
- Modal forms with OK/Cancel
- HUD-heavy management screens
- Grid placement as primary verb

## 1.5 Phase model (revised screen laws)

Phases remain spiritually identical to [FORTRESS_COMMANDER.md](FORTRESS_COMMANDER.md); **presentation** unifies under one fortress:

| Phase | Place law | Never |
|-------|-----------|-------|
| **Homestead (between fights)** | People places — Longhouse, Treasury | Battlefield visible |
| **Wall walk (prep)** | Defensive places — gates, towers, scars | Recruit ceremony (until unlocked) |
| **Battle** | Through the gate — combat field | Build, shop, recruit |
| **Aftermath** | Courtyard gathering → Skald at fire | Layout editor |

War Camp and Fortress Prep **merge visually** into one homestead; **place law** replaces screen law.

---

# 2. Living Fortress Concept

## 2.1 Design goal

The stronghold must feel **inhabited**, not like a static level select backdrop.

## 2.2 Living elements (by tier)

| Element | Village (slice) | Settlement+ | Fortress+ | Citadel+ |
|---------|-----------------|-------------|-----------|----------|
| **Villagers** | 3–5 silhouettes | 12+ | crowds | districts |
| **Builders** | — | 2 with tools | repair crews | mason guild |
| **Blacksmith** | — | smoke only | visible forge | enchant sparks |
| **Training** | — | 1–2 sparring | barracks yard | elite guard |
| **Smoke** | Longhouse chimney | +granary | +forge | ritual pyres |
| **Animals** | goat, raven | dogs, horses | war hounds | dragon perch |
| **Children** | — | 1–2 (hope) | refugees | market play |
| **Campfires** | central fire | multiple | braziers on walls | signal fires |
| **Flags/banners** | tattered cloth | named clan | facing colors | rune standards |
| **Bell tower** | — | warning bell | assault bell | citadel chimes |
| **Weather** | overcast wind | rain on scars | snow siege | aurora (magic) |
| **Season** | late autumn | winter prep | spring rebuild | saga years |

## 2.3 Reactive life (system-driven)

Life reacts to **game state**, not random decoration:

| State | Fortress reacts |
|-------|-----------------|
| Gate scarred | Builders point at west gate; villagers glance west |
| Assault queued | Scouts on tower; captain at gate; horn ready |
| Low gold | Quartermaster arms crossed at empty chest |
| Post-assault win | Courtyard relief — people return to chores |
| Boss imminent | Bell toll; children indoors; fire dimmed |
| Settlement | New faces arrive; stone dust; hope motif |

## 2.4 Bible alignment

- **§1** — Home feels alive; attachment to *place*
- **§6** — Tier growth adds life density, not just bigger walls
- **Moment #6** — War Camp as people: Longhouse interior *is* the hearth fantasy
- **Moment #9** — Settlement: refugees visible before recruit UI

---

# 3. Building Interaction Design

Every building answers **"What happens here?"** and owns **one primary fantasy**.

## 3.1 Building destination table (full game)

| Building | Physical home | Primary systems | Advisor host | Slice |
|----------|---------------|-----------------|--------------|-------|
| **Longhouse** | Fire pit interior | Story, naming, chronicle, recruit ceremonies | **Skald** | ✅ Tier I |
| **Tiny Treasury** | Buried chest + post | Gold reserve, battle budget | **Quartermaster** | ✅ |
| **West Gate** | Gate threshold | Hero assignment, brace, horn | **Captain** | ✅ |
| **Watch Tower** | Tower stairs | Intel, scout assign | **Scout** | ✅ |
| **Wall segment** | Walkable parapet | Repair, reinforce, tier | **Master Builder** | ✅ (west) |
| **Barracks** | Bunk + yard | Roster view, training, promotions | **Captain** | Finale tease |
| **Workshop** | Forge yard | Siege mount, engineering | **Master Builder** | 🔒 Age III |
| **Temple** | Shrine interior | Healing, blessings | **High Priest** | 🔒 Age II+ |
| **Rune Hall** | Rune shrine | Spells, rune prep | **Seer** | 🔒 CUT slice |
| **Smithy** | Anvil | Weapons, armor | **Armorer** | 🔒 |
| **Great Hall** | Hall interior | Oaths, kingdom events, major promotions | **Jarl's voice** | 🔒 Age III |

## 3.2 Interaction pattern (every building)

```
1. CLICK building on homestead (or walk hotspot)
2. CAMERA travels → threshold pause
3. ENTER (optional interior) or INSPECT (outdoor site)
4. ADVISOR greets in-character at this place
5. PLAYER acts with in-world props (not form fields)
6. RETURN to homestead overview
```

### Example — West Gate (slice)

```
[Click West Gate]
  Camera: pan to gate, slight low angle
  Captain steps into frame: "The west road is restless."
  Visual: gate HP as physical damage (splinters, not a bar)
  Actions: [Place Gunnar on the wall] [Call builders — repair]
  Horn rack visible when ready
```

### Example — Longhouse (slice)

```
[Click Longhouse]
  Camera: enter smoke-warm interior
  Skald by fire: "Sit. The saga is not finished."
  Actions: read chronicle scroll · name hero (post-A0) · (recruit locked)
  No battlefield through door — only night sky
```

### Example — Treasury (slice)

```
[Click chest near Longhouse]
  Quartermaster: "Battle gold spends fast. The chest keeps the rest."
  Visual: coins in chest, split piles (battle ◆ vs reserve)
  Actions: drag coins to pouches (physical metaphor) — no number dialog
```

## 3.3 Defensive sites vs meta buildings

| Type | Navigation | Interior? |
|------|------------|-----------|
| **Defensive site** | Wall walk camera track | No — always outdoor |
| **Meta building** | Enter threshold | Yes — intimate scene |
| **District** (Citadel+) | Pan to cluster | Optional overview only |

---

# 4. Advisor System

## 4.1 Philosophy

**Replace generic UI notifications with familiar characters at places.**

Advisors are not a chat log in the corner. They **appear** where they belong:

| Advisor | Home | Voice |
|---------|------|-------|
| **Scout** | Watch Tower | Terse, directional |
| **Quartermaster** | Treasury | Practical, worried about stores |
| **Master Builder** | Wall / Workshop | Proud, hands dirty |
| **Captain** | Gate / Barracks | Duty, names soldiers |
| **High Priest** | Temple | Solemn, conditional |
| **Skald** | Longhouse fire | Saga, memory, prose |
| **Seer** | Rune Hall | Cryptic, costly |

## 4.2 Delivery rules

- **One advisor at a time** per place (no council dump)
- **Max 2 lines** per interruption (slice rule carries)
- **No** red exclamation quest markers — instead character walks to player
- Urgent intel: Scout **descends tower** and calls from courtyard
- Critical block (unrepaired gate): Builder **at the scar**, not modal

## 4.3 Familiarity arc

| Campaign age | Advisor relationship |
|--------------|---------------------|
| Village | Skald + Captain only |
| Settlement | + Quartermaster, Scout |
| Fortress | + Master Builder, High Priest |
| Citadel | Full cast; callbacks to earlier lines |

## 4.4 Slice cast (Saga I)

| Advisor | Appears when |
|---------|--------------|
| **Skald** | Naming, debrief echoes, chronicle |
| **Captain** | Gate assignment, horn readiness |
| **Scout** | A1+ tower, intel lines |
| **Quartermaster** | A1 treasury teach |
| **Master Builder** | A3 repair at scar |

---

# 5. Ceremony System

## 5.1 Philosophy

**Replace confirmation dialogs with memorable transitions.**

Every high-stakes decision gets a **short scene** (3–15 seconds). Low-stakes actions stay in-world (hammer on wall).

## 5.2 Ceremony catalog

| Event | Place | Beats | Slice |
|-------|-------|-------|-------|
| **New recruit** | Longhouse fire | Stranger steps from dark; naming; clan welcomes | Finale |
| **Hero promotion** | Great Hall | Torchlight; title spoken; crowd | 🔒 |
| **Naming** | Longhouse fire | Player speaks name; Skald repeats | ✅ A0 |
| **Settlement upgrade** | West wall | Builders raise stone; crowd watches | ✅ Finale |
| **Fortress tier** | Homestead pan | Time-lapse silhouette morph | Post-slice |
| **Battle start** | West Gate horn | Captain steps aside; horn; cut to field | ✅ All |
| **Battle end** | Courtyard | Survivors limp in; Skald begins prose | ✅ Debrief lead-in |
| **Chronicle write** | Longhouse | Skald inks scroll; entry appears | ✅ |
| **Repair complete** | Gate scar | Builders step down; patch visible | ✅ A3 |
| **Talent choose** | Longhouse | Veteran teaches at fire (one pick) | ✅ A3 |
| **Boss warning** | Tower + bell | Bell + Scout line | ✅ A4 |

## 5.3 Ceremony vs friction

| Use ceremony | Skip ceremony |
|--------------|---------------|
| First time per chapter | Repeat repair on same gate |
| Recruit, promote, tier | Optional tower assign |
| Horn assault start | — always |
| Settlement, stone wall | — always |

**Skippable after first view** (hold Esc / click "Let them continue") — except horn and finale.

---

# 6. Building-as-UI Architecture

## 6.1 Technical concept (design-level)

```
┌─────────────────────────────────────────────────────────┐
│                 FORTRESS HOMESTEAD SCENE                 │
│  (single canvas / scene graph — persistent between acts) │
├─────────────────────────────────────────────────────────┤
│  Layers:                                                 │
│   L0 Terrain + sky + weather                             │
│   L1 Structures (clickable destinations)               │
│   L2 Living actors (villagers, advisors, animals)        │
│   L3 Damage overlays (scars, smoke intensity)            │
│   L4 Interaction highlights (hover glow, path hints)     │
│   L5 Ceremony overlay (fullscreen vignette when needed)  │
│   L6 Minimal chrome (assault name, resources as props)   │
└─────────────────────────────────────────────────────────┘
```

## 6.2 Place state machine

```
HOMESTEAD_OVERVIEW
  ├─→ PLACE_GATE ──→ ASSIGN_CEREMONY ──→ HOMESTEAD
  ├─→ PLACE_TOWER ──→ SCOUT_DIALOGUE ──→ HOMESTEAD
  ├─→ PLACE_WALL ──→ REPAIR_ACTION ──→ HOMESTEAD
  ├─→ INTERIOR_LONGHOUSE ──→ NAMING / CHRONICLE ──→ HOMESTEAD
  ├─→ INTERIOR_TREASURY ──→ QUARTERMASTER ──→ HOMESTEAD
  ├─→ WALL_WALK_TRACK ──→ (sequential inspect) ──→ HOMESTEAD
  └─→ HORN_CEREMONY ──→ BATTLE_TRANSITION ──→ COMBAT_FIELD
```

## 6.3 Resource display (no top-bar spreadsheet)

Resources appear as **world props**:

| Resource | Physical representation |
|----------|-------------------------|
| Gold (battle) | Coin pouch on captain's belt / prep table |
| Gold (reserve) | Chest pile (Treasury place) |
| Wood | Timber stack by gate (A3+) |
| Stone | Mason pallets (post-A4) |

Hover pouch → Quartermaster line, not tooltip grid.

## 6.4 Assault intel

**Command pole** or **scout map** at tower — unrolled scroll showing west arrow, wave count, enemy flavor. Not a header string.

---

# 7. Transition Storyboards

## 7.1 Command Map → Homestead (prep)

```
Frame 1: Map node "Splinter Raid" selected
Frame 2: Map zooms toward west node
Frame 3: Crossfade — map becomes fortress aerial
Frame 4: Camera descends into homestead; wind audio rises
Frame 5: Scout on tower turns; Captain walks to gate
Frame 6: Player control — click to explore
```

## 7.2 Homestead → Battle (horn)

```
Frame 1: Player at horn post; Captain nods
Frame 2: Horn lift animation (0.5s)
Frame 3: Horn blast — audio peak; UI chrome fades
Frame 4: Gate doors open outward; camera pushes through
Frame 5: Hard cut to combat deployment (assignments visible on field)
Frame 6: Wave 1 spawns — plan locked
```

## 7.3 Battle → Aftermath (courtyard)

```
Frame 1: Last enemy falls; desaturate
Frame 2: Fade from field back through gate (reverse horn path)
Frame 3: Courtyard — survivors, damaged gate visible behind
Frame 4: Skald steps from Longhouse doorway
Frame 5: Prose overlay (not stats grid) — who held, what broke
Frame 6: Choices as places: [Longhouse fire] [West Gate again]
```

## 7.4 Naming ceremony (A0)

```
Frame 1: Longhouse interior; fire crackle
Frame 2: Hero silhouette warming hands
Frame 3: Skald: "The wall will remember a name."
Frame 4: Name input as carved rune on beam (not form dialog)
Frame 5: Carving glow; name spoken aloud
Frame 6: Return to homestead — name banner on gate post
```

## 7.5 Settlement stone ceremony (finale)

```
Frame 1: Courtyard crowd; refugees visible
Frame 2: Master Builder gestures at west palisade
Frame 3: Timelapse — stone rises (1.2s)
Frame 4: Skald chapter title: Saga I — The Settlement
Frame 5: Stranger at fire — recruit choice (Valkyrie / Military)
Frame 6: Second naming mini-ceremony
```

---

# 8. Camera Movement Concepts

## 8.1 Camera grammar

| Move | Duration | Use |
|------|----------|-----|
| **Pan** | 0.5–0.8s | Homestead → building |
| **Dolly in** | 0.4s | Enter interior |
| **Orbit slow** | 1.2s | Tier upgrade ceremony |
| **Track** | 1.0s | Wall walk prep sequence |
| **Push through** | 0.3s | Gate → battle |
| **Crane up** | 0.8s | Pull back to overview |

Easing: ease-in-out; never snappy mobile UI snap.

## 8.2 Default anchors

```
ANCHOR_OVERVIEW     — 3/4 view of full compound
ANCHOR_WEST_WALL    — parapet track, west facing
ANCHOR_GATE         — hero eye level at threshold
ANCHOR_TOWER_BASE   — lookup at scout
ANCHOR_LONGHOUSE_IN — fire-side medium shot
ANCHOR_COURTYARD    — aftermath gathering
ANCHOR_HORN         — close on horn + hands
```

## 8.3 Wall walk (prep flow camera)

Suggested automated **optional** guided path for first-time players:

```
Overview → West wall damage → Gate → Tower → Treasury → Gate horn
```

Player can break track anytime by clicking another place. Track completes → Captain offers horn.

## 8.4 Slice constraint

One **outdoor camera rig** + one **Longhouse interior** + **Treasury nook** — no full interior for every building until Settlement tier.

---

# 9. Audio Concepts

## 9.1 Place-based soundscapes

| Place | Bed | Interaction |
|-------|-----|-------------|
| Homestead overview | Wind, distant hammer, raven | Footsteps on dirt |
| Longhouse | Fire crackle, murmur | Skald voice dry |
| Treasury | Coin clink, chest creak | Quartermaster gravel voice |
| West Gate | Wood stress, rope creak | Armor shuffle on assign |
| Watch Tower | High wind, flag snap | Scout whistle |
| Wall walk | Foot on timber | Hammer on repair |
| Horn ceremony | Silence → blast | Reverb across valley |
| Courtyard aftermath | Crowd relief, wounded | Skald begins low |

## 9.2 Advisor audio

- Distinct voice filter per advisor (not one narrator)
- Lines triggered by **proximity** to place, not popup
- Urgent lines **pan** from direction (west threat from left)

## 9.3 Music

- **No** looped epic during prep — sparse drone
- Horn moment: single brass sting (battle entry)
- Ceremony: swell only on Settlement / promotion
- Slice: ≤3 musical motifs total

## 9.4 Bible

- **Moment #1** First Night: sparse — wind, not orchestra
- **BRAGI** review: every critical cue has visual twin (INGIRD)

---

# 10. Progressive UI Evolution (Village → Last Bastion)

Fortress tier and **interface maturity** are the same curve ([fortress_progression.md](fortress_progression.md)).

| Tier | Fortress look | Navigation | Advisors | Ceremonies |
|------|---------------|------------|----------|------------|
| **Village** | Palisade, one fire, chest | 4 places + wall walk | 3 voices | Naming, horn, debrief |
| **Settlement** | Stone footings, barracks smoke | +Barracks, granary | +QM, Builder | Recruit fire, repair |
| **Fortress** | Stone curtain, four gates | District pan; Great Hall | Full cast | Hall promotion, multi-post |
| **Stronghold** | Crenellations, siege yard | Workshop interior | Specialist | Siege mount ritual |
| **Citadel** | Magic district glow | Rune Hall, Temple | Seer, Priest | Spell prep, blessings |
| **Last Bastion** | Legendary skyline | City-scale pan; memorial ave | Echoes of all | Saga chapters, legacy |

### UI chrome by tier

| Tier | Chrome level |
|------|--------------|
| Village | **Zero** persistent HUD — props only |
| Settlement | Small coin pouch icon (optional) |
| Fortress | Facing indicators on command pole |
| Citadel | Rune cooldown orbs on shrine (diegetic) |
| Last Bastion | Chronicle stone in courtyard (always visible) |

**Rule:** Higher tier = **more places**, not **more menus**.

---

# 11. Wireframes (places, not panels)

## 11.1 Homestead overview (Village / slice)

```
                    ~~ wind / grey sky ~~
                           🦅
              ┌─────────────────────────┐
              │      WATCH TOWER        │  ← click → climb, Scout
              │         🧭              │
              └───────────┬─────────────┘
    timber ═══════════════╪═══════════════  west wall walk →
              ┌───────────▼───────────┐
              │    ╔═════════════╗    │  ← click → Captain, assign
              │    ║  WEST GATE  ║    │     horn here when ready
              │    ╚═════════════╝    │
              └───────────┬───────────┘
         ┌────────────────┼────────────────┐
         │   LONGHOUSE    │    💰 chest    │
         │   ~ smoke ~    │  Quartermaster │
         │  click → fire  │  click → coins │
         └────────────────┴────────────────┘
              villagers · goat · banners

        [ No left panel ]    [ No right panel ]
        Scout line from tower: "West road, movement."
```

## 11.2 West Gate place (assignment — not a roster panel)

```
        ═══════════════════════════════════════
        ║  WEST GATE — splintered planks      ║
        ═══════════════════════════════════════
                    🛡️ Gunnar (on wall)

        CAPTAIN (in scene):
        "He stands where they'll come first."

        [ Tap Gunnar ] → swap / confirm
        [ Call for timber ] → Builder arrives (A3)

        🦌 Horn on post (glows when assignment valid)

        ← walk back to courtyard
```

## 11.3 Longhouse interior (people — not War Camp tabs)

```
        ╔═══════════════════════════════════════╗
        ║  LONGHOUSE — firelight                ║
        ║                                       ║
        ║      🔥   SKALD: "Sit with us."       ║
        ║                                       ║
        ║   [ scroll: chronicle ]               ║
        ║   [ name carved on beam ]  (A0+)     ║
        ║   [ empty stool — "Saga II" ] 🔒      ║
        ║                                       ║
        ║   door shows night — NO battlefield   ║
        ╚═══════════════════════════════════════╝

        exit → homestead overview
```

## 11.4 Wall walk — inspect damage (A2 scar teach)

```
    camera TRACK along parapet ──────────────►

    ║▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓║
    ║▓▓▓ CRACK — splinter ║▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓║
    ║▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓║

    BUILDER at scar: "Timber will hold — for now."

    [ Hammer repair ]  (wood stack nearby)

    no HP bar — damage is ART
```

## 11.5 Horn ceremony (battle start)

```
    ┌─────────────────────────────────────────┐
    │                                         │
    │     CAPTAIN steps aside                   │
    │                                         │
    │          🎺 ← player hand                 │
    │                                         │
    │     "When you blow — the plan is set."   │
    │                                         │
    │         [ SOUND THE HORN ]               │
    │                                         │
    └─────────────────────────────────────────┘
    gate behind begins to open ──► BATTLE
```

## 11.6 Courtyard aftermath (debrief entry — not stats screen)

```
    gate (damaged) visible in background

    survivors lean on walls
    SKALD approaches from Longhouse

    "The west gate held. Gunnar lives.
     The wolves tasted iron."

    [ Go to the fire ]  [ Walk the wall again ]

    (stats in scroll on fire if player wants — not default)
```

---

# 12. Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Scope explosion** (interiors, actors, camera) | High | Slice: 1 interior + outdoor places only; phase interiors by tier |
| **Slower prep loop** (travel time) | Medium | Camera moves <0.8s; guided track optional; skip on repeat |
| **Discoverability** (where to click?) | Medium | First assault: Captain walks to player; subtle glow on gate |
| **Conflicts with screen laws** | Medium | Place laws document; recruit only at Longhouse fire |
| **Engine cost** (canvas scene graph) | Medium | Start 2.5D layered art; not full 3D |
| **Accessibility** (camera motion) | Medium | `prefers-reduced-motion`: cuts not pans; text log of advisor lines |
| **Repeat player fatigue** | Low | Ceremony skip; advisors shorten lines on repeat |
| **Multi-front complexity** | Low (post-slice) | Command pole rotates to active front; sealed gates visible but inactive |

---

# 13. Opportunities

| Opportunity | Why it matters |
|-------------|----------------|
| **Unified homestead** | War Camp + Prep become one emotional space |
| **Streamer-readable** | Viewers see *a place*, not opaque UI |
| **Attachment multiplier** | Naming at fire > naming in modal |
| **Premium positioning** | Supergiant/Hades hub quality in strategy genre |
| **Tier marketing** | Screenshots sell progression without UI |
| **Chronicle integration** | Skald place is natural story hub |
| **DLC/expansion** | New buildings = new destinations, not new menus |
| **Slice still shippable** | 4 places + horn + fire = Saga I complete |

---

# 14. Fortress Preparation — place-based flow

## Full game walk

```
Walk the walls        → inspect scars
Repair at damage      → Builder + timber
Visit Longhouse       → hear saga, check people
Visit Barracks        → Captain, roster
Visit Workshop        → siege mounts
Visit Temple          → blessings (if unlocked)
Visit Rune Hall       → prep magic (if unlocked)
Return to Gate        → review assignments on wall
Sound the horn        → battle
```

## Saga I flow (slice)

```
A0: Gate only → assign → horn
A1: + Tower (Scout) · + Treasury (QM teach)
A2: Wall scar teach · intel scroll at tower
A3: Builder repair at gate · talent at fire
A4: Bell + boss intel · horn
Finale: Stone ceremony at wall · recruit at fire
```

**One new place or verb per assault** — tutorial pacing preserved.

---

# 15. What to REMOVE (menu thinking)

## From current prototype — remove entirely

| Element | Why it feels like a menu |
|---------|--------------------------|
| **Left post chip list** | Abstract list, not a place |
| **WARBAND \| STRUCTURES tabs** | Spreadsheet navigation |
| **Right context panel with action buttons** | CRM UI, not a stronghold |
| **Category accordion rail** (prior redesign) | Still a menu attached to fortress |
| **Begin Assault flat button** | Confirm dialog grammar |
| **Readiness summary modal** | Spreadsheet checklist — replace with Captain walk + horn |
| **Deploy bar / structure dock** | TD UI; violates commander fantasy |
| **Grid as player-facing prep** | Tile editor, not gate command |
| **Gold numbers in top bar** | Replace with pouch + chest |
| **Tooltip stat grids** | Numbers at places only when inspecting |
| **War Camp as separate abstract screen** | Merge into homestead places |
| **Fortress tab building cards** | Card grid = menu; visit building instead |
| **Recruit as shop panel** | Ceremony at fire only |
| **Generic toast notifications** | Advisor at place |
| **OK/Cancel dialogs** | Ceremonies or in-world actions |

## From [FORTRESS_PREP_REDESIGN.md](FORTRESS_PREP_REDESIGN.md) — supersede

| Element | Replace with |
|---------|--------------|
| Left category rail | Click destinations on homestead |
| Right dynamic context panel | Advisor + in-scene props |
| Preparation stepper UI | Optional wall-walk camera track |
| Review Readiness button | Captain invitation to horn |
| Max 3 primary actions panel | Physical affordances in scene |

## What to KEEP (compatible)

| Element | As place-based version |
|---------|------------------------|
| West Gate + Watch Tower posts | Gate and Tower **places** |
| Regional west front focus | West wall camera track |
| Scar / repair persistence | Art on wall walk |
| Horn locks plan | Horn ceremony |
| No battle-phase shop | Unchanged |
| Intel before assault | Scout scroll at tower |

---

# 16. Board review checklist

| Reviewer | Question |
|----------|----------|
| **SKJOLD** | Do place laws preserve prep-vs-battle separation? |
| **HEIDR** | Does every building answer "what happens here?" |
| **GRID** | Can players find gate assignment without a list? |
| **HAMARR** | Do tier ceremonies match fortress growth? |
| **SKALD** | Is fire the chronicle home? |
| **WITNESS** | A0 path ≤3 clicks to horn? |
| **BJORN** | Slice = 4 places + 1 interior — shippable? |
| **GARDR** | Assignment at gate, not roster panel? |

---

# 17. Implementation phasing (design only)

| Phase | Deliverable |
|-------|-------------|
| **P0 Slice** | Homestead overview + Gate + Longhouse interior + Horn ceremony |
| **P1** | Tower + Treasury places + wall walk + repair animation |
| **P2** | Courtyard aftermath + advisor actors |
| **P3** | Barracks yard + Settlement ceremonies |
| **P4** | Workshop, Temple, multi-front command pole |
| **P5** | Rune Hall, Great Hall, district pan |

---

## Final sentence

The player should never think *"I opened another menu."*  
They should think *"I walked to the west gate, spoke with the Captain, mended the wall with the builders, sat by the fire while the Skald remembered our names, and blew the horn when the fortress was ready."*

That is Northern Shield.
