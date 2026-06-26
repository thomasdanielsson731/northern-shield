# Fortress Readability & Emotional Upgrade Plan

> **Note (2026-06-24):** Campaign combat is **pathless** — path contrast/readability items below apply to **skirmish mode** only. Campaign readability uses spawn vectors, target priorities, hero combat HP, and fortress-zone tint.

Goal: transform Northern Shield from a prototype into a highly-readable, emotionally engaging "Fortress Defense" experience.

Summary of work completed
- Implemented MVP tower marker: selects best-performing tower after each wave and shows crown + particle flourish.

High-level approach
- Audit existing visuals and systems (many features already present in codebase: hoard, coin arcs, boss flows, elite marks).
- Prioritise low-risk, high-impact polish: clearer treasury, boss spectacle, strong visual hierarchy, MVP emotional hook, elite readability, combat feel.
- Implement small code hooks and assets where necessary; leave heavy refactors for later.

Where to find and modify code
- Core game loop & visual state: `src/core/game.js`
  - Treasury/hoard visuals: implemented in `src/grid/grid.js` (hoard aura, chest, pile)
  - Coin particle spawn: `spawnGoldCoins()` in `src/core/game.js`
  - Boss lifecycle & UI: `onBossPhase75()`, `onBossPhase50()`, `onBossKilled()`, `drawBossWarning()`, `drawBossDefeat()` in `src/core/game.js`
  - Wave-end hooks (MVP selection): inserted where wave ends in `src/core/game.js`

- Towers and MVP visuals: `src/entities/tower.js`
  - Tower stats: damage/kills tracked; `damageDealt` and `killCount` exist
  - MVP crown: `mvpTimer` added and crown drawing implemented

- Enemies and elite visuals: `src/entities/enemy.js`
  - `isElite` auto-flag for high-HP enemies; boss aura + name + HP bar code already present

- Art direction and assets: `tower-defense/ART_DIRECTION.md` and `assets/ui/gold_pile.png` exist and are referenced

Concrete tasks implemented / changed
1) MVP selection (code): choose best tower after wave end (damage + kills weighting), set `mvpTimer`, spawn particles and `MVP` floater. File: `src/core/game.js` (wave-end block).
2) Tower crown (code): `mvpTimer` property and crown drawing with small gems; decremented in `Tower.draw()`. File: `src/entities/tower.js`.

Planned follow-ups (ordered by impact)
1. Treasury polish — small (Small)
   - Add 3 visual tiers for hoard: basic coins → chests & relics → animated orbiting relics (already partly present). Wire `gold` thresholds to show chest/gems. Files: `src/grid/grid.js`, assets `ui/gold_pile.png`, `ui/gold_icon.png`.
2. Coin flight improvements — tiny (Small)
   - Tweak arc timing, add subtle scale-up near hoard, and sound sync. File: `src/core/game.js` (`spawnGoldCoins`, `drawGoldCoins`).
3. Boss spectacle tuning — medium (Medium)
   - Add screen-edge pulse, stronger audio hooks, boss nameplate glue, and dedicated entrance animation timed with portalFlash and `drawBossWarning`. Files: `src/core/game.js`, `src/core/sounds.js`, assets: boss audio.
4. Reduce clutter / visual hierarchy pass — medium (Medium)
   - Audit glows, lower ambient particle alpha, ensure Tier 1 objects (boss, fortress core, treasury, leaking enemies) have highest contrast. Files: various draw functions.
5. Elite readability tweaks — small (Small)
   - Strengthen elite outline, add tinted nameplate and reward popup. Files: `src/entities/enemy.js` (elite indicator already present).
6. Combat feel enhancements — small (Small)
   - More satisfying hit/kill FX: expand impact flashes, critical hit effects, and small camera shakes on heavy kills. Files: `src/core/game.js`, `src/entities/bullet.js`.
7. Boss death payoff — small/medium (Medium)
   - Treasure burst (already present), victory banner, animated coin flood tuned for emotional payoff. Files: `onBossKilled()` in `src/core/game.js` (already emits coins).
8. Fortress identity (decorative buildings) — medium (Medium)
   - Add static building sprites (Great Hall, Rune Forge, Watch Tower, Banner Poles, Longhouse) near fortress. Upgrade visuals per wave/stars. Files: `src/grid/grid.js` and assets in `assets/ui/`.
9. MVP persistence & share: (Small)
   - Persist MVP per-wave summary in highscore / wave recap UI; allow player to inspect tower after wave. Files: `src/core/game.js`, UI panels.
10. Final UX review & top-10 missing items (Large)
   - Run playtest, collect readability regressions, iterate.

Top 10 remaining high-impact improvements (ranked) with effort estimates
1. Reduce visual clutter & reweight glows across systems — Medium
2. Strengthen boss entrance cinematic (edge pulse + audio) — Medium
3. Decorative building upgrades (Great Hall / Treasury visuals per milestone) — Medium
4. MVP persistent recap + small UI to jump to tower — Small
5. Elite nameplates + tint + reward multiplier UI — Small
6. Coin arc scale & sound sync improvements — Small
7. Add small UI micro-animations for building upgrades (pop + glow) — Small
8. Tweak colors/contrast for Tier 1 vs Tier 4 elements — Small
9. Victory & defeat cinematic tweaks (slow-motion + vignette) — Medium
10. Tooling: automated visual regression snapshots for HUD elements — Large

Testing & verification
- Manual play through key waves (10,25,50,75,100) to verify boss flows and MVP behavior.
- Quick sanity checks: start dev server in `tower-defense/` and run a wave or two.

How I prioritized changes
- Always preserve gameplay correctness (pathfinding, economy, wave logic).
- Prefer visible, emotional feedback that doesn't alter balance.

Next steps I can perform now
- Tune boss entrance (add edge pulse + audio points).
- Add decorative building sprites placeholders and wire visual upgrade levels.
- Implement elite nameplate and MVP wave-recap UI.

If you'd like, I can implement one of the follow-ups now — tell me which (e.g., boss entrance, fortress buildings, elite nameplates, MVP recap) and I'll apply a focused patch and playtest instructions.
