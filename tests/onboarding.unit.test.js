import { describe, it, expect } from 'vitest';
import {
  ONBOARDING,
  advanceOnboarding,
  getOnboardingHint,
  resolveOnboardingHint,
  getRepairOnboardingHint,
} from '../src/campaign/onboarding.js';

describe('onboarding', () => {
  it('advances command map → pick front → deploy', () => {
    expect(advanceOnboarding(ONBOARDING.COMMAND_MAP, 'openFront')).toBe(ONBOARDING.PICK_FRONT);
    expect(advanceOnboarding(ONBOARDING.COMMAND_MAP, 'startAssault')).toBe(ONBOARDING.DEPLOY);
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

  it('stays on deploy after gate placed until hero placed', () => {
    expect(advanceOnboarding(ONBOARDING.DEPLOY, 'placedGate')).toBe(ONBOARDING.DEPLOY);
    expect(advanceOnboarding(ONBOARDING.DEPLOY, 'placedHero')).toBe(ONBOARDING.DONE);
  });

  it('advances after gate repair during deploy teach', () => {
    expect(advanceOnboarding(ONBOARDING.DEPLOY, 'repairedGate')).toBe(ONBOARDING.DONE);
  });

  it('shows repair hint on A3 when gate scarred', () => {
    const hint = getRepairOnboardingHint({ westGateScarred: true, westGateRepaired: false, wood: 15 }, 3);
    expect(hint?.title).toBe('MEND THE GATE');
    expect(hint?.line).toMatch(/10 wood/);
    expect(getRepairOnboardingHint({ westGateScarred: true, westGateRepaired: false, wood: 2 }, 3)?.line)
      .toMatch(/timber/i);
    expect(getRepairOnboardingHint({ westGateScarred: false, wood: 15 }, 3)).toBeNull();
  });
});
