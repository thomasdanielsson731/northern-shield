/**
 * Trait gameplay hooks — light combat modifiers (stacks under talents/equipment).
 * Caps: positive/negative ±5–15% for common traits; rare up to ±20%; legendary up to +25%.
 */

export function getTraitModifiers(defender, ctx = {}) {
  const out = {
    dmgMult:      1,
    combatHpMult: 1,
    cdMult:       1,
    rangeMult:    1,
    goldPerWave:  0,
    eventPreview: 0,
    fearImmune:   false,
    bossDmgMult:  1,
  };
  const trait = defender?.trait;
  if (!trait) return out;

  switch (trait) {
    // ── Positive ─────────────────────────────────────────────────────────────
    case 'steadfast':
      if (ctx.inWallZone) out.dmgMult = 1.08;
      break;
    case 'devout':
      if (ctx.inWallZone || ctx.inCoreZone) out.dmgMult = 1.05;
      break;
    case 'serene':
      out.fearImmune = true; out.dmgMult = 0.95;
      break;
    case 'methodical':
      out.cdMult = 0.94; out.dmgMult = 1.05;
      break;
    case 'fearless':
      out.fearImmune = true;
      if (ctx.inGateZone) out.dmgMult = 1.10;
      break;
    case 'builder':
      if (ctx.inWallZone) out.dmgMult = 1.10;
      break;
    case 'guardian':
      if (ctx.inCoreZone) { out.dmgMult = 1.12; out.combatHpMult = 1.12; }
      break;
    case 'lucky':
      out.goldPerWave = 0.5;
      break;
    case 'tactician':
      out.eventPreview = 1;
      break;
    case 'warmhearted':
      out.combatHpMult = 1.05; out.goldPerWave = 0.3;
      break;
    case 'inspiring':
      out.dmgMult = ctx.inCoreZone ? 1.08 : 1.04;
      break;
    case 'patient':
      out.dmgMult = (ctx.waveInNode ?? 1) >= 2 ? 1.12 : 0.96;
      break;
    case 'hardy':
      out.combatHpMult = 1.15;
      break;
    case 'loyal':
      out.dmgMult = 1.08;
      break;
    case 'swift':
      out.cdMult = 0.90;
      break;
    case 'merciful':
      out.goldPerWave = 0.4;
      break;
    case 'eagle_eyed':
      out.rangeMult = 1.12;
      break;
    case 'menders_touch':
      out.combatHpMult = 1.08;
      break;

    // ── Negative ─────────────────────────────────────────────────────────────
    case 'reckless':
      out.dmgMult = 1.12; out.combatHpMult = 0.88;
      break;
    case 'impulsive':
      out.dmgMult = ctx.waveInNode === 1 ? 1.10 : (ctx.waveInNode >= 3 ? 0.94 : 1);
      break;
    case 'brooding':
      out.dmgMult = ctx.rampartsLostThisBattle > 0 ? 1.12 : (ctx.livesFull ? 0.95 : 1);
      break;
    case 'vengeful':
      out.dmgMult = ctx.vengeanceActive ? 1.18 : 0.96;
      break;
    case 'greedy':
      out.dmgMult = 1.06; out.combatHpMult = 0.94;
      break;
    case 'cowardly':
      out.dmgMult   = ctx.rampartsLostThisBattle > 0 ? 0.88 : 0.96;
      out.combatHpMult = ctx.rampartsLostThisBattle > 0 ? 0.85 : 0.94;
      break;
    case 'proud':
      out.dmgMult = ctx.rampartsLostThisBattle > 0 ? 0.90 : 1.05;
      break;
    case 'hotheaded':
      out.dmgMult = 1.10; out.combatHpMult = 0.90;
      break;
    case 'suspicious':
      out.dmgMult = 0.92; out.fearImmune = true;
      break;
    case 'wasteful':
      out.cdMult = 1.10;
      break;
    case 'bitter':
      out.dmgMult = ctx.rampartsLostThisBattle > 1 ? 1.10 : 0.94;
      break;
    case 'lone_wolf':
      out.dmgMult = 1.06;
      break;

    // ── Rare ─────────────────────────────────────────────────────────────────
    case 'rune_touched':
      out.dmgMult = 1.08; out.rangeMult = 1.05;
      break;
    case 'veteran_trait': {
      const bonus = Math.min(0.15, (defender.careerKills ?? 0) / 1000);
      out.dmgMult = 1 + bonus;
      break;
    }
    case 'stubborn':
      out.combatHpMult = 1.20;
      break;
    case 'iron_willed':
      out.fearImmune = true; out.combatHpMult = 1.10;
      break;
    case 'wolf_friend':
      out.dmgMult = ctx.inWallZone ? 1.12 : 1.04;
      break;
    case 'giant_bane':
      out.bossDmgMult = 1.20;
      break;
    case 'draugr_hunter':
      out.dmgMult = 1.10;
      break;
    case 'frostborn':
      out.dmgMult = 1.06; out.combatHpMult = 1.06;
      break;
    case 'star_seeker':
      out.goldPerWave = 0.8; out.dmgMult = 1.04;
      break;
    case 'bond_forger':
      out.dmgMult = 1.06;
      break;
    case 'scar_bearer': {
      const scarBonus = Math.min(0.20, (defender.scars?.length ?? 0) * 0.05);
      out.dmgMult = 1 + scarBonus;
      break;
    }
    case 'quiet_leader':
      out.dmgMult = ctx.inCoreZone ? 1.10 : 1.05; out.combatHpMult = ctx.inCoreZone ? 1.05 : 1;
      break;
    case 'gate_singer':
      out.dmgMult = ctx.inGateZone ? 1.15 : 1.06; out.combatHpMult = ctx.inGateZone ? 1.08 : 1;
      break;
    case 'quartermasters_eye':
      out.goldPerWave = 0.5;
      break;

    // ── Legendary ─────────────────────────────────────────────────────────────
    case 'chieftain_hunter': // legacy alias
    case 'jarlslayer':
      out.bossDmgMult = 1.25;
      break;
    case 'einherjar':
      out.combatHpMult = 1.25; out.fearImmune = true;
      break;
    case 'saga_bound':
      out.goldPerWave = 1.0; out.dmgMult = 1.08;
      break;
    case 'fate_touched':
      out.combatHpMult = 1.15; out.dmgMult = 1.10;
      break;
    case 'world_tree_marked':
      out.dmgMult = 1.15; out.rangeMult = 1.15;
      break;
    case 'odins_watch':
      out.bossDmgMult = 1.25;
      out.dmgMult = ctx.rampartsLostThisBattle >= 2 ? 1.15 : 1.08;
      break;

    default:
      break;
  }
  return out;
}
