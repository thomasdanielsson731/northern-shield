# Fortress Preparation — Commander Planning Redesign

*Lead UX + Game Director proposal · Design Bible aligned · no implementation*

**Status:** Design proposal for review (Gameplay + Fortress + Player Experience boards)  
**Authority:** [north_star.md](north_star.md) · [FORTRESS_COMMANDER.md](FORTRESS_COMMANDER.md) · [the_first_saga.md](the_first_saga.md)  
**Supersedes:** Prototype left-panel post chips as primary navigation

---

## 1. Executive summary

Fortress Preparation becomes **Commander Planning** — a fortress-centric command table where the player walks their stronghold, inspects threats, strengthens **fronts**, assigns **named defenders**, and commits to a **locked battle plan** before the horn blows.

**Core shift:** Navigation moves from *lists of posts* to *the fortress as a living schematic*. Panels orbit the city; they never compete with it.

**Emotional target:** *"I am preparing my home for battle."*  
**Anti-pattern:** *"I am editing units on a spreadsheet."*

---

## 2. Design Bible alignment

| Principle | How this redesign serves it |
|-----------|------------------------------|
| **§1 Fortress as main character** | 70%+ screen is fortress schematic; UI is command furniture around it |
| **§2 Preparation wins** | All strategic verbs live here; battle is read-only execution |
| **§3 Heroes become legends** | Assignment shows **names + portraits on gates**, not class icons |
| **§5 Buildings unlock systems** | Clicking Treasury/Watch Tower reveals *what it enables*, not +HP |
| **§6 Visual progression** | Scars, patches, stone tiers visible on schematic before horn |
| **§7 Complexity between battles** | Depth in prep layers; battle HUD stays minimal |
| **§9 One screen, one question** | Each layer answers **one** question; categories collapse cognitive load |
| **Screen law §3** | Prep never recruits or opens talent trees — Barracks links to War Camp |
| **Moment #4 Fortress wounded** | Breach scar on gate geometry; repair is a **gate interaction**, not a menu row |
| **Moment #3 Prep wins** | Begin Assault **locks** plan; readiness summary is the commitment beat |

---

## 3. Current problems (diagnosis)

| Problem | Root cause | Redesign fix |
|---------|------------|--------------|
| Mixed hero/building/post concepts | Single left panel lists unrelated nouns | **Categories** + **context panel** tied to selection |
| Unknown focus | No visual hierarchy | **Layer 1** fortress dominates; intel banner answers "where from?" |
| Spreadsheet feel | Chips and rows | **Spatial selection** on schematic; panels as command tables |
| Prep = launch button | Launch divorced from inspection | **Readiness sequence** + ceremonial horn |
| Slice vs future systems shown at once | Prototype shows all posts | **Regional front** + **progressive category unlock** |

---

## 4. Architecture — five layers

Each layer answers exactly one question.

| Layer | Question | Primary surface |
|-------|----------|-----------------|
| **1 — Fortress Overview** | *What is my home and what state is it in?* | Center schematic |
| **2 — Context Panel** | *What can I do to this thing?* | Right panel (dynamic) |
| **3 — Categories** | *What kind of decision am I making?* | Left rail (collapsible) |
| **4 — Regional Defense** | *Which face of the kingdom is threatened?* | Front selector + grouped schematic |
| **5 — Preparation Sequence** | *Am I ready to blow the horn?* | Soft stepper + readiness summary |

Layers stack: **1 is always visible**. Layers 2–4 activate on interaction. Layer 5 is a **mode** toggled by "Review Readiness" or auto-prompt when assault intel is severe.

---

## 5. Screen layout (full vision)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ◀ Command    ASSAULT: Wolf Smoke · WEST FRONT · 2 waves    Gold ◆42  Wood ▣8 │  ← Meta strip (1 line intel)
├──────────┬──────────────────────────────────────────────────────┬───────────┤
│          │                                                      │           │
│ CATEGORY │              FORTRESS SCHEMATIC                      │  CONTEXT  │
│  RAIL    │         (isometric or top-down ring)                 │  PANEL    │
│  240px   │                                                      │  320px    │
│          │    [N Front - dim]                                   │           │
│ ▼ FRONTS │         ╭──Watch──╮                                  │  Dynamic  │
│  ● West  │    ╭────┤  Tower   ├────╮                             │  by       │
│  ○ North │    │    ╰──────────╯    │   ← clickable regions     │  selection│
│  ○ East  │  [G]══════ GATE ═══════[ ]                           │           │
│  ○ South │    │   Longhouse  Treasury │                         │           │
│          │    ╰══════════════════════╯                           │           │
│ ▼ DEFENSE│              ▲ assault arrow (animated, west)       │           │
│  Gates   │                                                      │           │
│  Walls   │                                                      │           │
│  Towers  │                                                      │           │
│ ▼ HEROES │                                                      │           │
│ ▼ MAGIC  │  (locked Age III)                                    │           │
│          │                                                      │           │
├──────────┴──────────────────────────────────────────────────────┴───────────┤
│  [ Review Readiness ]              Advisor: "Raiders aim at the west gate." │
│                          [ ▶▶ BEGIN ASSAULT ]  (gated until ready)         │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Proportions:** Schematic ~65% width, ~80% height. Panels use parchment/dark wood frames — *command table*, not Excel.

**Atmosphere:** Subtle smoke from Longhouse, torch flicker on selected gate, distant horn mute until ready. Ambient wind direction matches assault front.

---

## 6. Information hierarchy

| Priority | Information | Placement |
|----------|-------------|-----------|
| **P0** | Threat direction + assault name | Top meta strip |
| **P0** | Primary threatened front (highlight) | Schematic + front list |
| **P1** | Gate/wall HP state (color + scar art) | On geometry |
| **P1** | Hero assignments on posts | Portrait medallions on gates/towers |
| **P2** | Resources for prep actions | Top-right (battle budget ◆ separate from reserve) |
| **P2** | Advisor line (1 sentence) | Bottom strip |
| **P3** | Category lists | Left rail, collapsed by default |
| **P4** | Stats numbers | Context panel only, never on schematic |

**Rule:** If it's a number, it lives in the **context panel** unless it's P0 (lives remaining equivalent = gate HP on geometry).

---

## 7. Left panel — category rail redesign

Replace flat post list with **collapsible categories**. Only one category expanded at a time (accordion).

### Categories (full game)

| Category | Contains | Slice (Saga I) |
|----------|----------|----------------|
| **FRONTS** | West, North, East, South groupings | **West only** (others shown as sealed stubs) |
| **GATES** | Gate posts on active fronts | West Gate |
| **WALLS** | Wall segments per front | West palisade segment |
| **DEFENSES** | Towers, siege platforms | Watch Tower only |
| **HEROES** | Assignment roster (who's unassigned) | 1 hero → 2 after finale |
| **BUILDINGS** | Longhouse, Treasury, Workshop… | Longhouse, Treasury (view) |
| **SIEGE** | Ballista, catapult platforms | **Locked** "Age III" |
| **MAGIC** | Runes, fortress spells | **Locked** "Saga II+" |

### Interaction rules

- Click category → expands list; **does not** change schematic zoom (avoid disorientation).
- Click list item → **selects on schematic** + opens context panel.
- Empty category → hidden until unlocked (not gray clutter).
- **No** "show all posts" flat list — ever.

### Slice left rail (collapsed)

```
▶ FRONTS
● West Front          ← only active
▶ GATES
  West Gate
▶ DEFENSES
  Watch Tower
▶ HEROES
  Gunnar (unassigned)
▶ BUILDINGS
  Longhouse · Treasury
▸ SIEGE (locked)
▸ MAGIC (locked)
```

---

## 8. Right panel — dynamic context panel

**Never static.** Title = selected object name. Subtitle = role ("Gatekeeper post · West Front").

### Panel anatomy

```
┌─────────────────────────────┐
│ WEST GATE            [×]    │
│ Gatekeeper · Primary threat │
├─────────────────────────────┤
│ [ schematic thumb ]         │
│ HP ████████░░  scarred      │
├─────────────────────────────┤
│ PRIMARY ACTIONS (max 3)     │
│  [ Assign Hero ]            │
│  [ Repair — 10 wood ]       │
│  [ Reinforce (locked) ]     │
├─────────────────────────────┤
│ DETAILS (collapsed)         │
│  Tier: Palisade             │
│  Connected: West Wall       │
└─────────────────────────────┘
```

**Max 3 primary actions** visible — prevents spreadsheet sprawl. Secondary stats behind "Details" chevron.

### Context templates

| Selection | Primary actions | Details |
|-----------|-----------------|---------|
| **Wall segment** | Repair, Upgrade tier, View connected gate | HP, material, rune slots (future) |
| **Gate** | Assign hero, Repair, Brace (future) | HP, scar state, assault weight |
| **Watch Tower** | Assign scout, Upgrade, View intel | Range, intel lines, buffs |
| **Longhouse** | **Open War Camp** (nav), View upgrades | Recruit locked until Settlement |
| **Treasury** | Transfer to reserve, View balance | Campaign vs battle gold explain |
| **Barracks** (future) | **Open War Camp**, View capacity | Never recruit inline — screen law |
| **West Front** (regional) | Assign all heroes, Repair all, Front buffs | Aggregated HP, posts, heroes |
| **Siege platform** | Mount weapon, Upgrade, Clear | Budget ◆ cost |
| **Rune Shrine** (future) | Slot rune, Activate prep buff | Costs, cooldown into battle |

---

## 9. Fortress interaction model

### Schematic principles

- **Fortress occupies center** — not a minimap; this *is* the UI.
- **Click to select** — gates, walls, towers, buildings are hit targets.
- **Hover** — soft highlight + 1-word tooltip ("West Gate · scarred").
- **Selected** — warm glow + context panel sync.
- **Threatened** — assault arrow + pulse on primary front (from intel).
- **Damaged** — crack overlay persists between assaults (moment #4).
- **Repaired** — patch overlay (A3 teach).

### Zoom levels (optional polish)

| Level | Use |
|-------|-----|
| **Realm** | Four fronts visible (post-slice) |
| **Front** | One face fills schematic (default in prep) |
| **Structure** | Auto-zoom on select (subtle, 0.3s) |

Slice uses **Front** level only — west face fills 80% of schematic.

### What is NOT on the schematic

- Grid cells
- Drag handles
- Tower defense build ghosts
- Enemy sprites (intel arrow only)

---

## 10. Selection model

```
States: NONE | FRONT | STRUCTURE | HERO (drag source)

Click empty schematic → NONE (front overview, regional panel)
Click front label/arrows → FRONT selected
Click structure → STRUCTURE selected; category rail syncs
Click hero medallion on gate → STRUCTURE + hero sub-focus
Long-press hero portrait (left HEROES) → drag to gate (advanced; slice: tap-tap assign)
```

**Single selection** at a time. No multi-select except regional "Repair all on West Front" (A3+).

**Keyboard (future):** Tab cycles threatened structures; Enter opens primary action.

---

## 11. Regional defense (Layer 4)

Player thinks in **fronts**, not isolated posts.

### West Front object (slice)

Aggregates:
- West Gate (hero post)
- West palisade segment (wall HP)
- Watch Tower (scout/intel)
- Assigned heroes (medallions)
- Active buffs (future)
- Assault intel modifier ("gate-target weight high")

### Front context panel

When **West Front** selected:

```
WEST FRONT — Threatened
─────────────────────────
Gate HP      ████░░  SCARRED
Wall HP      ██████  OK
Watch Tower  Gunnar (optional scout)

Heroes assigned: 1/1 required
Repairs needed: Gate (10 wood)

[ Repair Gate ]  [ Assign Heroes ]  [ View Intel ]
```

**Bible:** Slice has one front — regional model still teaches the mental model for Age II four-front map without showing four active fronts.

North/East/South appear as **sealed stubs** on schematic (gray stone caps) — teaser from finale.

---

## 12. Preparation sequence (Layer 5)

Soft-guided flow — **not** a forced wizard. Player can skip steps; readiness flags gaps.

```
 ① INSPECT     → Read intel, see assault arrow, survey scars
 ② STRENGTHEN  → Buildings (War Camp if needed), wall tier
 ③ REPAIR      → Gate/wall (wood/stone)
 ④ ASSIGN      → Named heroes to gates/towers
 ⑤ SIEGE       → Mount weapons (post-slice)
 ⑥ RUNES       → Prep activations (post-slice)
 ⑦ READINESS   → Summary + advisor sign-off
 ⑧ ASSAULT     → Horn — plan locks
```

### Stepper UI (bottom-left, subtle)

```
Inspect ● — Strengthen ○ — Repair ○ — Assign ○ — Ready ○
```

Steps **auto-complete** when action taken. Incomplete required steps block horn with **specific** advisor line (*"The west gate still splinters. Mend it."*) — not generic.

### Slice sequence (A0–A4)

| Assault | Required steps | Optional |
|---------|----------------|----------|
| A0 | Assign → Ready | — |
| A1 | Assign → Ready | Watch Tower |
| A2 | Assign → Ready | Read intel |
| A3 | **Repair** → Assign → Ready | — |
| A4 | Assign → Ready | Repair if scarred |

**One new verb per assault** (tutorial pacing) — stepper only shows **unlocked** steps.

---

## 13. Flows

### 13.1 Hero assignment flow

```
1. Player selects West Gate (schematic or GATES list)
2. Context panel: [ Assign Hero ]
3. Overlay: roster strip (named portraits only — slice: 1 hero)
   ┌──────────────────────────────────────┐
   │ Who holds the gate?                  │
   │  [Portrait] Gunnar  Berserker        │
   │   "Preferred: Gatekeeper"            │
   │        [ Confirm Assignment ]        │
   └──────────────────────────────────────┘
4. Medallion appears on gate schematic
5. Advisor: "Gunnar will meet them at the threshold."
6. Stepper marks Assign ●
```

**Never:** class icon without name after A0 naming.  
**Empty post grief:** If player tries Ready with empty required post, gate pulses red + SKALD line.

### 13.2 Building upgrade flow

**Screen law:** Longhouse **upgrade** and recruit live in **War Camp**.

Prep building click (Longhouse/Treasury):
```
Context panel:
  "The Longhouse is where your people gather."
  [ Open War Camp — People ]
  View: Tier I · Smoke + · Recruit locked until Settlement
```

Prep shows **state**; War Camp shows **people progression**. Avoid duplicating upgrade buttons in both places.

**Exception:** Battle-affecting building actions (Treasury **transfer to assault budget**) can live in prep context — that's *preparation*, not roster.

### 13.3 Upgrade flow (walls / structures)

```
1. Select wall segment
2. Context: [ Upgrade to Stone — 30 stone ] (locked in slice until post-boss)
3. Confirm modal: before/after silhouette preview (north star §6)
4. Ceremony for chapter upgrades (finale stone face) — full-screen interrupt, not inline button
```

Slice: **Repair only** on gate (wood). Upgrade button visible but locked with tease *"Stone comes after the Ash-Warden."*

### 13.4 Rune activation flow (post-slice)

```
1. MAGIC category unlocks with Rune Shrine built
2. Select shrine → slot rune (from War Camp inventory)
3. Prep activation: choose **one** battle buff (long cooldown)
4. Activated rune glows on schematic; consumed or cooldown shown
5. Readiness lists active prep effects
```

**Slice:** MAGIC category shows locked shrine silhouette + *"Saga II"* — teaches future without UI bloat.

### 13.5 Repair flow (A3 sacred)

```
1. A3 entry: schematic auto-highlights scarred gate
2. Advisor + stepper forces Repair step visible
3. Select gate → [ Repair — 10 wood ]
4. Short animation: patch appears on schematic (0.8s)
5. SKALD: "The gate bears a patch like a scar."
6. Wood deducted; stepper Repair ●
```

### 13.6 Readiness summary

Triggered by [ Review Readiness ] or horn click when incomplete.

```
┌─────────────────────────────────────────┐
│         READINESS — Wolf Smoke          │
├─────────────────────────────────────────┤
│  West Front                             │
│   ✓ Hero assigned: Gunnar @ West Gate   │
│   ○ Watch Tower: empty (optional)       │
│   ✓ Gate HP: 100% (repaired)            │
│                                         │
│  Assault: 2 waves · west only          │
│  Budget remaining: ◆42                  │
│                                         │
│  Advisor: "The wolves will test speed.  │
│            The gate must hold."         │
│                                         │
│     [ Return to Fortress ]  [ ▶ HORN ] │
└─────────────────────────────────────────┘
```

Incomplete required items list with **jump links** (click → selects gate on schematic).

### 13.7 Battle launch experience

```
1. Player taps BEGIN ASSAULT (from readiness or bottom bar when green)
2. 0.3s horn sting (BRAGI)
3. Brief lock animation: medallions pin to gates; UI panels slide away
4. Schematic expands to battlefield transition (existing horn cut)
5. Plan frozen — no edits in battle
```

**Emotion:** Commitment, not menu confirm. Horn is the **primary CTA** — gold border, bottom center, disabled until ready (dim bronze when not).

---

## 14. ASCII wireframes

### 14.1 Fortress Overview (default — no selection)

```
╔══════════════════════════════════════════════════════════════════════════╗
║ ◀ Map   ASSAULT: Splinter Raid · WEST · 2 waves          Gold ◆28  ▣15 ║
╠════════╦═══════════════════════════════════════════════════════╦═══════╣
║FRONTS  ║                                                       ║ INTEL ║
║● West  ║              ~~ smoke ~~                             ║───────║
║░ North ║         ┌─────────────┐                               ║ Raiders║
║░ East  ║         │ WATCH TOWER │  (empty)                      ║ carry  ║
║░ South ║         └──────┬──────┘                               ║ axes.  ║
║        ║    ┌───────────┴───────────┐                         ║        ║
║GATES   ║    │  ╔══════════════════╗ │  ← assault arrow      ║ Target:║
║ West G ║    │  ║  WEST GATE       ║ │     ══════════►         ║ GATE   ║
║        ║    │  ╚══════════════════╝ │                         ║        ║
║HEROES  ║    │  Longhouse    Treasury│                         ║ Waves:2║
║ Gunnar ║    └───────────────────────┘                         ║        ║
║        ║         palisade ring (west segment highlighted)    ║        ║
║        ║                                                       ║ Click  ║
║        ║   Click any structure to inspect                      ║ any    ║
║        ║                                                       ║ struct ║
╠════════╩═══════════════════════════════════════════════════════╩═══════╣
║  Inspect ●  Repair ○  Assign ○  Ready ○                                  ║
║  "They aim at the west gate."              [ Review Readiness ] [ ▶ HORN]║
╚══════════════════════════════════════════════════════════════════════════╝
```

### 14.2 Wall Selected (west palisade segment)

```
╔══════════════════════════════════════════════════════════════════════════╗
║ ◀ Map   ASSAULT: Splinter Raid · WEST · 2 waves          Gold ◆28  ▣15 ║
╠════════╦═══════════════════════════════════════════════════════╦═══════╣
║FRONTS  ║                                                       ║WEST   ║
║● West  ║    ┌───────────────────────────┐                     ║WALL   ║
║        ║    │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│ ← SELECTED glow       ║───────║
║WALLS   ║    │▓▓▓ west palisade      ▓▓▓│                     ║ HP    ║
║●W seg  ║    │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│                     ║ ████░ ║
║        ║    └───────────┬───────────────┘                     ║ 82%   ║
║        ║         ┌──────┴──────┐                              ║       ║
║        ║         │  WEST GATE  │                              ║ Tier  ║
║        ║         └─────────────┘                              ║Wood I ║
║        ║                                                       ║       ║
║        ║                                                       ║Connec ║
║        ║                                                       ║West G ║
║        ║                                                       ║───────║
║        ║                                                       ║[Repair║
║        ║                                                       ║ 5 wood║
║        ║                                                       ║[Upgrad║
║        ║                                                       ║ LOCKED║
║        ║                                                       ║Details║
╠════════╩═══════════════════════════════════════════════════════╩═══════╣
║  Inspect ●  Repair ○  Assign ○  Ready ○     [ Review ]  [ ▶ HORN ]    ║
╚══════════════════════════════════════════════════════════════════════════╝
```

### 14.3 Barracks / Longhouse Selected (War Camp bridge)

*Slice uses Longhouse — Barracks is Age II+; pattern identical.*

```
╔══════════════════════════════════════════════════════════════════════════╗
║ ◀ Map   ASSAULT: Wolf Smoke · WEST · 2 waves             Gold ◆40       ║
╠════════╦═══════════════════════════════════════════════════════╦═══════╣
║BUILDING║                                                       ║LONG-  ║
║●Longhos║              ┌─────────────┐                           ║HOUSE  ║
║ Treasury║             │▓▓ LONGHOUSE ▓│ ← SELECTED               ║───────║
║        ║              │   ~ smoke ~ │                           ║ Tier I║
║        ║              └─────────────┘                           ║       ║
║        ║         Watch Tower    Treasury                        ║People:║
║        ║              ┌───┐                                     ║ hearth║
║        ║              │ T │                                     ║ for   ║
║        ║              └───┘                                     ║ stories║
║        ║         ┌────────────┐                                 ║       ║
║        ║         │ WEST GATE  │                                 ║Recruit║
║        ║         └────────────┘                                 ║ LOCKED║
║        ║                                                       ║ until ║
║        ║                                                       ║Saga end║
║        ║                                                       ║───────║
║        ║                                                       ║PRIMARY║
║        ║                                                       ║[Open  ║
║        ║                                                       ║War Camp║
║        ║                                                       ║[View  ║
║        ║                                                       ║ smoke]║
╠════════╩═══════════════════════════════════════════════════════╩═══════╣
║  "Rest happens at the fire — not on the wall."     [ Review ] [ ▶ HORN ]║
╚══════════════════════════════════════════════════════════════════════════╝
```

### 14.4 Ready for Assault (readiness mode)

```
╔══════════════════════════════════════════════════════════════════════════╗
║ ◀ Map   ASSAULT: Ash-Warden · WEST · 3 waves             Gold ◆55  ▣0  ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                          ║
║                    ┌─────────────────────────────┐                       ║
║                    │     READINESS SUMMARY       │                       ║
║                    ├─────────────────────────────┤                       ║
║                    │  ✓ Gunnar → West Gate       │                       ║
║                    │  ✓ Gate repaired (patched)  │                       ║
║                    │  ○ Watch Tower (empty)      │  optional             ║
║                    │  ─────────────────────────  │                       ║
║                    │  Boss: Ash-Warden · 3 waves │                       ║
║                    │  Budget: ◆55                │                       ║
║                    │                             │                       ║
║                    │  "The west must hold."      │                       ║
║                    │                             │                       ║
║                    │ [ Back ]    [ ▶▶ BLOW HORN ]│ ← gold, pulsing       ║
║                    └─────────────────────────────┘                       ║
║                                                                          ║
║     (schematic dimmed behind summary — fortress still visible)           ║
║                                                                          ║
╠══════════════════════════════════════════════════════════════════════════╣
║  Inspect ●  Strengthen ●  Repair ●  Assign ●  Ready ●                    ║
╚══════════════════════════════════════════════════════════════════════════╝
```

### 14.5 Slice tutorial A0 (minimal)

```
╔══════════════════════════════════════════════════════════════════════════╗
║ FIRST NIGHT — 1 wave · west only                                         ║
╠════════╦═══════════════════════════════════════════════════════╦═══════╣
║ (hidden║              ┌─────────────┐                           ║       ║
║  categ)║              │ WATCH TOWER │  dim                      ║ Assign║
║        ║              └──────┬──────┘                           ║ hero  ║
║        ║         ┌─────────────┴─────────────┐                   ║ to    ║
║        ║         │  ╔═══════════════════╗  │  PULSING            ║ gate  ║
║        ║         │  ║   WEST GATE       ║  │                   ║       ║
║        ║         │  ╚═══════════════════╝  │                   ║[Pick  ║
║        ║         └─────────────────────────┘                   ║Gunnar]║
║        ║                                                       ║       ║
╠════════╩═══════════════════════════════════════════════════════╩═══════╣
║  "Put your fighter on the West Gate."              [ ▶ HORN ] (locked)  ║
╚══════════════════════════════════════════════════════════════════════════╝
```

---

## 15. Slice vs full game (phasing)

| Element | Saga I (ship now) | Full Commander Planning |
|---------|-------------------|-------------------------|
| Fronts | West only | Four fronts |
| Categories | 5 visible, 2 locked | 8 categories |
| Context actions | Max 2 primary | Max 3 primary |
| Buildings in prep | View + War Camp link | + siege/magic structures |
| Stepper steps | 3–4 visible | Full 8 |
| Schematic zoom | Front (west) | Realm + Front |
| UI element budget | Per `the_first_saga.md` §16 | Expanded post-slice |

**Implementation strategy:** Build **full layout shell** with **slice content fill** — avoids second redesign at Settlement.

---

## 16. War Camp boundary (critical)

| Action | Screen |
|--------|--------|
| Assign hero to gate/tower | **Fortress Prep** |
| Repair gate/wall | **Fortress Prep** |
| Mount siege | **Fortress Prep** (post-slice) |
| Activate prep runes | **Fortress Prep** (post-slice) |
| Recruit, name, talents | **War Camp** |
| Longhouse upgrade (people) | **War Camp** |
| Equip, rune inventory | **War Camp** |
| Treasury reserve rules | **War Camp** view; transfer to battle budget in Prep |

Prep **shows** building status; War Camp **changes** people and meta buildings. Context panel CTA: *Open War Camp* with return path preserved.

---

## 17. Board review hooks

| Board | Review focus |
|-------|----------------|
| **SKJOLD** | Phase law, one-question-per-layer |
| **GARDR** | Post assignment on schematic |
| **RUNE** | Stepper vs tutorial pacing |
| **GRID** | Wireframes, hierarchy |
| **HAMARR** | Ceremony vs inline upgrade |
| **WITNESS** | A0–A3 comprehension |
| **BJORN** | Slice scope — no rune/siege in v1 |

---

## 18. Success metrics (playtest)

- Player describes prep as *"getting my fortress ready"* (interview)
- <10% misclick rate on first assignment (A0)
- Time-to-horn A1: 45–90s (not instant, not lost)
- Players mention gate scar unprompted after A2
- Zero attempts to recruit from prep (confusion metric)

---

## 19. Next steps (design iteration)

1. **Wireframe pass 2:** Watch Tower selected, Repair confirm, Horn lock animation storyboard
2. **Fortress + PX board** review of this doc
3. **WITNESS** script A0–A3 on paper prototype
4. **Implementation spec** in `IMPLEMENTATION_ROADMAP.md` Phase: Commander Planning shell

---

*Preparation is the game. The horn is the period at the end of the sentence.*
