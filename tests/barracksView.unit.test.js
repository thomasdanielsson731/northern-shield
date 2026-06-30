import { describe, it, expect } from 'vitest';
import {
  shouldShowBarracksRecruitView,
  getRecruitableTypes,
  getBarracksMetaHeader,
  getBarracksUnlockedSlots,
  getBarracksRosterCap,
  getBarracksDisplayCap,
  computeBarracksRecruitSlots,
  BARRACKS_ROSTER_CAP,
  CAMPAIGN_FIELD_HERO_CAP,
} from '../src/ui/barracksView.js';

describe('barracksView', () => {
  it('shouldShowBarracksRecruitView respects progression building over tab', () => {
    expect(shouldShowBarracksRecruitView('recruit', null)).toBe(true);
    expect(shouldShowBarracksRecruitView('warband', 'recruit')).toBe(true);
    expect(shouldShowBarracksRecruitView('recruit', 'warband')).toBe(false);
    expect(shouldShowBarracksRecruitView('recruit', 'fortress')).toBe(false);
    expect(shouldShowBarracksRecruitView('fortress', null)).toBe(false);
  });

  it('getRecruitableTypes limits first saga to valkyrie and military', () => {
    expect(getRecruitableTypes({ firstSagaMap: true })).toEqual(['valkyrie', 'military']);
    expect(getRecruitableTypes({ firstSagaMap: false }).length).toBe(9);
  });

  it('getBarracksMetaHeader exposes frame title copy', () => {
    const header = getBarracksMetaHeader();
    expect(header.line1).toContain('BARRACKS');
    expect(header.line1).toContain('RECRUIT');
    expect(header.line2.length).toBeGreaterThan(10);
  });

  it('roster cap and unlocked slots scale with barracks level', () => {
    expect(getBarracksRosterCap()).toBe(CAMPAIGN_FIELD_HERO_CAP);
    expect(getBarracksRosterCap({ firstSagaMap: true })).toBe(2);
    expect(getBarracksDisplayCap({ barracksLevel: 0 })).toBe(3);
    expect(getBarracksUnlockedSlots(0)).toBe(3);
    expect(getBarracksUnlockedSlots(3)).toBe(BARRACKS_ROSTER_CAP);
  });

  it('computeBarracksRecruitSlots places types on the floor band', () => {
    const hall = { x: 0, y: 0, w: 800, h: 500 };
    const slots = computeBarracksRecruitSlots(['berserk', 'valkyrie'], hall);
    expect(slots).toHaveLength(2);
    for (const slot of slots) {
      expect(slot.x).toBeGreaterThan(hall.x);
      expect(slot.x).toBeLessThan(hall.x + hall.w);
      expect(slot.y).toBeGreaterThan(hall.y + hall.h * 0.5);
      expect(slot.type).toBeTruthy();
    }
  });
});
