import { Food } from './types';

/** Pinned first, then newest updatedAt first. Stable; returns a new array. */
export function sortFoods(foods: Food[]): Food[] {
  return foods
    .map((food, i) => ({ food, i }))
    .sort((a, b) => {
      if (a.food.pinned !== b.food.pinned) return a.food.pinned ? -1 : 1;
      const ta = Date.parse(a.food.updatedAt) || 0;
      const tb = Date.parse(b.food.updatedAt) || 0;
      return tb - ta || a.i - b.i;
    })
    .map((x) => x.food);
}
