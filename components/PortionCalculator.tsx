import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { parseGrams, scalePortion } from '@/lib/library/portion';
import { Macros } from '@/lib/library/types';
import { colors, fonts, space } from '@/lib/ui/theme';

const fmt = (n: number) => String(Math.round(n * 10) / 10);

/** Grams input with live scaled result. Input is local state, never persisted. */
export default function PortionCalculator({ macros }: { macros: Macros }) {
  const [text, setText] = useState('');
  const grams = parseGrams(text);
  const result = grams === null ? null : scalePortion(macros, grams);
  const extra: string[] = [];
  if (result) {
    if (result.satFat !== undefined) extra.push(`Sat. fat ${fmt(result.satFat)} g`);
    if (result.sugar !== undefined) extra.push(`Sugar ${fmt(result.sugar)} g`);
    if (result.fiber !== undefined) extra.push(`Fiber ${fmt(result.fiber)} g`);
    if (result.sodiumMg !== undefined) extra.push(`Sodium ${fmt(result.sodiumMg)} mg`);
  }
  return (
    <View style={styles.box}>
      <View style={styles.inputBox}>
        <TextInput
          accessibilityLabel="Portion in grams"
          style={styles.input}
          value={text}
          onChangeText={setText}
          keyboardType="decimal-pad"
          placeholder="180"
          placeholderTextColor={colors.sub}
        />
        <Text style={styles.unit}>g</Text>
      </View>
      <View style={styles.result} accessibilityLiveRegion="polite">
        <Text style={styles.label} accessibilityRole="header">Your portion</Text>
        {result ? (
          <>
            <Text style={styles.kcal}>{fmt(result.kcal)} kcal</Text>
            <Text style={styles.macros}>
              P {fmt(result.protein)} · C {fmt(result.carbs)} · F {fmt(result.fat)}
            </Text>
            {extra.length > 0 && <Text style={styles.macros}>{extra.join(' · ')}</Text>}
          </>
        ) : (
          <Text style={styles.macros}>Grams, e.g. 180,5</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: space.gutter,
    marginTop: 12,
  },
  inputBox: {
    width: 96,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.surface2,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 3,
  },
  input: {
    flex: 1,
    minWidth: 0,
    height: 48,
    textAlign: 'right',
    color: colors.text,
    fontFamily: fonts.heading,
    fontSize: 20,
  },
  unit: { color: colors.sub, fontFamily: fonts.name, fontSize: 13 },
  result: { flex: 1, minWidth: 0 },
  label: { color: colors.sub, fontFamily: fonts.name, fontSize: 12 },
  kcal: { color: colors.gold, fontFamily: fonts.heading, fontSize: 20 },
  macros: { color: colors.sub, fontFamily: fonts.body, fontSize: 12 },
});
