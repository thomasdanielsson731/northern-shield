// Talent definitions — one talent per class per milestone level (3 / 5 / 8 / 10).
// Talents are auto-unlocked when a Defender crosses the corresponding career level.
// All bonuses are multiplicative and stack with career + equipment bonuses.
// slowMult (optional): multiplies the tower's slowFactor (lower = deeper slow).

export const TALENT_DEFS = {
  // ── Berserker ──────────────────────────────────────────────────────────────
  berserk_blood_fury:   { name: 'Blood Fury',      class: 'berserk',  level: 3,  dm: 1.12, rm: 1.00, cm: 1.00, desc: '+12% dmg' },
  berserk_war_howl:     { name: 'War Howl',         class: 'berserk',  level: 5,  dm: 1.08, rm: 1.00, cm: 0.92, desc: '+8% dmg, -8% cd' },
  berserk_rage:         { name: 'Berserk Rage',     class: 'berserk',  level: 8,  dm: 1.20, rm: 1.00, cm: 1.00, desc: '+20% dmg' },
  berserk_ulfhedinn:    { name: 'Ulfhedinn',        class: 'berserk',  level: 10, dm: 1.15, rm: 1.10, cm: 0.90, desc: '+15% dmg, +10% rng, -10% cd' },
  // ── Valkyrie ───────────────────────────────────────────────────────────────
  val_spear_mastery:    { name: 'Spear Mastery',   class: 'valkyrie', level: 3,  dm: 1.00, rm: 1.15, cm: 1.00, desc: '+15% rng' },
  val_battle_blessing:  { name: 'Battle Blessing', class: 'valkyrie', level: 5,  dm: 1.10, rm: 1.05, cm: 1.00, desc: '+10% dmg, +5% rng' },
  val_grace:            { name: "Valkyrja's Grace", class: 'valkyrie', level: 8,  dm: 1.00, rm: 1.08, cm: 0.88, desc: '+8% rng, -12% cd' },
  val_divine_strike:    { name: 'Divine Strike',   class: 'valkyrie', level: 10, dm: 1.25, rm: 1.12, cm: 1.00, desc: '+25% dmg, +12% rng' },
  // ── Archer ─────────────────────────────────────────────────────────────────
  mil_quick_nock:       { name: 'Quick Nock',      class: 'military', level: 3,  dm: 1.00, rm: 1.00, cm: 0.92, desc: '-8% cd' },
  mil_piercing_shot:    { name: 'Piercing Shot',   class: 'military', level: 5,  dm: 1.10, rm: 1.00, cm: 0.95, desc: '+10% dmg, -5% cd' },
  mil_eagle_eye:        { name: 'Eagle Eye',       class: 'military', level: 8,  dm: 1.00, rm: 1.15, cm: 0.92, desc: '+15% rng, -8% cd' },
  mil_death_volley:     { name: 'Death Volley',    class: 'military', level: 10, dm: 1.20, rm: 1.10, cm: 0.88, desc: '+20% dmg, +10% rng, -12% cd' },
  // ── Catapult ───────────────────────────────────────────────────────────────
  cat_heavy_load:       { name: 'Heavy Load',      class: 'catapult', level: 3,  dm: 1.15, rm: 1.00, cm: 1.00, desc: '+15% dmg' },
  cat_siege_master:     { name: 'Siege Master',    class: 'catapult', level: 5,  dm: 1.12, rm: 1.08, cm: 1.00, desc: '+12% dmg, +8% rng' },
  cat_rolling_thunder:  { name: 'Rolling Thunder', class: 'catapult', level: 8,  dm: 1.20, rm: 1.00, cm: 0.90, desc: '+20% dmg, -10% cd' },
  cat_cataclysm:        { name: 'Cataclysm',       class: 'catapult', level: 10, dm: 1.30, rm: 1.10, cm: 0.88, desc: '+30% dmg, +10% rng, -12% cd' },
  // ── Blondie (slow / stun) ──────────────────────────────────────────────────
  blo_frost_wisp:       { name: 'Frost Wisp',      class: 'blondie',  level: 3,  dm: 1.00, rm: 1.00, cm: 1.00, slowMult: 0.95, desc: 'Deeper slow' },
  blo_chilling_touch:   { name: 'Chilling Touch',  class: 'blondie',  level: 5,  dm: 1.00, rm: 1.10, cm: 1.00, slowMult: 0.92, desc: '+10% rng, deeper slow' },
  blo_winters_heart:    { name: "Winter's Heart",  class: 'blondie',  level: 8,  dm: 1.12, rm: 1.00, cm: 0.90, slowMult: 0.88, desc: '+12% dmg, -10% cd, deeper slow' },
  blo_blizzard:         { name: 'Blizzard',         class: 'blondie',  level: 10, dm: 1.00, rm: 1.15, cm: 0.88, slowMult: 0.85, desc: '+15% rng, -12% cd, deepest slow' },
  // ── Warden (piltorn) ───────────────────────────────────────────────────────
  pil_steady_aim:       { name: 'Steady Aim',      class: 'piltorn',  level: 3,  dm: 1.10, rm: 1.00, cm: 1.00, desc: '+10% dmg' },
  pil_watchmans_eye:    { name: "Watchman's Eye",  class: 'piltorn',  level: 5,  dm: 1.00, rm: 1.12, cm: 0.95, desc: '+12% rng, -5% cd' },
  pil_fortify:          { name: 'Fortify',          class: 'piltorn',  level: 8,  dm: 1.15, rm: 1.08, cm: 1.00, desc: '+15% dmg, +8% rng' },
  pil_iron_watch:       { name: 'Iron Watch',      class: 'piltorn',  level: 10, dm: 1.20, rm: 1.15, cm: 0.90, desc: '+20% dmg, +15% rng, -10% cd' },
  // ── Healer (hydda) ─────────────────────────────────────────────────────────
  hyd_natures_touch:    { name: "Nature's Touch",  class: 'hydda',    level: 3,  dm: 1.00, rm: 1.10, cm: 0.90, desc: '+10% aura rng, -10% cd' },
  hyd_mending_herbs:    { name: 'Mending Herbs',   class: 'hydda',    level: 5,  dm: 1.00, rm: 1.12, cm: 0.88, desc: '+12% rng, -12% cd' },
  hyd_runic_ward:       { name: 'Runic Ward',      class: 'hydda',    level: 8,  dm: 1.00, rm: 1.15, cm: 0.85, desc: '+15% rng, -15% cd' },
  hyd_living_fortress:  { name: 'Living Fortress', class: 'hydda',    level: 10, dm: 1.00, rm: 1.20, cm: 0.80, desc: '+20% rng, -20% cd' },
  // ── Ice Giant (isjatten) ───────────────────────────────────────────────────
  ice_frost_aura:       { name: 'Frost Aura',      class: 'isjatten', level: 3,  dm: 1.10, rm: 1.00, cm: 1.00, slowMult: 0.95, desc: '+10% dmg, deeper slow' },
  ice_ice_nova:         { name: 'Ice Nova',        class: 'isjatten', level: 5,  dm: 1.00, rm: 1.12, cm: 0.92, slowMult: 0.92, desc: '+12% rng, -8% cd, deeper slow' },
  ice_giant_stride:     { name: 'Giant Stride',    class: 'isjatten', level: 8,  dm: 1.20, rm: 1.08, cm: 1.00, slowMult: 0.88, desc: '+20% dmg, +8% rng, deeper slow' },
  ice_fimbulwinter:     { name: 'Fimbulwinter',    class: 'isjatten', level: 10, dm: 1.15, rm: 1.15, cm: 0.88, slowMult: 0.85, desc: '+15% dmg+rng, -12% cd, deeper slow' },
  // ── Dragonship (drakship) ──────────────────────────────────────────────────
  drak_dragon_ram:      { name: 'Dragon Ram',      class: 'drakship', level: 3,  dm: 1.12, rm: 1.00, cm: 1.00, desc: '+12% dmg' },
  drak_fire_barrage:    { name: 'Fire Barrage',    class: 'drakship', level: 5,  dm: 1.15, rm: 1.08, cm: 0.95, desc: '+15% dmg, +8% rng, -5% cd' },
  drak_dragons_fury:    { name: "Dragon's Fury",   class: 'drakship', level: 8,  dm: 1.25, rm: 1.00, cm: 0.88, desc: '+25% dmg, -12% cd' },
  drak_ragnarok_fire:   { name: 'Ragnarok Fire',   class: 'drakship', level: 10, dm: 1.35, rm: 1.15, cm: 0.85, desc: '+35% dmg, +15% rng, -15% cd' },
};

// class → { level: talentId } — used to auto-unlock talents when career level rises
export const CLASS_TALENTS = {};
for (const [id, def] of Object.entries(TALENT_DEFS)) {
  if (!CLASS_TALENTS[def.class]) CLASS_TALENTS[def.class] = {};
  CLASS_TALENTS[def.class][def.level] = id;
}

// Returns combined stat multipliers for an array of talent IDs.
export function getTalentBonuses(talentIds = []) {
  let dm = 1, rm = 1, cm = 1, slowMult = 1;
  for (const id of talentIds) {
    const def = TALENT_DEFS[id];
    if (!def) continue;
    dm       *= def.dm       ?? 1;
    rm       *= def.rm       ?? 1;
    cm       *= def.cm       ?? 1;
    slowMult *= def.slowMult ?? 1;
  }
  return { dm, rm, cm, slowMult };
}
