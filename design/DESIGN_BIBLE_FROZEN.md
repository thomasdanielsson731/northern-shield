# Design Bible — Frozen

*Effective: vertical slice pre-production complete*

The documents in `/design` are **frozen** as the Northern Shield Design Bible until **The First Saga** vertical slice ships.

## Implementation rule

> Every implementation decision must support [the_first_saga.md](the_first_saga.md) and pass [north_star.md](north_star.md) / [moments_to_protect.md](moments_to_protect.md).

- **Do not** add systems outside the slice fence without explicit saga approval.
- **Do not** skip ahead to later Ages (Citadel, dragon, runes, etc.).
- **Do not** refactor unrelated prototype code during slice work.

## Active implementation spec

| Document | Role |
|----------|------|
| **[the_first_saga.md](the_first_saga.md)** | **Primary** — assaults, screens, pacing, CUT list |
| [DEFENSIVE_POSTS.md](DEFENSIVE_POSTS.md) | 2 posts only in slice |
| [FORTRESS_COMMANDER.md](FORTRESS_COMMANDER.md) | Screen laws |
| [moments_to_protect.md](moments_to_protect.md) | Identity gate |

## Reference (not slice scope)

Foundation docs (vision, progression trees, domain architecture, player journey) inform **direction** but **the_first_saga.md wins** on scope conflicts.

## Unfreeze

Design Bible unfreezes after Saga I ships and Saga II scoping session is recorded.
