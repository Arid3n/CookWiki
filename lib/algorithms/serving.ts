/**
 * Pure function: calculates serving ratio strictly based on target / current.
 * Uses the 'worklet' directive so Reanimated's UI thread compiler permits its execution directly.
 */
export function calculateServingRatio(currentCalories: number, targetCalories: number): number {
  'worklet';
  if (currentCalories <= 0) return 0;
  return targetCalories / currentCalories;
}
