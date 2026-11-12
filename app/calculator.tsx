import { useCallback, useRef } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '@/components/ui/Icon';
import { colors, fonts, space, shape } from '@/lib/ui/theme';
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
  const { height } = useWindowDimensions();

  // The screen slides in natively (slide_from_bottom); the dim over the page behind is drawn by the screens
  // underneath (see DimmedScreen), so it is already complete from the first frame and never moves.
  const close = useCallback(() => router.back(), []);
  const sheetHeight = Math.round(height * 0.8);

  // Drag the top of the sheet down to dismiss it.
  const drag = useRef(new Animated.Value(0)).current;

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_e, g) => drag.setValue(Math.max(0, g.dy)),
      onPanResponderRelease: (_e, g) => {
        if (g.dy > 120 || g.vy > 0.8) close();
        else Animated.spring(drag, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
      },
      onPanResponderTerminate: () => Animated.spring(drag, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start(),
    }),
  ).current;

  return (
    <View style={styles.overlay}>
      {/* Tap-outside target only; screen readers use the Close button below. */}
      <Pressable style={StyleSheet.absoluteFill} onPress={close} accessible={false} importantForAccessibility="no" />
    <Animated.View
      style={[styles.container, { height: sheetHeight, paddingBottom: insets.bottom + 12, transform: [{ translateY: drag }] }]}
    >
      <View style={styles.header} {...pan.panHandlers}>
        <View style={styles.grabber} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close calculator"
          onPress={close}
          hitSlop={8}
          style={styles.close}
        >
          <Icon name="close" size={22} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.display}>
        <Text style={styles.expression} numberOfLines={2} adjustsFontSizeToFit>
          {expression}
        </Text>
        <Text style={styles.result} numberOfLines={1} adjustsFontSizeToFit accessibilityLiveRegion="polite">
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
    </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  container: {
    backgroundColor: colors.surface, paddingHorizontal: space.gutter,
    borderTopLeftRadius: shape.xl, borderTopRightRadius: shape.xl,
  },
  header: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', paddingTop: 8 },
  grabber: { position: 'absolute', left: '50%', marginLeft: -20, top: 10, width: 40, height: 4, borderRadius: 2, backgroundColor: colors.outline },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  display: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: 8, paddingBottom: 12, minHeight: 80 },
  expression: { color: colors.sub, fontFamily: fonts.body, fontSize: 28, textAlign: 'right' },
  result: { color: colors.text, fontFamily: fonts.heading, fontSize: 52, textAlign: 'right', minHeight: 64 },
  pad: { gap: 8 },
  row: { flexDirection: 'row', gap: 8 },
  key: {
    flex: 1,
    minHeight: 56,
    borderRadius: shape.lg,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wide: { flex: 1 },
  opKey: { backgroundColor: colors.gold },
  equals: { backgroundColor: colors.accent },
  pressed: { opacity: 0.7 },
  keyText: { color: colors.text, fontFamily: fonts.heading, fontSize: 24 },
  opText: { color: colors.ink },
  clearText: { color: colors.accent },
  equalsText: { color: colors.ink },
});
