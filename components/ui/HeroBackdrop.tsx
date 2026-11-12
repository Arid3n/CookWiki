import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, useWindowDimensions } from 'react-native';
import { usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HERO_MAX_HEIGHT, heroHeightFor } from '@/lib/ui/heroLayout';
import { colors, shape } from '@/lib/ui/theme';
import { useReducedMotion } from '@/lib/ui/useReducedMotion';
import TopoPattern from './TopoPattern';

/** Scroll offset of the current screen's content; a screen whose header scrolls with its content feeds this. */
export const heroScrollY = new Animated.Value(0);

/**
 * The orange header, drawn once behind every screen. Screens render transparent and only lay out their own
 * header content over it, so page changes swap content while this background stays put. Its height eases
 * between routes; the contour pattern is drawn at full height and merely revealed, so it never moves or rescales.
 */
export default function HeroBackdrop() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  // The calculator is a modal over the current screen: keep the header it covers as it is.
  const lastRoute = useRef(pathname);
  if (pathname !== '/calculator') lastRoute.current = pathname;
  const target = heroHeightFor(lastRoute.current) + insets.top;
  const height = useRef(new Animated.Value(target)).current;

  useEffect(() => {
    Animated.timing(height, { toValue: target, duration: reduceMotion ? 0 : 220, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [height, target, reduceMotion]);

  return (
    // Two layers: the native-driven scroll translation cannot share a node with the JS-driven height.
    <Animated.View pointerEvents="none" style={[styles.layer, { transform: [{ translateY: Animated.multiply(heroScrollY, -1) }] }]}>
      <Animated.View style={[styles.hero, { height }]}>
        <TopoPattern seed={2} width={width} height={HERO_MAX_HEIGHT + insets.top} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', top: 0, left: 0, right: 0 },
  hero: {
    overflow: 'hidden',
    backgroundColor: colors.hero, borderBottomLeftRadius: shape.xl, borderBottomRightRadius: shape.xl,
  },
});
