import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Pressable, RefreshControl, ScrollView, SectionList, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import FoodRow from '@/components/FoodRow';
import ChatBar, { CHAT_BAR_HEIGHT } from '@/components/ChatBar';
import Hero from '@/components/ui/Hero';
import HeroTitle from '@/components/ui/HeroTitle';
import HeroButton, { heroRowStyle } from '@/components/ui/HeroButton';
import Icon from '@/components/ui/Icon';
import { colors, fonts, shape, space, type } from '@/lib/ui/theme';
import { useReducedMotion } from '@/lib/ui/useReducedMotion';
import { keyboardClearance, useKeyboardHeight } from '@/lib/ui/useKeyboardHeight';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { listFoods, syncFromSupabase } from '@/lib/library/repository';
import { normalizeName } from '@/lib/library/duplicates';
import { applyFilters, distinctTags } from '@/lib/library/search';
import { sortFoods } from '@/lib/library/sort';
import { libraryCountLabel } from '@/lib/library/countLabel';
import { describeFilters, mergeTags } from '@/lib/library/searchSummary';
import { useSmartSearch } from '@/lib/library/useSmartSearch';
import { Food } from '@/lib/library/types';

/** Bottom padding so the last row clears the ChatBar (CHAT_BAR_HEIGHT plus the safe-area inset is added at render). */
const LIST_BOTTOM_PADDING = 24;
/** Same header height as settings, chat and scan. */
const HERO_HEIGHT = 150;
const SEARCH_HEIGHT = 52;

export default function Library() {
  const [foods, setFoods] = useState<Food[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [offline, setOffline] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const mounted = useRef(true);
  const requestId = useRef(0);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Only the latest read is applied; stale or post-unmount results are dropped.
  const load = useCallback(async () => {
    const id = ++requestId.current;
    try {
      const result = await listFoods();
      // Keep the old array when nothing changed: a focus reload then skips re-rendering the whole list mid-transition.
      if (mounted.current && id === requestId.current) {
        setFoods((prev) => (JSON.stringify(prev) === JSON.stringify(result) ? prev : result));
      }
    } catch (e) {
      console.warn('Failed to read local library', e);
    } finally {
      if (mounted.current && id === requestId.current) setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // A new device starts empty: reload once the background sync (joined via inflight) finishes.
  useEffect(() => {
    syncFromSupabase()
      .then(() => {
        if (mounted.current) return load();
      })
      .catch(() => {});
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    let failed = false;
    try {
      await syncFromSupabase();
    } catch {
      failed = true;
    }
    if (mounted.current) setOffline(failed);
    await load();
    if (mounted.current) setRefreshing(false);
  }, [load]);

  const allTags = useMemo(() => distinctTags(foods), [foods]);
  const smart = useSmartSearch(query, allTags);

  // Drop selections whose tag no longer exists (e.g. after a refresh); otherwise
  // an invisible chip would keep filtering everything out.
  const activeTags = useMemo(
    () => selectedTags.filter((t) => allTags.some((a) => normalizeName(a) === normalizeName(t))),
    [selectedTags, allTags],
  );

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags((prev) =>
      prev.some((t) => normalizeName(t) === normalizeName(tag))
        ? prev.filter((t) => normalizeName(t) !== normalizeName(tag))
        : [...prev, tag],
    );
  }, []);

  const sections = useMemo(() => {
    // Plain text is the baseline; an arrived interpretation replaces the text
    // and adds its filters, with chip tags unioned in.
    const tags = mergeTags(activeTags, smart.filters?.tags);
    const visible = applyFilters(foods, smart.filters
      ? { ...smart.filters, tags: tags.length > 0 ? tags : undefined }
      : { text: query.trim() || undefined, tags: tags.length > 0 ? tags : undefined });
    const dishes = sortFoods(visible.filter((f) => f.kind === 'dish'));
    const singles = sortFoods(visible.filter((f) => f.kind === 'single'));
    return [
      { title: 'Dishes', data: dishes },
      { title: 'Single foods', data: singles },
    ].filter((s) => s.data.length > 0);
  }, [foods, query, activeTags, smart.filters]);

  const openFood = useCallback((id: string) => {
    router.push({ pathname: '/food/[id]', params: { id } });
  }, []);

  // Rows that mount while the list first appears ease in, staggered and capped; later rows (scrolling, filtering) do not.
  const reduceMotion = useReducedMotion();
  const entering = useRef(true);
  useEffect(() => {
    if (loading) return;
    const t = setTimeout(() => { entering.current = false; }, 900);
    return () => clearTimeout(t);
  }, [loading]);
  const renderRow = useCallback(
    ({ item, index }: { item: Food; index: number }) => (
      <FoodRow food={item} onPress={openFood} enterDelay={entering.current && !reduceMotion ? Math.min(index, 7) * 35 : undefined} />
    ),
    [openFood, reduceMotion],
  );

  const dishCount = useMemo(() => foods.filter((f) => f.kind === 'dish').length, [foods]);

  // Shrink the list above the keyboard; the absolutely placed ChatBar rides on it separately.
  const insets = useSafeAreaInsets();
  const keyboardPad = keyboardClearance(useKeyboardHeight(), insets.bottom);
  const searching = query.trim().length > 0 || activeTags.length > 0;

  return (
    <View style={[styles.screen, { paddingBottom: keyboardPad }]}>
      <Hero height={HERO_HEIGHT}>
        <View style={styles.header}>
          <HeroButton icon="gear" accessibilityLabel="Settings" onPress={() => router.push('/settings')} />
        </View>
        <View style={styles.heroText}>
          {!loading && <Text style={styles.count}>{libraryCountLabel(foods.length, dishCount)}</Text>}
          <HeroTitle style={styles.title} accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.4} maxFontSizeMultiplier={1.2}>your library</HeroTitle>
        </View>
      </Hero>

      <View style={styles.searchBox}>
        <Icon name="search" size={18} color={colors.sub} />
        <TextInput
          accessibilityLabel="Search foods"
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search foods or tags"
          placeholderTextColor={colors.sub}
          returnKeyType="search"
          autoCorrect={false}
        />
        {query.length > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            onPress={() => setQuery('')}
            hitSlop={8}
            style={styles.clear}
          >
            <Icon name="close" size={16} color={colors.sub} />
          </Pressable>
        )}
      </View>

      {allTags.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          style={styles.chipScroll}
          contentContainerStyle={styles.chipRow}
          accessibilityLabel="Filter by tag"
        >
          {activeTags.length > 0 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear tag filters"
              onPress={() => setSelectedTags([])}
              style={styles.chip}
            >
              <Text style={styles.clearChipText}>Clear</Text>
            </Pressable>
          )}
          {allTags.map((tag) => {
            const selected = activeTags.some((t) => normalizeName(t) === normalizeName(tag));
            return (
              <Pressable
                key={tag}
                accessibilityRole="button"
                accessibilityLabel={`Filter by tag ${tag}`}
                accessibilityState={{ selected }}
                onPress={() => toggleTag(tag)}
                style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && styles.pressedScale]}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{tag}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {smart.filters && (
        <View style={styles.smartRow} accessibilityLiveRegion="polite">
          <Text style={styles.smartText} numberOfLines={1}>
            Smart search: {describeFilters({ ...smart.filters, tags: mergeTags(smart.filters.tags) })}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss smart search"
            onPress={smart.dismiss}
            hitSlop={8}
            style={styles.smartDismiss}
          >
            <Icon name="close" size={16} color={colors.sub} />
          </Pressable>
        </View>
      )}

      {smart.keyMissing && (
        <Pressable
          accessibilityRole="link"
          onPress={() => router.push('/settings')}
          style={styles.banner}
        >
          <Text style={styles.bannerText}>Add a Gemini key in Settings for smart search</Text>
        </Pressable>
      )}

      {offline && (
        <View style={styles.banner} accessibilityLiveRegion="polite">
          <Text style={styles.bannerText}>Offline — showing saved foods</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.accent} size="large" /></View>
      ) : (
        <SectionList
          style={styles.list}
          contentContainerStyle={[styles.listContent, { paddingBottom: LIST_BOTTOM_PADDING + CHAT_BAR_HEIGHT + insets.bottom }, sections.length === 0 && styles.emptyContent]}
          sections={sections}
          keyExtractor={(f) => f.id}
          renderItem={renderRow}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionTitle} accessibilityRole="header">{section.title}</Text>
          )}
          stickySectionHeadersEnabled={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} colors={[colors.accent]} />
          }
          ListEmptyComponent={
            <Text style={styles.empty}>
              {searching
                ? (query.trim() ? `No foods match '${query.trim()}'` : 'No foods match the selected tags')
                : "Your library is empty. Ask the chat about a food and say 'save it'."}
            </Text>
          }
        />
      )}

      <ChatBar />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  // Same arrangement as the food detail header: button on top, small label above a big title at the bottom left.
  header: { ...heroRowStyle, justifyContent: 'flex-end' },
  heroText: { position: 'absolute', left: space.gutter, right: space.gutter + 44, bottom: 30 },
  title: { color: colors.onHero, fontFamily: fonts.display, fontSize: 84, lineHeight: 78, marginTop: 2, textTransform: 'uppercase' },
  count: { color: colors.onHero, fontFamily: fonts.name, fontSize: type.label },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: space.gutter,
    marginTop: -SEARCH_HEIGHT / 2, marginBottom: 12, zIndex: 5,
    height: SEARCH_HEIGHT, paddingHorizontal: space.gutter, borderRadius: shape.bar,
    backgroundColor: colors.surface2,
    shadowColor: colors.shadow, shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  searchInput: { flex: 1, height: SEARCH_HEIGHT, color: colors.text, fontFamily: fonts.body, fontSize: type.body },
  clear: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', marginRight: -12 },
  chipScroll: { flexGrow: 0, marginBottom: 8 },
  chipRow: { paddingHorizontal: space.gutter, gap: 6, alignItems: 'center' },
  chip: {
    minHeight: 48, minWidth: 48, paddingHorizontal: 14, borderRadius: shape.sm,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.outline, backgroundColor: colors.surface,
  },
  pressedScale: { transform: [{ scale: 0.95 }] },
  chipSelected: { backgroundColor: colors.accentContainer, borderColor: colors.accentContainer },
  chipText: { color: colors.sub, fontFamily: fonts.body, fontSize: 13 },
  chipTextSelected: { color: colors.accent, fontFamily: fonts.bodyBold },
  clearChipText: { color: colors.accent, fontFamily: fonts.bodyBold, fontSize: 13 },
  banner: {
    marginHorizontal: space.gutter, marginBottom: 8, paddingVertical: 10, paddingHorizontal: 12,
    borderRadius: shape.lg, backgroundColor: colors.surface2,
  },
  bannerText: { color: colors.sub, fontFamily: fonts.body, fontSize: 13 },
  smartRow: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: space.gutter, marginBottom: 8,
    paddingLeft: 14, borderRadius: shape.lg, backgroundColor: colors.sageContainer,
  },
  smartText: { flex: 1, color: colors.text, fontFamily: fonts.body, fontSize: 13 },
  smartDismiss: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { flex: 1 },
  listContent: { paddingHorizontal: space.gutter },
  emptyContent: { flexGrow: 1, justifyContent: 'center' },
  sectionTitle: {
    color: colors.sub, fontFamily: fonts.heading, fontSize: type.caption, letterSpacing: 1,
    textTransform: 'uppercase', marginTop: 12, marginBottom: 8,
  },
  empty: { color: colors.sub, fontFamily: fonts.body, fontSize: 16, textAlign: 'center', paddingHorizontal: 24 },
});
