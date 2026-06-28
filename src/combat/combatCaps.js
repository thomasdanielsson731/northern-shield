/** Combat visual array caps — frame budget under dense waves. */

export const MAX_DMG_FLOATERS = 80;

export function trimDmgFloaters(floaters, max = MAX_DMG_FLOATERS) {
  if (!Array.isArray(floaters) || floaters.length <= max) return;
  floaters.splice(0, floaters.length - max);
}
