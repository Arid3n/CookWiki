import { Macros } from './types';

export function parseGrams(input: string): number | null {
  const s = input.trim().replace(',', '.');
  if (!/^\d*\.?\d+$|^\d+\.$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

const OPTIONAL = ['satFat', 'sugar', 'fiber', 'sodiumMg'] as const;

/** Macros are per 100 g; returns macros for `grams`, or null if grams is invalid. */
export function scalePortion(m: Macros, grams: number | string): Macros | null {
  const g = typeof grams === 'string' ? parseGrams(grams) : grams;
  if (g === null || !Number.isFinite(g) || g <= 0) return null;
  const k = g / 100;
  const out: Macros = {
    kcal: round1(m.kcal * k),
    protein: round1(m.protein * k),
    carbs: round1(m.carbs * k),
    fat: round1(m.fat * k),
  };
  for (const key of OPTIONAL) {
    const val = m[key];
    if (val !== undefined) out[key] = round1(val * k);
  }
  return out;
}
