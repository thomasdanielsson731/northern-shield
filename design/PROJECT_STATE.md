# Northern Shield — Project State

*Single source of truth for current implementation state · read this before any work*

**Last updated:** 2026-06-22 (Immersive Barracks, assault border spawn, structures-only fortress, battlefield bg)  
**Maintainer:** Technical Program Manager (update after every completed sprint)

---

# Project Identity

| Field | Value |
|-------|-------|
| **Project** | Northern Shield |
| **Genre** | Fortress Commander RPG |
| **Current Target** | The First Saga (vertical slice) |
| **Current Version** | `0.3.0-saga-rc` |
| **Current Phase** | Production (Vertical Slice RC) |
| **Current Sprint** | Sprint 6 — Immersive progression UI + assault polish |

**Design authority:** [north_star.md](north_star.md) · [the_first_saga.md](the_first_saga.md) · [DESIGN_BIBLE_FROZEN.md](DESIGN_BIBLE_FROZEN.md)

---

# North Star

Summarized from [north_star.md](north_star.md) — non-negotiable principles:

- The **fortress is the main character** — walls, halls, scars, skyline; heroes matter because they defend a place worth defending.
- **Preparation wins battles** — skill lives before the horn: posts, repairs, roster; combat is the verdict, not a redesign phase.
- **Heroes become legends** — names, ranks, scars, titles, saga entries; identity over +10% damage.
- **Every system strengthens the fortress fantasy** — if it could exist in any generic TD, it needs a Norse stronghold reason.
- **Buildings unlock systems** — structures introduce decisions and emotions, not passive stat sticks.
- **Progression must be visual** — palisade → stone → rune wall; screenshot at hour 1 vs hour 50 must differ.
- **Complexity belongs between battles** — War Camp, prep, crafting; battle stays readable.
- **Every battle tells a story** — debrief is saga, not a score screen; scars and damage persist.
- **One screen, one question** — map / War Camp / prep / battle / after action each answer one thing only.
- **Resources have jobs** — gold, wood, stone, food each refuse to solve every problem.

**Feature gate:** 8+ principles yes to proceed; principles 1, 2, or 7 failing requires design review.

---

# Current Production Status

## Completed milestones

| Milestone | Date | Notes |
|-----------|------|-------|
| Design Bible freeze | 2026-06 | `DESIGN_BIBLE_FROZEN.md` |
| Milestone 3–4 design docs | 2026-06 | Progression trees, player journey |
| Fortress Commander pivot | 2026-06-25 | Genre: Fortress Commander RPG, not TD |
| Sprint 1 — Prep shell | 2026-06-25 | `fortressPrep` phase, Commander shell (`1246947`) |
| Sprint 2 — Phases 2–4 | 2026-06-25 | War Camp purity, campaign combat HUD (`d9f2236`) |
| Sprint 3 — Phases 5–6 | 2026-06-22 | Prose debrief, post titles (`4f24dc7`) |
| Sprint 4 — Vertical slice closure | 2026-06-22 | 6-node map, Settlement ceremony, recruit gate |
| All Agents Board Session 18 | 2026-06-22 | Fortress Commander implementation ✅; slice RC blocked |

## Current milestone

**The First Saga — vertical slice playable end-to-end** (Age I → Settlement ceremony → recruit #2)

Status: **RC candidate** — code complete; manual fresh-save playtest recommended before Vertical Slice sign-off.

## Current sprint

**Sprint 6 — Immersive UI + assault readability**

Objective: Settlement building interiors (Barracks), assault playfield scale/spawn/terrain, hub fortress polish.

## Recently completed work

- **Immersive Barracks** — `barracksView.js`; Hall statues recruit row; roster panel; level card; `ui_barracks_interior@1536x1024.png`
- **Hall statues** — frame crop; no gold plinth rectangles
- **Settlement fortress hub** — ~40% smaller structures; no rings/shadows; full titles; upgrade affordance pulse
- **Command map chrome** — meta bar region/NEXT; top-left briefing glass chip
- **Assault combat** — border spawn (`getAssaultBorderSpawnPx`); structures-only fortress @ 1.72×; full-world `assault_battlefield_bg@2048x1320.png`; wilderness scatter; HUD/terrain/unit fixes
- **Polish Board iter 53–72** — Hall dossier, chronicle unread, `__NS_TEST_HOOKS__`
- **513** unit tests passing

## Current implementation focus

1. Human playtest: assault border spawn + fortress scale on shared terrain
2. Commit/push immersive UI batch (inner repo)
3. Polish backlog: structure PNGs (#33)

---

# Playable Features

Checklist for **The First Saga** scope. ✅ = playable in campaign flow · 🟡 = partial · ⬜ = not started.

| Feature | Status |
|---------|--------|
| Save slots (10) + session resume | ✅ |
| Campaign region select | ✅ |
| Command map (multi-front UI) | ✅ (slice uses linear west road on map 0) |
| War Camp (roster, heal, meta) | ✅ |
| War Camp purity (no field grid) | ✅ |
| Fortress Commander prep (`fortressPrep`) | ✅ |
| Defensive post assignment | ✅ |
| Hero assignment to posts | ✅ |
| Campaign assault combat (no build docks) | ✅ |
| PORT / gate targeting | ✅ |
| Gate scar persistence (A2) | ✅ |
| Wood salvage meta (A3+) | ✅ |
| Prose-first After Action debrief | ✅ |
| Fortress damage report | ✅ |
| Chronicle / battle history | ✅ |
| Post promotion titles (Gate Captain) | ✅ |
| Skald advisor counsel | ✅ |
| Boss A4 (Ash-Warden) | ✅ |
| Linear 6-node saga map | ✅ |
| Settlement ceremony | ✅ |
| Recruit #2 unlock (post-ceremony) | ✅ |
| Stone wall ceremony | ✅ (in Settlement Oath) |
| Fortress upgrade tree (slice subset) | 🟡 meta exists; slice ceremony not wired |
| Skirmish mode | ✅ (CUT from onboarding; separate entry) |
| Rune shop / stars in campaign | ✅ CUT — disabled in assault |
| Siege structures in slice | ✅ CUT |
| Structure PNG sprites | 🟡 procedural + prep sprites; assault uses composited structures |
| Immersive Barracks recruit | ✅ |
| Immersive Hall / Treasury | ✅ |
| Assault border spawn | ✅ |
| Assault full-world terrain | ✅ |

---

# Current Architecture

High-level phase model — detail in [ARCHITECTURE.md](../ARCHITECTURE.md) and [domain_architecture.md](domain_architecture.md).

```
slotSelect → campaignSelect → nodeMap (Command Map)
    → betweenBattles (War Camp)
    → fortressPrep (Fortress Commander)
    → playing (Combat)
    → debrief (After Action)
    → betweenBattles | nodeMap | fortressPrep
```

| Layer | Responsibility | Key modules |
|-------|----------------|-------------|
| **Campaign** | Regions, map runs, assault nodes, chronicle | `src/campaign/` |
| **War Camp** | Roster, heal, recruit, meta buildings | `game.js` `betweenBattles`; immersive views in `src/ui/*View.js` |
| **Fortress Prep** | Post assign, advisor, horn launch | `fortressPrep`, `fortressCommanderShell.js` |
| **Posts** | Assignment → tower placements | `src/fortress/defensivePosts.js` |
| **Combat** | Wave sim on grid (simulation-only in campaign) | `game.js` `playing` |
| **Debrief** | Saga prose + fortress report + routes | `debriefReport.js`, `drawCampaignAssaultDebrief` |
| **Chronicle** | Battle history prose | `_campaignState.chronicle` |
| **Save** | Slots, session, fieldState | `saveSlots.js`, `sessionSave.js`, `serializeFieldState` |

**Monolith note:** `src/core/game.js` intentionally holds render + phase orchestration; new systems go in dedicated files.

---

# Current Risks

| Risk | Mitigation |
|------|------------|
| Feature creep into post-slice systems (runes, siege, 4 fronts) | `the_first_saga.md` CUT list; Executive board gate |
| Mixing War Camp with Fortress Prep UI | Screen laws in `FORTRESS_COMMANDER.md`; Phase 3 shipped |
| Grid deploy exposed in campaign | Phase 4 shipped — posts only in prep |
| Skirmish polluting First Saga onboarding | Skirmish entry separate from campaign flow |
| Declaring slice done before Settlement ceremony | Session 18 verdict: slice RC blocked until ceremony + 6-node map |
| `game.js` growth without extraction trigger | VAULT: monitor; extract only when domain justifies |
| Uncommitted Phase 5–6 work | Commit before next sprint starts |

---

# Technical Debt

Real debt only — not aspirational refactors.

| Item | Priority | Effort | Suggested milestone |
|------|----------|--------|---------------------|
| `game.js` monolith (~16k lines) | Low | Large | Post-slice; split only with domain trigger |
| Legacy bonus stores name/rank but no stat applied | Medium | Small | Post-slice (CHAMPION retire loop not in First Saga) |
| Structure dock PNG sprites (#33 backlog) | Low | Medium | Polish / asset sprint |
| Command map still multi-front UI vs slice linear 6-node | — | — | Resolved Sprint 4 |
| Wood repair spend flow incomplete | — | — | Resolved Sprint 4 |
| Settlement ceremony not implemented | — | — | Resolved Sprint 4 |
| Bio typewriter / class-differentiated recruit SFX | Low | Small | Polish board backlog |

---

# Known Bugs

## Critical

*None logged as of 2026-06-22.*

## Major

*None logged — slice flow code-complete; manual playtest pending.*

## Minor

| Issue | Notes |
|-------|-------|
| Save slot delete confirm easy to miss | UI journey audit P2 |
| Legacy bonus mechanical stub | Affects post-slice retire loop only |
| Procedural schematic vs final art | Acceptable for slice per Session 18 |

---

# Active Design Decisions

Chronological log — **do not remove** historical entries.

| # | Decision | Status | Reason |
|---|----------|--------|--------|
| 1 | Genre pivot: Fortress Commander RPG, not TD | Accepted | Post-based prep; grid is simulation-only |
| 2 | `the_first_saga.md` is canonical until slice ships | Accepted | Prevents scope creep |
| 3 | Design Bible frozen | Accepted | `DESIGN_BIBLE_FROZEN.md` |
| 4 | One screen, one question (screen laws) | Accepted | `FORTRESS_COMMANDER.md` |
| 5 | War Camp never shows battlefield | Accepted | Phase 3 shipped |
| 6 | Fortress Prep never recruits | Accepted | Prep = defense only |
| 7 | Battle never shops or builds (campaign) | Accepted | Phase 4 shipped |
| 8 | Post-based deploy via `defensivePosts.js` | Accepted | Player-facing placement = posts, not tiles |
| 9 | `gamePhase === 'fortressPrep'` replaces `_fieldPrepMode` | Accepted | Session save + clear phase model |
| 10 | After Action routes only: War Camp / Prep / Command | Accepted | Phase 5; no layout edit on debrief |
| 11 | Prose-first debrief over stat sheet | Accepted | North star #8; `debriefReport.js` |
| 12 | Fortress is the UI (click-zoom schematic) | Accepted | `FORTRESS_AS_UI.md`; reduces abstraction |
| 13 | Recruitment remains in War Camp | Accepted | Keeps preparation focused on defense |
| 14 | Skirmish CUT from First Saga onboarding | Accepted | Screen-law violation if mixed |
| 15 | Runes, stars, siege CUT from slice | Accepted | `the_first_saga.md` §18 |
| 16 | Gate scar + wood bundle on A2 win debrief | Accepted | Scar teach moment; not on prep entry |
| 17 | Promotion titles tied to post assignment | Accepted | Gate Captain etc.; `postTitles.js` |
| 19 | Settlement ceremony as `settlementCeremony` game phase | Accepted | Post-A4 finale; recruit #2 unlock |
| 20 | Immersive building interiors (Hall, Treasury, Barracks) two-pass render | Accepted | Base before frame; overlays after `drawFrames()` |
| 21 | Barracks recruit uses Hall hero statues, not chip grid | Accepted | `barracksView.js` + `hallHeroStatues.js` |
| 22 | Assault enemies spawn on padded **world border**, not grid edge | Accepted | `getAssaultBorderSpawnPx` |
| 23 | Assault fortress = structures only on shared terrain (no ground plate) | Accepted | `drawAssaultFortressStructures`; plate retired |
| 24 | Assault terrain cover-fills padded world canvas | Accepted | `assault_battlefield_bg@2048x1320.png` |
| 25 | Settlement hub structures scaled to skyline (~40% display base) | Accepted | `FORTRESS_STRUCTURE_DISPLAY_BASE = 0.30` |
| 26 | Command map briefing in glass chip; region/NEXT in meta bar | Accepted | `firstSagaUI.js`, `warCampVisual.js` |

---

# Current Sprint Goal

## Objective

Ship immersive progression screens and assault readability fixes; validate in playtest.

## Definition of Done

- [x] Barracks immersive view wired
- [x] Assault border spawn + structures-only fortress
- [x] Battlefield background full-world cover
- [x] `npm test` green (**513**)
- [ ] Human playtest assault spawn rim + barracks recruit flow
- [ ] Inner-repo commit for this batch

## Success Criteria

Player reads enemies from forest edge; fortress feels sized to terrain; Barracks matches Hall/Treasury immersion pattern.

## Blocked By

- None (code complete)

## Next Review Board

**Player Experience** — GRID · SAGA · FENRIR · SIGHT · SKALD

## Next Recommended Work

1. Playtest + commit immersive UI batch
2. Structure PNG sprites (#33) if art sprint resumes
3. Regenerate assault battlefield if edge seams visible

---

# Metrics

| Metric | Value | As of |
|--------|-------|-------|
| Implementation progress (Fortress Commander roadmap) | Phases 0–6 ✅ (100%) | 2026-06-22 |
| First Saga vertical slice completion | ~95% (code complete; manual RC pending) | 2026-06-22 |
| Playable end-to-end (First Saga finale) | Code yes · human verify pending | 2026-06-22 |
| Tests passing | **513** / 513 | 2026-06-22 |
| Test files | 81 | 2026-06-22 |
| Open bugs (critical) | 0 | 2026-06-22 |
| Open bugs (major) | 0 | 2026-06-22 |
| Active design decisions | 26 | 2026-06-22 |
| Last board session | [Immersive UI + assault polish](../../agents/boards/sessions/2026-06-22-immersive-ui-assault-polish.md) | 2026-06-22 |

---

# AI Context

*Read this block first — 30-second orientation.*

- **Game:** Northern Shield — Fortress Commander RPG (Vanilla JS + Canvas, Vite, inner repo `tower-defense/`).
- **Target:** Ship **The First Saga** only — 1 hero → 2, west gate + watch tower, A0–A4 + Settlement ceremony.
- **Done:** Vertical slice RC + immersive Barracks/Hall/Treasury + assault border spawn.
- **Not done:** Human playtest sign-off on latest assault UI; structure PNG sprites (#33).
- **Immersive views:** `hallOfHeroesView.js`, `treasuryView.js`, `barracksView.js` — base draw early-return, overlays after frame.
- **Assault:** `useAssaultScrollWorld()` → padded world, border spawn, `drawAssaultFortressStructures`, `assault_battlefield_bg`.
- **Tests:** `npm test` from `tower-defense/` (**513**). Campaign edits: `npm run test:saga` first.
- **Before coding:** read `north_star.md` + `the_first_saga.md` + this file.
- **After sprint:** update this file — version, sprint, metrics, goals, decisions.

---

# Maintenance Rules

When a sprint completes, the TPM (or lead agent) **must** update this document:

1. **Never** overwrite or remove historical design decisions — append new `#` entries.
2. **Never** remove completed milestones — add rows to the milestones table.
3. **Always** update: version, sprint name, production status, metrics, current sprint goal, next recommended work, AI Context, last-updated date.
4. Sync checklist statuses in **Playable Features** with `the_first_saga.md` §17 when slice items change.
5. Log board session link under metrics after each review.
6. Outer repo: if inner submodule pointer changes, note commit hash in **Recently completed work**.

**This document is the single source of truth for implementation state.**  
Every reviewer, developer, and AI agent reads `design/PROJECT_STATE.md` before beginning work.

**Related trackers:** [IMPLEMENTATION_ROADMAP.md](IMPLEMENTATION_ROADMAP.md) (code phases) · [agents/boards/README.md](../../agents/boards/README.md) (review status)
