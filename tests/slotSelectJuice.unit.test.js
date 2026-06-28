import { describe, it, expect } from 'vitest';
import {
  SLOT_DELETE_MODAL,
  getDeleteConfirmBackdropAlpha,
  getDeleteConfirmPulse,
} from '../src/ui/slotSelectJuice.js';

describe('slotSelectJuice', () => {
  it('defines modal size', () => {
    expect(SLOT_DELETE_MODAL.w).toBe(320);
    expect(SLOT_DELETE_MODAL.h).toBe(118);
  });

  it('pulse and backdrop', () => {
    expect(getDeleteConfirmBackdropAlpha()).toBe(0.72);
    expect(getDeleteConfirmPulse(0)).toBeCloseTo(0.55, 1);
  });
});
