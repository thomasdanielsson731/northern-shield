// Sprite registry — loaded on module import, used by any renderer that needs them.
// Drawers should check for existence before using: if (SPRITES.barsarkare_walk) { ... }

export const SPRITES = {};

const manifest = [
  { key: 'barsarkare_walk', src: '/assets/towers/barsarkare_walk_spritesheet.png', cols: 4, rows: 2 },
  { key: 'barbarian',       src: '/assets/towers/barbarian_sprites.png',           cols: 4, rows: 1 },
  { key: 'archer',          src: '/assets/towers/archer_sprites.png',              cols: 4, rows: 1 },
  { key: 'dvarg',           src: '/assets/towers/dvarg_sprites.png',               cols: 4, rows: 1 },
  { key: 'brynhild',        src: '/assets/towers/brynhild_sprites.png',            cols: 4, rows: 1 },
  { key: 'valkyria',        src: '/assets/towers/valkyria_sprites.png',            cols: 4, rows: 1 },
  { key: 'vildeman',        src: '/assets/towers/vildeman_sprites.png',            cols: 4, rows: 1 },
  { key: 'ismaciker',       src: '/assets/towers/ismaciker_sprites.png',           cols: 4, rows: 1 },
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
