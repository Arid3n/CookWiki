import { ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/lib/ui/theme';
import TopoPattern from './TopoPattern';

const WAVE = 'M0 26C38 -2 78 2 126 24S214 46 260 12V40H0Z';
const WAVE_HEIGHT = 34;

interface Props {
  /** Height below the status bar; the top safe-area inset is added on top. */
  height: number;
  seed: number;
  children?: ReactNode;
}

/** Burnt-orange header with contour lines and a wavy bottom edge into the page background. */
export default function Hero({ height, seed, children }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const total = height + insets.top;
  return (
    <View style={[styles.hero, { height: total, paddingTop: insets.top }]}>
      <TopoPattern seed={seed} width={width} height={total} />
      <Svg
        style={styles.wave}
        width={width}
        height={WAVE_HEIGHT}
        viewBox="0 0 260 40"
        preserveAspectRatio="none"
        pointerEvents="none"
      >
        <Path d={WAVE} fill={colors.bg} />
      </Svg>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.hero, overflow: 'hidden' },
  wave: { position: 'absolute', left: 0, right: 0, bottom: -1, height: WAVE_HEIGHT },
});
