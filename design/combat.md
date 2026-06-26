# Northern Shield — Combat

*The verdict on preparation*

---

## Philosophy

Combat answers one question:

> **Did the plan hold?**

It is not the primary place for **building**, **shopping**, or **roster management**. Those belong to War Camp and Fortress Prep.

Northern Shield combat is **pathless assault defense** in campaign: enemies press toward the **heart** (Great Hall / goal). Skirmish mode retains classic maze TD as a **legacy lab** — not the north-star fantasy.

---

## Preparation vs execution split

| Preparation (before horn) | Execution (during wave) |
|---------------------------|-------------------------|
| Assign heroes to posts | Heroes auto-execute roles |
| Choose siege placements | Siege fires on AI rules |
| Repair gates / walls | Gate HP depletes visibly |
| Read assault intel | React with pause / speed |
| Spell loadout (Citadel+) | Trigger limited abilities |

**Target ratio:** ~70% of outcome decided in prep; ~30% in execution (abilities, target priority luck, clutch heals).

---

## Readability principles

1. **Threat direction** obvious without scanning 48×30 grid
2. **Gate under attack** reads faster than DPS numbers
3. **Named heroes** visible on field — initials minimum, portrait preferred
4. **Boss phases** telegraphed — UTGARD board standard
5. **No hidden rules** — if cursed shields absorb first hit, intel said so

See `agents/combat-readability-agent.md` (SIGHT) for review workflow.

---

## Enemy design (directional, not new content task)

Enemies are **narrative pressure**, not content treadmill.

| Era | Enemy tone |
|-----|------------|
| Village | Raiders, wolves, small draugr |
| Fortress | Siege lines, shield walls |
| Citadel | Jötnar, storm hosts, cursed kings |

**No task to add enemies now** — when added, each must **test a prep decision** (break wall? ignore flank? spend food for fire pot?).

---

## Assault structure (campaign)

- **2–3 waves** per assault node
- Wave 2+ auto-advance — plan must survive **duration**
- Boss node on south front (prototype convention)
- Four fronts — intel emphasizes **primary facing**

---

## Hero combat (prototype foundations)

- Pathless movement toward threats
- Fortress role zone bonuses (gate, wall, core)
- Trait hooks in `traitGameplay.js`
- Combat HP separate from career — injuries possible (v2)
- MVP tracking for debrief

---

## Fortress combat

- Wall ring with **gate gaps** at N/E/S/W
- Gate HP bars visible in assault
- Breach → lives / gold raid / narrative banner
- Wall damage **persists** between assaults (target)

---

## Battle UI (campaign target)

**Show:**
- Lives, gold, wave index within assault
- Incoming composition (intel card)
- Selected hero dossier (optional)
- Gate / wall integrity by facing
- Pause, speed

**Hide:**
- Build dock
- Structure shop
- Rune shop chip
- Recruit

---

## Aftermath linkage

Every assault exports **combat facts** to After Action:

- Who fell, who MVP’d
- Which gate cracked
- Gold stolen / earned
- Chronicle one-liner seed

Combat without aftermath story is incomplete.

---

## Skirmish mode

100-wave maze TD on preset maps — **secondary**. Useful for:

- Pathing tests
- Classic TD nostalgia
- Balance sandboxes

Skirmish may keep deploy-between-waves; **campaign must not**.

---

## See also

- [game_loop.md](game_loop.md)
- [fortress_progression.md](fortress_progression.md)
- [DEFENSIVE_POSTS.md](DEFENSIVE_POSTS.md)
- [FORTRESS_COMMANDER.md](FORTRESS_COMMANDER.md) — screen laws
