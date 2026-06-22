import { Defender } from './defender.js';

export class Roster {
  constructor() {
    this.defenders = [];
  }

  load(data = []) {
    this.defenders = data.map(d => Defender.fromJSON(d));
  }

  toJSON() {
    return this.defenders.map(d => d.toJSON());
  }

  // Find an undeployed defender of the given type, or create one from the tower's generated id/name.
  // Returns the Defender and marks them as deployed.
  link(towerType, towerId, towerName) {
    let def = this.defenders.find(d => d.type === towerType && !d.deployed);
    if (!def) {
      def = new Defender({ defenderId: towerId, name: towerName, type: towerType });
      this.defenders.push(def);
    }
    def.deployed = true;
    return def;
  }

  find(defenderId) {
    return this.defenders.find(d => d.defenderId === defenderId) ?? null;
  }

  dismiss(defenderId) {
    this.defenders = this.defenders.filter(d => d.defenderId !== defenderId);
  }

  releaseAll() {
    for (const d of this.defenders) d.deployed = false;
  }

  // Grant post-battle XP to all deployed defenders based on their tower's battle stats.
  // Returns [{defName, talentId}] for any talents unlocked this battle.
  grantBattleXP(towers, wavesCleared) {
    const unlocks = [];
    for (const tower of towers) {
      const def = this.find(tower.defenderId);
      if (def) {
        const { newTalentIds } = def.grantBattleXP(tower.killCount ?? 0, wavesCleared);
        def.careerDamage += tower.damageDealt ?? 0;
        for (const talentId of newTalentIds) {
          unlocks.push({ defName: def.name, talentId });
        }
      }
    }
    return unlocks;
  }
}
