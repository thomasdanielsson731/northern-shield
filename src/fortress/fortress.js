// Fortress upgrade nodes — purchased between battles with goldReserve.
// Each node has 3 levels. Bonuses at each level are cumulative within the node.

export const FORTRESS_DEFS = {
  barracks: {
    label:    'Barracks',
    icon:     '⚔',
    desc:     'Lowers defender recruit cost and boosts starting gold',
    maxLevel: 3,
    cost:     [40, 90, 170],  // goldReserve cost for levels 1, 2, 3
    bonuses:  [
      {},                                                              // level 0 — baseline
      { recruitCostReduction: 5,  startingGoldBonus:  20 },
      { recruitCostReduction: 10, startingGoldBonus:  40 },
      { recruitCostReduction: 15, startingGoldBonus:  60 },
    ],
    levelDesc: [
      'Recruit −5g  ·  +20g start',
      'Recruit −10g  ·  +40g start',
      'Recruit −15g  ·  +60g start',
    ],
  },

  armory: {
    label:    'Armory',
    icon:     '🛡',
    desc:     'Multiplies the damage bonus on all equipped items',
    maxLevel: 3,
    cost:     [55, 115, 200],
    bonuses:  [
      { equipDmMult: 1.00 },
      { equipDmMult: 1.08 },
      { equipDmMult: 1.13 },
      { equipDmMult: 1.20 },
    ],
    levelDesc: [
      'Equipment +8% dmg',
      'Equipment +13% dmg',
      'Equipment +20% dmg',
    ],
  },

  watchtower: {
    label:    'Watch Tower',
    icon:     '👁',
    desc:     'Reveals upcoming wave events earlier in the HUD',
    maxLevel: 3,
    cost:     [35, 80, 130],
    bonuses:  [
      { eventPreviewBonus: 0 },
      { eventPreviewBonus: 1 },
      { eventPreviewBonus: 2 },
      { eventPreviewBonus: 3 },
    ],
    levelDesc: [
      'Events: 2 waves ahead',
      'Events: 3 waves ahead',
      'Events: 4 waves ahead',
    ],
  },

  wallworks: {
    label:    'Wallworks',
    icon:     '🧱',
    desc:     'Reduces wall build cost and deepens the slow on adjacent enemies',
    maxLevel: 3,
    cost:     [40, 95, 165],
    bonuses:  [
      { wallCostReduction: 0, wallSlowBonus: 0.00 },
      { wallCostReduction: 1, wallSlowBonus: 0.04 },
      { wallCostReduction: 2, wallSlowBonus: 0.07 },
      { wallCostReduction: 3, wallSlowBonus: 0.10 },
    ],
    levelDesc: [
      'Wall −1g  ·  slow +4%',
      'Wall −2g  ·  slow +7%',
      'Wall −3g  ·  slow +10%',
    ],
  },
};

// Compute the combined effect of all fortress upgrades.
// upgrades: { barracks: 0-3, armory: 0-3, watchtower: 0-3, wallworks: 0-3 }
export function getFortressBonuses(upgrades = {}) {
  let recruitCostReduction = 0;
  let startingGoldBonus    = 0;
  let equipDmMult          = 1.00;
  let eventPreviewBonus    = 0;
  let wallCostReduction    = 0;
  let wallSlowBonus        = 0.00;

  for (const [key, def] of Object.entries(FORTRESS_DEFS)) {
    const lvl = Math.min(upgrades[key] ?? 0, def.maxLevel);
    if (lvl === 0) continue;
    const b = def.bonuses[lvl];
    recruitCostReduction += b.recruitCostReduction ?? 0;
    startingGoldBonus    += b.startingGoldBonus    ?? 0;
    if (b.equipDmMult          !== undefined) equipDmMult       = b.equipDmMult;
    if (b.eventPreviewBonus    !== undefined) eventPreviewBonus = b.eventPreviewBonus;
    wallCostReduction          += b.wallCostReduction            ?? 0;
    wallSlowBonus              += b.wallSlowBonus                ?? 0;
  }

  return { recruitCostReduction, startingGoldBonus, equipDmMult, eventPreviewBonus, wallCostReduction, wallSlowBonus };
}
