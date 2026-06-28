// Runtime configuration helpers for visual experiments
let _spriteScale = 0.82;
let _playfieldSpriteComp = 1;

export function getSpriteScale() { return _spriteScale; }
export function setSpriteScale(s) { _spriteScale = Math.max(0.4, Math.min(1.6, s)); }
export function changeSpriteScale(delta) { setSpriteScale(Math.round((_spriteScale + delta) * 100) / 100); }

/** Counter zoom-to-fill on wide assault playfield so units stay readable, not giant. */
export function setPlayfieldSpriteCompensation(comp) {
  _playfieldSpriteComp = Math.max(0.35, Math.min(1.2, comp));
}
export function getCombatSpriteScale() {
  return _spriteScale * _playfieldSpriteComp;
}
