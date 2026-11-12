import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Variant } from '@/lib/library/types';
import { colors, fonts, shape } from '@/lib/ui/theme';

interface Props {
  variants: Variant[];
  selectedId: string;
  busy: boolean;
  onSelect: (id: string) => void;
  onMakeDefault: (id: string) => void;
}

export default function VariantSwitcher({ variants, selectedId, busy, onSelect, onMakeDefault }: Props) {
  // Default variant first, rest in given order.
  const ordered = [...variants].sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
  const selected = variants.find((v) => v.id === selectedId);

  if (variants.length <= 1) {
    return (
      <Text style={styles.single} accessibilityLabel={`Variant: ${selected?.label ?? ''}`}>
        {selected?.label}
      </Text>
    );
  }

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.seg} contentContainerStyle={styles.row}>
        {ordered.map((v) => {
          const on = v.id === selectedId;
          return (
            <Pressable
              key={v.id}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${v.label}${v.isDefault ? ', default' : ''}`}
              onPress={() => onSelect(v.id)}
              style={[styles.chip, on && styles.chipOn]}
            >
              {v.isDefault && <View style={[styles.defaultDot, on && styles.defaultDotOn]} />}
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{v.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {selected && !selected.isDefault && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Make ${selected.label} the default variant`}
          disabled={busy}
          onPress={() => onMakeDefault(selected.id)}
          style={[styles.makeDefault, busy && styles.disabled]}
        >
          <Text style={styles.makeDefaultText}>Make default</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  single: { color: colors.sub, fontFamily: fonts.body, fontSize: 14 },
  seg: { flexGrow: 0, borderWidth: 1, borderColor: colors.outline, borderRadius: shape.card },
  row: { flexGrow: 1, gap: 4, padding: 4 },
  chip: {
    flexGrow: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    minHeight: 44, paddingHorizontal: 14, borderRadius: shape.lg,
  },
  chipOn: { backgroundColor: colors.accentContainer },
  chipText: { color: colors.sub, fontFamily: fonts.body, fontSize: 14 },
  chipTextOn: { color: colors.accent, fontFamily: fonts.bodyBold },
  // Default variant marker (replaces the old star icon).
  defaultDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.gold },
  defaultDotOn: { backgroundColor: colors.accent },
  makeDefault: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  makeDefaultText: { color: colors.accent, fontFamily: fonts.bodyBold, fontSize: 14 },
  disabled: { opacity: 0.5 },
});
