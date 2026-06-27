/** Debrief screen juice — MVP pulse and route emphasis. */

export function getMvpPulseScale(frame, period = 60) {
  return 0.85 + Math.sin((frame / period) * Math.PI * 2) * 0.15;
}

export function getDebriefRouteOpacity(isDefeat, routeIndex) {
  if (!isDefeat) return 1;
  return routeIndex === 1 ? 1 : 0.82;
}

export function getMvpPulseAlpha(frame, holdFrames = 90) {
  if (frame >= holdFrames) return 1;
  return getMvpPulseScale(frame);
}

export function getDebriefContinuePulse(nowMs = 0) {
  return 0.65 + Math.sin(nowMs * 0.004) * 0.35;
}

export function getDebriefOutcomeColor(isVictory) {
  return isVictory ? '#40e880' : '#e84040';
}

/** Header fill + glow used on debrief panels. */
export function getDebriefHeaderColors(isVictory) {
  return isVictory
    ? { fill: '#f0c840', glow: 'rgba(240,180,20,0.6)', shadowBlur: 14 }
    : { fill: '#e04040', glow: 'rgba(220,40,40,0.6)', shadowBlur: 10 };
}
