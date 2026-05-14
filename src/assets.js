// Sprite registry — loaded on module import, used by any renderer that needs them.
// Drawers should check for existence before using: if (SPRITES.barsarkare_walk) { ... }

export const SPRITES = {};

const manifest = [
  { key: 'barsarkare_walk', src: '/assets/towers/barsarkare_walk_spritesheet.png', cols: 4, rows: 2 }
];

for (const { key, src, cols, rows } of manifest) {
  const img = new Image();
  img.onload = () => {
    SPRITES[key] = {
      img,
      frameW: img.naturalWidth  / cols,
      frameH: img.naturalHeight / rows,
      cols,
      rows,
      total:  cols * rows
    };
  };
  img.src = src;
}
