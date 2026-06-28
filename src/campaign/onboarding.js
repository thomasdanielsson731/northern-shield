/** Guided onboarding steps for first campaign play. */
export const ONBOARDING = {
  NONE:        0,
  COMMAND_MAP: 1,
  PICK_FRONT:  2,
  LAUNCH:      3,
  DEPLOY:      4,
  DONE:        5,
};

export function getOnboardingHint(step, { firstSaga = false } = {}) {
  if (firstSaga) {
    switch (step) {
      case ONBOARDING.COMMAND_MAP:
        return { title: 'WEST ROAD', line: 'Tap the glowing node — your first assault awaits' };
      case ONBOARDING.PICK_FRONT:
        return { title: 'FIRST ASSAULT', line: 'Launch First Night from the highlighted node' };
      case ONBOARDING.LAUNCH:
        return { title: 'LAUNCH', line: 'Press LAUNCH on the highlighted assault row' };
      case ONBOARDING.DEPLOY:
        return { title: 'ASSIGN GATE', line: 'Tap WEST GATE · assign your berserker · sound the horn' };
      default:
        return null;
    }
  }
  switch (step) {
    case ONBOARDING.COMMAND_MAP:
      return { title: 'COMMAND MAP', line: 'Four fronts surround your fortress — pick one to begin' };
    case ONBOARDING.PICK_FRONT:
      return { title: 'SELECT FRONT', line: 'Tap a glowing front card · West is the gentlest start' };
    case ONBOARDING.LAUNCH:
      return { title: 'LAUNCH ASSAULT', line: 'Press LAUNCH on the highlighted assault row' };
    case ONBOARDING.DEPLOY:
      return { title: 'DEPLOY WARBAND', line: 'PORT at wall opening first · then 2–3 heroes · siege in fortress ring' };
    default:
      return null;
  }
}

export function advanceOnboarding(step, action) {
  if (step >= ONBOARDING.DONE) return step;
  if (action === 'startAssault' && step <= ONBOARDING.LAUNCH) return ONBOARDING.DEPLOY;
  if (step === ONBOARDING.COMMAND_MAP && action === 'openFront') return ONBOARDING.PICK_FRONT;
  if (step === ONBOARDING.PICK_FRONT && action === 'startAssault') return ONBOARDING.DEPLOY;
  if (step === ONBOARDING.LAUNCH && action === 'startAssault') return ONBOARDING.DEPLOY;
  if (step === ONBOARDING.DEPLOY && action === 'placedHero') return ONBOARDING.DONE;
  if (step === ONBOARDING.DEPLOY && action === 'placedGate') return step;
  if (step === ONBOARDING.DEPLOY && action === 'repairedGate') return ONBOARDING.DONE;
  return step;
}

/** A3 teach — mend scarred west gate before horn. */
export function getRepairOnboardingHint(prepMeta, assaultNodeIndex, woodCost = 10) {
  if (assaultNodeIndex == null || assaultNodeIndex < 3) return null;
  if (!prepMeta?.westGateScarred || prepMeta.westGateRepaired) return null;
  return {
    title: 'MEND THE GATE',
    line: (prepMeta.wood ?? 0) >= woodCost
      ? `Spend ${woodCost} wood on the west wall, then sound the horn`
      : 'Splintered palisade — gather timber from assault rewards first',
  };
}

/** Context-aware hint — front panel shows LAUNCH step after a front is picked. */
export function resolveOnboardingHint(step, context = {}) {
  if (step === ONBOARDING.PICK_FRONT && context.frontView) {
    return getOnboardingHint(ONBOARDING.LAUNCH, context);
  }
  return getOnboardingHint(step, context);
}
