import { describe, it, expect, vi } from 'vitest';
import { EVENT_DEFS, getAvailableEvent } from '../src/campaign/events.js';

describe('campaign events', () => {
  it('defines eight story events', () => {
    expect(EVENT_DEFS).toHaveLength(8);
    for (const e of EVENT_DEFS) {
      expect(e.id).toBeTruthy();
      expect(e.trigger).toBeTypeOf('function');
      expect(e.canAffordA).toBeTypeOf('function');
      expect(e.canAffordB).toBeTypeOf('function');
    }
  });

  it('returns null when no campaign state', () => {
    expect(getAvailableEvent(null)).toBeNull();
  });

  it('returns null when no events trigger', () => {
    expect(getAvailableEvent({ battlesCompleted: 0, goldReserve: 0, stars: 0, defenders: [] })).toBeNull();
  });

  it('prefers unseen events', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const cs = { battlesCompleted: 3, goldReserve: 100, stars: 3, defenders: [], seenEventIds: ['handelsman'] };
    const ev = getAvailableEvent(cs);
    expect(ev.id).not.toBe('handelsman');
    Math.random.mockRestore();
  });

  it('handelsman triggers at 2+ battles with afford checks', () => {
    const ev = EVENT_DEFS.find(e => e.id === 'handelsman');
    expect(ev.trigger({ battlesCompleted: 2 })).toBe(true);
    expect(ev.canAffordA({ goldReserve: 60 })).toBe(true);
    expect(ev.canAffordA({ goldReserve: 10 })).toBe(false);
  });

  it('each event exposes working trigger and afford predicates', () => {
    const rich = {
      battlesCompleted: 10,
      goldReserve: 200,
      stars: 5,
      defenders: [{ careerKills: 20 }, { careerKills: 5 }],
      seenEventIds: [],
    };
    for (const ev of EVENT_DEFS) {
      expect(typeof ev.trigger(rich)).toBe('boolean');
      expect(typeof ev.canAffordA(rich)).toBe('boolean');
      expect(ev.canAffordB(rich)).toBe(true);
    }
    const broke = { battlesCompleted: 0, goldReserve: 0, stars: 0, defenders: [] };
    const eligible = EVENT_DEFS.filter(e => e.trigger(broke));
    expect(eligible).toHaveLength(0);
  });

  it('repeats seen events when all eligible were seen', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const cs = {
      battlesCompleted: 10,
      goldReserve: 200,
      stars: 5,
      defenders: [{ careerKills: 20 }],
      seenEventIds: EVENT_DEFS.map(e => e.id),
    };
    const ev = getAvailableEvent(cs);
    expect(ev).not.toBeNull();
    Math.random.mockRestore();
  });
});
