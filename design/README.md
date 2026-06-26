# Northern Shield — Design Foundation

*Permanent reference · Foundation Phase · 2026-06-25*

> Build and command a living Viking fortress that evolves from a tiny wooden village into the last magical citadel protecting the North.

**Before implementing any feature**, read [north_star.md](north_star.md) and run the feature gate.

---

## Foundation documents (start here)

| Document | Purpose |
|----------|---------|
| [vision.md](vision.md) | What the game is and what success feels like |
| [north_star.md](north_star.md) | **Design principles** — non-negotiable |
| [game_loop.md](game_loop.md) | Session, battle, and progression loops |
| [roadmap.md](roadmap.md) | Long-term phases: Village → Last Bastion |
| [fortress_progression.md](fortress_progression.md) | Visual and systemic fortress evolution |
| [heroes.md](heroes.md) | Legend ladder and attachment philosophy |
| [economy.md](economy.md) | Battle, campaign, and kingdom resources |
| [combat.md](combat.md) | Preparation vs execution, readability |
| [buildings.md](buildings.md) | Structures unlock systems |
| [future_systems.md](future_systems.md) | Placeholders — runes, spells, diplomacy, etc. |
| [domain_architecture.md](domain_architecture.md) | **Domain boundaries** — responsibilities, I/O, dependencies |

### Milestone 3 — Core progression design

| Document | Purpose |
|----------|---------|
| [progression_tree.md](progression_tree.md) | Ages I–VI — fortress chapters |
| [building_dependency_tree.md](building_dependency_tree.md) | Building unlock web |
| [hero_progression_tree.md](hero_progression_tree.md) | Legend ladders per class |
| [economy_flow.md](economy_flow.md) | Three-layer resource flow |
| [unlock_philosophy.md](unlock_philosophy.md) | Fortress-evolved unlocks only |
| [system_dependency_map.md](system_dependency_map.md) | Future systems reinforcement map |

---

## Implementation specs (engineering)

Written for code delivery; must align with foundation docs above.

| Document | Status |
|----------|--------|
| [FORTRESS_COMMANDER.md](FORTRESS_COMMANDER.md) | Screen laws, phase separation |
| [DEFENSIVE_POSTS.md](DEFENSIVE_POSTS.md) | Post assignment spec |
| [IMPLEMENTATION_ROADMAP.md](IMPLEMENTATION_ROADMAP.md) | Code phase tracker |
| [HERO_DOMAIN.md](HERO_DOMAIN.md) | MVP ✅ Defender entity |
| [FORTRESS_ROLES.md](FORTRESS_ROLES.md) | MVP ✅ Six roles |
| [WARBAND_COMPOSITION.md](WARBAND_COMPOSITION.md) | MVP ✅ Presets & hints |
| [TRAITS.md](TRAITS.md) | MVP ✅ 50 traits |
| [DIFFICULTY_BALANCE.md](DIFFICULTY_BALANCE.md) | MVP ✅ Tutorial & curve |
| [fortress_readability_plan.md](fortress_readability_plan.md) | Partial |

---

## Conflict resolution

1. **north_star.md** wins over implementation specs
2. **roadmap.md** wins over sprint convenience
3. Update or deprecate legacy specs when the foundation changes

---

## Agent boards

Review sessions: [agents/boards/sessions/](../agents/boards/sessions/)

Fortress Commander pivot: [2026-06-25-fortress-commander-pivot.md](../agents/boards/sessions/2026-06-25-fortress-commander-pivot.md)
