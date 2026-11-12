import { useEffect, useRef } from 'react';
import { Animated, Easing, TextProps } from 'react-native';
import { useReducedMotion } from '@/lib/ui/useReducedMotion';

/** Header title that rises into place when its screen appears, while the pistachio header itself stays still. */
export default function HeroTitle({ style, ...rest }: TextProps) {
  const reduce = useReducedMotion();
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduce) {
      progress.setValue(1);
      return;
    }
    Animated.timing(progress, { toValue: 1, duration: 260, delay: 60, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [progress, reduce]);
  return (
    <Animated.Text
      {...rest}
      style={[style, { opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }]}
    />
  );
}
