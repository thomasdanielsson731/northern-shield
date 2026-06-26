# Fortress as the User Interface

*Production spec · First Saga (Level 1) · Executive-approved scope*

**Status:** Implementation target for `fortressPrep` until Saga I ships  
**Authority:** [DESIGN_BIBLE_FROZEN.md](DESIGN_BIBLE_FROZEN.md) · [the_first_saga.md](the_first_saga.md) · [north_star.md](north_star.md)  
**Philosophy:** APPROVED — places, people, ceremonies (not spreadsheet menus)  
**Scope:** Level 1 only — see [Future Evolution](#future-evolution)

> **Executive rule:** Increase immersion by reducing abstraction.  
> **Do NOT** increase immersion by increasing friction.  
> The player should feel they *visited the Barracks* — not that they *walked to the Barracks*.

---

## Executive verdict

| | Decision |
|---|----------|
| **Fantasy** | Keep 100% — fortress is the interface, advisors speak, horn commits the plan |
| **Implementation** | Cut ~70% — click + zoom + panel, not hub sim |
| **Target** | [the_first_saga.md](the_first_saga.md) only — not Version 1.0 |
| **Ship bar** | Player says: *"I feel like I'm preparing my own fortress"* in ≤3 clicks and ≤5 seconds per prep action |

---

## Smallest implementation that still works

**The First Saga target — build only this:**

```
┌────────────────────────────────────────────────────────────────┐
│  ASSAULT: Splinter Raid · WEST · 2 waves          ◆28  ▣15     │  ← thin meta strip only
├───────────────────────────────────────┬────────────────────────┤
│                                       │  ADVISOR PANEL         │
│     LARGE FORTRESS SCHEMATIC          │  [portrait]            │
│     (70% width · all interaction)     │  Captain:              │
│                                       │  "The west road stirs."│
│   [Tower]──[Wall/Gate scar]──[Horn]   │                        │
│        [Longhouse]  [Treasury]        │  [ Assign Gunnar ]     │
│                                       │  [ Repair — 10 wood ]  │
│   hover glow · click zoom ≤0.4s       │                        │
│   hero medallion on gate when set     │  ─────────────────     │
│                                       │  [ ▶ SOUND HORN ]      │
└───────────────────────────────────────┴────────────────────────┘
```

**Five clickable hotspots (slice):** West Gate · Watch Tower · West Wall/Gate scar · Longhouse · Treasury chest  

**One interaction loop:** Click place → camera nudges to it → advisor panel updates → act → done. **No return journey. No interior. No walking.**

**Why this is enough:** The fortress dominates the screen; the advisor names the place; scars and medallions are on the geometry; the horn is ceremonial. Player never sees a post chip list or WARBAND tab in prep.

**War Camp stays a separate phase** per [the_first_saga.md](the_first_saga.md) (talents A3, chronicle scroll, fortress building cards). Prep **references** Longhouse/Treasury visually; deep people management remains War Camp until Saga II unification.

---

## Design levels (every feature)

Use this table when scoping any fortress UX work:

| Level | When | Rule |
|-------|------|------|
| **Level 1 — Build Now** | First Saga | Click, zoom ≤0.5s, advisor portrait + panel, overlays, horn |
| **Level 2 — After Saga I** | Saga II+ | Ambient life, idle advisors, bells, flags, seasonal art |
| **Level 3 — Version 1.0** | Ages III–VI | Interiors, walkable hubs, crowds, fly-throughs, festivals |

**If a feature is not Level 1, do not implement it during the frozen bible.**

---

# Level 1 — Build Now (First Saga)

## Allowed

| Capability | Spec |
|------------|------|
| **Clickable fortress** | 5 hotspots on one schematic (see below) |
| **Camera** | Zoom/pan to selected structure, **≤0.5s**, ease-out |
| **Advisor** | Static **portrait** + **1–2 lines** in right panel |
| **Right panel** | Context-sensitive: actions + advisor (not a static menu) |
| **Highlight** | Hover glow + selection ring on structure |
| **Damage** | Gate scar **overlay** on art (persists A2+) |
| **Repair** | Button in panel → **0.6s patch animation** on gate art |
| **Assignment** | Hero **medallion** on gate; assign via panel button |
| **Horn** | **Major ceremony** (≤1.5s) → battle; skippable after A0 |
| **Idle animation** | Smoke from Longhouse chimney (loop); optional flag flutter |
| **Intel** | Scout line in panel when Tower selected; assault strip top |

## Not allowed (Level 1)

| Cut | Reason |
|-----|--------|
| Walking / travel between places | Friction without fantasy gain |
| Building **interiors** | Separate scenes = scope explosion |
| NPC pathfinding | No captain walks to player |
| Dynamic villager schedules | Level 2 |
| Wall-walk camera **track** | Level 2 — click wall segment instead |
| Courtyard aftermath scene in prep | Debrief handles prose (existing phase) |
| Resource drag-and-drop | Panel buttons + numbers OK in slice |
| Merge War Camp into homestead | Slice keeps `betweenBattles` phase |
| Multiple camera hops per action | One zoom per click |
| "Return to overview" button required | Click empty schematic or second click deselects |

---

## Performance budget (non-negotiable)

| Metric | Limit |
|--------|-------|
| **Clicks** to complete any prep task | **≤3** |
| **Camera movement** | **≤0.5s** |
| **Wait before interaction** after click | **≤1s** (advisor text can typewrite fast) |
| **Horn ceremony** (first view) | **≤1.5s** |
| **Repeat prep** (A1+) | Advisor short line or silent; horn skip offered |

**Prep gets faster with mastery:** repeat assignments skip advisor intro; repair skip animation after first A3.

---

## Screen layout (Level 1)

```
┌─────────────────────────────────────────────────────────────────┐
│ META: assault name · front · waves · gold ◆ · wood ▣ (A3+)      │  32px strip
├────────────────────────────────────────────┬────────────────────┤
│                                            │ RIGHT PANEL  280px │
│  FORTRESS SCHEMATIC  (flex, min 65%)       │                    │
│                                            │ Place title        │
│  Isometric/top-down village ring            │ Advisor portrait   │
│  Clickable:                                 │ 1–2 line dialogue  │
│    · Watch Tower (northwest)                │                    │
│    · West Gate + wall scar                  │ Primary actions    │
│    · Horn peg (part of gate anchor)         │ (max 2 visible)    │
│    · Longhouse (south)                      │                    │
│    · Treasury chest (beside longhouse)      │ ─────────────      │
│                                            │ HORN (gated)       │
│  States on art:                             │                    │
│    scar / patch / hero medallion / pulse    │                    │
└────────────────────────────────────────────┴────────────────────┘
```

**Remove from prototype:** left post chip list · structure dock · flat Begin Assault without horn beat · category accordion from [FORTRESS_PREP_REDESIGN.md](FORTRESS_PREP_REDESIGN.md).

**Keep from redesign:** west-front focus · 2 posts only · scar persistence · horn locks plan.

---

## Hotspots (slice — exhaustive)

| Hotspot | Click zoom | Advisor | Panel actions | Assault |
|---------|------------|---------|---------------|---------|
| **West Gate** | Gate fills ~40% of schematic | Captain | Assign hero · Repair (A3, if scarred) | All |
| **Watch Tower** | Tower prominent | Scout | Assign hero (optional A1+) · View intel | A1+ |
| **West Wall** | Same as gate (shared scar hitbox) | Builder (A3) | Repair only when scarred | A2+ |
| **Longhouse** | Building front | Skald | View chronicle (read) · 🔒 recruit until finale | A0+ naming* |
| **Treasury** | Chest | Quartermaster | View reserve split (read A1 teach) | A1+ |

\* **Naming (major ceremony)** triggers after A0 debrief, not during prep — see Ceremonies. Longhouse in prep is chronicle read only until finale.

**Locked silhouettes (no click):** N/E/S gate stubs gray — "Saga II" tooltip on hover only.

---

## Interaction flow (4–5 seconds per visit)

```
Click Barracks equivalent (Gate)
  → 0.4s zoom
  → Captain portrait already visible in panel
  → "Gunnar stands ready."
  → [Assign] or state shown
  → click schematic background OR another hotspot
  → 0.4s zoom out
Total: 4–5s
```

**No** explicit "Back" required. **No** intermediate screens.

### A0 tutorial (≤3 clicks to horn)

1. Prep opens — gate **pulses**, Captain line pre-loaded  
2. Click gate (optional if pre-selected) → **[ Assign ]**  
3. **[ Sound Horn ]** enables → click → ceremony → battle  

---

## Advisor system (Level 1)

| Advisor | Portrait | When |
|---------|----------|------|
| **Captain** | Gate/default | Gate, horn readiness |
| **Scout** | Tower | Tower selected, A1+ |
| **Quartermaster** | Treasury | Treasury selected, A1+ |
| **Builder** | Scar repair | Gate scar + A3 |
| **Skald** | Longhouse | Chronicle; finale recruit lead-in |

**Rules:**
- Portrait + text in **panel only** — not a character sprite on schematic (Level 2)
- Max **2 lines**; repeat visits use **1 line** or icon-only panel
- No toast notifications — advisor line replaces them

---

## Ceremony system (Level 1)

### Major — never skip

| Ceremony | Trigger | Duration | Implementation |
|----------|---------|----------|----------------|
| **Naming** | Post-A0 debrief → War Camp or modal | ≤3s | Skald + name input — existing flow OK |
| **Horn / battle start** | Horn button | ≤1.5s | Horn art + sting + cut to battle |
| **Settlement stone** | Post-A4 | ≤2s | Full-screen illustration (existing spec) |
| **Recruit #2** | Finale | ≤4s | Choice + naming at fire — fullscreen modal |

### Minor — auto-skip after first view

| Ceremony | First view | Repeat |
|----------|------------|--------|
| Assign hero | Captain: "He holds the gate." | Instant medallion |
| Repair complete | Builder: "Mended." + patch anim | Patch only, 0.3s |
| Treasury teach | QM explains reserve | Panel numbers only |
| Tower intel | Scout reads scroll | Icon + wave count |

**Skip:** click anywhere or auto-advance at 0.8s for minor only.

---

## Per-assault prep (slice pacing)

One new verb per assault — unchanged from bible.

| Assault | Hotspots active | New verb | Clicks to horn (target) |
|---------|-----------------|----------|-------------------------|
| **A0** | Gate only | Assign | 2–3 |
| **A1** | + Tower, Treasury | Reserve read | 3 |
| **A2** | Scar visible | Intel read | 3 |
| **A3** | Repair enabled | Repair wood | 3 |
| **A4** | All | Boss intel | 3 |
| **Finale** | Ceremony on map | — | — |

---

## Visual & audio (Level 1 minimum)

| Element | Level 1 |
|---------|---------|
| Longhouse smoke | 1 looping sprite |
| Gate scar | Static crack overlay |
| Gate patch | Cross-fade overlay after repair |
| Hero medallion | 32px portrait badge on gate |
| Horn | 1 frame lift + sound sting |
| Ambient | Wind loop in prep only |
| Music | None in prep (moment #1) |

---

## Technical notes (for Engineering)

- **Phase:** `gamePhase === 'fortressPrep'` — unchanged  
- **State:** extend `defensivePosts.js` + hotspot `selectedPlaceId` in prep module  
- **Camera:** offset/scaling on existing schematic draw — no scene graph required  
- **Panel:** HTML overlay or canvas right column — either OK  
- **Do not** merge `betweenBattles` into prep for slice  
- **Tests:** hotspot selection, assign round-trip, horn gated until `validateAssignments` passes  

---

## Wireframes (Level 1)

### Overview — nothing selected

```
╔══════════════════════════════════════════════════════════════════╗
║ Splinter Raid · WEST · 2 waves                        ◆28  ▣15   ║
╠══════════════════════════════════════════════╦═══════════════════╣
║                                              ║ WEST FRONT        ║
║           ┌────────────┐                     ║                   ║
║           │WATCH TOWER │                     ║ Select a part of  ║
║           └─────┬──────┘                     ║ your fortress.    ║
║    ═════════════╪═════════════                ║                   ║
║         ┌───────▼────────┐                   ║ Scout (distant):  ║
║         │╔════════════╗│  ← pulse if needed  ║ "Axes. West gate."║
║         │║ WEST GATE  ║│                   ║                   ║
║         │╚════════════╝│  🎺               ║                   ║
║         └──────────────┘                   ║                   ║
║      [LONGHOUSE ~]    [💰]                   ║                   ║
║                                              ║ [ ▶ HORN ] dim    ║
╚══════════════════════════════════════════════╩═══════════════════╝
```

### West Gate selected

```
╠══════════════════════════════════════════════╦═══════════════════╣
║         ┌───────▼────────┐                   ║ WEST GATE         ║
║         │╔════════════╗│ ◉ SELECTED          ║ [Captain portrait]║
║         │║ WEST GATE  ║│  🛡 Gunnar          ║                   ║
║         │╚════════════╝│  crack art         ║ "He meets them    ║
║         └──────────────┘                   ║  at the threshold."║
║                                              ║                   ║
║                                              ║ [ Change hero ]   ║
║                                              ║ [ Repair 10▣] A3  ║
║                                              ║ ─────────────────  ║
║                                              ║ [ ▶ SOUND HORN ]  ║
╚══════════════════════════════════════════════╩═══════════════════╝
```

### Watch Tower selected (A1)

```
╠══════════════════════════════════════════════╦═══════════════════╣
║           ┌────────────┐ ◉                   ║ WATCH TOWER       ║
║           │WATCH TOWER │                     ║ [Scout portrait]  ║
║           └────────────┘                     ║ "Wolves. Fast.    ║
║                                              ║  Two waves."      ║
║                                              ║ [ Assign scout ]  ║
║                                              ║ (optional)        ║
╚══════════════════════════════════════════════╩═══════════════════╝
```

### Horn ceremony (major — in-place, no new screen)

```
║  Schematic dims 20%                           ║
║  Horn icon enlarges center-gate               ║  "The plan is set."
║  0.8s sting ────────────────────────────────► BATTLE
```

---

## What we removed (executive cut list)

From [FORTRESS_AS_UI.md v1](.) creative draft and prototype:

| Removed | Replacement (Level 1) |
|---------|------------------------|
| Walk / travel verbs | Click + zoom |
| Longhouse **interior** | Exterior zoom + Skald panel |
| Treasury interior / coin drag | Panel + QM line |
| Wall-walk camera track | Click gate/wall hitbox |
| Captain walks to player | Portrait in panel |
| Courtyard debrief in prep | Keep `debrief` phase |
| Unified homestead (War Camp merge) | Defer Saga II |
| Villagers, goat, raven actors | Smoke only |
| Command pole scroll prop | Intel in Scout panel |
| Multiple camera anchors | 5 zoom targets total |
| Zero HUD | Thin meta strip allowed |
| "No right panel" | **Context panel required** |
| Readiness summary modal | Horn gated by `validateAssignments` + dim/enable |
| Left category rail | Hotspots on art |

---

## Bible compliance checklist

| Requirement | Level 1 how |
|-------------|-------------|
| Moment #1 One hero one gate | A0 gate-only pulse |
| Moment #3 No battle shop | Horn locks plan |
| Moment #4 Fortress wounded | Scar overlay + repair |
| Moment #6 War Camp no battlefield | Separate phase |
| §1 Fortress as character | Schematic dominates |
| §2 Preparation wins | All verbs in prep |
| §9 One question | Panel = selected place only |
| Slice §16 UI limits | 5 hotspots, 2 actions, 1 horn |
| Screen law §3 Prep no recruit | Recruit finale modal only |

---

## Future Evolution

*Do not implement until Design Bible unfreezes. Preserved vision from creative direction.*

### Level 2 — After First Saga (Saga II)

| Feature | Notes |
|---------|-------|
| Ambient villagers | Static sprites, not pathing |
| Builders at scar | Cosmetic at gate during repair |
| Animals, flags, bell | Art pass |
| Seasonal weather overlay | Palette swap |
| Advisor idle bob on portrait | CSS/canvas wiggle |
| Barracks hotspot | Recruit moves from modal to zoom+panel |
| Second front unlock | Rotate schematic emphasis |
| Minor ceremony polish | Repair hammer SFX |

### Level 3 — Version 1.0

| Feature | Notes |
|---------|-------|
| Walkable interiors | Longhouse, Temple, Rune Hall, Workshop |
| Camera fly-through | Command map → homestead cinematic |
| Dynamic advisors on schematic | Captain at gate sprite |
| Living settlement crowds | Settlement+ tier |
| Festival / promotion scenes | Great Hall |
| Wall-walk guided track | Optional tutorial |
| Resource props (coin drag) | Diegetic economy |
| War Camp + Prep unified homestead | Single phase exploration |
| District pan (Citadel) | Multi-cluster camera |
| Full advisor cast + voice filters | BRAGI pass |

### Creative north star (unchanged)

> The fortress is the interface. Places not menus. People not panels. Ceremonies not confirm dialogs.

Level 1 delivers this **feel** with **click-zoom-panel-horn** — not the full hub sim.

---

## Board sign-off

| Reviewer | Level 1 verdict |
|----------|-----------------|
| **BJORN** | ✅ Scope bounded — ship target defined |
| **SKJOLD** | ✅ Screen laws preserved |
| **GRID** | ✅ ≤3 clicks, panel not spreadsheet |
| **GARDR** | ✅ Gate assignment primary |
| **WITNESS** | ✅ A0 path 2–3 clicks |
| **VAULT** | ✅ No new scene engine required |

---

## Implementation target (single sentence)

**Build one fortress schematic with five clickable hotspots, a ≤0.5s zoom, an advisor portrait panel, scar/repair overlays, hero medallions, and a horn ceremony — nothing else for Saga I prep.**

That is the smallest implementation that still makes players say: *"I feel like I'm preparing my own fortress."*

---

*Executive review: philosophy approved · scope reduced · First Saga only · 2026-06-22*
