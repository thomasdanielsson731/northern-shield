# Northern Shield — Fortress Commander RPG

*Creative direction bible · 2026-06-25 · Supersedes TD-first UX assumptions*

## Genre

**Fortress Commander RPG** — not tower defense.

The player is the commander of a Viking stronghold. They manage **people** (War Camp), prepare **places** (Fortress Preparation), and watch **plans execute** (Battle). Preparation wins battles.

Reference touchstones: XCOM (people), Darkest Dungeon (attachment), Into the Breach (readable plans), Stronghold (home), Against the Storm (prep under pressure).

## Core fantasy

> *"I am protecting my kingdom — Gunnar holds the West Gate when the draugr come."*

Not: *"I place archer at tile 14,7."*

## Game loop

```
Campaign Map → Command Map → War Camp → Fortress Preparation → Battle → After Action → War Camp
```

| Phase | Question answered | Player fantasy |
|-------|-------------------|----------------|
| Campaign Map | Where is the war? | Realm under siege |
| Command Map | Which fight? | Four fronts, one breach ends us |
| War Camp | Who fights? | My army — names, scars, gear |
| Fortress Prep | How do we hold? | Assign captains to gates and walls |
| Battle | Did the plan work? | Hold the line |
| After Action | What did it mean? | Saga, injuries, scars on the fortress |

## Screen laws

1. **One screen = one question.**
2. **War Camp never shows the battlefield.**
3. **Fortress Prep never recruits or opens talent trees.**
4. **Battle never shops or builds.**
5. **After Action never edits layout.**

## War Camp (people)

- Roster, recruit, heal, equip, runes, promotions, bonds, chronicle
- Campaign meta buildings (Great Hall, Treasury, Rune Forge) — persistent, not field tiles
- **No grid. No posts. No wave HUD.**

Primary CTA: **Prepare Fortress** (when assault queued) or **Command Map**.

## Fortress Preparation (places)

- Defensive **posts** (not grid cells): West Gate, Watch Tower, Ballista Platform, Inner Keep, etc.
- Assign named heroes to posts; mount siege on platforms; repair gates/walls
- Assault intel (read-only) + skald advisor
- Assault budget ◆ (repairs, siege) separate from War Camp reserve

Primary CTA: **Begin Assault** (gated: ≥1 hero, gate rule on first tutorial).

Implementation: `src/fortress/defensivePosts.js`, `gamePhase === 'fortressPrep'`.

## Battle (execution)

- Combat field only; preparation determines ~70% of outcome
- Abilities, pause, speed — no recruit, no structure dock, no rune shop

## After Action (meaning)

- Chronicle prose first, then consequences (injuries, gate damage, MVP)
- Route to War Camp or Fortress Prep — never raw grid

## Defenders as people

Every hero: name, preferred post, fortress role, traits, injuries, promotion titles (e.g. Gate Captain).

Verb: **Assign Gunnar to West Gate** — not "place military."

## Fortress as character

- Gate/wall integrity per facing persists between assaults
- Meta buildings evolve visually in War Camp (v2 art)
- Schematic in Prep is the primary fortress UI

## Skirmish

Classic maze TD remains a **separate mode** with its own UI grammar. Not mixed into campaign onboarding.

## Removed from campaign (prototype → product)

- Drag-to-grid deploy as primary verb
- Deploy bar over playfield
- WARBAND \| STRUCTURES dock during assault
- Rune shop in combat
- Field structure list in War Camp
- Multiple competing onboarding strips

See [IMPLEMENTATION_ROADMAP.md](IMPLEMENTATION_ROADMAP.md) for phased delivery.
