# Fortress Commander — Implementation Roadmap

*Phased delivery · start 2026-06-25*

## Phase 0 — Documentation & agents ✅

- [x] `FORTRESS_COMMANDER.md`, `DEFENSIVE_POSTS.md`, this roadmap
- [x] Update `CLAUDE.md`, `ARCHITECTURE.md`, `PRODUCT_DESCRIPTION.md`
- [x] Agent board session + RUNE/GRID agent updates

## Phase 1 — Post model & tests ✅

- [x] `src/fortress/defensivePosts.js` — post defs, assignment, validation, `buildTowerPlacements`
- [x] `tests/defensivePosts.unit.test.js`
- [x] Extend `serializeFieldState` / `fieldState` with `postAssignments`
- [x] `ensurePostAssignments` / `inferPostAssignmentsFromTowers` for save migration

## Phase 2 — `fortressPrep` game phase (inner repo) ✅

- [x] `gamePhase === 'fortressPrep'` replaces `_fieldPrepMode`
- [x] Fortress Commander shell (click-zoom-panel-horn, 5 hotspots)
- [x] `launchFieldPrepAssault()` uses `buildTowerPlacements`
- [x] Session save resume for `fortressPrep`
- [x] A2 debrief → gate scar + wood bundle on field state
- [x] Wood chip in prep meta strip (A3+)
- [x] Schematic art pass (ring, gate arch, flag, chest — procedural)

## Phase 3 — War Camp purity (inner repo) ✅

- [x] Remove field structure list from War Camp FORTRESS tab (meta only)
- [x] Remove grid/backdrop from betweenBattles (hearth backdrop; no field upgrades in roster)
- [x] War Camp CTAs: Prepare Fortress / Command only

## Phase 4 — Battle strip (inner repo) ✅

- [x] Remove build docks in campaign combat
- [x] Remove rune shop chip during assault
- [x] Right panel: combat HUD only (no WAR BAND / FORTRESS tabs in campaign)

## Phase 5 — After Action & chronicle (inner repo) ✅

- [x] Prose-first debrief layout
- [x] Fortress damage report (gate %, wall facing)
- [x] Route buttons only: War Camp / Prep / Command

## Phase 6 — Polish ✅

- [x] Advisor skald lines linked to posts
- [x] Preferred post on hero cards
- [x] Promotion titles (Gate Captain)
- [x] War Camp fortress backdrop evolution
- [x] Art pass on schematic

## Test gates

Run `npx vitest run` after each phase. Manual: slot → command → prep → assign → battle → debrief.

## Commit discipline

- Outer repo: docs + agents per phase boundary
- Inner repo: code + tests; message prefix `fortress-commander:`
