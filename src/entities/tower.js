import { Bullet } from './bullet.js';
import { SPRITES } from '../assets.js';
import { getSpriteScale, getCombatSpriteScale } from '../config.js';
import { getDefenderName } from '../roster/names.js';
import { careerBonusForLevel } from '../roster/defender.js';
import { getTalentBonuses } from '../roster/talents.js';
import { isHeroTowerType } from '../campaign/campaignRun.js';
import {
  MAX_HERO_LEVEL,
  getHeroLevelStatMultipliers,
  getHeroUpgradeCost,
  getHyddaHealCount,
  isHeroLevelMilestone,
} from '../roster/heroLevel.js';
import {
  pickAnimColumn,
  computeWalkBob,
  resolveFacingAngle,
  drawSpriteSheetFrame,
  drawSpriteContourShadow,
} from '../combat/spriteAnim.js';
import { drawTowerAttackVfx } from '../combat/characterAttackVfx.js';
import { triggerHeroAttackLunge, getHeroLungeOffset } from '../combat/combatJuice.js';
import {
  getMaxLevelForTowerType,
  getStructureLevelStatMultipliers,
  getStructureUpgradeCost,
} from '../roster/structureLevel.js';

function drawSpriteFrame(ctx, spriteKey, frame, x, y, aimAngle, dw = 36, glowColor = null, level = 1, bob = { yOff: 0, scaleY: 1, lean: 0 }) {
  const sp = SPRITES[spriteKey];
  if (!sp) return false;
  const scale = getCombatSpriteScale();
  dw = Math.round(dw * scale);
  const rimRgb = glowColor
    ? glowColor.replace(/rgba?\(([^)]+)\).*/, '$1').split(',').map(s => parseFloat(s.trim())).slice(0, 3)
    : null;

  drawSpriteContourShadow(ctx, sp, {
    col: frame,
    x,
    y: y + bob.yOff,
    aimAngle,
    dw,
    lean: bob.lean ?? 0,
    offsetY: 5,
    squashY: 0.34,
    alpha: 0.48,
  });

  ctx.save();
  ctx.translate(x, y + bob.yOff);
  ctx.scale(1, bob.scaleY);
  const drew = drawSpriteSheetFrame(ctx, sp, {
    col: frame,
    x: 0,
    y: 0,
    aimAngle,
    dw,
    lean: bob.lean ?? 0,
    rimRgb,
    brighten: 1.62,
    outline: false,
  });
  ctx.restore();
  return drew;
}

function heroAnimFrame(tower, t) {
  const moving = (tower.moveSpeed ?? 0) > 0.25;
  return pickAnimColumn({
    dying: false,
    attacking: tower.fireFlash > 0,
    moving,
    walkPhase: t + (tower._animOff ?? 0),
    gait: moving ? 'twoStep' : 'hold',
  });
}

function heroWalkBob(tower, t) {
  return computeWalkBob(tower.moveSpeed ?? 0, t + (tower._animOff ?? 0));
}

/** Locomotion faces movement; idle/attack faces combat target (may differ while kiting). */
export function heroSpriteFacingAngle(tower) {
  if ((tower.moveSpeed ?? 0) > 0.25 && tower.moveAngle != null) return tower.moveAngle;
  return tower.aimAngle ?? tower.moveAngle ?? 0;
}

export const TOWER_TYPES = {
  BERSERK:    'berserk',
  VALKYRIE:   'valkyrie',
  MILITARY:   'military',
  CATAPULT:   'catapult',
  BLONDIE:    'blondie',
  PILTORN:    'piltorn',
  HYDDA:      'hydda',
  ISJATTEN:   'isjatten',
  DRAKSHIP:   'drakship',
  MINE:       'mine',
  WATCHTOWER: 'watchtower',
  BALLISTA:   'ballista',
  RUNESHRINE: 'runeshrine',
  BARRACKS:   'barracks',
};

export const TOWER_DEFS = {
  [TOWER_TYPES.BERSERK]: {
    label:        'Berserker',
    key:          '2',
    color:        '#8a4018',
    glowRgb:      '220,50,20',
    rangeColor:   'rgba(200,60,20,0.15)',
    cost:         36,
    range:        22,
    fireRate:     22,
    damage:       48,
    radius:       8,
    bulletSpeed:  40,
    fireFlashDuration: 20,
  },
  [TOWER_TYPES.VALKYRIE]: {
    label:        'Valkyrie',
    key:          '3',
    color:        '#c8a030',
    glowRgb:      '100,160,240',
    rangeColor:   'rgba(100,140,220,0.28)',
    cost:         48,
    range:        110,
    fireRate:     72,
    damage:       88,
    radius:       8,
    bulletSpeed:  13,
    bulletShape:  'spear',
    fireFlashDuration: 16
  },
  [TOWER_TYPES.MILITARY]: {
    label:        'Archer',
    key:          '4',
    color:        '#3a8830',
    glowRgb:      '50,180,60',
    rangeColor:   'rgba(80,120,170,0.26)',
    cost:         52,
    range:        80,
    fireRate:     9,
    damage:       22,
    radius:       7,
    bulletSpeed:  11,
    bulletShape:  'arrow',
    fireFlashDuration: 5,
  },
  [TOWER_TYPES.CATAPULT]: {
    label:        'Catapult',
    key:          '5',
    color:        '#8a6030',
    glowRgb:      '220,120,30',
    rangeColor:   'rgba(130,90,30,0.26)',
    cost:         68,
    range:        120,
    fireRate:     88,
    damage:       80,
    radius:       9,
    bulletSpeed:  3.5,
    splashRadius: 44,
    splashDamage: 58,
    bulletShape:  'rock',
    fireFlashDuration: 22,
    footprint:    { w: 2, h: 2 },
  },
  [TOWER_TYPES.BLONDIE]: {
    label:        'Blondie',
    key:          '6',
    color:        '#c8a030',
    glowRgb:      '200,180,50',
    rangeColor:   'rgba(220,180,60,0.26)',
    cost:         42,
    range:        90,
    fireRate:     35,
    damage:       8,
    radius:       7,
    bulletSpeed:  5,
    slowFactor:   0.40,
    slowDuration: 60,
    bulletShape:  'stun'
  },
  [TOWER_TYPES.PILTORN]: {
    label:        'Warden',
    key:          '7',
    color:        '#8a7050',
    glowRgb:      '170,130,60',
    rangeColor:   'rgba(140,110,70,0.26)',
    cost:         54,
    range:        100,
    fireRate:     14,
    damage:       34,
    radius:       7,
    bulletSpeed:  15,
    bulletShape:  'arrow',
    fireFlashDuration: 8,
  },
  [TOWER_TYPES.HYDDA]: {
    label:        'Healer',
    key:          '8',
    color:        '#4a8840',
    glowRgb:      '60,210,100',
    rangeColor:   'rgba(60,120,50,0.24)',
    cost:         64,
    range:        0,
    fireRate:     120,
    damage:       0,
    radius:       7,
    bulletSpeed:  0,
    fireFlashDuration: 6,
  },
  [TOWER_TYPES.ISJATTEN]: {
    label:        'Ice Giant',
    key:          '9',
    color:        '#60b8f0',
    glowRgb:      '80,200,250',
    rangeColor:   'rgba(80,170,240,0.22)',
    cost:         96,
    range:        80,
    fireRate:     150,
    damage:       30,
    radius:       9,
    bulletSpeed:  0,
    slowFactor:   0.30,
    slowDuration: 90,
    novaMode:     true,
    fireFlashDuration: 20,
  },
  [TOWER_TYPES.DRAKSHIP]: {
    label:        'Dragonship',
    key:          '0',
    color:        '#b05820',
    glowRgb:      '230,70,20',
    rangeColor:   'rgba(170,80,30,0.24)',
    cost:         120,
    range:        130,
    fireRate:     78,
    damage:       90,
    radius:       9,
    bulletSpeed:  3.5,
    splashRadius: 55,
    splashDamage: 40,
    bulletShape:  'rock',
    fireFlashDuration: 14,
    footprint:    { w: 3, h: 1 },
  },
  // ── Outposts (passive) ────────────────────────────────────────────────────
  [TOWER_TYPES.BALLISTA]: {
    label:             'Ballista',
    key:               'r',
    color:             '#5a4028',
    glowRgb:           '160,100,40',
    rangeColor:        'rgba(140,90,40,0.24)',
    cost:              68,
    range:             160,
    fireRate:          90,
    damage:            215,
    radius:            7,
    bulletSpeed:       18,
    bulletShape:       'arrow',
    fireFlashDuration: 18,
  },
  [TOWER_TYPES.RUNESHRINE]: {
    label:        'Rune Shrine',
    key:          't',
    color:        '#6050a8',
    glowRgb:      '100,80,200',
    rangeColor:   'rgba(80,60,180,0.20)',
    cost:         55,
    range:        0,
    fireRate:     9999,
    damage:       0,
    radius:       6,
    bulletSpeed:  0,
    passive:      true,
    starPerWaves: 4,
  },
  [TOWER_TYPES.BARRACKS]: {
    label:             'Barracks',
    key:               'y',
    color:             '#506030',
    glowRgb:           '100,130,60',
    rangeColor:        'rgba(80,100,50,0.20)',
    cost:              60,
    range:             0,
    fireRate:          9999,
    damage:            0,
    radius:            6,
    bulletSpeed:       0,
    passive:           true,
    xpPerWave:         2,
    recruitCostReduce: 5,
  },
  [TOWER_TYPES.MINE]: {
    label:       'Mine',
    key:         'q',
    color:       '#7a6040',
    glowRgb:     '160,120,60',
    rangeColor:  'rgba(120,90,40,0.20)',
    cost:        45,
    range:       0,
    fireRate:    9999,
    damage:      0,
    radius:      6,
    bulletSpeed: 0,
    passive:     true,
    goldPerWave: 3,
  },
  [TOWER_TYPES.WATCHTOWER]: {
    label:            'Watch Tower',
    key:              'e',
    color:            '#7080a0',
    glowRgb:          '100,130,180',
    rangeColor:       'rgba(80,110,160,0.20)',
    cost:             35,
    range:            0,
    fireRate:         9999,
    damage:           0,
    radius:           6,
    bulletSpeed:      0,
    passive:          true,
    eventPreviewBonus: 1,
  },
};

const MAX_LEVEL = MAX_HERO_LEVEL;

function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export class Tower {
  constructor(x, y, col, row, type = TOWER_TYPES.BERSERK) {
    this.x   = x;
    this.y   = y;
    this.col = col;
    this.row = row;
    this.type = type;
    this.name         = getDefenderName(type);
    this.defenderId   = generateId();
    this._careerLevel = 0;
    this.fireCooldown  = 0;
    this.level         = 1;
    this.damageDealt   = 0;
    this._shadowGrad   = null;
    this._shadowR      = -1;

    const def = TOWER_DEFS[this.type] || TOWER_DEFS[TOWER_TYPES.BERSERK];
    this.baseDamage    = def.damage;
    this.baseRange     = def.range;
    this.baseFireRate  = def.fireRate;
    this.radius        = def.radius;
    this.bulletSpeed   = def.bulletSpeed;
    this.color         = def.color;
    this.glowRgb       = def.glowRgb ?? '255,190,80';
    this.rangeColor    = def.rangeColor;
    this.splashRadius  = def.splashRadius  ?? 0;
    this.splashDamage  = def.splashDamage  ?? 0;
    this.slowFactor    = def.slowFactor    ?? 1;
    this.slowDuration  = def.slowDuration  ?? 0;
    this.bulletShape   = def.bulletShape   ?? 'orb';
    this.moveSpeed      = 0;
    this.moveAngle     = -Math.PI / 2;
    this._animOff       = Math.random() * 8;
    this.aimAngle      = -Math.PI / 2;
    this.fireFlash       = 0;
    this.maxFireFlash    = def.fireFlashDuration ?? 8;
    this.disabledTimer   = 0;
    this.levelFlash      = 0;   // frames of milestone glow on level 5 / 10
    this.synergyRingTimer = 0;  // frames of gold ring on Berserker-wall synergy
    this.killCount       = 0;   // total enemy kills credited to this tower
    this.goldGenerated   = 0;   // total gold reward earned via this tower's kills
    this.footprint       = def.footprint ?? { w: 1, h: 1 };
    this._synergy        = null;  // active synergy key ('eagleEye'|'siegeFury'|'winterGrip'|null)
    this._synergyDmgBoost = 1;   // set by game.js before update() call
    this.lastTargetX     = null;
    this.lastTargetY     = null;
    this.targetLineTimer = 0;
    this.rune            = null;
    this._talentBonuses  = null;
    this._legacyBonus    = null;
    this.itemRune        = null;   // rune socketed into equipped item's rune slot
    this._waveTicks      = 0;      // wave counter for rune shrine star generation
    this.onHighGround    = false;  // placed on a tactical high-ground choke tile

    // MVP marker timer (frames); when >0 the tower is highlighted as MVP
    this.mvpTimer = 0;

    this.selected      = false;
    this._applyLevel();
    this.fireCooldown  = this.fireRate;  // start with full cooldown — no instant first shot
  }

  _applyLevel() {
    const def = TOWER_DEFS[this.type];
    const passive = def?.passive;
    const mults = isHeroTowerType(this.type)
      ? getHeroLevelStatMultipliers(this.level)
      : passive
        ? { dmgMult: 1, rangeMult: 1, rateMult: 1 }
        : getStructureLevelStatMultipliers(this.level);
    this.damage       = Math.round(this.baseDamage   * mults.dmgMult);
    this.range        = Math.round(this.baseRange    * mults.rangeMult);
    this.fireRate     = Math.max(4, Math.round(this.baseFireRate * mults.rateMult));
    this.slowFactor   = def.slowFactor   ?? 1;
    this.slowDuration = def.slowDuration ?? 0;
    if (this.slowDuration > 0) this.slowDuration = Math.round(this.slowDuration * (1 + (this.level - 1) * 0.10));
    if (this.rune === 'ironEdge')    this.damage   = Math.round(this.damage * 1.25);
    if (this.rune === 'swiftStrike') this.fireRate = Math.max(4, Math.round(this.fireRate * 0.85));
    if (this.rune === 'battleHymn')  this.range    = Math.round(this.range  * 1.30);
    if (this.rune === 'frostRune') {
      this.slowFactor   = Math.min(this.slowFactor,   0.50);
      this.slowDuration = Math.min(this.slowDuration + 20, 80);
    }
    // Item rune slot — weaker stacking bonus from equipped item's socket
    if (this.itemRune === 'ironEdge')    this.damage   = Math.round(this.damage * 1.12);
    if (this.itemRune === 'swiftStrike') this.fireRate = Math.max(4, Math.round(this.fireRate * 0.91));
    if (this.itemRune === 'battleHymn')  this.range    = Math.round(this.range  * 1.18);
    if (this.itemRune === 'frostRune') {
      this.slowFactor   = Math.min(this.slowFactor,   0.55);
      this.slowDuration = Math.min(this.slowDuration + 12, 80);
    }
    // High-ground choke point: +15% range
    if (this.onHighGround && this.range > 0) this.range = Math.round(this.range * 1.15);
    if (this._careerLevel > 0) {
      const { dm, rm, cm } = careerBonusForLevel(this._careerLevel);
      this.damage   = Math.round(this.damage   * dm);
      this.range    = Math.round(this.range    * rm);
      this.fireRate = Math.max(4, Math.round(this.fireRate * cm));
    }
    if (this._equipmentBonuses) {
      const { dm, rm, cm } = this._equipmentBonuses;
      if (dm !== 1) this.damage   = Math.round(this.damage   * dm);
      if (rm !== 1) this.range    = Math.round(this.range    * rm);
      if (cm !== 1) this.fireRate = Math.max(4, Math.round(this.fireRate * cm));
    }
    if (this._talentBonuses) {
      const { dm, rm, cm, slowMult } = this._talentBonuses;
      if (dm !== 1)       this.damage    = Math.round(this.damage   * dm);
      if (rm !== 1)       this.range     = Math.round(this.range    * rm);
      if (cm !== 1)       this.fireRate  = Math.max(4, Math.round(this.fireRate * cm));
      if (slowMult !== 1) this.slowFactor = Math.max(0.15, this.slowFactor * slowMult);
    }
    if (this._legacyBonus?.stat) {
      const { stat, value } = this._legacyBonus;
      if (stat === 'dm')      this.damage   = Math.round(this.damage   * value);
      else if (stat === 'rm') this.range    = Math.round(this.range    * value);
      else if (stat === 'cm') this.fireRate = Math.max(4, Math.round(this.fireRate * value));
    }
  }

  // Called by game.js after roster lookup — overwrites generated name/id, applies career + equipment + talent + legacy stats.
  applyCareerData(defenderId, name, careerLevel, equipmentBonuses = null, talentBonuses = null, legacyBonus = null) {
    this.defenderId        = defenderId;
    this.name              = name;
    this._careerLevel      = careerLevel;
    this._equipmentBonuses = equipmentBonuses;
    this._talentBonuses    = talentBonuses;
    this._legacyBonus      = legacyBonus;
    this._applyLevel();
  }

  get upgradeCost() {
    const base = TOWER_DEFS[this.type]?.cost ?? 20;
    if (isHeroTowerType(this.type)) return getHeroUpgradeCost(base, this.level);
    return getStructureUpgradeCost(base, this.level);
  }
  get sellValue() {
    const base = TOWER_DEFS[this.type]?.cost ?? 20;
    let total = base;
    for (let i = 1; i < this.level; i++) total += Math.floor(base * Math.sqrt(i) * 0.90);
    return Math.floor(total * 0.70);
  }
  get maxed()       { return this.level >= getMaxLevelForTowerType(this.type); }

  upgrade() {
    if (this.maxed) return false;
    this.level++;
    this._applyLevel();
    if (isHeroLevelMilestone(this.level) || (!isHeroTowerType(this.type) && [10, 20, 30].includes(this.level))) {
      this.levelFlash = 55;
    }
    return true;
  }

  setRune(id) {
    this.rune = id;
    this._applyLevel();
  }

  clearRune() {
    this.rune = null;
    this._applyLevel();
  }

  setItemRune(id) {
    this.itemRune = id;
    this._applyLevel();
  }

  clearItemRune() {
    this.itemRune = null;
    this._applyLevel();
  }

  update(enemies, bullets = null) {
    if (this.disabledTimer > 0) { this.disabledTimer--; return null; }
    if (TOWER_DEFS[this.type]?.passive) return null;

    // ── Hydda: passive healer — ticks down cooldown, signals heal to caller ──
    if (this.type === TOWER_TYPES.HYDDA) {
      if (this.fireCooldown > 0) { this.fireCooldown--; return null; }
      this.fireCooldown = this.fireRate;
      this.fireFlash    = this.maxFireFlash;
      triggerHeroAttackLunge(this, this.lastTargetX ?? this.x + 1, this.lastTargetY ?? this.y);
      return { type: 'heal', count: getHyddaHealCount(this.level) };
    }

    // ── Isjätte: AoE ice nova — damages & slows all enemies in range ─────────
    if (this.type === TOWER_TYPES.ISJATTEN) {
      if (this.fireCooldown > 0) { this.fireCooldown--; return null; }
      const rangeSq = this.range * this.range;
      let killed = 0, hit = false, aimX = this.x + 1, aimY = this.y;
      for (const enemy of enemies) {
        if (!enemy.alive || enemy.reached) continue;
        const dx = enemy.x - this.x, dy = enemy.y - this.y;
        if (dx * dx + dy * dy > rangeSq) continue;
        hit = true;
        aimX = enemy.x;
        aimY = enemy.y;
        enemy.hp -= Math.round(this.damage * (Tower.dmgMult ?? 1) * (this._synergyDmgBoost ?? 1));
        enemy.hitFlash    = this.damage > 20 ? 6 : 4;
        enemy.hitFlashMax = enemy.hitFlash;
        if (!enemy.slowImmune) {
          enemy.slowTimer  = this.slowDuration;
          enemy.slowFactor = this.slowFactor;
        }
        if (enemy.hp <= 0) { enemy.hp = 0; enemy.kill(); enemy._killed = true; killed++; }
      }
      if (!hit) return null;
      this.fireCooldown = this.level >= 5 ? Math.min(this.fireRate, 120) : this.fireRate;
      this.fireFlash = this.maxFireFlash;
      triggerHeroAttackLunge(this, aimX, aimY);
      return { type: 'nova', x: this.x, y: this.y, r: this.range, killed };
    }

    if (this.fireCooldown > 0) { this.fireCooldown--; return null; }

    const rangeSq = this.range * this.range;
    let target = null, bestProgress = -1, bestDistSq = rangeSq;
    for (const enemy of enemies) {
      if (!enemy.alive || enemy.reached) continue;
      const dx = enemy.x - this.x, dy = enemy.y - this.y;
      const distSq   = dx * dx + dy * dy;
      const progress = enemy.pathIndex ?? 0;
      if (distSq > rangeSq) continue;
      if (progress > bestProgress || (progress === bestProgress && distSq < bestDistSq)) {
        bestProgress = progress; bestDistSq = distSq; target = enemy;
      }
    }

    if (!target) { this._currentTarget = null; return null; }
    this._currentTarget = target;
    this.aimAngle = Math.atan2(target.y - this.y, target.x - this.x);

    if (Array.isArray(bullets)) {
      const _dmg   = Math.round(this.damage       * (Tower.dmgMult ?? 1) * (this._synergyDmgBoost ?? 1));
      const _sdmg  = Math.round(this.splashDamage * (Tower.dmgMult ?? 1) * (this._synergyDmgBoost ?? 1));
      const b = new Bullet(
        this.x, this.y, target, _dmg, this.bulletSpeed,
        this.splashRadius, _sdmg,
        this.slowFactor, this.slowDuration,
        this.bulletShape
      );
      b.source = this;
      if (this.type === TOWER_TYPES.PILTORN) {
        b.canPierce = true;
        if (this._synergy === 'runeChain') b.pierceCap = 5;  // +1 pierce target from Rune Chain
      }
      bullets.push(b);
      this.lastTargetX = target.x; this.lastTargetY = target.y; this.targetLineTimer = 20;
      this.fireCooldown = this.fireRate;
      this.fireFlash    = this.maxFireFlash;
      triggerHeroAttackLunge(this, target.x, target.y);
      return 0;
    }

    target.hp -= Math.round(this.damage * (Tower.dmgMult ?? 1));
    if (this.rune === 'frostRune' && !target.slowImmune) {
      target.slowTimer  = Math.max(target.slowTimer ?? 0, this.slowDuration);
      target.slowFactor = Math.min(target.slowFactor ?? 1, this.slowFactor);
    }
    this.lastTargetX = target.x; this.lastTargetY = target.y; this.targetLineTimer = 20;
    this.fireCooldown = this.fireRate;
    if (target.hp <= 0) { target.hp = 0; target.kill(); return 1; }
    return 0;
  }

  /** Redraw hero sprite only — used when overlapping fortress walls (depth pass). */
  drawCombatSpriteOnly(ctx, t) {
    if (!isHeroTowerType(this.type)) return;
    const bob = heroWalkBob(this, t);
    const lunge = getHeroLungeOffset(this);
    const x = this.x + lunge.x;
    const y = this.y + lunge.y;
    const angle = heroSpriteFacingAngle(this);
    const glow = this.glowRgb ? `rgba(${this.glowRgb},0.95)` : null;
    if      (this.type === TOWER_TYPES.BERSERK)    drawSpriteFrame(ctx, 'berserker', heroAnimFrame(this, t), x, y, angle, 58, glow ?? 'rgba(255,120,40,0.95)', this.level, bob);
    else if (this.type === TOWER_TYPES.VALKYRIE)   drawSpriteFrame(ctx, 'valkyrie', heroAnimFrame(this, t), x, y, angle, 72, glow ?? 'rgba(220,180,60,0.9)', this.level, bob);
    else if (this.type === TOWER_TYPES.MILITARY)   drawSpriteFrame(ctx, 'archer', heroAnimFrame(this, t), x, y, angle, 62, glow ?? 'rgba(90,140,190,0.75)', this.level, bob);
    else if (this.type === TOWER_TYPES.CATAPULT)   drawSpriteFrame(ctx, 'catapult', heroAnimFrame(this, t), x, y, angle, 68, glow ?? 'rgba(200,130,30,0.85)', this.level, bob);
    else if (this.type === TOWER_TYPES.BLONDIE)    drawSpriteFrame(ctx, 'blondie', heroAnimFrame(this, t), x, y, angle, 64, glow ?? 'rgba(255,110,200,0.9)', this.level, bob);
    else if (this.type === TOWER_TYPES.PILTORN)    drawSpriteFrame(ctx, 'piltorn', heroAnimFrame(this, t), x, y, angle, 62, glow ?? 'rgba(100,140,190,0.8)', this.level, bob);
    else if (this.type === TOWER_TYPES.HYDDA)      drawSpriteFrame(ctx, 'hydda', heroAnimFrame(this, t), x, y, angle, 58, glow ?? 'rgba(50,200,90,0.85)', this.level, bob);
    else if (this.type === TOWER_TYPES.ISJATTEN)   drawSpriteFrame(ctx, 'isjatten', heroAnimFrame(this, t), x, y, angle, 72, glow ?? 'rgba(88,82,72,0.9)', this.level, bob);
    else if (this.type === TOWER_TYPES.DRAKSHIP)   drawSpriteFrame(ctx, 'drakship', heroAnimFrame(this, t), x, y, angle, 70, glow ?? 'rgba(200,100,30,0.85)', this.level, bob);
  }

  draw(ctx) {
    const _now = performance.now();
    const t    = _now * 0.001;
    const def  = TOWER_DEFS[this.type];
    const isHero = isHeroTowerType(this.type);

    // Colored baseplate — structures/siege only (warband heroes walk freely)
    if (!isHero) {
      const fpW = this.footprint.w * 14;
      const fpH = this.footprint.h * 14;
      ctx.save();
      ctx.globalAlpha = this.disabledTimer > 0 ? 0.10 : 0.32;
      ctx.fillStyle   = def.color;
      ctx.beginPath();
      ctx.roundRect(this.x - fpW / 2, this.y - fpH / 2, fpW, fpH, 3);
      ctx.fill();
      ctx.globalAlpha = this.disabledTimer > 0 ? 0.05 : 0.22;
      ctx.strokeStyle = def.color;
      ctx.lineWidth   = this.footprint.w > 1 || this.footprint.h > 1 ? 1.5 : 1;
      ctx.stroke();
      ctx.restore();
    }

    // Ground shadow — heroes use sprite silhouette; structures keep soft ellipse
    if (!isHero) {
      const fpW = this.footprint.w * 14;
      const fpH = this.footprint.h * 14;
      const shadowR = Math.max(fpW, fpH) / 2 + 2;
      if (shadowR !== this._shadowR) {
        this._shadowR    = shadowR;
        const g = ctx.createRadialGradient(this.x, this.y + 4, 0, this.x, this.y + 4, shadowR);
        g.addColorStop(0,   'rgba(0,0,0,0.85)');
        g.addColorStop(0.5, 'rgba(0,0,0,0.45)');
        g.addColorStop(1,   'rgba(0,0,0,0)');
        this._shadowGrad = g;
      }
      ctx.save();
      ctx.globalAlpha = this.disabledTimer > 0 ? 0.08 : 0.52;
      ctx.fillStyle = this._shadowGrad;
      ctx.beginPath();
      ctx.ellipse(this.x, this.y + 4, shadowR, shadowR * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Active synergy indicator — dashed ring around synergy pairs
    if (this._synergy) {
      const synergyColors = {
        eagleEye: 'rgba(180,150,110,0.50)',
        siegeFury: 'rgba(169,80,40,0.50)',
        winterGrip: 'rgba(140,150,130,0.50)',
      };
      const sc = synergyColors[this._synergy] ?? '#ffffff';
      ctx.save();
      ctx.strokeStyle = sc + '55';
      ctx.lineWidth   = 1;
      ctx.setLineDash([2, 3]);
      ctx.lineDashOffset = -(_now * 0.012) % 5;
      ctx.beginPath();
      ctx.rect(this.x - fpW / 2 - 2, this.y - fpH / 2 - 2, fpW + 4, fpH + 4);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // Range ring — only when selected and range is non-zero
    if (this.range > 0 && this.selected) {
      ctx.strokeStyle = this.rangeColor;
      ctx.lineWidth   = 1;
      ctx.setLineDash([3, 8]);
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.range, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Multi-cell towers (except Catapult, which handles its own scale) are drawn
    // scaled up to fill their footprint.
    const fpScale = Math.sqrt(this.footprint.w * this.footprint.h);
    const useFpScale = fpScale > 1.01 && this.type !== TOWER_TYPES.CATAPULT;
    const lunge = isHero ? getHeroLungeOffset(this) : { x: 0, y: 0 };
    const lungeActive = isHero && (lunge.x !== 0 || lunge.y !== 0);
    if (useFpScale) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.scale(fpScale, fpScale);
      ctx.translate(-this.x, -this.y);
    }
    if (lungeActive) {
      ctx.save();
      ctx.translate(lunge.x, lunge.y);
    }
    if      (this.type === TOWER_TYPES.BERSERK)    this._drawBerserk(ctx, t);
    else if (this.type === TOWER_TYPES.VALKYRIE)   this._drawValkyrie(ctx, t);
    else if (this.type === TOWER_TYPES.MILITARY)   this._drawMilitary(ctx, t);
    else if (this.type === TOWER_TYPES.CATAPULT)   this._drawCatapult(ctx, t);
    else if (this.type === TOWER_TYPES.PILTORN)    this._drawPiltorn(ctx, t);
    else if (this.type === TOWER_TYPES.HYDDA)      this._drawHydda(ctx, t);
    else if (this.type === TOWER_TYPES.ISJATTEN)   this._drawIsjatten(ctx, t);
    else if (this.type === TOWER_TYPES.DRAKSHIP)   this._drawDrakship(ctx, t);
    else if (this.type === TOWER_TYPES.MINE)       this._drawMine(ctx, t);
    else if (this.type === TOWER_TYPES.WATCHTOWER) this._drawWatchtower(ctx, t);
    else if (this.type === TOWER_TYPES.BALLISTA)   this._drawBallista(ctx, t);
    else if (this.type === TOWER_TYPES.RUNESHRINE) this._drawRuneShrine(ctx, t);
    else if (this.type === TOWER_TYPES.BARRACKS)   this._drawBarracks(ctx, t);
    else                                           this._drawBlondie(ctx, t);
    if (lungeActive) ctx.restore();
    if (useFpScale) ctx.restore();

    // Attack VFX — per-class (characterAttackVfx)
    if (this.fireFlash > 0) {
      drawTowerAttackVfx(ctx, this, t);
      this.fireFlash--;
    }

    // Disabled shimmer — amber-red (reads as broken, not buffed)
    if (this.disabledTimer > 0) {
      const flicker = 0.30 + Math.sin(t * 26) * 0.15;
      ctx.save();
      ctx.fillStyle   = `rgba(180,55,18,${flicker * 0.32})`;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 4, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < 3; i++) {
        const a  = t * 7 + (i * Math.PI * 2 / 3);
        const r1 = this.radius + 2, r2 = this.radius + 7;
        ctx.strokeStyle = `rgba(160,48,14,${0.22 + Math.sin(t * 13 + i) * 0.14})`;
        ctx.lineWidth   = 0.8;
        ctx.beginPath();
        ctx.moveTo(this.x + Math.cos(a) * r1,       this.y + Math.sin(a) * r1);
        ctx.lineTo(this.x + Math.cos(a + 0.5) * r2, this.y + Math.sin(a + 0.5) * r2);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
      // EMP label — tells player why the tower is inactive
      ctx.save();
      ctx.font      = 'bold 7px monospace';
      ctx.fillStyle = `rgba(180,110,70,${0.65 + Math.sin(t * 10) * 0.25})`;
      ctx.textAlign = 'center';
      const empSec = Math.max(1, Math.ceil(this.disabledTimer / 60));
      ctx.fillText(`EMP ${empSec}s`, this.x, this.y - this.radius - 4);
      ctx.restore();
      ctx.restore();
    }

    // Level milestone burst (levels 5 and 10)
    if (this.levelFlash > 0) {
      const lf = this.levelFlash / 55;
      const ringR = this.radius + 4 + (1 - lf) * 14;
      ctx.save();
      ctx.strokeStyle = `rgba(200,165,90,${lf * 0.9})`;
      ctx.lineWidth   = 2;
      ctx.beginPath(); ctx.arc(this.x, this.y, ringR, 0, Math.PI * 2); ctx.stroke();
      ctx.shadowBlur  = 0;
      // Radiating sparks
      for (let i = 0; i < 6; i++) {
        const a  = (i / 6) * Math.PI * 2 + (1 - lf) * Math.PI;
        const r0 = this.radius + 3;
        const r1 = r0 + (1 - lf) * 18;
        ctx.strokeStyle = `rgba(190,155,85,${lf * 0.7})`;
        ctx.lineWidth   = 0.8;
        ctx.beginPath();
        ctx.moveTo(this.x + Math.cos(a) * r0, this.y + Math.sin(a) * r0);
        ctx.lineTo(this.x + Math.cos(a) * r1, this.y + Math.sin(a) * r1);
        ctx.stroke();
      }
      ctx.restore();
      this.levelFlash--;
    }

    // Synergy ring — Berserker + wall placement feedback
    if (this.synergyRingTimer > 0) {
      const sf   = this.synergyRingTimer / 30;
      const ringR = this.radius + 3 + (1 - sf) * 18;
      ctx.save();
      ctx.strokeStyle = `rgba(185,150,80,${sf * 0.85})`;
      ctx.lineWidth   = 2.5;
      ctx.beginPath(); ctx.arc(this.x, this.y, ringR, 0, Math.PI * 2); ctx.stroke();
      ctx.shadowBlur  = 0;
      ctx.restore();
      this.synergyRingTimer--;
    }

    // Level badge
    if (this.level > 1) {
      const badge = this.maxed ? 'MAX' : `${this.level}`;
      ctx.save();
      ctx.font      = 'bold 7px monospace';
      ctx.textAlign = 'center';
      const _badgeKey = `${badge}_7`;
      if (!this._badgeW || this._badgeWKey !== _badgeKey) {
        this._badgeW    = ctx.measureText(badge).width + 5;
        this._badgeWKey = _badgeKey;
      }
      const bw = this._badgeW;
      ctx.fillStyle = 'rgba(6,3,14,0.9)';
      ctx.fillRect(this.x - bw / 2, this.y + 6, bw, 8);
      ctx.fillStyle = this.maxed ? '#c87840' : '#e8c040';
      ctx.fillText(badge, this.x, this.y + 13);
      ctx.restore();
    }

    // Rune gem — small glowing dot top-right of tower when a rune is equipped
    if (this.rune) {
      const RUNE_COLORS = {
        ironEdge: 'rgba(169,50,38,0.85)',
        swiftStrike: 'rgba(180,150,110,0.85)',
        frostRune: 'rgba(140,155,130,0.85)',
        battleHymn: 'rgba(180,130,70,0.85)',
        valhalla: 'rgba(212,175,55,0.85)',
      };
      const rc = RUNE_COLORS[this.rune] ?? '#ffffff';
      const pulse = 0.6 + Math.sin(_now * 0.006 + this.x) * 0.4;
      ctx.save();
      ctx.fillStyle = rc; ctx.globalAlpha = 0.75 + pulse * 0.25;
      ctx.beginPath(); ctx.arc(this.x + this.radius - 2, this.y - this.radius + 2, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // MVP crown — small pulsing crown above tower when mvpTimer > 0
    if (this.mvpTimer > 0) {
      const mt = Math.max(1, this.mvpTimer);
      const pulse = 0.6 + Math.sin(_now * 0.009) * 0.4;
      const alpha = Math.min(1, mt / 120);
      // Pulsing gold glow ring beneath tower
      ctx.save();
      ctx.globalAlpha = alpha * (0.30 + pulse * 0.20);
      ctx.strokeStyle = `rgba(185,150,80,${0.55 + pulse * 0.30})`;
      ctx.lineWidth   = 2.0 + pulse * 1.2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 5 + pulse * 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = alpha;
      const cx = this.x, cy = this.y - this.radius - 14;
      // Crown base
      ctx.fillStyle = '#c9a227';
      ctx.beginPath();
      ctx.moveTo(cx - 8, cy + 4);
      ctx.lineTo(cx - 5, cy - 2);
      ctx.lineTo(cx - 1, cy + 4);
      ctx.lineTo(cx + 2, cy - 3);
      ctx.lineTo(cx + 6, cy + 4);
      ctx.closePath(); ctx.fill();
      // Gems
      ctx.fillStyle = '#e87050'; ctx.beginPath(); ctx.arc(cx - 5, cy - 1, 1.6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(140,150,130,0.85)'; ctx.beginPath(); ctx.arc(cx + 2, cy - 2, 1.6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f0e050'; ctx.beginPath(); ctx.arc(cx + 6, cy + 1, 1.2, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();
      this.mvpTimer = Math.max(0, this.mvpTimer - 1);
    }
  }

  // ── Berserker: huge berserker warrior swinging a battle axe ──────────────────
  _drawBerserk(ctx, t) {
    const x = this.x, y = this.y;

    // Ground shadow (always drawn)
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(x + 2, y + 9, 9, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    if (drawSpriteFrame(ctx, 'berserker', heroAnimFrame(this, t), x, y, heroSpriteFacingAngle(this), 58, 'rgba(255,120,40,0.95)', this.level, heroWalkBob(this, t))) return;

    const axeSpin = t * (this.fireFlash > 0 ? 12 : 3.5);

    // Fur-lined boots
    ctx.fillStyle = '#5a3010';
    ctx.fillRect(x - 5, y + 4, 4, 5);
    ctx.fillRect(x + 1, y + 4, 4, 5);
    ctx.fillStyle = '#7a4820';
    ctx.fillRect(x - 5, y + 4, 4, 2);
    ctx.fillRect(x + 1, y + 4, 4, 2);

    // Legs / trousers
    ctx.fillStyle = '#382010';
    ctx.fillRect(x - 4, y - 1, 4, 6);
    ctx.fillRect(x, y - 1, 4, 6);

    // Torso — leather vest + chain-mail
    ctx.fillStyle = '#8a4018';
    ctx.beginPath();
    ctx.moveTo(x - 6, y + 1);
    ctx.lineTo(x + 6, y + 1);
    ctx.lineTo(x + 5, y - 6);
    ctx.lineTo(x - 5, y - 6);
    ctx.closePath();
    ctx.fill();
    // Vest highlight
    ctx.fillStyle = '#b05820';
    ctx.beginPath();
    ctx.moveTo(x - 6, y + 1);
    ctx.lineTo(x - 2, y + 1);
    ctx.lineTo(x - 2, y - 6);
    ctx.lineTo(x - 5, y - 6);
    ctx.closePath();
    ctx.fill();
    // Belt
    ctx.fillStyle = '#1e1008';
    ctx.fillRect(x - 6, y - 1, 12, 2);
    ctx.fillStyle = '#c8a020';
    ctx.fillRect(x - 1, y - 1.5, 2.5, 3);

    // Skull-painted shoulder pads
    ctx.fillStyle = '#6a3810';
    ctx.beginPath();
    ctx.ellipse(x - 6, y - 5, 3.5, 2.5, -0.3, 0, Math.PI * 2);
    ctx.ellipse(x + 6, y - 5, 3.5, 2.5,  0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f0e8d0';
    for (const [sx, sy] of [[x - 6.5, y - 5.8], [x + 5.5, y - 5.8]]) {
      ctx.beginPath();
      ctx.arc(sx, sy, 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#201008';
      ctx.beginPath();
      ctx.ellipse(sx - 0.5, sy, 0.5, 0.4, 0, 0, Math.PI * 2);
      ctx.ellipse(sx + 0.5, sy, 0.5, 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f0e8d0';
    }

    // Head
    ctx.fillStyle   = '#c8885a';
    ctx.beginPath();
    ctx.arc(x, y - 9, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    // Beard
    ctx.fillStyle = '#8a4418';
    ctx.beginPath();
    ctx.moveTo(x - 4, y - 7);
    ctx.lineTo(x - 4.5, y - 5);
    ctx.lineTo(x - 2, y - 4);
    ctx.lineTo(x, y - 3.5);
    ctx.lineTo(x + 2, y - 4);
    ctx.lineTo(x + 4.5, y - 5);
    ctx.lineTo(x + 4, y - 7);
    ctx.closePath();
    ctx.fill();
    // Beard highlight
    ctx.fillStyle = '#aa5c28';
    ctx.beginPath();
    ctx.moveTo(x - 3, y - 7);
    ctx.lineTo(x - 3.5, y - 5.5);
    ctx.lineTo(x - 0.5, y - 5);
    ctx.lineTo(x - 0.5, y - 7);
    ctx.closePath();
    ctx.fill();

    // Viking helmet
    ctx.fillStyle = '#888880';
    ctx.beginPath();
    ctx.arc(x, y - 12.5, 5, 0, Math.PI, true);
    ctx.fill();
    ctx.fillStyle = '#a0a898';
    ctx.fillRect(x - 5, y - 12.5, 10, 2);
    // Horn left
    ctx.fillStyle = '#e8e0c0';
    ctx.beginPath();
    ctx.moveTo(x - 4.5, y - 13);
    ctx.lineTo(x - 8.5, y - 18);
    ctx.lineTo(x - 2.5, y - 13.5);
    ctx.closePath();
    ctx.fill();
    // Horn right
    ctx.beginPath();
    ctx.moveTo(x + 4.5, y - 13);
    ctx.lineTo(x + 8.5, y - 18);
    ctx.lineTo(x + 2.5, y - 13.5);
    ctx.closePath();
    ctx.fill();
    // Nose guard
    ctx.fillStyle = '#888880';
    ctx.fillRect(x - 1, y - 12, 2, 5);

    // Warpaint stripes (dark blood red)
    ctx.fillStyle = '#a81c10';
    ctx.fillRect(x - 4, y - 10, 2.5, 1);
    ctx.fillRect(x + 1.5, y - 10, 2.5, 1);

    // Spinning battle axe
    ctx.save();
    ctx.translate(x + 7, y - 4);
    ctx.rotate(axeSpin);
    // Handle
    ctx.strokeStyle = '#6a3810';
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.moveTo(0, -9); ctx.lineTo(0, 6);
    ctx.stroke();
    // Axe head
    ctx.fillStyle = '#b0a898';
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(5, -12);
    ctx.lineTo(6, -6);
    ctx.lineTo(1, -4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#d8d4c8';
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(5, -12);
    ctx.lineTo(3.5, -9);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();

    // Warm glow ring on attack
    if (this.fireFlash > 0) {
      const br = this.fireFlash / (this.maxFireFlash || 6);
      ctx.save();
      ctx.strokeStyle = `rgba(255,120,40,${br * 0.7})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, 12 * (1.3 - br * 0.3), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  // ── Valkyrie: winged warrior with spear ───────────────────────────────────────
  _drawValkyrie(ctx, t) {
    const x = this.x, y = this.y;

    ctx.fillStyle = 'rgba(0,0,0,0.38)';
    ctx.beginPath();
    ctx.ellipse(x + 1, y + 8, 10, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    if (drawSpriteFrame(ctx, 'valkyrie', heroAnimFrame(this, t), x, y, heroSpriteFacingAngle(this), 72, 'rgba(220,180,60,0.9)', this.level, heroWalkBob(this, t))) return;

    const glow     = 0.7 + Math.sin(t * 2.2) * 0.3;
    const wingFlap = Math.sin(t * 2.8) * 0.1;
    ctx.save();
    // Left wing
    ctx.fillStyle = '#f0e8d0';
    ctx.beginPath();
    ctx.moveTo(x - 3, y - 1);
    ctx.bezierCurveTo(x - 9 - wingFlap * 6, y - 9, x - 17 - wingFlap * 8, y - 5, x - 19 - wingFlap * 10, y + 2);
    ctx.bezierCurveTo(x - 13, y + 6, x - 5, y + 3, x - 2, y + 2);
    ctx.closePath();
    ctx.fill();
    // Right wing
    ctx.beginPath();
    ctx.moveTo(x + 3, y - 1);
    ctx.bezierCurveTo(x + 9 + wingFlap * 6, y - 9, x + 17 + wingFlap * 8, y - 5, x + 19 + wingFlap * 10, y + 2);
    ctx.bezierCurveTo(x + 13, y + 6, x + 5, y + 3, x + 2, y + 2);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    // Feather lines
    ctx.strokeStyle = 'rgba(180,150,60,0.35)';
    ctx.lineWidth   = 0.6;
    for (let i = 0; i < 4; i++) {
      const f = i / 3;
      ctx.beginPath();
      ctx.moveTo(x - 2 - f * 2, y + f);
      ctx.bezierCurveTo(x - 7 - f * 5, y - 5 - f * 2, x - 13 - f * 4, y - 3 + f, x - 17 - f * 2, y + 1 + f * 1.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + 2 + f * 2, y + f);
      ctx.bezierCurveTo(x + 7 + f * 5, y - 5 - f * 2, x + 13 + f * 4, y - 3 + f, x + 17 + f * 2, y + 1 + f * 1.5);
      ctx.stroke();
    }
    ctx.restore();

    // Lower body / skirt-armor — warm bronze
    ctx.fillStyle = '#7a6030';
    ctx.beginPath();
    ctx.moveTo(x - 4, y + 5);
    ctx.lineTo(x + 4, y + 5);
    ctx.lineTo(x + 3, y - 1);
    ctx.lineTo(x - 3, y - 1);
    ctx.closePath();
    ctx.fill();

    // Chest plate — Norse gold
    ctx.fillStyle = '#c8b060';
    ctx.beginPath();
    ctx.moveTo(x - 4.5, y - 1);
    ctx.lineTo(x + 4.5, y - 1);
    ctx.lineTo(x + 3.2, y - 7);
    ctx.lineTo(x - 3.2, y - 7);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,230,150,0.3)';
    ctx.beginPath();
    ctx.moveTo(x - 4.5, y - 1);
    ctx.lineTo(x - 0.5, y - 1);
    ctx.lineTo(x - 0.5, y - 7);
    ctx.lineTo(x - 3.2, y - 7);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(100,70,20,0.4)';
    ctx.lineWidth   = 0.5;
    ctx.beginPath();
    ctx.moveTo(x, y - 1); ctx.lineTo(x, y - 7);
    ctx.stroke();

    // Helmet — warm gold
    ctx.fillStyle = '#c0a840';
    ctx.beginPath();
    ctx.arc(x, y - 9.5, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,230,160,0.45)';
    ctx.beginPath();
    ctx.arc(x - 1.5, y - 10.5, 1.8, 0, Math.PI * 2);
    ctx.fill();
    // Nose guard
    ctx.fillStyle = '#806020';
    ctx.fillRect(x - 0.8, y - 11, 1.6, 3.5);
    // Horns — warm ivory
    ctx.fillStyle = '#e0d0b0';
    ctx.beginPath();
    ctx.moveTo(x - 3.5, y - 11);
    ctx.lineTo(x - 7, y - 16);
    ctx.lineTo(x - 1.8, y - 11.5);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 3.5, y - 11);
    ctx.lineTo(x + 7, y - 16);
    ctx.lineTo(x + 1.8, y - 11.5);
    ctx.closePath();
    ctx.fill();
    // Visor glow eyes — gold
    ctx.fillStyle   = '#f0c040';
    ctx.beginPath();
    ctx.ellipse(x - 1.8, y - 9.5, 1.3, 0.8, -0.15, 0, Math.PI * 2);
    ctx.ellipse(x + 1.8, y - 9.5, 1.3, 0.8,  0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Spear shaft
    const spearLen  = 18;
    const tipLen    = 6;
    const spearEndX = x + Math.cos(this.aimAngle) * spearLen;
    const spearEndY = y - 3 + Math.sin(this.aimAngle) * spearLen;
    const tipX      = spearEndX + Math.cos(this.aimAngle) * tipLen;
    const tipY      = spearEndY + Math.sin(this.aimAngle) * tipLen;
    const perpA     = this.aimAngle + Math.PI / 2;

    ctx.strokeStyle = '#8a6030';
    ctx.lineWidth   = 2;
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y - 3);
    ctx.lineTo(spearEndX, spearEndY);
    ctx.stroke();
    // Tip — warm iron
    ctx.fillStyle   = '#e8e0c0';
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(spearEndX + Math.cos(perpA) * 2.5, spearEndY + Math.sin(perpA) * 2.5);
    ctx.lineTo(spearEndX - Math.cos(perpA) * 2.5, spearEndY - Math.sin(perpA) * 2.5);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineCap = 'butt';
  }

  // ── Archer: Viking archer on stone watchtower ────────────────────────────────
  _drawMilitary(ctx, t) {
    const x = this.x, y = this.y;
    const glow = 0.6 + Math.sin(t * 3.5) * 0.4;

    // Ground shadow
    ctx.fillStyle = 'rgba(0,0,0,0.38)';
    ctx.beginPath();
    ctx.ellipse(x + 1, y + 9, 8, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    if (drawSpriteFrame(ctx, 'archer', heroAnimFrame(this, t), x, y, heroSpriteFacingAngle(this), 62, 'rgba(90,140,190,0.75)', this.level, heroWalkBob(this, t))) return;

    // Legs
    ctx.fillStyle = '#2e1008';
    ctx.fillRect(x - 3, y - 1, 2.5, 6);
    ctx.fillRect(x + 0.5, y - 1, 2.5, 6);
    // Boots with fur trim
    ctx.fillStyle = '#5a3010';
    ctx.fillRect(x - 3.5, y + 3, 3.2, 2.5);
    ctx.fillRect(x + 0.5, y + 3, 3.2, 2.5);
    ctx.fillStyle = '#c8b090';
    ctx.fillRect(x - 3.5, y + 3, 3.2, 1);
    ctx.fillRect(x + 0.5, y + 3, 3.2, 1);

    // Torso — leather jerkin
    ctx.fillStyle = '#7a4820';
    ctx.beginPath();
    ctx.moveTo(x - 5, y + 1);
    ctx.lineTo(x + 5, y + 1);
    ctx.lineTo(x + 4, y - 6);
    ctx.lineTo(x - 4, y - 6);
    ctx.closePath();
    ctx.fill();
    // Highlight left panel
    ctx.fillStyle = '#9a5828';
    ctx.beginPath();
    ctx.moveTo(x - 5, y + 1);
    ctx.lineTo(x - 1.5, y + 1);
    ctx.lineTo(x - 1.5, y - 6);
    ctx.lineTo(x - 4, y - 6);
    ctx.closePath();
    ctx.fill();
    // Belt + buckle
    ctx.fillStyle = '#1e0c06';
    ctx.fillRect(x - 5, y - 0.5, 10, 1.5);
    ctx.fillStyle = '#d0a030';
    ctx.fillRect(x - 0.8, y - 0.5, 1.8, 2);

    // Quiver on back (left)
    ctx.fillStyle = '#5a3010';
    ctx.fillRect(x - 7, y - 5, 2.2, 7);
    ctx.fillStyle = '#3a1808';
    ctx.fillRect(x - 7, y - 5, 2.2, 1.2);
    // Arrow shafts
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = '#8a5020';
      ctx.lineWidth   = 0.7;
      ctx.beginPath();
      ctx.moveTo(x - 6.6 + i * 0.7, y - 5);
      ctx.lineTo(x - 6.6 + i * 0.7, y - 2.5);
      ctx.stroke();
      ctx.fillStyle = '#cc3322';
      ctx.fillRect(x - 6.9 + i * 0.7, y - 6, 0.9, 1);
    }
    ctx.lineCap = 'butt';

    // Head
    ctx.fillStyle   = '#c8885a';
    ctx.beginPath();
    ctx.arc(x, y - 9.5, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    // Round helm (no horns — archer needs mobility)
    ctx.fillStyle = '#8898b0';
    ctx.beginPath();
    ctx.arc(x, y - 11.5, 4.2, 0, Math.PI, true);
    ctx.fill();
    ctx.fillStyle = '#a0b2c8';
    ctx.fillRect(x - 4.2, y - 11.5, 8.4, 1.5);
    ctx.fillStyle = '#8898b0';
    ctx.fillRect(x - 0.8, y - 11.5, 1.6, 4.2);
    // Blue warpaint
    ctx.fillStyle = '#4460a8';
    ctx.fillRect(x - 3.5, y - 10.5, 2.3, 1);
    ctx.fillRect(x + 1.2, y - 10.5, 2.3, 1);

    // Longbow (rotates toward aim target)
    ctx.save();
    ctx.translate(x + 3, y - 3);
    ctx.rotate(this.aimAngle);
    // Bow limb
    ctx.strokeStyle = '#6a3810';
    ctx.lineWidth   = 2;
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.moveTo(-2, -9);
    ctx.quadraticCurveTo(-8, 0, -2, 9);
    ctx.stroke();
    ctx.shadowBlur = 0;
    // Bowstring (slightly drawn back)
    ctx.strokeStyle = '#e0d0a0';
    ctx.lineWidth   = 0.7;
    ctx.beginPath();
    ctx.moveTo(-2, -9);
    ctx.lineTo(2, 0);
    ctx.lineTo(-2, 9);
    ctx.stroke();
    // Arrow nocked
    ctx.strokeStyle = '#8a5020';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(2, 0);
    ctx.stroke();
    // Arrowhead
    ctx.fillStyle   = '#c8c0a8';
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(10, -1.6);
    ctx.lineTo(10, 1.6);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    // Fletching
    ctx.fillStyle = '#cc3322';
    ctx.beginPath();
    ctx.moveTo(2.5, 0); ctx.lineTo(2.5, -2.8); ctx.lineTo(5, 0); ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(2.5, 0); ctx.lineTo(2.5, 2.8);  ctx.lineTo(5, 0); ctx.closePath(); ctx.fill();
    ctx.lineCap = 'butt';
    ctx.restore();
  }

  // ── Catapult: medieval trebuchet with swinging arm ───────────────────────────
  _drawCatapult(ctx, t) {
    const x = this.x, y = this.y;

    ctx.fillStyle = 'rgba(0,0,0,0.42)';
    ctx.beginPath();
    ctx.ellipse(x + 1, y + 9, 10, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    if (drawSpriteFrame(ctx, 'catapult', heroAnimFrame(this, t), x, y, heroSpriteFacingAngle(this), 68, 'rgba(200,130,30,0.85)', this.level, heroWalkBob(this, t))) return;

    const pulse  = 0.6 + Math.sin(t * 2.8) * 0.4;
    const swingOffset = this.fireFlash > 0 ? (this.fireFlash / (this.maxFireFlash || 6)) * 0.25 : 0;
    const armAng = this.aimAngle - Math.PI * 0.5 + swingOffset;

    // Wooden base platform
    ctx.fillStyle = '#5a3810';
    ctx.fillRect(x - 9, y + 4, 18, 5);
    ctx.fillStyle = '#6a4820';
    ctx.fillRect(x - 9, y + 4, 18, 1.5);
    ctx.fillStyle = '#3a2008';
    ctx.fillRect(x - 9, y + 8, 18, 1);

    // Wheels
    for (const wx of [x - 7, x + 4]) {
      ctx.fillStyle = '#3a2008';
      ctx.beginPath();
      ctx.arc(wx, y + 9, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#6a4820';
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.arc(wx, y + 9, 3.2, 0, Math.PI * 2);
      ctx.stroke();
      // Spokes
      for (let i = 0; i < 4; i++) {
        const a = t * 2 + (i / 4) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(wx, y + 9);
        ctx.lineTo(wx + Math.cos(a) * 3, y + 9 + Math.sin(a) * 3);
        ctx.stroke();
      }
    }

    // Frame uprights
    ctx.strokeStyle = '#5a3810';
    ctx.lineWidth   = 3;
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.moveTo(x - 4, y + 4); ctx.lineTo(x - 1, y - 5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 4, y + 4); ctx.lineTo(x + 1, y - 5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 1, y - 5); ctx.lineTo(x + 1, y - 5);
    ctx.stroke();
    ctx.lineCap = 'butt';

    // Pivot arm (rotating toward aim)
    ctx.save();
    ctx.translate(x, y - 2);
    ctx.rotate(armAng);
    ctx.strokeStyle = '#6a4010';
    ctx.lineWidth   = 2.5;
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.moveTo(-12, 0); ctx.lineTo(8, 0);
    ctx.stroke();
    // Counterweight
    ctx.fillStyle = '#3a2808';
    ctx.beginPath();
    ctx.arc(-12, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#555030';
    ctx.beginPath();
    ctx.arc(-12, 0, 2.5, 0, Math.PI * 2);
    ctx.fill();
    // Sling cup
    ctx.fillStyle = '#8a6030';
    ctx.beginPath();
    ctx.arc(10, 0, 2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle   = '#e8a030';
    ctx.beginPath();
    ctx.arc(10, 0, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineCap = 'butt';
    ctx.restore();
  }

  // ── Blondie: enchantress with floating hearts ─────────────────────────────────
  _drawBlondie(ctx, t) {
    const x = this.x, y = this.y;

    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(x + 1, y + 8, 8, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
    if (drawSpriteFrame(ctx, 'blondie', heroAnimFrame(this, t), x, y, heroSpriteFacingAngle(this), 64, 'rgba(255,110,200,0.9)', this.level, heroWalkBob(this, t))) return;

    const pulse = 0.55 + Math.sin(t * 2.5) * 0.45;
    const spin  = t * 1.6;

    // White marble column
    ctx.fillStyle = '#f0d8ec';
    ctx.beginPath();
    ctx.moveTo(x - 3.5, y + 5);
    ctx.lineTo(x + 3.5, y + 5);
    ctx.lineTo(x + 2.5, y - 2);
    ctx.lineTo(x - 2.5, y - 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f0e8d0';
    ctx.beginPath();
    ctx.moveTo(x - 3.5, y + 5);
    ctx.lineTo(x - 1, y + 5);
    ctx.lineTo(x - 0.5, y - 2);
    ctx.lineTo(x - 2.5, y - 2);
    ctx.closePath();
    ctx.fill();

    // Sparkle orbit
    for (let i = 0; i < 6; i++) {
      const a     = spin + (i / 6) * Math.PI * 2;
      const alpha = 0.4 + Math.sin(spin * 3 + i) * 0.3;
      ctx.fillStyle   = `rgba(255,130,200,${Math.max(0, alpha)})`;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * 8.5, y - 2 + Math.sin(a) * 4, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Hair (big blonde poof)
    ctx.fillStyle = '#f0c030';
    ctx.beginPath();
    ctx.arc(x, y - 8, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f8d850';
    ctx.beginPath();
    ctx.arc(x - 2, y - 9, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Face
    ctx.fillStyle = '#f5c8a0';
    ctx.beginPath();
    ctx.arc(x, y - 8, 4.2, 0, Math.PI * 2);
    ctx.fill();
    // Eyes
    ctx.fillStyle = '#3a1860';
    ctx.beginPath();
    ctx.ellipse(x - 1.8, y - 8.5, 1, 0.9, -0.1, 0, Math.PI * 2);
    ctx.ellipse(x + 1.8, y - 8.5, 1, 0.9,  0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#9050f0';
    ctx.beginPath();
    ctx.arc(x - 1.8, y - 8.5, 0.5, 0, Math.PI * 2);
    ctx.arc(x + 1.8, y - 8.5, 0.5, 0, Math.PI * 2);
    ctx.fill();
    // Smile
    ctx.strokeStyle = '#c87060';
    ctx.lineWidth   = 0.8;
    ctx.beginPath();
    ctx.arc(x, y - 7.2, 1.5, 0.2, Math.PI - 0.2);
    ctx.stroke();
    // Rosy cheeks
    ctx.fillStyle = 'rgba(255,150,150,0.35)';
    ctx.beginPath();
    ctx.ellipse(x - 3, y - 8, 1.5, 0.8, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 3, y - 8, 1.5, 0.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Floating heart above head
    const hy = y - 15 - Math.sin(t * 2.5) * 1.5;
    ctx.fillStyle   = this.color;
    ctx.beginPath();
    ctx.arc(x - 1.8, hy, 3, 0, Math.PI * 2);
    ctx.arc(x + 1.8, hy, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - 4.5, hy + 1);
    ctx.lineTo(x,       hy + 6);
    ctx.lineTo(x + 4.5, hy + 1);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,230,245,0.85)';
    ctx.beginPath();
    ctx.arc(x - 1.2, hy - 0.8, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Warden: stone watchtower with pierce crossbow ─────────────────────────────
  _drawPiltorn(ctx, t) {
    const x = this.x, y = this.y;

    ctx.fillStyle = 'rgba(0,0,0,0.40)';
    ctx.beginPath();
    ctx.ellipse(x, y + 9, 10, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    if (drawSpriteFrame(ctx, 'piltorn', heroAnimFrame(this, t), x, y, heroSpriteFacingAngle(this), 62, 'rgba(100,140,190,0.8)', this.level, heroWalkBob(this, t))) return;

    // Stone tower body
    ctx.fillStyle = '#4a3a2e';
    ctx.fillRect(x - 7, y + 1, 14, 8);
    ctx.fillStyle = 'rgba(200,170,120,0.18)';
    ctx.fillRect(x - 7, y + 1, 14, 1.5);
    // Mortar lines
    ctx.strokeStyle = 'rgba(0,0,0,0.20)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(x - 7, y + 4.5); ctx.lineTo(x + 7, y + 4.5);
    ctx.moveTo(x,     y + 1);   ctx.lineTo(x,     y + 4.5);
    ctx.moveTo(x - 3.5, y + 4.5); ctx.lineTo(x - 3.5, y + 9);
    ctx.moveTo(x + 3.5, y + 4.5); ctx.lineTo(x + 3.5, y + 9);
    ctx.stroke();

    // Crenellations
    ctx.fillStyle = '#5a4a3e';
    for (const mx of [-5.5, -2.0, 1.5, 4.8]) {
      ctx.fillRect(x + mx, y - 2, 2.4, 3.5);
    }
    ctx.fillStyle = '#3a2a1e';
    ctx.fillRect(x - 7, y + 1, 14, 1);

    // Dark arrow slit in tower front
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(x - 0.7, y + 2.5, 1.4, 4);

    // Archer torso peeking from battlements
    ctx.fillStyle = '#5a3818';
    ctx.fillRect(x - 3, y - 3.5, 6, 5.5);
    ctx.fillStyle = 'rgba(180,150,80,0.3)';
    ctx.fillRect(x - 3, y - 3.5, 6, 1.2);

    // Head
    ctx.fillStyle = '#c8885a';
    ctx.beginPath();
    ctx.arc(x, y - 7, 4, 0, Math.PI * 2);
    ctx.fill();
    // Iron coif
    ctx.fillStyle = '#7888a0';
    ctx.beginPath();
    ctx.arc(x, y - 8.5, 3.8, 0, Math.PI, true);
    ctx.fill();
    ctx.fillRect(x - 3.8, y - 8.5, 7.6, 1.5);
    ctx.fillStyle = '#687890';
    ctx.fillRect(x - 0.7, y - 8.5, 1.4, 3.8);

    // Heavy crossbow pointing toward aim
    const perpA = this.aimAngle + Math.PI / 2;
    const bx = x + Math.cos(this.aimAngle) * 3;
    const by = y - 4 + Math.sin(this.aimAngle) * 3;
    ctx.save();
    // Stock
    ctx.strokeStyle = '#4a2e0e';
    ctx.lineWidth   = 2.5;
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.moveTo(bx - Math.cos(this.aimAngle) * 3, by - Math.sin(this.aimAngle) * 3);
    ctx.lineTo(bx + Math.cos(this.aimAngle) * 10, by + Math.sin(this.aimAngle) * 10);
    ctx.stroke();
    // Prod (horizontal bow part)
    ctx.strokeStyle = '#3a2808';
    ctx.lineWidth   = 1.8;
    const prodX = bx + Math.cos(this.aimAngle) * 9;
    const prodY = by + Math.sin(this.aimAngle) * 9;
    ctx.beginPath();
    ctx.moveTo(prodX - Math.cos(perpA) * 6, prodY - Math.sin(perpA) * 6);
    ctx.lineTo(prodX + Math.cos(perpA) * 6, prodY + Math.sin(perpA) * 6);
    ctx.stroke();
    // String
    ctx.strokeStyle = 'rgba(210,190,150,0.75)';
    ctx.lineWidth   = 0.5;
    ctx.beginPath();
    ctx.moveTo(prodX - Math.cos(perpA) * 6, prodY - Math.sin(perpA) * 6);
    ctx.lineTo(bx + Math.cos(this.aimAngle) * 4, by + Math.sin(this.aimAngle) * 4);
    ctx.lineTo(prodX + Math.cos(perpA) * 6, prodY + Math.sin(perpA) * 6);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.lineCap = 'butt';
    ctx.restore();
  }

  // ── Hydda: healing hut with green rune cross ──────────────────────────────────
  _drawHydda(ctx, t) {
    const x = this.x, y = this.y;
    const pulse = 0.5 + Math.sin(t * 2.2) * 0.5;

    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(x, y + 9, 9, 2.3, 0, 0, Math.PI * 2);
    ctx.fill();
    if (drawSpriteFrame(ctx, 'hydda', heroAnimFrame(this, t), x, y, heroSpriteFacingAngle(this), 58, 'rgba(50,200,90,0.85)', this.level, heroWalkBob(this, t))) return;

    // Hut walls — weathered wood planks
    ctx.fillStyle = '#5a3818';
    ctx.fillRect(x - 7, y + 0, 14, 9);
    // Plank lines
    ctx.strokeStyle = 'rgba(20,8,2,0.35)';
    ctx.lineWidth   = 0.5;
    ctx.beginPath();
    for (let i = 1; i < 4; i++) {
      const yy = y + i * 2.5;
      ctx.moveTo(x - 7, yy); ctx.lineTo(x + 7, yy);
    }
    ctx.stroke();
    // Left highlight
    ctx.fillStyle = 'rgba(200,150,80,0.18)';
    ctx.fillRect(x - 7, y, 2, 9);

    // Hut wall outline
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth   = 0.8;
    ctx.strokeRect(x - 7, y + 0, 14, 9);

    // Thatched roof (triangle shape) — cold dark thatch, Norse style
    ctx.fillStyle = '#3a3028';
    ctx.beginPath();
    ctx.moveTo(x - 10, y + 1);
    ctx.lineTo(x,      y - 9);
    ctx.lineTo(x + 10, y + 1);
    ctx.closePath();
    ctx.fill();
    // Thatch lines
    ctx.strokeStyle = 'rgba(60,40,10,0.35)';
    ctx.lineWidth   = 0.6;
    ctx.lineCap     = 'round';
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const f  = i / 5;
      const yy = y + 1 - (y + 1 - (y - 9)) * f;
      const hw = 10 * (1 - f);
      ctx.moveTo(x - hw + 1, yy);
      ctx.lineTo(x + hw - 1, yy);
    }
    ctx.stroke();
    ctx.lineCap = 'butt';
    // Roof peak cap (ridge at apex)
    ctx.strokeStyle = '#5a4010';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.moveTo(x - 2, y - 8.5); ctx.lineTo(x + 2, y - 8.5);
    ctx.stroke();

    // Green rune cross on hut front — the healing symbol
    const crossCx = x, crossCy = y + 4;
    ctx.save();
    ctx.strokeStyle = `rgba(60,220,90,${0.75 + pulse * 0.25})`;
    ctx.lineWidth   = 2;
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.moveTo(crossCx, crossCy - 5); ctx.lineTo(crossCx, crossCy + 5);
    ctx.moveTo(crossCx - 4, crossCy); ctx.lineTo(crossCx + 4, crossCy);
    ctx.stroke();
    // Rune notches on arms
    ctx.lineWidth = 0.7;
    ctx.strokeStyle = `rgba(100,255,140,${0.5 + pulse * 0.4})`;
    ctx.beginPath();
    ctx.moveTo(crossCx - 1.5, crossCy - 3); ctx.lineTo(crossCx + 1.5, crossCy - 3);
    ctx.moveTo(crossCx - 1.5, crossCy + 3); ctx.lineTo(crossCx + 1.5, crossCy + 3);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.lineCap = 'butt';
    ctx.restore();

    // Ambient healing aura when on cooldown reset
    if (this.fireFlash > 0) {
      const ff = this.fireFlash / this.maxFireFlash;
      ctx.save();
      ctx.strokeStyle = `rgba(50,220,90,${ff * 0.6})`;
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      ctx.arc(x, y, (1 - ff) * 18 + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }

  // ── Isjätte: frost giant with AoE ice nova ────────────────────────────────────
  _drawIsjatten(ctx, t) {
    const x = this.x, y = this.y;
    const pulse = 0.5 + Math.sin(t * 1.8) * 0.5;

    ctx.fillStyle = 'rgba(0,0,0,0.38)';
    ctx.beginPath();
    ctx.ellipse(x, y + 10, 11, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();
    if (drawSpriteFrame(ctx, 'isjatten', heroAnimFrame(this, t), x, y, heroSpriteFacingAngle(this), 72, 'rgba(88,82,72,0.9)', this.level, heroWalkBob(this, t))) return;

    // Giant icy body — large crystalline form
    ctx.save();

    // Legs
    ctx.fillStyle = '#3a6080';
    ctx.fillRect(x - 5, y + 1, 4, 5);
    ctx.fillRect(x + 1, y + 1, 4, 5);
    // Ice shard knee guards
    ctx.fillStyle = '#80c8f0';
    ctx.beginPath();
    ctx.moveTo(x - 4, y + 2); ctx.lineTo(x - 1, y + 2); ctx.lineTo(x - 2.5, y); ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 2, y + 2); ctx.lineTo(x + 5, y + 2); ctx.lineTo(x + 3.5, y); ctx.closePath(); ctx.fill();

    // Torso — broad ice armour
    ctx.fillStyle = '#3a6888';
    ctx.beginPath();
    ctx.moveTo(x - 7, y + 2);
    ctx.lineTo(x + 7, y + 2);
    ctx.lineTo(x + 6, y - 6);
    ctx.lineTo(x - 6, y - 6);
    ctx.closePath();
    ctx.fill();
    // Chest highlight
    ctx.fillStyle = 'rgba(150,220,255,0.28)';
    ctx.beginPath();
    ctx.moveTo(x - 7, y + 2);
    ctx.lineTo(x - 2, y + 2);
    ctx.lineTo(x - 2, y - 6);
    ctx.lineTo(x - 6, y - 6);
    ctx.closePath();
    ctx.fill();
    // Ice shards on shoulders
    for (const [ox, dir] of [[-6.5, -1], [6.5, 1]]) {
      ctx.fillStyle = '#a0d8f8';
      ctx.beginPath();
      ctx.moveTo(x + ox, y - 5);
      ctx.lineTo(x + ox + dir * 4, y - 9);
      ctx.lineTo(x + ox + dir * 2, y - 5);
      ctx.closePath();
      ctx.fill();
    }

    // Head — angular icy helm
    ctx.fillStyle = '#2a5070';
    ctx.beginPath();
    ctx.arc(x, y - 9, 5, 0, Math.PI * 2);
    ctx.fill();
    // Ice crown spikes
    ctx.fillStyle = '#b0e8ff';
    for (let i = 0; i < 3; i++) {
      const a = -Math.PI / 2 + (i - 1) * 0.45;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * 4, y - 9 + Math.sin(a) * 4);
      ctx.lineTo(x + Math.cos(a) * 8.5, y - 9 + Math.sin(a) * 8.5);
      ctx.lineTo(x + Math.cos(a + 0.22) * 5, y - 9 + Math.sin(a + 0.22) * 5);
      ctx.closePath();
      ctx.fill();
    }
    // Glowing eyes
    ctx.fillStyle = `rgba(180,240,255,${0.7 + pulse * 0.3})`;
    ctx.beginPath();
    ctx.ellipse(x - 2, y - 9.5, 1.4, 0.9, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 2, y - 9.5, 1.4, 0.9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();

    // Orbiting ice shards (telegraphs the nova)
    const readyRatio = 1 - this.fireCooldown / this.fireRate;
    if (readyRatio > 0.5) {
      const orbAlpha = (readyRatio - 0.5) * 2;
      for (let i = 0; i < 4; i++) {
        const a  = t * 3.5 + (i / 4) * Math.PI * 2;
        const or = 12 + readyRatio * 8;
        const sx = x + Math.cos(a) * or;
        const sy = y - 2 + Math.sin(a) * or * 0.55;
        ctx.save();
        ctx.globalAlpha = orbAlpha * 0.8;
        ctx.fillStyle   = '#c0ecff';
        ctx.beginPath();
        ctx.moveTo(sx, sy - 3.5);
        ctx.lineTo(sx + 1.5, sy);
        ctx.lineTo(sx, sy + 3.5);
        ctx.lineTo(sx - 1.5, sy);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();
      }
    }

    // Nova burst ice shards on fire
    if (this.fireFlash > 0) {
      const br = this.fireFlash / (this.maxFireFlash || 8);
      ctx.save();
      ctx.strokeStyle = `rgba(160,230,255,${br * 0.8})`;
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const r1 = 8, r2 = 8 + (1 - br) * 22;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
        ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  // ── Drakship: Norse longship with dragon-head prow ────────────────────────────
  _drawDrakship(ctx, t) {
    const x = this.x, y = this.y;
    const pulse = 0.5 + Math.sin(t * 2.0) * 0.5;

    ctx.fillStyle = 'rgba(0,0,0,0.42)';
    ctx.beginPath();
    ctx.ellipse(x, y + 10, 12, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    if (drawSpriteFrame(ctx, 'drakship', heroAnimFrame(this, t), x, y, heroSpriteFacingAngle(this), 70, 'rgba(200,100,30,0.85)', this.level, heroWalkBob(this, t))) return;

    // Ship hull — rotates with aim direction
    ctx.save();
    ctx.translate(x, y - 1);
    ctx.rotate(this.aimAngle + Math.PI / 2);

    // Water below hull
    ctx.fillStyle = 'rgba(30,60,120,0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 4, 10, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hull body
    ctx.fillStyle = '#4a2808';
    ctx.beginPath();
    ctx.moveTo(-8, 8);
    ctx.bezierCurveTo(-9, 4, -9, -4, -5, -12);
    ctx.lineTo(5, -12);
    ctx.bezierCurveTo(9, -4, 9, 4, 8, 8);
    ctx.closePath();
    ctx.fill();
    // Hull planks highlight
    ctx.fillStyle = 'rgba(180,120,50,0.40)';
    ctx.beginPath();
    ctx.moveTo(-8, 8);
    ctx.bezierCurveTo(-9, 4, -9, -4, -5, -12);
    ctx.lineTo(-2, -12);
    ctx.bezierCurveTo(-4, -4, -4.5, 4, -4.5, 8);
    ctx.closePath();
    ctx.fill();
    // Inner deck
    ctx.fillStyle = '#5a3012';
    ctx.beginPath();
    ctx.moveTo(-6, 7);
    ctx.bezierCurveTo(-6.5, 3, -6.5, -3, -3.5, -11);
    ctx.lineTo(3.5, -11);
    ctx.bezierCurveTo(6.5, -3, 6.5, 3, 6, 7);
    ctx.closePath();
    ctx.fill();

    // Dragon head prow
    ctx.save();
    ctx.translate(0, -13);
    // Neck
    ctx.fillStyle = '#5a3018';
    ctx.fillRect(-2, 0, 4, 5);
    // Head body
    ctx.fillStyle = '#7a3a10';
    ctx.beginPath();
    ctx.moveTo(-4, 0);
    ctx.bezierCurveTo(-5, -3, -3, -6, 0, -7);
    ctx.bezierCurveTo(3, -6, 5, -3, 4, 0);
    ctx.closePath();
    ctx.fill();
    // Snout
    ctx.fillStyle = '#903818';
    ctx.beginPath();
    ctx.moveTo(-3, -3);
    ctx.lineTo(-7, -5);
    ctx.lineTo(-7, -3);
    ctx.lineTo(-3, -1.5);
    ctx.closePath();
    ctx.fill();
    // Dragon eye
    ctx.fillStyle = '#f0c030';
    ctx.beginPath();
    ctx.ellipse(1.5, -4, 1.5, 1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a0808';
    ctx.beginPath();
    ctx.arc(1.5, -4, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();

    // Shields along sides (3 per side)
    for (let i = 0; i < 3; i++) {
      const py = -6 + i * 5;
      for (const sx of [-9, 9]) {
        const shc = i % 2 === 0 ? '#a06820' : '#d8c060';
        ctx.fillStyle = '#2a1408';
        ctx.beginPath(); ctx.arc(sx, py, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = shc;
        ctx.beginPath(); ctx.arc(sx, py, 2.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#888070';
        ctx.beginPath(); ctx.arc(sx, py, 0.8, 0, Math.PI * 2); ctx.fill();
      }
    }

    // Sail (furled — darker roll)
    ctx.fillStyle = '#7a5828';
    ctx.fillRect(-3, -8, 6, 3);
    ctx.fillStyle = '#c09040';
    ctx.fillRect(-3, -8, 6, 1);

    ctx.restore();
  }

  _drawMine(ctx, t) {
    const x = this.x, y = this.y;
    const pulse = 0.7 + Math.sin(t * 1.8) * 0.10;
    ctx.save();
    ctx.translate(x, y);
    // Shaft entrance — dark rectangle
    ctx.fillStyle = '#3a2810';
    ctx.fillRect(-4, -3, 8, 7);
    // Timber frame
    ctx.strokeStyle = '#7a5828'; ctx.lineWidth = 1.2;
    ctx.strokeRect(-4, -3, 8, 7);
    // Horizontal beam
    ctx.beginPath(); ctx.moveTo(-5, -3); ctx.lineTo(5, -3); ctx.stroke();
    // Gold nugget glow
    ctx.globalAlpha = pulse * 0.85;
    ctx.fillStyle = '#d0a020';
    ctx.beginPath(); ctx.arc(0, 1, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    // Level indicator dots
    for (let i = 0; i < Math.min(this.level, 5); i++) {
      ctx.fillStyle = '#c8a030';
      ctx.beginPath(); ctx.arc(-4 + i * 2, -6, 1, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  _drawWatchtower(ctx, t) {
    const x = this.x, y = this.y;
    const pulse = 0.6 + Math.sin(t * 1.2) * 0.15;
    ctx.save();
    ctx.translate(x, y);
    // Tower body
    ctx.fillStyle = '#5a6880';
    ctx.fillRect(-3, -8, 6, 12);
    // Battlement
    ctx.fillStyle = '#6a7898';
    for (let i = -1; i <= 1; i += 1) {
      ctx.fillRect(i * 2 - 0.8, -11, 1.6, 3);
    }
    // Arrow slit window
    ctx.fillStyle = '#202830';
    ctx.fillRect(-0.6, -6, 1.2, 3);
    // Beacon flame at top
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#f0c040';
    ctx.beginPath(); ctx.arc(0, -12, 2, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = pulse * 0.4;
    ctx.fillStyle = '#ff8020';
    ctx.beginPath(); ctx.arc(0, -12, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // ── Ballista: heavy bolt-thrower on swiveling stone mount ────────────────────
  _drawBallista(ctx, t) {
    const x = this.x, y = this.y;
    const glow = 0.5 + Math.sin(t * 2.5) * 0.35;
    ctx.save();
    ctx.translate(x, y);
    // Stone mounting base
    ctx.fillStyle = '#4a3a2e';
    ctx.fillRect(-6, 0, 12, 8);
    ctx.fillStyle = 'rgba(160,130,70,0.15)';
    ctx.fillRect(-6, 0, 12, 1.5);
    ctx.fillStyle = '#3a2a1e';
    ctx.fillRect(-6, 7, 12, 1.5);
    // Ground shadow
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.beginPath();
    ctx.ellipse(0, 10, 8, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
    // Rotating assembly — forward = aimAngle
    ctx.save();
    ctx.translate(0, -2);
    ctx.rotate(this.aimAngle + Math.PI / 2);
    // Torsion bundle at pivot
    ctx.fillStyle = '#5a3818';
    ctx.fillRect(-2, -2, 4, 5);
    ctx.fillStyle = '#704028';
    ctx.fillRect(-2, -2, 1.5, 5);
    // Tiller (forward beam)
    ctx.strokeStyle = '#6a4020';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 3); ctx.lineTo(0, -14);
    ctx.stroke();
    ctx.shadowBlur = 0;
    // Cross-arms (bow limbs)
    ctx.strokeStyle = '#8a5028';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-11, -7); ctx.lineTo(11, -7);
    ctx.stroke();
    // Curved limb tips
    ctx.strokeStyle = '#6a3818';
    ctx.lineWidth = 2;
    for (const [tx, dir] of [[-11, -1], [11, 1]]) {
      ctx.beginPath();
      ctx.arc(tx, -7, 2.5, dir > 0 ? Math.PI / 2 : -Math.PI / 2, dir > 0 ? Math.PI * 1.5 : Math.PI / 2, dir < 0);
      ctx.stroke();
    }
    // Bowstring
    const stretchY = this.fireFlash > 0 ? -4 : -7;
    ctx.strokeStyle = 'rgba(215,185,110,0.9)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-11, -7); ctx.lineTo(0, stretchY); ctx.lineTo(11, -7);
    ctx.stroke();
    // Bolt on track
    ctx.fillStyle = '#c8b070';
    ctx.fillRect(-0.8, -14, 1.6, 7);
    ctx.fillStyle = '#e0d4a0';
    ctx.beginPath();
    ctx.moveTo(0, -16); ctx.lineTo(-2.2, -12.5); ctx.lineTo(2.2, -12.5); ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#b82818';
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(-1, stretchY + 1); ctx.lineTo(-4, stretchY + 4); ctx.lineTo(-1, stretchY + 3); ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(1, stretchY + 1); ctx.lineTo(4, stretchY + 4); ctx.lineTo(1, stretchY + 3); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.lineCap = 'butt';
    ctx.restore();
    ctx.restore();
  }

  // ── Rune Shrine: standing rune-stone generating star energy ──────────────────
  _drawRuneShrine(ctx, t) {
    const x = this.x, y = this.y;
    const pulse  = 0.5 + Math.sin(t * 1.5) * 0.5;
    const pulse2 = 0.5 + Math.sin(t * 1.5 + Math.PI * 0.7) * 0.5;
    ctx.save();
    ctx.translate(x, y);
    // Stone base
    ctx.fillStyle = '#3a3040';
    ctx.fillRect(-5, 3, 10, 5);
    ctx.fillStyle = 'rgba(80,60,140,0.20)';
    ctx.fillRect(-5, 3, 10, 1.5);
    // Main standing stone
    ctx.fillStyle = '#24203a';
    ctx.beginPath();
    ctx.roundRect(-4, -14, 8, 18, 1);
    ctx.fill();
    ctx.fillStyle = 'rgba(120,100,180,0.12)';
    ctx.beginPath();
    ctx.roundRect(-4, -14, 2, 18, 1);
    ctx.fill();
    // Carved glowing runes
    ctx.save();
    ctx.strokeStyle = `rgba(140,110,255,${0.65 + pulse * 0.35})`;
    ctx.lineWidth = 0.9;
    ctx.lineCap = 'round';
    // Hagalaz (H-cross)
    ctx.beginPath();
    ctx.moveTo(-2, -12); ctx.lineTo(-2, -9);
    ctx.moveTo(2, -12); ctx.lineTo(2, -9);
    ctx.moveTo(-2, -10.5); ctx.lineTo(2, -10.5);
    ctx.stroke();
    // Ingwaz (diamond)
    ctx.beginPath();
    ctx.moveTo(0, -8); ctx.lineTo(2.5, -6); ctx.lineTo(0, -4); ctx.lineTo(-2.5, -6); ctx.closePath();
    ctx.stroke();
    // Tiwaz (arrow-up)
    ctx.beginPath();
    ctx.moveTo(0, -3); ctx.lineTo(0, 0);
    ctx.moveTo(-2, -2); ctx.lineTo(0, -3); ctx.lineTo(2, -2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();
    // Glow halo
    const glowR = 5 + pulse * 3;
    const g = ctx.createRadialGradient(0, -6, 1, 0, -6, glowR + 5);
    g.addColorStop(0, `rgba(100,80,220,${0.30 + pulse * 0.20})`);
    g.addColorStop(1, 'rgba(80,60,180,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, -6, glowR + 6, glowR + 3, 0, 0, Math.PI * 2);
    ctx.fill();
    // Orbiting star particles
    for (let i = 0; i < 3; i++) {
      const a = t * 1.2 + (i / 3) * Math.PI * 2;
      const r = 6 + pulse * 2;
      ctx.fillStyle = `rgba(160,130,255,${0.35 + pulse2 * 0.4})`;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r, -6 + Math.sin(a) * r * 0.5, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
    // Wave tick counter dots (shows waves until next star)
    const spw = TOWER_DEFS[TOWER_TYPES.RUNESHRINE].starPerWaves ?? 4;
    for (let i = 0; i < spw; i++) {
      const filled = i < (this._waveTicks ?? 0);
      ctx.fillStyle = filled ? '#c0a0ff' : 'rgba(80,60,140,0.5)';
      ctx.beginPath();
      ctx.arc(-4 + i * 2.8, 6, 1.1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // ── Barracks: military training hall, reduces recruit cost ───────────────────
  _drawBarracks(ctx, t) {
    const x = this.x, y = this.y;
    const pulse = 0.6 + Math.sin(t * 1.8) * 0.2;
    ctx.save();
    ctx.translate(x, y);
    // Building body — wooden barracks
    ctx.fillStyle = '#4a3820';
    ctx.fillRect(-6, -4, 12, 12);
    // Plank horizontal lines
    ctx.strokeStyle = 'rgba(30,15,5,0.28)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let i = 1; i < 5; i++) {
      ctx.moveTo(-6, -4 + i * 2.5); ctx.lineTo(6, -4 + i * 2.5);
    }
    ctx.stroke();
    // Left-side highlight plank
    ctx.fillStyle = 'rgba(180,140,80,0.13)';
    ctx.fillRect(-6, -4, 2, 12);
    // Gabled roof
    ctx.fillStyle = '#303828';
    ctx.beginPath();
    ctx.moveTo(-8, -4); ctx.lineTo(0, -12); ctx.lineTo(8, -4); ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(100,120,80,0.18)';
    ctx.beginPath();
    ctx.moveTo(-8, -4); ctx.lineTo(0, -12); ctx.lineTo(-3, -4); ctx.closePath();
    ctx.fill();
    // Ridge cap
    ctx.strokeStyle = '#4a5830';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-1.5, -11); ctx.lineTo(1.5, -11);
    ctx.stroke();
    // Crossed spears (unit symbol on gable)
    ctx.save();
    ctx.strokeStyle = '#c8a030';
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-3.5, -8); ctx.lineTo(3.5, -14);
    ctx.moveTo(3.5, -8); ctx.lineTo(-3.5, -14);
    ctx.stroke();
    ctx.fillStyle = '#e0c060';
    ctx.beginPath();
    ctx.moveTo(-3.5, -14); ctx.lineTo(-4.8, -12.2); ctx.lineTo(-2.2, -12.2); ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(3.5, -14); ctx.lineTo(2.2, -12.2); ctx.lineTo(4.8, -12.2); ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
    // Door
    ctx.fillStyle = '#1e1008';
    ctx.fillRect(-2, 0, 4, 8);
    ctx.fillStyle = '#4a3010';
    ctx.fillRect(-1.5, 0.5, 1.5, 5);
    // Level indicator dots
    for (let i = 0; i < Math.min(this.level, 5); i++) {
      ctx.fillStyle = '#90c060';
      ctx.beginPath(); ctx.arc(-4 + i * 2, -7, 1, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
}

// Class-level rune multiplier — set by game.js each tick before update() calls
Tower.dmgMult = 1;
