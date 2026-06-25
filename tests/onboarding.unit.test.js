import { describe, it, expect } from 'vitest';
import { ONBOARDING, advanceOnboarding, getOnboardingHint } from '../src/campaign/onboarding.js';

describe('onboarding', () => {
  it('advances command map to launch to deploy', () => {
    expect(advanceOnboarding(ONBOARDING.COMMAND_MAP, 'openFront')).toBe(ONBOARDING.LAUNCH);
    expect(advanceOnboarding(ONBOARDING.LAUNCH, 'startAssault')).toBe(ONBOARDING.DEPLOY);
    expect(advanceOnboarding(ONBOARDING.DEPLOY, 'placedHero')).toBe(ONBOARDING.DONE);
  });

  it('returns hints for active steps', () => {
    expect(getOnboardingHint(ONBOARDING.COMMAND_MAP)?.title).toBe('COMMAND MAP');
    expect(getOnboardingHint(ONBOARDING.DONE)).toBeNull();
  });
});
