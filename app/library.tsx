import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Pressable, RefreshControl, ScrollView, SectionList, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FoodRow from '@/components/FoodRow';
import ChatBar from '@/components/ChatBar';
import { listFoods, syncFromSupabase } from '@/lib/library/repository';
import { normalizeName } from '@/lib/library/duplicates';
import { applyFilters, distinctTags } from '@/lib/library/search';
import { sortFoods } from '@/lib/library/sort';
import { describeFilters, mergeTags } from '@/lib/library/searchSummary';
import { useSmartSearch } from '@/lib/library/useSmartSearch';
import { Food } from '@/lib/library/types';

/**
 * Bottom padding so the last row clears the global calculator FAB, which sits
 * 32pt above the ChatBar (FAB bottom 96 vs bar 64) and is 48pt tall:
 * 32 + 48 + 8 breathing room = 88.
 */
const LIST_BOTTOM_PADDING = 88;

export default function Library() {
  const insets = useSafeAreaInsets();
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

  const searching = query.trim().length > 0 || activeTags.length > 0;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">Library</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Settings"
          onPress={() => router.push('/settings')}
          style={styles.settings}
        >
          <Text style={styles.settingsText}>Settings</Text>
        </Pressable>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color="#94A3B8" />
        <TextInput
          accessibilityLabel="Search foods"
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search foods or tags"
          placeholderTextColor="#94A3B8"
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
            <Ionicons name="close-circle" size={20} color="#94A3B8" />
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
            <Ionicons name="close-circle" size={20} color="#94A3B8" />
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
        <View style={styles.center}><ActivityIndicator color="#10B981" size="large" /></View>
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
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" colors={['#10B981']} />
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
  screen: { flex: 1, backgroundColor: '#0F172A' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 8,
  },
  title: { color: '#F1F5F9', fontSize: 24, fontWeight: 'bold' },
  settings: { minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'flex-end' },
  settingsText: { color: '#10B981', fontSize: 16 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginVertical: 8,
    minHeight: 44, paddingHorizontal: 12, borderRadius: 12, backgroundColor: '#1E293B',
  },
  searchInput: { flex: 1, minHeight: 44, color: '#F1F5F9', fontSize: 16 },
  clear: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', marginRight: -12 },
  chipScroll: { flexGrow: 0 },
  chipRow: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  chip: {
    minHeight: 44, minWidth: 44, paddingHorizontal: 14, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#1E293B',
    borderWidth: 1, borderColor: '#334155',
  },
  chipSelected: { backgroundColor: '#10B981', borderColor: '#10B981' },
  chipText: { color: '#CBD5E1', fontSize: 14 },
  chipTextSelected: { color: '#0F172A', fontWeight: '600' },
  clearChipText: { color: '#10B981', fontSize: 14, fontWeight: '600' },
  banner: { marginHorizontal: 16, marginBottom: 4, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#1E293B' },
  bannerText: { color: '#94A3B8', fontSize: 13 },
  smartRow: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 4,
    paddingLeft: 12, borderRadius: 8, backgroundColor: '#1E293B',
  },
  smartText: { flex: 1, color: '#10B981', fontSize: 13 },
  smartDismiss: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingBottom: LIST_BOTTOM_PADDING },
  emptyContent: { flexGrow: 1, justifyContent: 'center' },
  sectionTitle: { color: '#94A3B8', fontSize: 13, fontWeight: '600', textTransform: 'uppercase', marginTop: 12, marginBottom: 8 },
  empty: { color: '#94A3B8', fontSize: 16, textAlign: 'center', paddingHorizontal: 24 },
});
