# Hero Domain

*Northern Shield — Fortress Defense RPG with Tactical Squad Management*

> **Status:** MVP in code — `defender.js`, `heroMovement.js`, combat HP, War Camp loop (2026-06-22).

Heroes are the **primary asset**. Structures support. A Hero persists across maps; a `Tower` on the field is their **combat instance** for one assault.

## Entity model

| Layer | File (today) | Persists |
|-------|--------------|----------|
| Hero | `defender.js` → `hero.js` | Yes — roster, save |
| Tower | `tower.js` | No — per assault |
| Chronicle | `chronicle.js` | Yes — prose, scars |

### Hero fields (target)

1. **Identity** — name, portrait, biography, origin  
2. **Progression** — level (0–10), XP, veteran rank  
3. **Combat class** — Berserker, Valkyrie, Archer, Warden, Healer, Ice Giant, Skald  
4. **Combat role** — Tank, ST DPS, AOE DPS, Support, Control  
5. **Fortress role** — player-assigned (see [FORTRESS_ROLES.md](FORTRESS_ROLES.md))  
6. **Traits** — personality + earned (see [TRAITS.md](TRAITS.md))  
7. **Equipment** — weapon, armor, relic (v2)  
8. **Career** — battles, kills, chieftains slain, last stands  

## MVP → v2 → vision

| Phase | Scope |
|-------|-------|
| **MVP** | UI "Hero" not "Defender"; combat role badge; 6 fortress roles; biography persist |
| **v2** | Relic slot; 6 active + 4 reserve squad; trait gameplay |
| **Long-term** | Lineage, map scars, Hall saga export |

## Save compatibility

Map `heroes[]` ← `defenders[]`, `id` ← `defenderId`, `level` ← `careerLevel`. Omit `fortressRole`, `relic`, `combatRole` until shipped.

See [WARBAND_COMPOSITION.md](WARBAND_COMPOSITION.md) for squad doctrine.
