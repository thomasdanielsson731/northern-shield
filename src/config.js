// Runtime configuration helpers for visual experiments
// Default scale set to user's requested experiment value
let _spriteScale = 0.45;

export function getSpriteScale() { return _spriteScale; }
export function setSpriteScale(s) { _spriteScale = Math.max(0.4, Math.min(1.6, s)); }

export function changeSpriteScale(delta) { setSpriteScale(Math.round((_spriteScale + delta) * 100) / 100); }
