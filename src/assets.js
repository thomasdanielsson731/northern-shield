export const SPRITES = {};

const manifest = [
  { key: 'berserker',       src: '/assets/towers/berserker_sprites.png',           cols: 4, rows: 1 },
  { key: 'archer',          src: '/assets/towers/archer_sprites.png',              cols: 4, rows: 1 },
  { key: 'catapult',        src: '/assets/towers/catapult_sprites.png',            cols: 4, rows: 1 },
  { key: 'blondie',         src: '/assets/towers/blondie_sprites.png',             cols: 4, rows: 1 },
  { key: 'valkyrie',        src: '/assets/towers/valkyrie_sprites.png',            cols: 4, rows: 1 },
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
