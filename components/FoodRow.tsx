import { memo, useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from '@/components/ui/Icon';
import { kcalLabel } from '@/lib/library/kcalLabel';
import { Food } from '@/lib/library/types';
import { colors, fonts, shape, sizes, space } from '@/lib/ui/theme';

/** Minimum-height list card (grows with large system text): name (one line, ellipsized) and kcal per 100 g in the type colour. */
function FoodRow({ food, onPress, enterDelay }: { food: Food; onPress: (id: string) => void; enterDelay?: number }) {
  // enterDelay is set only for the first rows when the list first appears; later rows mount without animating.
  const enter = useRef(new Animated.Value(enterDelay === undefined ? 1 : 0)).current;
  useEffect(() => {
    if (enterDelay === undefined) return;
    Animated.timing(enter, { toValue: 1, duration: 260, delay: enterDelay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [enter, enterDelay]);
  const tint = food.kind === 'dish' ? colors.accent : colors.sage;
  const kcal = kcalLabel(food);
  const kcalSpoken = food.variants.length === 0 ? 'No nutrition data' : `${kcal} kcal per 100 g`;
  return (
    <Animated.View style={{ opacity: enter, transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }}>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${food.name}${food.pinned ? ', pinned' : ''}. ${kcalSpoken}`}
      onPress={() => onPress(food.id)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={[styles.lead, { backgroundColor: food.kind === 'dish' ? colors.accentContainer : colors.sageContainer }]}>
        <Icon name={food.kind === 'dish' ? 'cloche' : 'cutlery'} size={22} color={tint} />
      </View>
      <View style={styles.nameWrap}>
        {food.pinned && <Icon name="pin" size={14} color={colors.accent} />}
        <Text style={styles.name} numberOfLines={1}>{food.name}</Text>
      </View>
      <Text style={[styles.kcal, { color: tint }]} numberOfLines={1}>{kcal}</Text>
    </Pressable>
    </Animated.View>
  );
}

export default memo(FoodRow);

const styles = StyleSheet.create({
  row: {
    minHeight: sizes.card,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: shape.lg,
    paddingLeft: 10,
    paddingRight: space.gutter,
    marginBottom: 8,
  },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  lead: { width: 40, height: 40, borderRadius: shape.md, alignItems: 'center', justifyContent: 'center' },
  nameWrap: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { flex: 1, minWidth: 0, color: colors.text, fontFamily: fonts.name, fontSize: 17 },
  kcal: { flexShrink: 0, textAlign: 'right', fontFamily: fonts.heading, fontSize: 28, lineHeight: 32 },
});
