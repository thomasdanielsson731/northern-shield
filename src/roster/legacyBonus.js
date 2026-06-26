/** Legacy bonus display — retired predecessor stat inheritance. */

const STAT_LABELS = {
  dm: '+8% DMG',
  rm: '+8% RNG',
  cd: '−7% CD',
};

export function formatLegacyBonusLine(legacyBonus) {
  if (!legacyBonus?.fromName) return null;
  const stat = STAT_LABELS[legacyBonus.stat] ?? '+bonus';
  return `✦ ${legacyBonus.fromName}'s Legacy: ${stat}`;
}

export function formatLegacyBadge(legacyBonus) {
  if (!legacyBonus?.fromName) return null;
  return `✦ ${legacyBonus.fromName.slice(0, 10)}`;
}

export function hasLegacyBonus(defender) {
  return !!defender?.legacyBonus?.fromName;
}
