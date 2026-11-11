import { calculateServingRatio } from './serving';

export interface Macros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

/**
 * Pure function: cleanly scales all macros by the ratio of targetCalories to baseCalories.
 * Uses the 'worklet' directive so Reanimated's UI thread compiler permits its execution directly.
 */
export function scaleMacros(baseMacros: Macros, targetCalories: number): Macros {
  'worklet';
  const ratio = calculateServingRatio(baseMacros.calories, targetCalories);
  return {
    calories: targetCalories,
    protein: Math.round(baseMacros.protein * ratio),
    carbs: Math.round(baseMacros.carbs * ratio),
    fat: Math.round(baseMacros.fat * ratio),
  };
}
