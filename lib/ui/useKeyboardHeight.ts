import { useEffect, useRef, useState } from 'react';
import { Animated, Keyboard, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Current keyboard height in dp; 0 when hidden. Resets on every hide event. */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const ios = Platform.OS === 'ios';
    const show = Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', (e) =>
      setHeight(e.endCoordinates.height),
    );
    const hide = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return height;
}

/**
 * Lifts a bottom-anchored element clear of the keyboard. The element must rest `insets.bottom` above the
 * screen edge (the safe-area padding), so it moves up by the keyboard height minus that inset. Apply `style`
 * to the view that should move. The move is animated with the native driver.
 */
export function keyboardClearance(keyboard: number, insetBottom: number): number {
  if (keyboard <= 0) return 0;
  // Android (edge-to-edge) reports a height that does not include the bottom inset, so nothing is subtracted there.
  return Platform.OS === 'ios' ? Math.max(0, keyboard - insetBottom) : keyboard;
}

export function useKeyboardLift() {
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardHeight();
  const lift = useRef(new Animated.Value(0)).current;
  const target = -keyboardClearance(keyboard, insets.bottom);

  useEffect(() => {
    Animated.timing(lift, { toValue: target, duration: 160, useNativeDriver: true }).start();
  }, [lift, target]);

  return { style: { transform: [{ translateY: lift }] } };
}
