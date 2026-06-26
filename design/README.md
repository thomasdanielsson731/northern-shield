# Northern Shield — Design Foundation

*Design Bible **frozen** · see [DESIGN_BIBLE_FROZEN.md](DESIGN_BIBLE_FROZEN.md)*

> Build and command a living Viking fortress that evolves from a tiny wooden village into the last magical citadel protecting the North.

**Before implementing any feature**, read [north_star.md](north_star.md) and [the_first_saga.md](the_first_saga.md) (active vertical slice).

---

## Active implementation target

| Document | Purpose |
|----------|---------|
| **[the_first_saga.md](the_first_saga.md)** | **Vertical slice — The First Saga** (canonical until shipped) |
| [DESIGN_BIBLE_FROZEN.md](DESIGN_BIBLE_FROZEN.md) | Freeze notice + rules |
| [moments_to_protect.md](moments_to_protect.md) | Sacred beats — do not sacrifice |

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

### Milestone 4 — Player experience

| Document | Purpose |
|----------|---------|
| [player_journey.md](player_journey.md) | Emotional chapters + 35 WOW moments |
| [player_motivation.md](player_motivation.md) | Retention — first hour to 100 hours |
| [moments_to_protect.md](moments_to_protect.md) | Sacred beats; identity over convenience |

---

## Implementation specs (engineering)

Written for code delivery; must align with foundation docs above.

| Document | Status |
|----------|--------|
| **[FORTRESS_AS_UI.md](FORTRESS_AS_UI.md)** | **Creative direction — fortress IS the interface** (places, not menus) |
| [FORTRESS_PREP_REDESIGN.md](FORTRESS_PREP_REDESIGN.md) | Superseded for navigation; schematic/ceremony beats may carry forward |
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

## Agent review organization

Five studio boards protect this bible. Start at [agents/ORGANIZATION.md](../agents/ORGANIZATION.md).

| Board | Protects |
|-------|----------|
| Executive | Vision, scope, milestones |
| Gameplay | Loop, economy, heroes, combat |
| Fortress | Buildings, posts, settlement |
| Player Experience | UX, art, narrative, feel |
| Engineering | Architecture, tests, saves |

Review sessions: [agents/boards/sessions/](../agents/boards/sessions/)
