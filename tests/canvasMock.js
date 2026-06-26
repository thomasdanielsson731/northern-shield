/** Minimal CanvasRenderingContext2D mock for UI draw helpers. */
export function mockCtx() {
  const grad = { addColorStop: () => {} };
  return {
    save: () => {},
    restore: () => {},
    beginPath: () => {},
    arc: () => {},
    fill: () => {},
    stroke: () => {},
    fillRect: () => {},
    strokeRect: () => {},
    moveTo: () => {},
    lineTo: () => {},
    quadraticCurveTo: () => {},
    closePath: () => {},
    fillText: () => {},
    roundRect: () => {},
    createLinearGradient: () => grad,
    measureText: (t) => ({ width: (t ?? '').length * 5 }),
    font: '',
    textAlign: 'left',
    textBaseline: 'alphabetic',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    shadowBlur: 0,
    shadowColor: '',
    shadowOffsetY: 0,
    globalAlpha: 1,
  };
}
