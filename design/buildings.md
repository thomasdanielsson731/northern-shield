# Northern Shield — Buildings

*Structures unlock systems — the fortress teaches itself*

---

## Philosophy

A building is not a +5% stat node. It is a **promise**:

> *"If you build this, your life as jarl changes."*

Players discover systems by **erecting** them, not by reading a tech tree manual on hour one.

---

## Building categories

### 1. Defensive field structures (assault-facing)

Exist on the **battle schematic** as posts or fixtures. Chosen in **Fortress Prep**.

| Building | Role | Unlocks |
|----------|------|---------|
| **Gate / Port** | Enemy admission control | Assault survival baseline |
| **Wall segment** | Damage sponge | Repair economy sink |
| **Ballista platform** | Anti-swarm siege | Ranged structure slot |
| **Catapult platform** | Anti-armor | Area structure slot |
| **Watch tower** | Intel + range | Scout post bonuses |

*Prototype: many map to tower types on grid; target: post labels.*

### 2. War Camp meta buildings (persistent)

Live in **War Camp / Fortress tab** — not draggable tiles.

| Building | Role | Unlocks |
|----------|------|---------|
| **Great Hall** | Heart of roster | Cap, promotions, saga |
| **Treasury** | Gold reserve | Passive income, raid protection |
| **Barracks** | Housing | Recruit cadence, starter gold |
| **Armory** | Gear | Equipment slots, crafting hooks |
| **Rune Forge** | Magic industry | Rune tiers, star discounts |
| **Granary** | Food storage | Food economy |
| **Quarry / Mine** | Materials | Stone / iron income |
| **Market** | Trade | Reputation sinks |
| **Scriptorium** | Lore | Research, ancient knowledge |

### 3. Districts (Citadel+)

Visual **clusters** on fortress panorama — not individual click targets.

- Memorial avenue
- Ritual circle
- Dragon perch
- Refugee quarter

Districts signal **tier** and **story state**.

---

## Upgrade philosophy

| Tier | Player feeling |
|------|----------------|
| I | “We have this now” — new button or cap |
| II | “We’re serious” — visual upgrade + efficiency |
| III | “The North knows us” — unique rule or spell |

Max **3 visible tiers** per meta building for clarity (IV+ = legendary variant, rare).

---

## Unlock rules

1. **Fortress phase gate** — no Rune Forge in Village
2. **Reputation gate** — Market needs allies
3. **Assault milestone** — Forge after first siege victory
4. **Choice gate** — fork: deep walls OR deep hall (optional drama)

Never hard-lock **fun** behind grind — hard-lock **power** behind **story beats**.

---

## Building ↔ post mapping

As fortress tier rises, **posts upgrade in place**:

- West Gate I → timber gate
- West Gate II → iron-bound gate
- West Gate III → rune ward gate

Same post ID, new art and rules.

---

## Prototype (`src/fortress/fortress.js`)

Current meta upgrades: barracks, armory, watchtower, wallworks, treasury.

**Gap vs vision:** Great Hall, Rune Forge, material producers — see [roadmap.md](roadmap.md) Fortress phase.

---

## Anti-patterns

- Buildings that only modify numbers
- Ten buildings with identical upgrade shape
- Field structures that require maze building in campaign
- Meta buildings visible on battle grid cluttering combat

---

## See also

- [economy.md](economy.md)
- [fortress_progression.md](fortress_progression.md)
- [future_systems.md](future_systems.md)
