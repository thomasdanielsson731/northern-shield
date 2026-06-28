/**
 * Unified threat counter — one line for field + incoming + wave total.
 * Example: "8/10 Draugr · 2 incoming"
 */

/** Primary enemy label from wave composition (largest count wins). */
export function primaryWaveThreatLabel(comp) {
  if (!comp) return 'enemies';
  const entries = [
    ['draugr', comp.draugr, 'Draugr'],
    ['mylings', comp.mylings, 'Myling'],
    ['jotunn', comp.jotunn, 'Jötunn'],
    ['maras', comp.maras, 'Mara'],
    ['wargs', comp.wargs ?? 0, 'Warg'],
    ['einherjars', comp.einherjars ?? 0, 'Einherjar'],
    ['fossegrims', comp.fossegrims ?? 0, 'Fossegrim'],
  ].filter(([, n]) => n > 0);

  if (entries.length === 0) return 'enemies';
  if (entries.length === 1) return entries[0][2];
  entries.sort((a, b) => b[1] - a[1]);
  const top = entries[0][1];
  const tied = entries.filter(([, n]) => n === top);
  if (tied.length > 1) return 'mixed host';
  return entries[0][2];
}

/**
 * @param {object} p
 * @param {number} p.onField — alive enemies currently on the path
 * @param {number} p.incoming — still in spawn queue
 * @param {number} p.waveTotal — total enemies this wave
 * @param {object} [p.comp] — waveComposition() result
 * @param {boolean} [p.campaign] — assault node mode (no comp breakdown)
 */
export function formatThreatStatusLine({ onField, incoming, waveTotal, comp, campaign = false }) {
  const total = Math.max(waveTotal, onField + incoming, 1);
  if (campaign) {
    const rem = onField + incoming;
    return incoming > 0 ? `${rem} remaining · ${incoming} incoming` : `${rem} remaining`;
  }
  const label = primaryWaveThreatLabel(comp);
  const suffix = incoming > 0 ? ` · ${incoming} incoming` : onField > 0 ? '' : ' · cleared';
  return `${onField}/${total} ${label}${suffix}`;
}
