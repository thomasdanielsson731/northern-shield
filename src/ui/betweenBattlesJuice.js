/** Between-battles screen feel — fade, particles, victory pulse (extracted for tests). */

export const BETWEEN_FADE_FRAMES = 30;

export function computeBetweenBattlesFadeAlpha(framesRemaining) {
  if (framesRemaining <= 0) return 1;
  return Math.min(1, (BETWEEN_FADE_FRAMES - framesRemaining) / 20);
}

export function tickBtParticle(p, bounds) {
  p.x += p.dx;
  p.y += p.dy;
  if (p.y > bounds.h + 4) {
    p.y = -2;
    p.x = Math.random() * bounds.w;
  }
  if (p.x < 0) p.x = bounds.w;
  if (p.x > bounds.w) p.x = 0;
  return p;
}

export function createBtParticlePool(count, bounds) {
  return Array.from({ length: count }, () => ({
    x: Math.random() * bounds.w,
    y: Math.random() * bounds.h * 0.6,
    dx: (Math.random() - 0.5) * 0.35,
    dy: 0.28 + Math.random() * 0.28,
    ember: Math.random() < 0.18,
    a: 0.28 + Math.random() * 0.25,
  }));
}

export function getVictoryHeaderStyle(isVictory, nowMs = 0) {
  if (!isVictory) {
    return { color: '#e84040', shadow: 'rgba(220,50,50,0.7)', blur: 18 };
  }
  const pulse = 0.85 + Math.sin(nowMs * 0.004) * 0.15;
  return {
    color: '#40e880',
    shadow: `rgba(50,220,100,${0.55 + pulse * 0.25})`,
    blur: 14 + pulse * 8,
  };
}
