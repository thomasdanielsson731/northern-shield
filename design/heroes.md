# Northern Shield — Heroes

*Legends, not stat sticks*

---

## Philosophy

Heroes are **people the player sends to die for the fortress**. They should not feel like interchangeable towers with Norse skins.

Progression is measured in:

- **Identity** — name, voice, trait, title
- **Relationship** — bonds, memorials, legacy
- **Story** — chronicle, scars, assault MVP
- **Capability** — stats last, not first

> A +10% damage upgrade without a title, scar, or saga line is a failed hero feature.

---

## Legend ladder (universal arc)

Every class follows the same **emotional climb**. Class changes **how** they fight, not **whether** they become legend.

```
Village Guard
    ↓  (first survival, naming)
Berserker / Valkyrie / … (class identity)
    ↓  (battles survived, kills, roles)
Veteran
    ↓  (milestone talents, scar risk)
Captain
    ↓  (holds a post, leads composition)
Jarl
    ↓  (faction recognition, unique ability)
High King / High Queen (capstone title — one per campaign optional)
```

### Rank meanings

| Rank | Fantasy | Unlocks (design) |
|------|---------|------------------|
| **Village Guard** | Untested, afraid, loyal | Deploy only |
| **Class identity** | “This is who I am” | Class ability |
| **Veteran** | Seen blood; still stands | Talents, trait depth |
| **Captain** | Others rally nearby | Post bonus, advisor lines |
| **Jarl** | Named in chronicle | Hero spell / aura |
| **High King** | North remembers | Legacy buff, succession |

Ranks are **earned**, not purchased. Death before Veteran hurts; death after Jarl is **history**.

---

## Class philosophy (nine defenders)

Each class answers a **fortress question**:

| Class | Fortress question | Legend fantasy |
|-------|-------------------|----------------|
| **Berserker** | Who breaks the charge? | Feared breaker at the gate |
| **Valkyrie** | Who holds the line? | Shield that never bends |
| **Military** | Who sees them coming? | Eagle eye on the wall |
| **Hydda** | Who keeps us fed and paid? | Quartermaster saint |
| **Blondie** | Who strikes from afar? | Saga skald with bow |
| **Isjätten** | Who kills chiefs? | Giant-slayer |
| *(star-gated)* | Who answers myth? | Late-game legend slots |

Star-gated classes are **myth arrivals**, not early roster filler.

---

## Attachment systems (existing + planned)

### Live today (prototype)
- Persistent `Defender` entity — XP, career level, talents, equipment
- Traits (50) — personality in combat hooks
- Fortress roles — gatekeeper, scout, etc.
- Chronicle titles, scars, battle history
- Named starters, rename ceremony

### Planned (see [future_systems.md](future_systems.md))
- Promotion titles tied to **posts held** (Gate Captain, Wall Warden)
- Hero spells at Jarl rank
- Legacy succession — fallen jarl buffs successor
- Bonds between defenders — combo dialogue in debrief
- Injury / recovery between assaults (not instant full heal)

---

## Death and consequence

| Mode | Design intent |
|------|----------------|
| **Within assault** | Hero falls; may respawn next assault at post (prototype) |
| **Permadeath (optional)** | Legend ends; memorial + legacy bonus |
| **Chronicle** | Death always writes a line |

Death should produce **story**, not only roster -1.

---

## War Camp vs field

- **War Camp** — who they are (gear, talents, name, rank, injuries)
- **Fortress prep** — where they stand (post assignment)
- **Battle** — what they do (execution)

Never recruit during battle. Never open talent trees during prep if it splits attention from **assignment**.

---

## Hero ↔ fortress relationship

- Preferred post on hero card (v2)
- Role fit icon in post picker
- Advisor skald: *“Gunnar is a gatekeeper — west gate needs him.”*
- Great Hall tier raises **roster cap** — more legends possible

---

## Anti-patterns

- Heroes as infinite respawn tiles
- Stats without rank or title feedback
- New hero class every month without legend arc
- DPS leaderboard as primary UI

---

## See also

- [HERO_DOMAIN.md](HERO_DOMAIN.md) — MVP entity spec
- [FORTRESS_ROLES.md](FORTRESS_ROLES.md) — role bonuses
- [TRAITS.md](TRAITS.md) — trait catalog
- [north_star.md](north_star.md)
