# Northern Shield — Project State

*Single source of truth for current implementation state · read this before any work*

**Last updated:** 2026-06-22 (Sprint 3 close — Fortress Commander Phases 0–6)  
**Maintainer:** Technical Program Manager (update after every completed sprint)

---

# Project Identity

| Field | Value |
|-------|-------|
| **Project** | Northern Shield |
| **Genre** | Fortress Commander RPG |
| **Current Target** | The First Saga (vertical slice) |
| **Current Version** | `0.2.0-dev` |
| **Current Phase** | Production |
| **Current Sprint** | Sprint 3 — Vertical Slice Closure |

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
| Sprint 3 — Phases 5–6 | 2026-06-22 | Prose debrief, post titles, polish (uncommitted) |
| All Agents Board Session 18 | 2026-06-22 | Fortress Commander implementation ✅; slice RC blocked |

## Current milestone

**The First Saga — vertical slice playable end-to-end** (Age I → Settlement ceremony → recruit #2)

Status: **In progress** — Fortress Commander arc complete; three slice blockers remain (see §17 [the_first_saga.md](the_first_saga.md)).

## Current sprint

**Sprint 3 — Vertical Slice Closure**

Objective: Close gap between Fortress Commander implementation and shippable First Saga journey.

## Recently completed work

- `debriefReport.js` — saga prose, fortress damage report, compact stats
- `postTitles.js` — Gate Captain, preferred post, skald counsel
- `drawCampaignAssaultDebrief()` — prose-first; routes WAR CAMP · PREPARE FORTRESS · COMMAND MAP
- Post-linked advisor lines in Fortress Commander shell
- War Camp post badges + evolving fortress backdrop by upgrade tier
- Procedural schematic art pass (ring, gate arch, flag, chest, smoke)
- `IMPLEMENTATION_ROADMAP.md` Phases 0–6 marked complete
- All Agents Board Session 18 logged

## Current implementation focus

1. Commit Phase 5–6 (inner + outer submodule sync)
2. Linear 6-node Region 1 assault chain (west front only)
3. Settlement ceremony modal (post-A4 finale)
4. Wood repair spend UI (A3 teach minimum)

---

# Playable Features

Checklist for **The First Saga** scope. ✅ = playable in campaign flow · 🟡 = partial · ⬜ = not started.

| Feature | Status |
|---------|--------|
| Save slots (10) + session resume | ✅ |
| Campaign region select | ✅ |
| Command map (multi-front UI) | ✅ (slice needs linear 6-node west chain) |
| War Camp (roster, heal, meta) | ✅ |
| War Camp purity (no field grid) | ✅ |
| Fortress Commander prep (`fortressPrep`) | ✅ |
| Defensive post assignment | ✅ |
| Hero assignment to posts | ✅ |
| Campaign assault combat (no build docks) | ✅ |
| PORT / gate targeting | ✅ |
| Gate scar persistence (A2) | ✅ |
| Wood salvage meta (A3+) | 🟡 visible; spend UI thin |
| Prose-first After Action debrief | ✅ |
| Fortress damage report | ✅ |
| Chronicle / battle history | ✅ |
| Post promotion titles (Gate Captain) | ✅ |
| Skald advisor counsel | ✅ |
| Boss A4 (Ash-Warden) | ✅ |
| Linear 6-node saga map | ⬜ |
| Settlement ceremony | ⬜ |
| Recruit #2 unlock (post-ceremony) | ⬜ (gate exists; ceremony missing) |
| Stone wall ceremony | ⬜ |
| Fortress upgrade tree (slice subset) | 🟡 meta exists; slice ceremony not wired |
| Skirmish mode | ✅ (CUT from onboarding; separate entry) |
| Rune shop / stars in campaign | ✅ CUT — disabled in assault |
| Siege structures in slice | ✅ CUT |
| Structure PNG sprites | 🟡 procedural placeholders |

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
| **War Camp** | Roster, heal, recruit, meta buildings | `game.js` `betweenBattles` |
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
| Command map still multi-front UI vs slice linear 6-node | High | Medium | **Current sprint** |
| Wood repair spend flow incomplete | High | Small | **Current sprint** (A3 teach) |
| Settlement ceremony not implemented | High | Medium | **Current sprint** |
| Bio typewriter / class-differentiated recruit SFX | Low | Small | Polish board backlog |

---

# Known Bugs

## Critical

*None logged as of 2026-06-22.*

## Major

| Issue | Notes |
|-------|-------|
| First Saga not completable end-to-end | Missing 6-node linear map + Settlement ceremony — design gap, not a crash |
| Wood repair teach incomplete | A3 assault expects repair action; salvage visible but spend UX thin |

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
| 18 | Procedural schematic acceptable until Settlement ships | Accepted | Session 18; PNG is polish not blocker |

---

# Current Sprint Goal

## Objective

Ship the smallest set of changes that let a **fresh save** complete The First Saga A0→Settlement (recruit #2).

## Definition of Done

- [ ] Phase 5–6 committed (inner `fortress-commander:` + outer submodule)
- [ ] Linear 6-node west-front assault chain on Region 1 command map
- [ ] Settlement ceremony modal fires after A4 victory
- [ ] Wood repair action available on scarred west gate before A3 horn
- [ ] `the_first_saga.md` §17 alignment table all ✅ or documented 🟡
- [ ] Fresh-save manual playtest logged to `agents/boards/sessions/`
- [ ] `npx vitest run` green

## Success Criteria

Player can complete: slot → Region 1 → A0…A4 → Settlement Oath → recruit #2 named — without encountering CUT systems or screen-law violations.

## Blocked By

- Phase 5–6 uncommitted at sprint start (resolve first)
- Settlement ceremony spec in `the_first_saga.md` §14 (design ready; code missing)
- Linear map script vs existing multi-front command map (needs slice-only filter)

## Next Review Board

**Vertical Slice review** — 11 required reviewers per [REVIEW_MATRIX.md](../../agents/REVIEW_MATRIX.md): BJORN · SKJOLD · RUNE · BASTION · GARDR · EINHERI · WITNESS · GRID · SKALD · VAULT · DROTT

Convene after Sprint 3 DoD met. Latest full review: [Session 18](../../agents/boards/sessions/2026-06-22-all-agents-board-18.md).

---

# Next Recommended Work

*Smallest production steps only — no post-slice systems.*

1. **Commit Phase 5–6** — `debriefReport.js`, `postTitles.js`, debrief UI, War Camp badges, roadmap sync (inner + outer).
2. **Linear 6-node Region 1 map** — west front only; assault chain A0→A4 per `the_first_saga.md` §3; hide/disable non-slice fronts.
3. **Settlement ceremony modal** — post-A4 non-combat beat; unlock recruit #2; wire War Camp RECRUIT tab gate.

*Do not start:* four-front command map, rune shop, siege platforms, Region 2+, food economy.

---

# Metrics

| Metric | Value | As of |
|--------|-------|-------|
| Implementation progress (Fortress Commander roadmap) | Phases 0–6 ✅ (100%) | 2026-06-22 |
| First Saga vertical slice completion | ~72% (6/9 §17 items ✅, 1 🟡, 2 ❌) | 2026-06-22 |
| Playable end-to-end (First Saga finale) | No | 2026-06-22 |
| Tests passing | **221** / 221 | 2026-06-22 |
| Test files | 27 | 2026-06-22 |
| Open bugs (critical) | 0 | 2026-06-22 |
| Open bugs (major) | 2 | 2026-06-22 |
| Inner repo commits ahead of `origin/main` | 8 (+ uncommitted Phase 5–6) | 2026-06-22 |
| Implemented slice features (checklist) | 18 ✅ · 4 🟡 · 4 ⬜ | 2026-06-22 |
| Technical debt items tracked | 7 | 2026-06-22 |
| Active design decisions | 18 | 2026-06-22 |
| Last board session | [2026-06-22-all-agents-board-18](../../agents/boards/sessions/2026-06-22-all-agents-board-18.md) | 2026-06-22 |

---

# AI Context

*Read this block first — 30-second orientation.*

- **Game:** Northern Shield — Fortress Commander RPG (Vanilla JS + Canvas, Vite, inner repo `tower-defense/`).
- **Target:** Ship **The First Saga** only — 1 hero → 2, west gate + watch tower, A0–A4 + Settlement ceremony.
- **Done:** Fortress Commander Phases 0–6 — prep shell, War Camp purity, campaign combat strip, prose debrief, post titles.
- **Not done:** Linear 6-node map, Settlement ceremony, wood repair spend UI.
- **Phase flow:** War Camp (`betweenBattles`) → Prep (`fortressPrep`) → Combat (`playing`) → Debrief → routes back.
- **Posts:** `defensivePosts.js` — player assigns heroes to posts; `buildTowerPlacements` feeds combat grid silently.
- **CUT in slice:** runes, stars, siege, 4 fronts, skirmish onboarding, food, Region 2+.
- **Screen laws:** one question per screen; no grid in War Camp; no shop in battle; no recruit in prep.
- **Key files:** `game.js` (phases), `fortressCommanderShell.js`, `debriefReport.js`, `postTitles.js`.
- **Tests:** run from `tower-defense/` → `npx vitest run` (221 passing).
- **Commits:** Phase 5–6 may be uncommitted — check `git status` before assuming shipped.
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
