# Fortress Roles

> **Status:** MVP implemented (6 roles) in `src/roster/heroRoles.js` — 2026-06-22. Full 20-role spec below remains v2 target.

Heroes answer: **where on the battlefield do you belong?** Combat class = *how* they fight. Fortress role = *what part of the fortress they defend*.

Assigned in **War Camp** (one per hero). Bonus active only when placed in the correct **zone**.

## Zones

| Zone | Definition |
|------|------------|
| **Gate** | ≤4 cells (Chebyshev) from any portal |
| **Wall** | Adjacent to wall / fortress ring (radius 5 around GOAL) |
| **Core** | ≤3 cells from GOAL |
| **Outpost** | ≤2 cells from passive structure (Shrine, Barracks, Mine, Watch Tower) |
| **Fortress** | ≤10 cells from GOAL (`FORTRESS_ZONE_RADIUS`) |

## MVP — six roles

| Role | Effect (in zone) |
|------|------------------|
| **Gatekeeper** | +12% dmg near portals; +8% vs first spawn per portal/wave |
| **Wallkeeper** | +15% dmg adjacent to wall; walls +10% effective HP |
| **Scout** | +1 wave event preview (stacks Watch Tower) |
| **Quartermaster** | +3g/wave; −3g next hero recruit this assault |
| **Rune Keeper** | Shrine stars −1 wave threshold (min 2); +1★ / 8 waves if adjacent |
| **Chieftain Hunter** | +20% boss/herald dmg; first boss hit slow |

## Full roster (20)

**v2 specialists:** Citadel Warden, Bulwark, Lane Captain, Beacon Keeper, Siege Captain, Miner's Mate  

**Squad/story:** Rally Master, Vanguard, Shield-Brother, Frost Warden, Field Surgeon, Herald Breaker, Breacher, Reserve Captain  

## Synergies (pairs within 4 cells)

| Pair | Bonus |
|------|-------|
| Gatekeeper + Scout | The Pass — +5% gate dmg, +1 preview |
| Wallkeeper + Citadel Warden | Inner Ring — Warden +8% near Wallkeeper walls |
| Chieftain Hunter + Herald Breaker | The Hunt — elite kills soften boss |
| Rune Keeper + Quartermaster | Treasury — +1g per ★ earned |

Off-type assignment: −10% role bonus (player may override class default).
