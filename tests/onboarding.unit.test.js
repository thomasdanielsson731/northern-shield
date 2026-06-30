import { describe, it, expect } from 'vitest';
import {
  ONBOARDING,
  advanceOnboarding,
  getOnboardingHint,
  resolveOnboardingHint,
} from '../src/campaign/onboarding.js';

describe('onboarding', () => {
  it('advances command map → pick front → deploy', () => {
    expect(advanceOnboarding(ONBOARDING.COMMAND_MAP, 'openFront')).toBe(ONBOARDING.PICK_FRONT);
    expect(advanceOnboarding(ONBOARDING.COMMAND_MAP, 'startAssault')).toBe(ONBOARDING.DEPLOY);
    expect(advanceOnboarding(ONBOARDING.COMMAND_MAP, 'attack')).toBe(ONBOARDING.DEPLOY);
    expect(advanceOnboarding(ONBOARDING.PICK_FRONT, 'startAssault')).toBe(ONBOARDING.DEPLOY);
    expect(advanceOnboarding(ONBOARDING.LAUNCH, 'startAssault')).toBe(ONBOARDING.DEPLOY);
    expect(advanceOnboarding(ONBOARDING.DEPLOY, 'placedHero')).toBe(ONBOARDING.DONE);
  });

  it('returns first saga hints when requested', () => {
    expect(getOnboardingHint(ONBOARDING.COMMAND_MAP, { firstSaga: true })?.title).toBe('WEST ROAD');
    expect(getOnboardingHint(ONBOARDING.DEPLOY, { firstSaga: true })?.line).toMatch(/WEST GATE/i);
    expect(getOnboardingHint(ONBOARDING.DEPLOY, { firstSaga: true, gateAssigned: true })?.title)
      .toBe('SOUND HORN');
  });

  it('shows launch hint on front panel after pick', () => {
    expect(resolveOnboardingHint(ONBOARDING.PICK_FRONT, { frontView: true })?.title).toBe('LAUNCH ASSAULT');
    expect(resolveOnboardingHint(ONBOARDING.PICK_FRONT, { frontView: false })?.title).toBe('SELECT FRONT');
  });

  it('stays on deploy after gate placed until hero placed', () => {
    expect(advanceOnboarding(ONBOARDING.DEPLOY, 'placedGate')).toBe(ONBOARDING.DEPLOY);
    expect(advanceOnboarding(ONBOARDING.DEPLOY, 'placedHero')).toBe(ONBOARDING.DONE);
  });

  it('advances after horn during deploy teach', () => {
    expect(advanceOnboarding(ONBOARDING.DEPLOY, 'soundedHorn')).toBe(ONBOARDING.DONE);
  });
});
