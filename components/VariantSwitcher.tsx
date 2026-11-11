import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Variant } from '@/lib/library/types';

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
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
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
              {v.isDefault && <Ionicons name="star" size={14} color={on ? '#0F172A' : '#10B981'} />}
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
  single: { color: '#94A3B8', fontSize: 14 },
  row: { gap: 8, paddingVertical: 2 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 14,
    borderRadius: 22, backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155',
  },
  chipOn: { backgroundColor: '#10B981', borderColor: '#10B981' },
  chipText: { color: '#F1F5F9', fontSize: 14 },
  chipTextOn: { color: '#0F172A', fontWeight: '600' },
  makeDefault: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  makeDefaultText: { color: '#10B981', fontSize: 14, fontWeight: '600' },
  disabled: { opacity: 0.5 },
});
