import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import VariantSwitcher from '@/components/VariantSwitcher';
import PortionCalculator from '@/components/PortionCalculator';
import MacroLines from '@/components/MacroLines';
import Hero from '@/components/ui/Hero';
import Icon, { IconName } from '@/components/ui/Icon';
import { MacroEditor, NameEditor, TagEditor } from '@/components/FoodEditors';
import { OfflineError } from '@/lib/library/errors';
import {
  deleteFood, deleteVariant, listFoods, setDefaultVariant, updateFood, updateVariant,
} from '@/lib/library/repository';
import { defaultVariant } from '@/lib/library/search';
import { Food, FoodKind, Variant } from '@/lib/library/types';
import { variantKcalLabel } from '@/lib/library/kcalLabel';
import { confirm } from '@/lib/ui/confirm';
import { colors, fonts, space } from '@/lib/ui/theme';

/** Clears the global calculator FAB (bottom 96 + inset, 48 tall) with breathing room. */
const BOTTOM_PADDING = 160;
const HERO_HEIGHT = 172;

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

function Pill({ icon, label, onPress, disabled }: { icon: IconName; label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress}
      style={[styles.pill, disabled && styles.disabled]}
    >
      <Icon name={icon} size={16} color={colors.peach} />
      <Text style={styles.pillText}>{label}</Text>
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
    return <View style={[styles.center, { paddingTop: insets.top }]}><ActivityIndicator color={colors.peach} size="large" /></View>;
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
      contentContainerStyle={{ paddingBottom: BOTTOM_PADDING + insets.bottom }}
      keyboardShouldPersistTaps="handled"
    >
      <Hero height={HERO_HEIGHT} seed={3}>
        <View style={styles.heroRow}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={leave} hitSlop={6} style={styles.round}>
            <Icon name="back" size={18} color={colors.text} />
          </Pressable>
          <Pressable
            accessibilityRole="button" accessibilityState={{ selected: f.pinned }}
            accessibilityLabel={f.pinned ? 'Unpin' : 'Pin'} disabled={busy} hitSlop={6}
            onPress={() => run(() => updateFood(f.id, { pinned: !f.pinned }))} style={styles.round}
          >
            <Icon name="pin" size={18} color={f.pinned ? colors.peach : colors.text} />
          </Pressable>
        </View>
        <View style={styles.heroText}>
          <Text style={styles.kind}>{f.kind === 'dish' ? 'Dish' : 'Single food'} · per 100 g</Text>
          <Text style={styles.name} accessibilityRole="header" numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.6}>
            {f.name}
          </Text>
        </View>
      </Hero>

      <View style={styles.kcalRow}>
        <Text style={styles.kcal}>{variantKcalLabel(selected)}</Text>
        <Text style={styles.kcalUnit}>kcal</Text>
      </View>

      {message && <Text style={styles.message} accessibilityLiveRegion="polite">{message}</Text>}
      {busy && <ActivityIndicator color={colors.peach} style={styles.spinner} />}

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

      <View style={styles.pills}>
        <Pill icon="edit" label="Edit" disabled={busy} onPress={() => setEditing('macros')} />
        <Pill icon="tag" label="Tags" disabled={busy} onPress={() => setEditing('tags')} />
        <Pill icon="chat" label="Ask" onPress={() => router.push({ pathname: '/chat', params: { foodId: f.id } })} />
      </View>

      <View style={styles.actions}>
        <Action label="Refine with chat" onPress={() => router.push({ pathname: '/chat', params: { foodId: f.id } })} />
        <Action label="Rename" disabled={busy} onPress={() => setEditing('name')} />
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
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  notFound: { color: colors.text, fontFamily: fonts.body, fontSize: 16, textAlign: 'center' },
  heroRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: space.gutter, paddingTop: 12 },
  round: {
    width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.scrim,
  },
  heroText: { paddingHorizontal: space.gutter, paddingTop: 10 },
  kind: { color: colors.text, fontFamily: fonts.name, fontSize: 11 },
  name: { color: colors.text, fontFamily: fonts.display, fontSize: 34, lineHeight: 38, marginTop: 2 },
  kcalRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, paddingHorizontal: space.gutter, marginTop: 4 },
  kcal: { color: colors.peach, fontFamily: fonts.heading, fontSize: 40 },
  kcalUnit: { color: colors.sub, fontFamily: fonts.name, fontSize: 11 },
  message: { color: colors.dangerText, fontFamily: fonts.body, fontSize: 14, marginTop: 10, marginHorizontal: space.gutter },
  spinner: { alignSelf: 'flex-start', marginTop: 8, marginHorizontal: space.gutter },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, marginHorizontal: space.gutter },
  chip: { backgroundColor: colors.surface2, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  chipText: { color: colors.sub, fontFamily: fonts.body, fontSize: 12 },
  section: { marginTop: 12, marginHorizontal: space.gutter },
  card: { backgroundColor: colors.surface, borderRadius: 18, padding: 14, marginTop: 12, marginHorizontal: space.gutter },
  cardTitle: { color: colors.text, fontFamily: fonts.bodyBold, fontSize: 15, marginBottom: 6 },
  meta: { color: colors.sub, fontFamily: fonts.body, fontSize: 13, marginTop: 4 },
  ingRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  ingName: { color: colors.text, fontFamily: fonts.body, fontSize: 15, flex: 1 },
  pills: { flexDirection: 'row', gap: 8, marginTop: 12, marginHorizontal: space.gutter },
  pill: {
    flex: 1, minHeight: 44, borderRadius: 22, borderWidth: 1.5, borderColor: colors.peach,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  pillText: { color: colors.peach, fontFamily: fonts.bodyBold, fontSize: 13 },
  actions: { marginTop: 12, marginHorizontal: space.gutter },
  action: { minHeight: 44, justifyContent: 'center' },
  actionText: { color: colors.sub, fontFamily: fonts.body, fontSize: 14 },
  danger: { color: colors.danger },
  disabled: { opacity: 0.5 },
});
