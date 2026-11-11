import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import MacroLines from '@/components/MacroLines';
import { parseGrams, scalePortion } from '@/lib/library/portion';
import { Macros } from '@/lib/library/types';

/** Grams input with live scaled result. Input is local state, never persisted. */
export default function PortionCalculator({ macros }: { macros: Macros }) {
  const [text, setText] = useState('');
  const grams = parseGrams(text);
  const result = grams === null ? null : scalePortion(macros, grams);
  return (
    <View style={styles.box}>
      <Text style={styles.title} accessibilityRole="header">Portion</Text>
      <View style={styles.inputRow}>
        <TextInput
          accessibilityLabel="Portion in grams"
          style={styles.input}
          value={text}
          onChangeText={setText}
          keyboardType="decimal-pad"
          placeholder="Grams, e.g. 180,5"
          placeholderTextColor="#94A3B8"
        />
        <Text style={styles.unit}>g</Text>
      </View>
      {result && (
        <View style={styles.result} accessibilityLiveRegion="polite">
          <MacroLines m={result} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: '#1E293B', borderRadius: 12, padding: 14, marginTop: 12 },
  title: { color: '#F1F5F9', fontSize: 16, fontWeight: '600', marginBottom: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    flex: 1, minHeight: 44, paddingHorizontal: 12, borderRadius: 10,
    backgroundColor: '#0F172A', color: '#F1F5F9', fontSize: 16,
  },
  unit: { color: '#94A3B8', fontSize: 16 },
  result: { marginTop: 10 },
});
