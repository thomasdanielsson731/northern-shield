export const SPRITES = {};

const manifest = [
  { key: 'berserker',       src: '/assets/towers/berserker_sprites.png',           cols: 4, rows: 4 },
  { key: 'archer',          src: '/assets/towers/archer_sprites.png',              cols: 4, rows: 4 },
  { key: 'catapult',        src: '/assets/towers/catapult_sprites.png',            cols: 4, rows: 4 },
  { key: 'blondie',         src: '/assets/towers/blondie_sprites.png',             cols: 4, rows: 4 },
  { key: 'valkyrie',        src: '/assets/towers/valkyrie_sprites.png',            cols: 4, rows: 4 },
  { key: 'draugr',          src: '/assets/enemies/draugr_sprites.png',             cols: 4, rows: 1 },
  { key: 'myling',          src: '/assets/enemies/myling_sprites.png',             cols: 4, rows: 1 },
  { key: 'jotunn',          src: '/assets/enemies/jotunn_sprites.png',             cols: 4, rows: 1 },
  { key: 'mara',            src: '/assets/enemies/mara_sprites.png',               cols: 4, rows: 1 },
  { key: 'portal',          src: '/assets/ui/portal_spawn_gate.png',              cols: 4, rows: 1 },
  { key: 'trelleborg',      src: '/assets/ui/goal_trelleborg_fort.png',           cols: 1, rows: 1 },
  { key: 'runeIronEdge',   src: '/assets/ui/rune_iron_edge.png',                 cols: 1, rows: 1 },
  { key: 'runeSwiftStrike',src: '/assets/ui/rune_swift_strike.png',              cols: 1, rows: 1 },
  { key: 'runeFrost',      src: '/assets/ui/rune_frost.png',                     cols: 1, rows: 1 },
  { key: 'runeBattleHymn', src: '/assets/ui/rune_battle_hymn.png',               cols: 1, rows: 1 },
  { key: 'runeValhalla',   src: '/assets/ui/rune_valhalla.png',                  cols: 1, rows: 1 },
  { key: 'ground',          src: '/assets/terrain/ground_tile.png',               cols: 1, rows: 1 },
  { key: 'path',            src: '/assets/terrain/path_tile.png',                 cols: 1, rows: 1 },
  { key: 'frameCorner',     src: '/assets/ui/ui_corner_ornament_top_left.png',    cols: 1, rows: 1 },
  { key: 'frameBorderH',    src: '/assets/ui/ui_border_horizontal_tile.png',      cols: 1, rows: 1 },
  { key: 'frameBorderV',    src: '/assets/ui/ui_border_vertical_tile.png',        cols: 1, rows: 1 },
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
