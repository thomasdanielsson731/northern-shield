import { describe, it, expect } from 'vitest';
import {
  EQUIP_CEREMONY_FRAMES,
  getEquipCeremonyProgress,
  getEquipFlashAlpha,
  getEquipRingAlpha,
  getEquipRingRadius,
  getEquipLabelAlpha,
  getEquipCardPopAlpha,
  tickEquipCeremonyTimer,
} from '../src/ui/equipJuice.js';
import { getEquipCeremonyLayout } from '../src/ui/warCampJuice.js';

describe('equipJuice', () => {
  it('progress rises as timer counts down', () => {
    expect(getEquipCeremonyProgress(EQUIP_CEREMONY_FRAMES)).toBe(0);
    expect(getEquipCeremonyProgress(36)).toBeCloseTo(0.5, 2);
    expect(getEquipCeremonyProgress(0)).toBe(1);
  });

  it('flash alpha only in opening frames', () => {
    expect(getEquipFlashAlpha(72)).toBeCloseTo(0.24, 2);
    expect(getEquipFlashAlpha(48)).toBe(0);
    expect(getEquipFlashAlpha(40)).toBe(0);
  });

  it('ring and label fade with progress', () => {
    const prog = getEquipCeremonyProgress(36);
    expect(getEquipRingRadius(prog)).toBeGreaterThan(28);
    expect(getEquipRingAlpha(prog)).toBeGreaterThan(0);
    expect(getEquipLabelAlpha(42)).toBeGreaterThan(0);
    expect(getEquipLabelAlpha(20)).toBe(0);
    expect(getEquipCeremonyLayout(50).ringCy).toBeGreaterThan(120);
    expect(getEquipCardPopAlpha(36)).toBeGreaterThan(0);
    expect(getEquipCardPopAlpha(0)).toBe(0);
  });

  it('ticks ceremony timer', () => {
    expect(tickEquipCeremonyTimer(5)).toBe(4);
    expect(tickEquipCeremonyTimer(0)).toBe(0);
  });
});
