// Equipment item definitions for Northern Shield — Phase 5
// slot: 'weapon' (offensive) | 'armor' (defensive/utility)
// dm/rm/cm: multiplicative bonus stacked on top of career level bonuses

export const ITEM_DEFS = {
  // ── Common ────────────────────────────────────────────────────────────────
  frost_crystal:     { name: 'Frost Crystal',      slot: 'weapon', rarity: 'common',    dm: 1.12, rm: 1.00, cm: 1.00, desc: '+12% dmg' },
  iron_mantle:       { name: 'Iron Mantle',         slot: 'armor',  rarity: 'common',    dm: 1.10, rm: 1.00, cm: 0.96, desc: '+10% dmg, -4% cd' },
  wolf_pelt:         { name: 'Wolf Pelt',           slot: 'armor',  rarity: 'common',    dm: 1.00, rm: 1.10, cm: 0.97, desc: '+10% rng, -3% cd' },
  bloodwood_grip:    { name: 'Bloodwood Grip',      slot: 'weapon', rarity: 'common',    dm: 1.08, rm: 1.00, cm: 0.94, desc: '+8% dmg, -6% cd' },
  // ── Rare ─────────────────────────────────────────────────────────────────
  skadi_blade:       { name: "Skaði's Blade",       slot: 'weapon', rarity: 'rare',      dm: 1.25, rm: 1.00, cm: 1.00, desc: '+25% dmg' },
  eagle_lens:        { name: 'Eagle Eye Lens',      slot: 'armor',  rarity: 'rare',      dm: 1.00, rm: 1.22, cm: 1.00, desc: '+22% rng' },
  war_torc:          { name: 'Warcry Torc',         slot: 'weapon', rarity: 'rare',      dm: 1.20, rm: 1.08, cm: 0.95, desc: '+20% dmg, +8% rng, -5% cd' },
  storm_cloak:       { name: 'Storm Cloak',         slot: 'armor',  rarity: 'rare',      dm: 1.00, rm: 1.18, cm: 0.92, desc: '+18% rng, -8% cd' },
  berserker_axe:     { name: 'Berserker Axe',       slot: 'weapon', rarity: 'rare',      dm: 1.30, rm: 1.00, cm: 1.05, desc: '+30% dmg (costs 5% cd)' },
  raven_cloak:       { name: 'Raven Cloak',         slot: 'armor',  rarity: 'rare',      dm: 1.08, rm: 1.12, cm: 0.94, desc: '+8% dmg, +12% rng, -6% cd' },
  // ── Epic ─────────────────────────────────────────────────────────────────
  runebane:          { name: 'Runebane',             slot: 'weapon', rarity: 'epic',      dm: 1.35, rm: 1.00, cm: 0.90, desc: '+35% dmg, -10% cd' },
  frostborn_shield:  { name: 'Frostborn Shield',    slot: 'armor',  rarity: 'epic',      dm: 1.12, rm: 1.15, cm: 0.90, desc: '+12% dmg, +15% rng, -10% cd' },
  mjolnir_shard:     { name: 'Mjölnir Shard',       slot: 'weapon', rarity: 'epic',      dm: 1.28, rm: 1.10, cm: 0.88, desc: '+28% dmg, +10% rng, -12% cd', runeSlot: true },
  // ── Legendary ────────────────────────────────────────────────────────────
  surtr_shard:       { name: "Surtr's Shard",       slot: 'weapon', rarity: 'legendary', dm: 1.50, rm: 1.00, cm: 0.88, desc: '+50% dmg, -12% cd',           runeSlot: true },
  valkyrja_wings:    { name: 'Valkyrja Wings',      slot: 'armor',  rarity: 'legendary', dm: 1.00, rm: 1.25, cm: 0.85, desc: '+25% rng, -15% cd',            runeSlot: true },
  gungnir_tip:       { name: "Gungnir's Tip",       slot: 'weapon', rarity: 'legendary', dm: 1.40, rm: 1.15, cm: 0.82, desc: '+40% dmg, +15% rng, -18% cd', runeSlot: true },
};

// Which items drop on each boss wave (two options; one is chosen at random)
export const BOSS_DROP_TABLE = {
  10:  ['frost_crystal',  'iron_mantle'      ],
  25:  ['skadi_blade',    'eagle_lens'       ],
  35:  ['berserker_axe',  'raven_cloak'      ],
  50:  ['war_torc',       'storm_cloak'      ],
  65:  ['mjolnir_shard',  'frostborn_shield' ],
  75:  ['runebane',       'frostborn_shield' ],
  100: ['surtr_shard',    'valkyrja_wings'   ],
};

export const RARITY_COLOR = {
  common:    '#a8a8a8',
  rare:      '#4090ff',
  epic:      '#cc44ff',
  legendary: '#ff9020',
};

// Compute combined stat multipliers from an array of item IDs (some may be null)
export function getItemBonuses(itemIds = []) {
  let dm = 1, rm = 1, cm = 1;
  for (const id of itemIds) {
    if (!id) continue;
    const def = ITEM_DEFS[id];
    if (!def) continue;
    dm *= def.dm;
    rm *= def.rm;
    cm *= def.cm;
  }
  return { dm, rm, cm };
}
