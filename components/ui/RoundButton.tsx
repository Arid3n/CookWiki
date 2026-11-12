import { Pressable, StyleSheet } from 'react-native';
import { colors, shape } from '@/lib/ui/theme';
import Icon, { IconName } from './Icon';

interface Props {
  size: number;
  onPress: () => void;
  icon: IconName;
  disabled?: boolean;
  accessibilityLabel: string;
}

/** Rounded-rectangle button: accent container, dark icon. */
export default function RoundButton({ size, onPress, icon, disabled, accessibilityLabel }: Props) {
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
        { width: size, height: size, borderRadius: shape.lg },
        (pressed || disabled) && styles.dim,
        pressed && styles.press,
      ]}
    >
      <Icon name={icon} size={Math.round(size * 0.44)} color={colors.ink} strokeWidth={2.2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dim: { opacity: 0.6 },
  press: { transform: [{ scale: 0.94 }] },
});
