/**
 * Warband composition — role quotas, deploy hints, squad presets.
 */

export const COMBAT_ROLES = {
  tank:    { label: 'Tank',    classes: ['berserk', 'valkyrie'] },
  support: { label: 'Support', classes: ['hydda'] },
  control: { label: 'Control', classes: ['blondie', 'isjatten'] },
  st_dps:  { label: 'ST DPS',  classes: ['valkyrie', 'military'] },
  aoe_dps: { label: 'AOE',     classes: ['blondie', 'isjatten'] },
};

export const CLASS_COMBAT_ROLE = {
  berserk:  'tank',
  valkyrie: 'st_dps',
  military: 'st_dps',
  hydda:    'support',
  blondie:  'control',
  isjatten: 'aoe_dps',
};

export const SQUAD_PRESETS = [
  {
    id: 'beginner',
    label: 'Shield Wall',
    roles: {
      berserk: 'gatekeeper', valkyrie: 'wallkeeper', military: 'scout',
      hydda: 'quartermaster', blondie: null, isjatten: null,
    },
  },
  {
    id: 'balanced',
    label: 'Northern Line',
    roles: {
      berserk: 'gatekeeper', valkyrie: 'wallkeeper', military: 'scout',
      hydda: 'quartermaster', blondie: 'scout', isjatten: 'chieftain_hunter',
    },
  },
  {
    id: 'fortress',
    label: 'Iron Ring',
    roles: {
      berserk: 'gatekeeper', valkyrie: 'wallkeeper', military: 'wallkeeper',
      hydda: 'quartermaster', blondie: 'rune_keeper', isjatten: 'wallkeeper',
    },
  },
  {
    id: 'boss_hunter',
    label: "Jarl's Bane",
    roles: {
      berserk: 'gatekeeper', valkyrie: 'chieftain_hunter', military: 'chieftain_hunter',
      hydda: 'quartermaster', blondie: null, isjatten: 'chieftain_hunter',
    },
  },
  {
    id: 'rune_focus',
    label: 'Star Forge',
    roles: {
      berserk: 'gatekeeper', valkyrie: null, military: 'scout',
      hydda: 'quartermaster', blondie: 'rune_keeper', isjatten: 'rune_keeper',
    },
  },
];

export function getCombatRole(classType) {
  return CLASS_COMBAT_ROLE[classType] ?? 'st_dps';
}

export function analyzeWarband(defenders = []) {
  const counts = { tank: 0, support: 0, control: 0, st_dps: 0, aoe_dps: 0 };
  for (const d of defenders) {
    const role = getCombatRole(d.type);
    if (counts[role] !== undefined) counts[role]++;
  }
  return { counts, total: defenders.length };
}

export function getRecommendedDeploy(portalCount, isBossNode, waveCount) {
  let n = 3 + (portalCount ?? 1);
  if ((waveCount ?? 2) >= 3) n += 1;
  if (isBossNode) n = Math.min(10, n + 2);
  return Math.max(4, Math.min(10, n));
}

export function getCompositionWarnings(analysis, portalCount, waveCount, isBossNode) {
  const w = [];
  const c = analysis.counts;
  if (portalCount >= 2 && c.tank < 1) w.push('Need a tank for multi-portal nodes');
  if (waveCount >= 3 && c.support < 1 && c.control < 1) w.push('Bring support or control for 3-wave nodes');
  if (c.st_dps > 4) w.push('Too many ST DPS — add control');
  if (isBossNode && c.st_dps < 2) w.push('Boss node: add Chieftain Hunters / ST DPS');
  return w;
}

export function applySquadPreset(presetId, defenders) {
  const preset = SQUAD_PRESETS.find(p => p.id === presetId);
  if (!preset) return;
  for (const d of defenders) {
    const role = preset.roles[d.type];
    if (role) d.fortressRole = role;
  }
}
