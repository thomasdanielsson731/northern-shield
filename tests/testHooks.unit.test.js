import { describe, it, expect, beforeEach } from 'vitest';
import { registerNsTestHooks, getNsTestHooks } from '../src/testHooks.js';

describe('testHooks', () => {
  beforeEach(() => {
    registerNsTestHooks({
      getPhase: () => 'betweenBattles',
      getRosterCount: () => 2,
    });
  });

  it('registerNsTestHooks exposes frozen hook object', () => {
    const hooks = getNsTestHooks();
    expect(hooks?.getPhase()).toBe('betweenBattles');
    expect(hooks?.getRosterCount()).toBe(2);
    expect(() => { hooks.getPhase = () => 'playing'; }).toThrow();
  });

  it('globalThis.__NS_TEST_HOOKS__ mirrors registered hooks', () => {
    expect(globalThis.__NS_TEST_HOOKS__?.getPhase()).toBe('betweenBattles');
  });
});
