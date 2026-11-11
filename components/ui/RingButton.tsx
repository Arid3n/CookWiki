import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Path, Text as SvgText, TextPath } from 'react-native-svg';
import { colors, fonts } from '@/lib/ui/theme';
import Icon, { IconName } from './Icon';
import { RING_LABELS, ringCircle, ringLayout } from './ringText';

type Kind = keyof typeof RING_LABELS;

interface Props {
  kind: Kind;
  size: number;
  onPress: () => void;
  icon: IconName;
  disabled?: boolean;
  accessibilityLabel: string;
}

/** Dark round button with gold text running round the edge and a rust icon in the middle. */
export default function RingButton({ kind, size, onPress, icon, disabled, accessibilityLabel }: Props) {
  const layout = useMemo(() => ringLayout(kind), [kind]);
  const pathId = `ring-${kind}`;
  // Icon about a third of the button, heavier stroke as in the mockup.
  const iconSize = Math.round(size * 0.36);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={size < 48 ? (48 - size) / 2 : undefined}
      style={({ pressed }) => [
        styles.btn,
        { width: size, height: size, borderRadius: size / 2 },
        (pressed || disabled) && styles.dim,
      ]}
    >
      <Svg style={StyleSheet.absoluteFill} width={size} height={size} viewBox="0 0 100 100" pointerEvents="none">
        <Defs>
          <Path id={pathId} d={ringCircle(100)} />
        </Defs>
        <Circle cx="50" cy="50" r="49.2" fill="none" stroke={colors.ringEdge} strokeWidth={100 / size} />
        {/* One text per repeat, centred between two dots; letterSpacing stands in for textLength. */}
        {layout.words.map((w, i) => (
          <SvgText
            key={i}
            fill={colors.gold}
            fontFamily={fonts.bodyBold}
            fontSize={layout.fontSize}
            letterSpacing={w.letterSpacing}
            textAnchor="middle"
          >
            <TextPath href={`#${pathId}`} startOffset={w.startOffset}>
              {w.text}
            </TextPath>
          </SvgText>
        ))}
        {layout.dots.map((d, i) => (
          <Circle key={i} cx={d.x} cy={d.y} r={1.6} fill={colors.gold} />
        ))}
      </Svg>
      <View pointerEvents="none">
        <Icon name={icon} size={iconSize} color={colors.rust} strokeWidth={2.4} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { backgroundColor: colors.ringFill, alignItems: 'center', justifyContent: 'center' },
  dim: { opacity: 0.6 },
});
