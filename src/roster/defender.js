// XP thresholds to reach each career level (index = level)
export const CAREER_XP = [0, 50, 150, 350, 700, 1200, 1800, 2500, 3500, 4800, 6500];

// Stat multipliers granted at milestone career levels (cumulative — each row replaces previous)
export const CAREER_MILESTONES = [
  //  minLevel  damage  range  cooldown
  [3,    1.10,   1.00,   1.00],
  [5,    1.15,   1.05,   0.97],
  [8,    1.25,   1.08,   0.93],
  [10,   1.40,   1.12,   0.88],
];

export const XP_PER_KILL  = 10;
export const XP_PER_WAVE  = 5;

export function careerLevelFromXP(xp) {
  for (let lvl = CAREER_XP.length - 1; lvl >= 0; lvl--) {
    if (xp >= CAREER_XP[lvl]) return lvl;
  }
  return 0;
}

export function careerBonusForLevel(level) {
  let dm = 1.0, rm = 1.0, cm = 1.0;
  for (const [threshold, d, r, c] of CAREER_MILESTONES) {
    if (level >= threshold) { dm = d; rm = r; cm = c; }
  }
  return { dm, rm, cm };
}

export const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

export class Defender {
  constructor({ defenderId, name, type }) {
    this.defenderId    = defenderId;
    this.name          = name;
    this.type          = type;
    this.xp            = 0;
    this.careerLevel   = 0;
    this.careerKills   = 0;
    this.careerDamage  = 0;
    this.battlesPlayed = 0;
    this.deployed      = false;
  }

  grantBattleXP(kills, wavesCleared) {
    const earned        = kills * XP_PER_KILL + wavesCleared * XP_PER_WAVE;
    this.xp            += earned;
    this.careerKills   += kills;
    this.battlesPlayed++;
    this.careerLevel    = careerLevelFromXP(this.xp);
    return earned;
  }

  toJSON() {
    return {
      defenderId:    this.defenderId,
      name:          this.name,
      type:          this.type,
      xp:            this.xp,
      careerLevel:   this.careerLevel,
      careerKills:   this.careerKills,
      careerDamage:  this.careerDamage,
      battlesPlayed: this.battlesPlayed,
    };
  }

  static fromJSON(data) {
    const d = new Defender(data);
    d.xp            = data.xp            ?? 0;
    d.careerLevel   = data.careerLevel   ?? 0;
    d.careerKills   = data.careerKills   ?? 0;
    d.careerDamage  = data.careerDamage  ?? 0;
    d.battlesPlayed = data.battlesPlayed ?? 0;
    return d;
  }
}
