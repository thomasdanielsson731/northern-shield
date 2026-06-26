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

## Phase 2 — `fortressPrep` game phase (inner repo) — in progress

- [x] `gamePhase === 'fortressPrep'` replaces `_fieldPrepMode`
- [x] Post picker left panel + markers on schematic grid
- [x] `launchFieldPrepAssault()` uses `buildTowerPlacements`
- [ ] Session save resume for `fortressPrep`
- [ ] Full schematic UI (no STRUCTURES tab in prep)

## Phase 3 — War Camp purity (inner repo)

- [ ] Remove field structure list from War Camp FORTRESS tab (meta only)
- [ ] Remove grid/backdrop from betweenBattles
- [ ] War Camp CTAs: Prepare Fortress / Command only

## Phase 4 — Battle strip (inner repo)

- [ ] Remove build docks in campaign combat
- [ ] Remove rune shop chip during assault
- [ ] Right panel: combat HUD only (no WAR BAND / FORTRESS tabs in campaign)

## Phase 5 — After Action & chronicle (inner repo)

- [ ] Prose-first debrief layout
- [ ] Fortress damage report (gate %, wall facing)
- [ ] Route buttons only: War Camp / Prep / Command

## Phase 6 — Polish

- [ ] Advisor skald lines linked to posts
- [ ] Preferred post on hero cards
- [ ] Promotion titles (Gate Captain)
- [ ] War Camp fortress backdrop evolution
- [ ] Art pass on schematic

## Test gates

Run `npx vitest run` after each phase. Manual: slot → command → prep → assign → battle → debrief.

## Commit discipline

- Outer repo: docs + agents per phase boundary
- Inner repo: code + tests; message prefix `fortress-commander:`
