import { ITEM_DEFS, getItemBonuses } from './items.js';
import { getTalentBonuses } from './talents.js';

export const MAX_EQUIPMENT_INVENTORY = 60;

export function defenderHasRuneSocket(def) {
  if (!def?.equipment) return false;
  return def.equipment.some(iid => iid && ITEM_DEFS[iid]?.runeSlot);
}

export function buildEquipmentBonuses(def, armoryEquipDmMult = 1) {
  const equipment = def?.equipment ?? [];
  const raw = getItemBonuses(equipment);
  const hasEquip = equipment.some(Boolean);
  const mult = armoryEquipDmMult ?? 1;
  if (!hasEquip || mult === 1) return raw;
  return { dm: raw.dm * mult, rm: raw.rm, cm: raw.cm };
}

export function buildDefenderBonuses(def, armoryEquipDmMult = 1) {
  return {
    equipment: buildEquipmentBonuses(def, armoryEquipDmMult),
    talents: getTalentBonuses(def?.talents ?? []),
  };
}

/** Reapply roster equipment/talents on a live field tower. Returns socketed item rune to stash if invalid. */
export function syncTowerDefenderGear(tower, def, { armoryEquipDmMult = 1 } = {}) {
  if (!tower || !def) return { returnedItemRune: null };

  let returnedItemRune = null;
  if (tower.itemRune && !defenderHasRuneSocket(def)) {
    returnedItemRune = tower.itemRune;
    tower.itemRune = null;
  }

  const { equipment, talents } = buildDefenderBonuses(def, armoryEquipDmMult);
  const hasEquip = def.equipment?.some(Boolean);
  const hasBonus = def.careerLevel > 0 || hasEquip || def.talents?.length > 0 || !!def.legacyBonus;

  if (hasBonus) {
    tower.applyCareerData(
      def.defenderId,
      def.name,
      def.careerLevel,
      equipment,
      talents,
      def.legacyBonus ?? null,
    );
  } else {
    tower.defenderId = def.defenderId;
    tower.name = def.name;
    tower._applyLevel();
  }

  if (tower.rune) tower.setRune(tower.rune);
  if (tower.itemRune) tower.setItemRune(tower.itemRune);

  return { returnedItemRune };
}

export function canAddEquipment(inventory, addCount = 1) {
  return (inventory?.length ?? 0) + addCount <= MAX_EQUIPMENT_INVENTORY;
}
