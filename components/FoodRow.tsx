import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { defaultVariant } from '@/lib/library/search';
import { Food } from '@/lib/library/types';

const MAX_TAGS = 3;

function macroLine(food: Food): string {
  if (food.variants.length === 0) return 'No nutrition data';
  const v = defaultVariant(food);
  const kcal =
    v.kcalMin !== undefined && v.kcalMax !== undefined
      ? `${Math.round(v.kcalMin)}–${Math.round(v.kcalMax)} kcal`
      : `${Math.round(v.kcal)} kcal`;
  return `${kcal} · P ${Math.round(v.protein)} · C ${Math.round(v.carbs)} · F ${Math.round(v.fat)} per 100 g`;
}

export default function FoodRow({ food, onPress }: { food: Food; onPress: (id: string) => void }) {
  const shown = food.tags.slice(0, MAX_TAGS);
  const extra = food.tags.length - shown.length;
  const line = macroLine(food);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${food.name}${food.pinned ? ', pinned' : ''}. ${line}`}
      onPress={() => onPress(food.id)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.titleRow}>
        <Text style={styles.name} numberOfLines={1}>{food.name}</Text>
        {food.pinned && <Ionicons name="pin" size={16} color="#10B981" accessibilityLabel="Pinned" />}
      </View>
      <Text style={styles.macros}>{line}</Text>
      {shown.length > 0 && (
        <View style={styles.tags}>
          {shown.map((t) => (
            <View key={t} style={styles.chip}><Text style={styles.chipText}>{t}</Text></View>
          ))}
          {extra > 0 && <View style={styles.chip}><Text style={styles.chipText}>+{extra}</Text></View>}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 44,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  pressed: { opacity: 0.8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { flex: 1, color: '#F1F5F9', fontSize: 16, fontWeight: '600' },
  macros: { color: '#94A3B8', fontSize: 13, marginTop: 4 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  chip: { backgroundColor: '#0F172A', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  chipText: { color: '#94A3B8', fontSize: 12 },
});
