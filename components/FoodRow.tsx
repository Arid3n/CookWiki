import { Pressable, StyleSheet, Text, View } from 'react-native';
import Icon from '@/components/ui/Icon';
import { kcalLabel } from '@/lib/library/kcalLabel';
import { Food } from '@/lib/library/types';
import { colors, fonts, sizes, space } from '@/lib/ui/theme';

/** Fixed-height list card: name (one line, ellipsized) and kcal per 100 g in the type colour. */
export default function FoodRow({ food, onPress }: { food: Food; onPress: (id: string) => void }) {
  const tint = food.kind === 'dish' ? colors.peach : colors.sage;
  const kcal = kcalLabel(food);
  const kcalSpoken = food.variants.length === 0 ? 'No nutrition data' : `${kcal} kcal per 100 g`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${food.name}${food.pinned ? ', pinned' : ''}. ${kcalSpoken}`}
      onPress={() => onPress(food.id)}
      style={({ pressed }) => [styles.row, { borderLeftColor: tint }, pressed && styles.pressed]}
    >
      <View style={styles.nameWrap}>
        {food.pinned && <Icon name="pin" size={14} color={colors.peach} />}
        <Text style={styles.name} numberOfLines={1}>{food.name}</Text>
      </View>
      <Text style={[styles.kcal, { color: tint }]} numberOfLines={1}>{kcal}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    height: sizes.card,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderLeftWidth: 3,
    paddingHorizontal: space.gutter,
    marginBottom: 8,
  },
  pressed: { opacity: 0.8 },
  nameWrap: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { flex: 1, minWidth: 0, color: colors.text, fontFamily: fonts.name, fontSize: 16 },
  kcal: { flexShrink: 0, textAlign: 'right', fontFamily: fonts.heading, fontSize: 18 },
});
