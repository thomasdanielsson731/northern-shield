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
    expect(advanceOnboarding(ONBOARDING.PICK_FRONT, 'startAssault')).toBe(ONBOARDING.DEPLOY);
    expect(advanceOnboarding(ONBOARDING.LAUNCH, 'startAssault')).toBe(ONBOARDING.DEPLOY);
    expect(advanceOnboarding(ONBOARDING.DEPLOY, 'placedHero')).toBe(ONBOARDING.DONE);
  });

  it('returns hints for active steps', () => {
    expect(getOnboardingHint(ONBOARDING.COMMAND_MAP)?.title).toBe('COMMAND MAP');
    expect(getOnboardingHint(ONBOARDING.DONE)).toBeNull();
  });

  it('shows launch hint on front panel after pick', () => {
    expect(resolveOnboardingHint(ONBOARDING.PICK_FRONT, { frontView: true })?.title).toBe('LAUNCH ASSAULT');
    expect(resolveOnboardingHint(ONBOARDING.PICK_FRONT, { frontView: false })?.title).toBe('SELECT FRONT');
  });
});
