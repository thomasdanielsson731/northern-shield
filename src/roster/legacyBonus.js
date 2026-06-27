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

function _normalizeLegacyQueue(legArr) {
  if (!legArr) return [];
  return Array.isArray(legArr) ? legArr : [legArr];
}

/** Recruit panel — count of pending legacy bonuses for a class. */
export function formatPendingLegacyCount(legArr) {
  const count = _normalizeLegacyQueue(legArr).length;
  if (!count) return null;
  return `✦ ${count} legacy bonus${count !== 1 ? 'es' : ''} waiting`;
}

/** Recruit panel — preview of next inherited legacy. */
export function formatPendingLegacyPreview(legArr) {
  const arr = _normalizeLegacyQueue(legArr);
  if (!arr.length) return null;
  const first = arr[0];
  if (!first?.fromName) return formatPendingLegacyCount(arr);
  const stat = STAT_LABELS[first.stat] ?? '+bonus';
  if (arr.length === 1) return `Inherits ${first.fromName}'s legacy ${stat}`;
  return `${arr.length} legacies — next: ${first.fromName} ${stat}`;
}
