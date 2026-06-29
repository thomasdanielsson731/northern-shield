/**
 * Browser / Playwright automation surface — read-only game state + input simulation.
 * Exposed as globalThis.__NS_TEST_HOOKS__ when registered from game.js.
 */

/** @type {Record<string, unknown> | null} */
let _hooks = null;

/** @param {Record<string, unknown>} hooks */
export function registerNsTestHooks(hooks) {
  _hooks = Object.freeze({ ...hooks });
  if (typeof globalThis !== 'undefined') {
    globalThis.__NS_TEST_HOOKS__ = _hooks;
  }
}

export function getNsTestHooks() {
  return _hooks;
}
