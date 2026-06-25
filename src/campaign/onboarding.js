/** Guided onboarding steps for first campaign play. */
export const ONBOARDING = {
  NONE:        0,
  COMMAND_MAP: 1,
  PICK_FRONT:  2,
  LAUNCH:      3,
  DEPLOY:      4,
  DONE:        5,
};

export function getOnboardingHint(step) {
  switch (step) {
    case ONBOARDING.COMMAND_MAP:
      return { title: 'COMMAND MAP', line: 'Four fronts surround your fortress — pick one to begin' };
    case ONBOARDING.PICK_FRONT:
      return { title: 'SELECT FRONT', line: 'Tap a glowing front card · West is the gentlest start' };
    case ONBOARDING.LAUNCH:
      return { title: 'LAUNCH ASSAULT', line: 'Press LAUNCH on the highlighted assault row' };
    case ONBOARDING.DEPLOY:
      return { title: 'DEPLOY WARBAND', line: 'Place 2–3 heroes · structures go in the fortress zone' };
    default:
      return null;
  }
}

export function advanceOnboarding(step, action) {
  if (step >= ONBOARDING.DONE) return step;
  if (step === ONBOARDING.COMMAND_MAP && action === 'openFront') return ONBOARDING.LAUNCH;
  if (step === ONBOARDING.LAUNCH && action === 'startAssault') return ONBOARDING.DEPLOY;
  if (step === ONBOARDING.DEPLOY && action === 'placedHero') return ONBOARDING.DONE;
  return step;
}
