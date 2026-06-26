# Defensive Posts — System Spec

*Fortress Preparation · MVP v1*

## Concept

Players assign heroes and siege to **named posts**. Posts map to grid `(col, row)` for combat simulation — the grid is implementation detail, not player-facing.

## Post types

### Hero posts (max 6 filled per assault)

| Post ID | Label | Role hint | Zone |
|---------|-------|-----------|------|
| `west_gate` | West Gate | Gatekeeper | Portal-facing west |
| `east_gate` | East Gate | Gatekeeper | Portal-facing east |
| `north_gate` | North Gate | Gatekeeper | Portal-facing north |
| `south_gate` | South Gate | Gatekeeper | Portal-facing south |
| `north_wall` | North Wall | Wallkeeper | Fortress ring |
| `south_wall` | South Wall | Wallkeeper | Fortress ring |
| `watch_tower` | Watch Tower | Scout | Range / intel |
| `inner_keep` | Inner Keep | Quartermaster / healer | Core |

### Siege posts (max 4 structures)

| Post ID | Label | Structure |
|---------|-------|-----------|
| `ballista_platform` | Ballista Platform | `military` or siege type TBD |
| `catapult_platform` | Catapult Platform | `catapult` |
| `gate_fixture` | Port / Gate | `gate` (CELL.GATE in walls) |

Assault **front** (`west` | `north` | `east` | `south`) marks which gate post is **primary** (+advisor emphasis).

## Persistence (`fieldState`)

```js
{
  gold: number,
  towers: [...],           // derived from posts at battle start; legacy compat
  walls: { ... },
  postAssignments: {
    [postId]: { defenderId: string } | { structureType: string, level?: number }
  },
  deploySnapshot: { ... }  // existing assault respawn
}
```

## API (`src/fortress/defensivePosts.js`)

- `resolvePostCell(postId, goal, ringR)` → `{ col, row }`
- `getPrimaryGateForFront(frontId)` → postId
- `assignDefender(assignments, postId, defenderId)`
- `assignStructure(assignments, postId, structureType)`
- `clearPost(assignments, postId)`
- `validateAssignments(assignments, { requireGate, minHeroes })`
- `buildTowerPlacements(assignments, roster, goal)` → tower plain objects for `restoreCampaignField`

## UX

1. Click post chip → roster picker (available heroes, role fit icon)
2. Click assigned hero → clear or swap
3. Siege posts → structure picker (budget ◆)
4. Schematic highlights primary front gate
5. **Begin Assault** → `buildTowerPlacements` → `startCampaignNodeBattle({ autoStartCombat: true })`

## Migration

Existing saves without `postAssignments`: infer from `towers[]` positions on first Prep load, or empty assignments.
