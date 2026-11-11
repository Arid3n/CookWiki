import { normalizeName } from './duplicates';
import { Food, SearchFilters, Variant } from './types';

export function defaultVariant(food: Food): Variant {
  if (food.variants.length === 0) {
    throw new Error(`Food "${food.name}" (${food.id}) has no variants`);
  }
  return food.variants.find((v) => v.isDefault) ?? food.variants[0];
}

function matches(food: Food, f: SearchFilters): boolean {
  if (f.kind && food.kind !== f.kind) return false;

  if (f.tags && f.tags.length > 0) {
    const have = food.tags.map(normalizeName);
    if (!f.tags.every((t) => have.includes(normalizeName(t)))) return false;
  }

  if (f.text) {
    const tokens = normalizeName(f.text).split(' ').filter(Boolean);
    const hay = [food.name, ...food.tags].map(normalizeName);
    if (!tokens.every((tk) => hay.some((h) => h.includes(tk)))) return false;
  }

  const numeric =
    f.maxKcal !== undefined || f.minProtein !== undefined ||
    f.maxCarbs !== undefined || f.maxFat !== undefined;
  if (numeric) {
    if (food.variants.length === 0) return false;
    const v = defaultVariant(food);
    if (f.maxKcal !== undefined && !(v.kcal <= f.maxKcal)) return false;
    if (f.minProtein !== undefined && !(v.protein >= f.minProtein)) return false;
    if (f.maxCarbs !== undefined && !(v.carbs <= f.maxCarbs)) return false;
    if (f.maxFat !== undefined && !(v.fat <= f.maxFat)) return false;
  }
  return true;
}

/** Filters, then stable-sorts pinned foods first. */
export function applyFilters(foods: Food[], f: SearchFilters): Food[] {
  const kept = foods.filter((food) => matches(food, f));
  return [...kept.filter((x) => x.pinned), ...kept.filter((x) => !x.pinned)];
}
