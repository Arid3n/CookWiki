import { defaultVariant } from './search';
import { Food } from './types';

/** Kcal per 100 g of the default variant: "96", "80–120" for a range, "—" with no variants. */
export function kcalLabel(food: Food): string {
  if (food.variants.length === 0) return '—';
  const v = defaultVariant(food);
  if (v.kcalMin !== undefined && v.kcalMax !== undefined) {
    return `${Math.round(v.kcalMin)}–${Math.round(v.kcalMax)}`;
  }
  return String(Math.round(v.kcal));
}
