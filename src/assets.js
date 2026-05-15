export const SPRITES = {};

const manifest = [
  { key: 'berserker',       src: '/assets/towers/berserker_sprites.png',           cols: 4, rows: 1 },
  { key: 'archer',          src: '/assets/towers/archer_sprites.png',              cols: 4, rows: 1 },
  { key: 'catapult',        src: '/assets/towers/catapult_sprites.png',            cols: 4, rows: 1 },
  { key: 'blondie',         src: '/assets/towers/blondie_sprites.png',             cols: 4, rows: 1 },
  { key: 'valkyrie',        src: '/assets/towers/valkyrie_sprites.png',            cols: 4, rows: 1 },
  { key: 'draugr',          src: '/assets/enemies/draugr_sprites.png',             cols: 4, rows: 1 },
  { key: 'myling',          src: '/assets/enemies/myling_sprites.png',             cols: 4, rows: 1 },
  { key: 'jotunn',          src: '/assets/enemies/jotunn_sprites.png',             cols: 4, rows: 1 },
  { key: 'mara',            src: '/assets/enemies/mara_sprites.png',               cols: 4, rows: 1 },
  { key: 'portal',          src: '/assets/ui/portal_spawn_gate.png',              cols: 1, rows: 1 },
  { key: 'trelleborg',      src: '/assets/ui/goal_trelleborg_fort.png',           cols: 1, rows: 1 },
  { key: 'ground',          src: '/assets/terrain/ground_tile.png',               cols: 1, rows: 1 },
  { key: 'path',            src: '/assets/terrain/path_tile.png',                 cols: 1, rows: 1 },
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
