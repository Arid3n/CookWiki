import { useSharedValue, useDerivedValue } from 'react-native-reanimated';
import { scaleMacros, Macros } from '@/lib/algorithms/macros';

export function useMacroSlider(initialMacros: Macros) {
  // Global unbounded tracking numeric capturing real-time hardware touch locations physically
  const targetCalories = useSharedValue(initialMacros.calories);

  // Natively bounded derivative looping purely over the Worklet layer to execute algorithm macros 120 times/sec
  const dynamicMacros = useDerivedValue(() => {
    return scaleMacros(initialMacros, targetCalories.value);
  }, [initialMacros]);

  return { targetCalories, dynamicMacros };
}
