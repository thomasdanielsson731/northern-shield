/** Debrief screen juice — MVP pulse and route emphasis. */

export function getMvpPulseScale(frame, period = 60) {
  return 0.85 + Math.sin((frame / period) * Math.PI * 2) * 0.15;
}

export function getDebriefRouteOpacity(isDefeat, routeIndex) {
  if (!isDefeat) return 1;
  return routeIndex === 1 ? 1 : 0.82;
}

export function getDebriefOutcomeColor(isVictory) {
  return isVictory ? '#40e880' : '#e84040';
}
