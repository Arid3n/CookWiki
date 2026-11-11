import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatResult, useCalculatorStore } from '@/store/calculatorStore';

const ROWS: string[][] = [
  ['C', '⌫', '%', '÷'],
  ['7', '8', '9', '×'],
  ['4', '5', '6', '-'],
  ['1', '2', '3', '+'],
  ['(', '0', '.', ')'],
];

const LABELS: Record<string, string> = {
  C: 'Clear',
  '⌫': 'Backspace',
  '%': 'Percent',
  '÷': 'Divide',
  '×': 'Multiply',
  '-': 'Subtract',
  '+': 'Add',
  '(': 'Open parenthesis',
  ')': 'Close parenthesis',
  '.': 'Decimal point',
  '=': 'Equals',
};

const isOperator = (k: string) => ['÷', '×', '-', '+', '%'].includes(k);

function Key({ k, wide }: { k: string; wide?: boolean }) {
  const press = useCalculatorStore((s) => s.press);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={LABELS[k] ?? k}
      onPress={() => press(k)}
      style={({ pressed }) => [
        styles.key,
        wide && styles.wide,
        k === '=' && styles.equals,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.keyText, (isOperator(k) || k === 'C') && styles.opText, k === '=' && styles.equalsText]}>
        {k}
      </Text>
    </Pressable>
  );
}

export default function Calculator() {
  const expression = useCalculatorStore((s) => s.expression);
  const result = useCalculatorStore((s) => s.result);
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close calculator"
          onPress={() => router.back()}
          hitSlop={8}
          style={styles.close}
        >
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      </View>

      <View style={styles.display}>
        <Text style={styles.expression} numberOfLines={2} adjustsFontSizeToFit accessibilityLabel="Expression">
          {expression}
        </Text>
        <Text style={styles.result} numberOfLines={1} adjustsFontSizeToFit accessibilityLabel="Result">
          {result === null ? '' : formatResult(result)}
        </Text>
      </View>

      <View style={styles.pad}>
        {ROWS.map((row, i) => (
          <View key={i} style={styles.row}>
            {row.map((k) => (
              <Key key={k} k={k} />
            ))}
          </View>
        ))}
        <View style={styles.row}>
          <Key k="=" wide />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A', paddingHorizontal: 12 },
  header: { flexDirection: 'row', justifyContent: 'flex-end' },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: '#F1F5F9', fontSize: 22 },
  display: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 8, paddingBottom: 12, minHeight: 80 },
  expression: { color: '#94A3B8', fontSize: 28, textAlign: 'right' },
  result: { color: '#F1F5F9', fontSize: 44, fontWeight: '600', textAlign: 'right', minHeight: 56 },
  pad: { gap: 8 },
  row: { flexDirection: 'row', gap: 8 },
  key: {
    flex: 1,
    minHeight: 56,
    borderRadius: 14,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wide: { flex: 1 },
  equals: { backgroundColor: '#10B981' },
  pressed: { opacity: 0.7 },
  keyText: { color: '#F1F5F9', fontSize: 24 },
  opText: { color: '#10B981' },
  equalsText: { color: '#0F172A', fontWeight: '700' },
});
