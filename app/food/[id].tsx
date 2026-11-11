import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import VariantSwitcher from '@/components/VariantSwitcher';
import PortionCalculator from '@/components/PortionCalculator';
import MacroLines from '@/components/MacroLines';
import { MacroEditor, NameEditor, TagEditor } from '@/components/FoodEditors';
import { OfflineError } from '@/lib/library/errors';
import {
  deleteFood, deleteVariant, listFoods, setDefaultVariant, updateFood, updateVariant,
} from '@/lib/library/repository';
import { defaultVariant } from '@/lib/library/search';
import { Food, FoodKind, Variant } from '@/lib/library/types';
import { confirm } from '@/lib/ui/confirm';

/** Clears the global calculator FAB (bottom 96 + inset, 48 tall) with breathing room. */
const BOTTOM_PADDING = 160;

type Editing = null | 'name' | 'tags' | 'macros';

function leave() {
  if (router.canGoBack()) router.back();
  else router.replace('/library');
}

function Action({ label, onPress, disabled, danger }: { label: string; onPress: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress}
      style={[styles.action, disabled && styles.disabled]}
    >
      <Text style={[styles.actionText, danger && styles.danger]}>{label}</Text>
    </Pressable>
  );
}

export default function FoodCard() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const foodId = Array.isArray(id) ? id[0] : id;

  const [food, setFood] = useState<Food | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Editing>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const mounted = useRef(true);
  const requestId = useRef(0);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Reads the local copy; only the latest read is applied. Returns false if dropped as stale.
  const load = useCallback(async (): Promise<boolean> => {
    const req = ++requestId.current;
    try {
      const foods = await listFoods();
      if (!mounted.current || req !== requestId.current) return false;
      const found = foods.find((f) => f.id === foodId);
      setFood(found && found.variants.length > 0 ? found : null);
    } catch (e) {
      console.warn('Failed to read local library', e);
      if (mounted.current && req === requestId.current) setFood(null);
    } finally {
      if (mounted.current && req === requestId.current) setLoading(false);
    }
    return true;
  }, [foodId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // Every write: busy state, error message, no optimistic change; reload only after success.
  const run = useCallback(async (write: () => Promise<void>): Promise<boolean> => {
    setBusy(true);
    setMessage(null);
    try {
      await write();
    } catch (e) {
      if (mounted.current) {
        setMessage(e instanceof OfflineError ? e.message : e instanceof Error ? e.message : 'Something went wrong.');
        setBusy(false);
      }
      return false;
    }
    await load();
    if (mounted.current) setBusy(false);
    return true;
  }, [load]);

  if (loading) {
    return <View style={[styles.center, { paddingTop: insets.top }]}><ActivityIndicator color="#10B981" size="large" /></View>;
  }

  if (!food) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.notFound}>This food is no longer in your library</Text>
        <Action label="Back" onPress={leave} />
      </View>
    );
  }

  const selected: Variant = food.variants.find((v) => v.id === selectedId) ?? defaultVariant(food);
  const f = food;

  const closeAfter = async (ok: Promise<boolean>) => {
    if (await ok && mounted.current) setEditing(null);
  };

  const onDeleteVariant = async () => {
    if (f.variants.length <= 1) {
      setMessage('A food needs at least one variant. Delete the food instead.');
      return;
    }
    if (!(await confirm('Delete variant', `Delete "${selected.label}"?`))) return;
    if (await run(() => deleteVariant(selected.id)) && mounted.current) setSelectedId(null);
  };

  const onDeleteFood = async () => {
    if (!(await confirm('Delete food', `Delete "${f.name}" and all its variants?`))) return;
    if (await run(() => deleteFood(f.id)) && mounted.current) leave();
  };

  const otherKind: FoodKind = f.kind === 'dish' ? 'single' : 'dish';
  const range =
    selected.kcalMin !== undefined && selected.kcalMax !== undefined
      ? `Estimate ${Math.round(selected.kcalMin)}–${Math.round(selected.kcalMax)} kcal` : null;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: BOTTOM_PADDING + insets.bottom }}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={leave} style={styles.back}>
        <Ionicons name="chevron-back" size={22} color="#10B981" />
        <Text style={styles.actionText}>Library</Text>
      </Pressable>

      <View style={styles.titleRow}>
        <Text style={styles.name} accessibilityRole="header">{f.name}</Text>
        <Pressable
          accessibilityRole="button" accessibilityState={{ selected: f.pinned }}
          accessibilityLabel={f.pinned ? 'Unpin' : 'Pin'} disabled={busy}
          onPress={() => run(() => updateFood(f.id, { pinned: !f.pinned }))} style={styles.pin}
        >
          <Ionicons name={f.pinned ? 'pin' : 'pin-outline'} size={24} color={f.pinned ? '#10B981' : '#94A3B8'} />
        </Pressable>
      </View>
      <View style={styles.badge}><Text style={styles.badgeText}>{f.kind === 'dish' ? 'Dish' : 'Single food'}</Text></View>

      {message && <Text style={styles.message} accessibilityLiveRegion="polite">{message}</Text>}
      {busy && <ActivityIndicator color="#10B981" style={styles.spinner} />}

      {editing === 'name' ? (
        <NameEditor initial={f.name} busy={busy} onCancel={() => setEditing(null)}
          onSave={(name) => closeAfter(run(() => updateFood(f.id, { name })))} />
      ) : null}

      {editing === 'tags' ? (
        <TagEditor initial={f.tags} busy={busy} onCancel={() => setEditing(null)}
          onSave={(tags) => closeAfter(run(() => updateFood(f.id, { tags })))} />
      ) : f.tags.length > 0 ? (
        <View style={styles.tags}>
          {f.tags.map((t) => <View key={t} style={styles.chip}><Text style={styles.chipText}>{t}</Text></View>)}
        </View>
      ) : null}

      <View style={styles.section}>
        <VariantSwitcher variants={f.variants} selectedId={selected.id} busy={busy}
          onSelect={setSelectedId} onMakeDefault={(vid) => run(() => setDefaultVariant(f.id, vid))} />
      </View>

      {editing === 'macros' ? (
        <MacroEditor key={selected.id} initial={selected} busy={busy} onCancel={() => setEditing(null)}
          onSave={(patch) => closeAfter(run(() => updateVariant(selected.id, patch)))} />
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle} accessibilityRole="header">Per 100 g</Text>
          <MacroLines m={selected} />
          {range && <Text style={styles.meta}>{range}</Text>}
          {selected.confidence && <Text style={styles.meta}>Confidence: {selected.confidence}</Text>}
        </View>
      )}

      {selected.ingredients && selected.ingredients.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle} accessibilityRole="header">Ingredients</Text>
          {selected.ingredients.map((ing, i) => (
            <View key={`${ing.name}-${i}`} style={styles.ingRow}>
              <Text style={styles.ingName}>{ing.name}</Text>
              {ing.grams !== undefined && <Text style={styles.meta}>{ing.grams} g</Text>}
            </View>
          ))}
        </View>
      )}

      <PortionCalculator key={selected.id} macros={selected} />

      <View style={styles.actions}>
        <Action label="Refine with chat" onPress={() => router.push({ pathname: '/chat', params: { foodId: f.id } })} />
        <Action label="Rename" disabled={busy} onPress={() => setEditing('name')} />
        <Action label="Edit tags" disabled={busy} onPress={() => setEditing('tags')} />
        <Action label="Edit numbers" disabled={busy} onPress={() => setEditing('macros')} />
        <Action label={`Move to ${otherKind === 'dish' ? 'Dishes' : 'Single foods'}`} disabled={busy}
          onPress={() => run(() => updateFood(f.id, { kind: otherKind }))} />
        <Action label="Delete this variant" danger disabled={busy} onPress={onDeleteVariant} />
        <Action label="Delete food" danger disabled={busy} onPress={onDeleteFood} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0F172A' },
  center: { flex: 1, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  notFound: { color: '#F1F5F9', fontSize: 16, textAlign: 'center' },
  back: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { flex: 1, color: '#F1F5F9', fontSize: 24, fontWeight: 'bold' },
  pin: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  badge: { alignSelf: 'flex-start', backgroundColor: '#1E293B', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, marginTop: 4 },
  badgeText: { color: '#94A3B8', fontSize: 12 },
  message: { color: '#F87171', fontSize: 14, marginTop: 10 },
  spinner: { alignSelf: 'flex-start', marginTop: 8 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  chip: { backgroundColor: '#1E293B', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  chipText: { color: '#94A3B8', fontSize: 12 },
  section: { marginTop: 14 },
  card: { backgroundColor: '#1E293B', borderRadius: 12, padding: 14, marginTop: 12 },
  cardTitle: { color: '#F1F5F9', fontSize: 16, fontWeight: '600', marginBottom: 6 },
  meta: { color: '#94A3B8', fontSize: 13, marginTop: 4 },
  ingRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  ingName: { color: '#F1F5F9', fontSize: 15, flex: 1 },
  actions: { marginTop: 16 },
  action: { minHeight: 44, justifyContent: 'center' },
  actionText: { color: '#10B981', fontSize: 16 },
  danger: { color: '#F87171' },
  disabled: { opacity: 0.5 },
});
