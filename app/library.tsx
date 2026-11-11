import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Pressable, RefreshControl, ScrollView, SectionList, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import FoodRow from '@/components/FoodRow';
import ChatBar from '@/components/ChatBar';
import Hero from '@/components/ui/Hero';
import Icon from '@/components/ui/Icon';
import { colors, fonts, space } from '@/lib/ui/theme';
import { listFoods, syncFromSupabase } from '@/lib/library/repository';
import { normalizeName } from '@/lib/library/duplicates';
import { applyFilters, distinctTags } from '@/lib/library/search';
import { sortFoods } from '@/lib/library/sort';
import { describeFilters, mergeTags } from '@/lib/library/searchSummary';
import { useSmartSearch } from '@/lib/library/useSmartSearch';
import { Food } from '@/lib/library/types';

/**
 * Bottom padding so the last row clears the global calculator FAB, which sits
 * 32pt above the ChatBar and is sizes.fab (56pt) tall:
 * 32 + 56 + 8 breathing room = 96.
 */
const LIST_BOTTOM_PADDING = 96;
const HERO_HEIGHT = 164;
const SEARCH_HEIGHT = 44;

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
      if (mounted.current && id === requestId.current) setFoods(result);
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

  const dishCount = useMemo(() => foods.filter((f) => f.kind === 'dish').length, [foods]);

  const searching = query.trim().length > 0 || activeTags.length > 0;

  return (
    <View style={styles.screen}>
      <Hero height={HERO_HEIGHT} seed={2}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title} accessibilityRole="header">your library</Text>
            <Text style={styles.count}>{foods.length} foods · {dishCount} dishes</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Settings"
            onPress={() => router.push('/settings')}
            hitSlop={6}
            style={styles.settings}
          >
            <Icon name="gear" size={18} color={colors.text} />
          </Pressable>
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
                style={[styles.chip, selected && styles.chipSelected]}
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
        <View style={styles.center}><ActivityIndicator color={colors.peach} size="large" /></View>
      ) : (
        <SectionList
          style={styles.list}
          contentContainerStyle={[styles.listContent, sections.length === 0 && styles.emptyContent]}
          sections={sections}
          keyExtractor={(f) => f.id}
          renderItem={({ item }) => <FoodRow food={item} onPress={openFood} />}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionTitle} accessibilityRole="header">{section.title}</Text>
          )}
          stickySectionHeadersEnabled={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.peach} colors={[colors.peach]} />
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
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: space.gutter, paddingTop: 14,
  },
  headerText: { flex: 1, paddingRight: 12 },
  title: { color: colors.text, fontFamily: fonts.display, fontSize: 30, lineHeight: 34, textTransform: 'uppercase' },
  count: { color: colors.peach, fontFamily: fonts.body, fontSize: 12, marginTop: 4 },
  settings: {
    width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.scrim,
  },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: space.gutter,
    marginTop: -SEARCH_HEIGHT / 2, marginBottom: 12, zIndex: 5,
    height: SEARCH_HEIGHT, paddingHorizontal: space.gutter, borderRadius: SEARCH_HEIGHT / 2,
    backgroundColor: colors.surface2,
    shadowColor: colors.shadow, shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  searchInput: { flex: 1, height: SEARCH_HEIGHT, color: colors.text, fontFamily: fonts.body, fontSize: 14 },
  clear: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', marginRight: -12 },
  chipScroll: { flexGrow: 0, marginBottom: 8 },
  chipRow: { paddingHorizontal: space.gutter, gap: 6, alignItems: 'center' },
  chip: {
    minHeight: 44, minWidth: 44, paddingHorizontal: 14, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface2,
  },
  chipSelected: { backgroundColor: colors.peach },
  chipText: { color: colors.sub, fontFamily: fonts.body, fontSize: 13 },
  chipTextSelected: { color: colors.ink, fontFamily: fonts.bodyBold },
  clearChipText: { color: colors.peach, fontFamily: fonts.bodyBold, fontSize: 13 },
  banner: {
    marginHorizontal: space.gutter, marginBottom: 8, paddingVertical: 10, paddingHorizontal: 12,
    borderRadius: 14, backgroundColor: colors.surface, borderLeftWidth: 3, borderLeftColor: colors.gold,
  },
  bannerText: { color: colors.sub, fontFamily: fonts.body, fontSize: 13 },
  smartRow: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: space.gutter, marginBottom: 8,
    paddingLeft: 12, borderRadius: 14, backgroundColor: colors.surface,
    borderLeftWidth: 3, borderLeftColor: colors.sage,
  },
  smartText: { flex: 1, color: colors.text, fontFamily: fonts.body, fontSize: 13 },
  smartDismiss: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { flex: 1 },
  listContent: { paddingHorizontal: space.gutter, paddingBottom: LIST_BOTTOM_PADDING },
  emptyContent: { flexGrow: 1, justifyContent: 'center' },
  sectionTitle: {
    color: colors.sub, fontFamily: fonts.heading, fontSize: 11, letterSpacing: 1,
    textTransform: 'uppercase', marginTop: 12, marginBottom: 8,
  },
  empty: { color: colors.sub, fontFamily: fonts.body, fontSize: 16, textAlign: 'center', paddingHorizontal: 24 },
});
