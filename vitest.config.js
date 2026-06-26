import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['tests/setup.js'],
    include: ['tests/**/*.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'json-summary'],
      // Pure-logic modules only — canvas game loop (game.js, entities, grid) excluded.
      include: [
        'src/campaign/**/*.js',
        'src/fortress/**/*.js',
        'src/combat/**/*.js',
        'src/roster/**/*.js',
        'src/ui/warCampPanel.js',
        'src/ui/structurePortrait.js',
        'src/ui/assaultPanels.js',
        'src/ui/uiTheme.js',
      ],
      exclude: [
        'src/campaign/sagaPlaytestHarness.js',
        'src/campaign/firstSagaUI.js',
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 70,
        statements: 90,
      },
    },
  },
});
