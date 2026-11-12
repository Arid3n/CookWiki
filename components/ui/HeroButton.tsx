import { Pressable, StyleSheet } from 'react-native';
import { colors } from '@/lib/ui/theme';
import Icon, { IconName } from './Icon';

interface Props {
  icon: IconName;
  accessibilityLabel: string;
  onPress: () => void;
  disabled?: boolean;
  selected?: boolean;
}

/** Circular button for Hero headers (back, settings, pin). 36dp plus hitSlop 6 gives a 48dp target. */
export default function HeroButton({ icon, accessibilityLabel, onPress, disabled, selected }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={selected === undefined ? { disabled: !!disabled } : { disabled: !!disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [styles.btn, selected && styles.btnSelected, pressed && styles.press]}
    >
      <Icon name={icon} size={18} color={selected ? colors.gold : colors.onHero} />
    </Pressable>
  );
}

/** Row style for Hero headers: buttons sit at the top, 14dp below the status bar. */
export const heroRowStyle = {
  flexDirection: 'row',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  paddingHorizontal: 16,
  paddingTop: 14,
} as const;

export const HERO_BUTTON_SIZE = 36;

const styles = StyleSheet.create({
  press: { transform: [{ scale: 0.92 }], opacity: 0.8 },
  btnSelected: { backgroundColor: colors.onHero },
  btn: {
    width: HERO_BUTTON_SIZE, height: HERO_BUTTON_SIZE, borderRadius: HERO_BUTTON_SIZE / 2,
    alignItems: 'center', justifyContent: 'center', backgroundColor: colors.onHeroScrim,
  },
});
