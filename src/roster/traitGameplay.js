/**
 * Trait gameplay hooks — light combat modifiers (stacks under talents/equipment).
 */

export function getTraitModifiers(defender, ctx = {}) {
  const out = {
    dmgMult:        1,
    combatHpMult:   1,
    cdMult:         1,
    goldPerWave:    0,
    eventPreview:   0,
    fearImmune:     false,
    bossDmgMult:    1,
  };
  const trait = defender?.trait;
  if (!trait) return out;

  switch (trait) {
    case 'reckless':
      out.dmgMult = 1.12; out.combatHpMult = 0.88; break;
    case 'steadfast':
      if (ctx.inWallZone) out.dmgMult = 1.08;
      break;
    case 'serene':
      out.fearImmune = true; out.dmgMult = 0.95;
      break;
    case 'methodical':
      out.cdMult = 0.94; out.dmgMult = 1.05;
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
    case 'devout':
      if (ctx.inWallZone || ctx.inCoreZone) out.dmgMult = 1.05;
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
    case 'chieftain_hunter':
    case 'jarlslayer':
      out.bossDmgMult = 1.20;
      break;
    default:
      break;
  }
  return out;
}
