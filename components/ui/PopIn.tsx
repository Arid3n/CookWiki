import { ReactNode, useEffect, useRef } from 'react';
import { Animated, Easing, StyleProp, ViewStyle } from 'react-native';
import { useReducedMotion } from '@/lib/ui/useReducedMotion';

interface Props {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  delay?: number;
  accessibilityLiveRegion?: 'none' | 'polite' | 'assertive';
}

/** Settles in with a small scale-up and fade (native-driven). Used for "saved" confirmations. */
export default function PopIn({ children, style, delay = 0, accessibilityLiveRegion }: Props) {
  const reduce = useReducedMotion();
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduce) {
      progress.setValue(1);
      return;
    }
    Animated.timing(progress, { toValue: 1, duration: 240, delay, easing: Easing.out(Easing.back(1.6)), useNativeDriver: true }).start();
  }, [progress, reduce, delay]);
  return (
    <Animated.View
      accessibilityLiveRegion={accessibilityLiveRegion}
      style={[style, { opacity: progress.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 1, 1] }), transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }] }]}
    >
      {children}
    </Animated.View>
  );
}
