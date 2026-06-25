import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Catches missing imports that only fail at runtime in the browser (e.g. `new Roster()` without import).
 */
describe('game.js module-scope imports', () => {
  const src = readFileSync(resolve('src/core/game.js'), 'utf8');
  const importBlock = src.split(/^const COLS/m)[0];

  const mustImport = [
    ['new Roster()', 'Roster'],
    ['getFortressBonuses(', 'getFortressBonuses'],
    ['getNextFortressUpgradeOffer(', 'getNextFortressUpgradeOffer'],
    ['new Grid(', 'Grid'],
    ['new Tower(', 'Tower'],
    ['new Enemy(', 'Enemy'],
    ['new Defender(', 'Defender'],
    ['resolveOnboardingHint(', 'resolveOnboardingHint'],
    ['buildAssaultTargetPriority(', 'buildAssaultTargetPriority'],
    ['prepareFieldForNewAssault(', 'prepareFieldForNewAssault'],
  ];

  for (const [usage, symbol] of mustImport) {
    it(`imports ${symbol} used in game.js`, () => {
      expect(src).toContain(usage);
      expect(importBlock).toMatch(new RegExp(`\\b${symbol}\\b`));
    });
  }
});
