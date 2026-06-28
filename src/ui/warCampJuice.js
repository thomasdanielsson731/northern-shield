/** War Camp polish — tab welcome hint, equip ceremony layout, rune carver chrome. */

export const WAR_CAMP_WELCOME_FRAMES = 280;
export const WAR_CAMP_TAB_HINT_LINE = 'WARBAND · RECRUIT · FORTRESS — one tab at a time';
export const RUNE_CARVER_COLLAPSED_H = 22;

export function getWarCampWelcomeAlpha(timer, total = WAR_CAMP_WELCOME_FRAMES) {
  if (timer <= 0) return 0;
  const fadeIn = Math.min(1, (total - timer) / 24);
  const fadeOut = timer < 72 ? timer / 72 : 1;
  return fadeIn * fadeOut * 0.9;
}

/** Equip ceremony Y positions — below meta bar, clear of top chrome. */
export function getEquipCeremonyLayout(metaScreenTop) {
  const ringCy = metaScreenTop + 88;
  return {
    ringCy,
    nameY: ringCy - 4,
    subtitleY: ringCy + 12,
    sparkleY: ringCy - 20,
  };
}

/** Threat intel card Y when lone-defender stand is active. */
export function getThreatCardY(gridTop, gridBottom, dossierUp, loneStand) {
  if (loneStand && dossierUp) return gridBottom - 128;
  if (dossierUp) return gridBottom - 88;
  return gridTop + 6;
}
