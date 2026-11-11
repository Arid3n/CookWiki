import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '@/components/ui/Icon';
import { colors, fonts, space } from '@/lib/ui/theme';
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
        isOperator(k) && styles.opKey,
        k === '=' && styles.equals,
        pressed && styles.pressed,
      ]}
    >
      {k === '⌫' ? (
        <Icon name="backspace" size={24} color={colors.text} />
      ) : (
        <Text style={[styles.keyText, isOperator(k) && styles.opText, k === 'C' && styles.clearText, k === '=' && styles.equalsText]}>
          {k}
        </Text>
      )}
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
          <Icon name="close" size={22} color={colors.text} />
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
  container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: space.gutter },
  header: { flexDirection: 'row', justifyContent: 'flex-end' },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  display: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 8, paddingBottom: 12, minHeight: 80 },
  expression: { color: colors.sub, fontFamily: fonts.body, fontSize: 28, textAlign: 'right' },
  result: { color: colors.text, fontFamily: fonts.heading, fontSize: 52, textAlign: 'right', minHeight: 64 },
  pad: { gap: 8 },
  row: { flexDirection: 'row', gap: 8 },
  key: {
    flex: 1,
    minHeight: 56,
    borderRadius: 28,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wide: { flex: 1 },
  opKey: { backgroundColor: colors.gold },
  equals: { backgroundColor: colors.peach },
  pressed: { opacity: 0.7 },
  keyText: { color: colors.text, fontFamily: fonts.heading, fontSize: 24 },
  opText: { color: colors.ink },
  clearText: { color: colors.peach },
  equalsText: { color: colors.ink },
});
