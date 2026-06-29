/** Minimal Canvas2D mock for unit tests that call draw helpers. */
export function mockCtx() {
  return {
    save() {},
    restore() {},
    fillRect() {},
    strokeRect() {},
    fill() {},
    stroke() {},
    beginPath() {},
    closePath() {},
    moveTo() {},
    lineTo() {},
    quadraticCurveTo() {},
    bezierCurveTo() {},
    roundRect() {},
    fillText() {},
    strokeText() {},
    ellipse() {},
    arc() {},
    clip() {},
    translate() {},
    scale() {},
    createLinearGradient() {
      return { addColorStop() {} };
    },
    createRadialGradient() {
      return { addColorStop() {} };
    },
    measureText(text) {
      return { width: String(text).length * 6 };
    },
    canvas: { width: 800, height: 600 },
    globalAlpha: 1,
    font: '',
    fillStyle: '',
    strokeStyle: '',
    textAlign: 'left',
    lineWidth: 1,
    shadowBlur: 0,
    shadowColor: '',
  };
}
