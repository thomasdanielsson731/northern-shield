// Stub browser globals needed by src/assets.js at module load time.
// Tests don't draw anything, so SPRITES remaining empty is fine.
global.Image = class {
  constructor() { this.onload = null; }
  set src(_) {}
};
