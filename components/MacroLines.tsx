import { StyleSheet, Text, View } from 'react-native';
import { Macros } from '@/lib/library/types';

const fmt = (n: number) => String(Math.round(n * 10) / 10);

/** Rows of label/value for macros; optional nutrients only when present. */
export default function MacroLines({ m }: { m: Macros }) {
  const rows: [string, string][] = [
    ['Calories', `${fmt(m.kcal)} kcal`],
    ['Protein', `${fmt(m.protein)} g`],
    ['Carbs', `${fmt(m.carbs)} g`],
    ['Fat', `${fmt(m.fat)} g`],
  ];
  if (m.satFat !== undefined) rows.push(['Saturated fat', `${fmt(m.satFat)} g`]);
  if (m.sugar !== undefined) rows.push(['Sugar', `${fmt(m.sugar)} g`]);
  if (m.fiber !== undefined) rows.push(['Fiber', `${fmt(m.fiber)} g`]);
  if (m.sodiumMg !== undefined) rows.push(['Sodium', `${fmt(m.sodiumMg)} mg`]);
  return (
    <View>
      {rows.map(([label, value]) => (
        <View key={label} style={styles.row} accessible accessibilityLabel={`${label} ${value}`}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.value}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  label: { color: '#94A3B8', fontSize: 15 },
  value: { color: '#F1F5F9', fontSize: 15, fontWeight: '600' },
});
