import { StyleSheet, Text, View } from 'react-native';
import { Macros } from '@/lib/library/types';
import { colors, fonts } from '@/lib/ui/theme';

const fmt = (n: number) => String(Math.round(n * 10) / 10);

/**
 * Protein / carbs / fat as three tiles (gold, sage, peach), then optional nutrients as small
 * lines when present. Calories are not shown here: screens show kcal on their own.
 */
export default function MacroLines({ m }: { m: Macros }) {
  const tiles: [string, number, string][] = [
    ['Protein', m.protein, colors.gold],
    ['Carbs', m.carbs, colors.sage],
    ['Fat', m.fat, colors.peach],
  ];
  const extra: [string, string][] = [];
  if (m.satFat !== undefined) extra.push(['Saturated fat', `${fmt(m.satFat)} g`]);
  if (m.sugar !== undefined) extra.push(['Sugar', `${fmt(m.sugar)} g`]);
  if (m.fiber !== undefined) extra.push(['Fiber', `${fmt(m.fiber)} g`]);
  if (m.sodiumMg !== undefined) extra.push(['Sodium', `${fmt(m.sodiumMg)} mg`]);
  return (
    <View>
      <View style={styles.tiles}>
        {tiles.map(([label, value, tint]) => (
          <View
            key={label}
            style={[styles.tile, { borderBottomColor: tint }]}
            accessible
            accessibilityLabel={`${label} ${fmt(value)} g`}
          >
            <Text style={[styles.value, { color: tint }]} numberOfLines={1} adjustsFontSizeToFit>
              {fmt(value)} g
            </Text>
            <Text style={styles.tileLabel}>{label}</Text>
          </View>
        ))}
      </View>
      {extra.map(([label, value]) => (
        <View key={label} style={styles.row} accessible accessibilityLabel={`${label} ${value}`}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.rowValue}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', gap: 8 },
  tile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 18,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderBottomWidth: 3,
  },
  value: { fontFamily: fonts.heading, fontSize: 20 },
  tileLabel: { color: colors.sub, fontFamily: fonts.body, fontSize: 12, marginTop: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, marginTop: 4 },
  label: { color: colors.sub, fontFamily: fonts.body, fontSize: 14 },
  rowValue: { color: colors.text, fontFamily: fonts.bodyBold, fontSize: 14 },
});
