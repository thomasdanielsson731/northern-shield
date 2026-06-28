import { describe, it, expect } from 'vitest';
import {
  getWarCampWelcomeAlpha,
  getEquipCeremonyLayout,
  getThreatCardY,
  WAR_CAMP_WELCOME_FRAMES,
} from '../src/ui/warCampJuice.js';

describe('warCampJuice', () => {
  it('welcome hint fades in and out', () => {
    expect(getWarCampWelcomeAlpha(0)).toBe(0);
    expect(getWarCampWelcomeAlpha(WAR_CAMP_WELCOME_FRAMES)).toBe(0);
    expect(getWarCampWelcomeAlpha(200)).toBeGreaterThan(0);
    expect(getWarCampWelcomeAlpha(30)).toBeLessThan(getWarCampWelcomeAlpha(200));
  });

  it('equip ceremony sits below meta bar', () => {
    const layout = getEquipCeremonyLayout(50);
    expect(layout.ringCy).toBeGreaterThan(120);
    expect(layout.nameY).toBeLessThan(layout.ringCy);
    expect(layout.subtitleY).toBeGreaterThan(layout.ringCy);
  });

  it('threat card moves up when lone stand + dossier', () => {
    const top = 56;
    const bottom = 400;
    const dossierY = getThreatCardY(top, bottom, true, false);
    const loneY = getThreatCardY(top, bottom, true, true);
    expect(loneY).toBeLessThan(dossierY);
    expect(getThreatCardY(top, bottom, false, false)).toBe(top + 6);
  });
});
