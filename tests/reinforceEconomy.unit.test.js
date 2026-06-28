import { describe, it, expect } from 'vitest';
import {
  REINFORCE_COST,
  canOfferReinforcePurchase,
  purchaseReinforce,
  tickReinforceAfterBattle,
  canPlaceReinforceWall,
  isFortressFullyUpgraded,
} from '../src/campaign/reinforceEconomy.js';
import { createNewCampaign } from '../src/campaign/save.js';

describe('reinforceEconomy', () => {
  it('offers purchase when fortress maxed and reserve is high', () => {
    const s = createNewCampaign();
    s.battlesCompleted = 10;
    s.goldReserve = 200;
    s.fortressUpgrades = {
      barracks: 3, armory: 3, watchtower: 3, wallworks: 3, treasury: 3,
    };
    expect(canOfferReinforcePurchase(s)).toBe(true);
  });

  it('purchases reinforce battles from reserve', () => {
    const s = createNewCampaign();
    s.battlesCompleted = 12;
    s.goldReserve = 200;
    s.fortressUpgrades = {
      barracks: 3, armory: 3, watchtower: 3, wallworks: 3, treasury: 3,
    };
    const { ok, state } = purchaseReinforce(s);
    expect(ok).toBe(true);
    expect(state.goldReserve).toBe(200 - REINFORCE_COST);
    expect(state.reinforceBattlesLeft).toBe(3);
  });

  it('ticks battles down after skirmish', () => {
    const s = { reinforceBattlesLeft: 2 };
    expect(tickReinforceAfterBattle(s).reinforceBattlesLeft).toBe(1);
  });

  it('allows temp wall placement during active reinforce skirmish', () => {
    expect(canPlaceReinforceWall({
      reinforceBattlesLeft: 2,
      wallData: {},
      isSkirmish: true,
    })).toBe(true);
    expect(canPlaceReinforceWall({
      reinforceBattlesLeft: 0,
      wallData: {},
      isSkirmish: true,
    })).toBe(false);
  });

  it('detects fully upgraded fortress', () => {
    expect(isFortressFullyUpgraded({
      barracks: 3, armory: 3, watchtower: 3, wallworks: 3, treasury: 3,
    })).toBe(true);
    expect(isFortressFullyUpgraded({ barracks: 1 })).toBe(false);
  });
});
