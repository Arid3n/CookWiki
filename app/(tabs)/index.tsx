import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { db, expoDb } from '@/db';
import { recipes, recipeLikes } from '@/db/schema';
import { like, or, eq, isNull, and } from 'drizzle-orm';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeStore } from '@/store/themeStore';
import { getTheme } from '@/lib/theme';
import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';

// Terracotta and sunset orange inspired gradient palette
const CARD_GRADIENTS: [string, string][] = [
  ['#E2725B', '#C2410C'], // terracotta → burnt orange
  ['#FD5E53', '#E2725B'], // sunset orange → terracotta
  ['#FF7B54', '#D9534F'], // light sunset → soft red
  ['#F4A261', '#E76F51'], // sandy orange → burnt sienna
  ['#E07A5F', '#3D405B'], // soft terracotta → deep contrast (optional warm pairing)
  ['#F28482', '#F6BD60'], // light coral → warm yellow
  ['#D94A38', '#A43020'], // deep terracotta → dark rust
  ['#FF6B6B', '#C92A2A'], // bright sunset → deep red
];

const CARD_ICONS = [
  'food-apple', 'noodles', 'food-steak', 'fish', 'bowl-mix',
  'bread-slice', 'pizza', 'pot-steam', 'food-croissant', 'leaf',
];

/** Stable index derived from a string so the same recipe always gets the same card style */
function titleHash(title: string): number {
  let h = 0;
  for (let i = 0; i < title.length; i++) h = (h * 31 + title.charCodeAt(i)) >>> 0;
  return h;
}

function FilterInput({ value, setValue, placeholder, step, s, t }: { value: string, setValue: (v: string) => void, placeholder: string, step: number, s: any, t: any }) {
  const sanitizeNumeric = (v: string) => {
    let str = v.replace(/[^0-9.]/g, '');
    const parts = str.split('.');
    if (parts.length > 2) str = parts[0] + '.' + parts.slice(1).join('');
    return str;
  };
  const adjust = (delta: number) => {
    let num = parseFloat(value) || 0;
    num = Math.max(0, num + delta);
    
    if (num === 0 && placeholder === 'Max') {
      setValue('');
    } else {
      setValue(num.toString());
    }
  };

  const handleBlur = () => {
    if (parseFloat(value) === 0 && placeholder === 'Max') {
      setValue('');
    }
  };

  return (
    <View style={s.filterInputWrap}>
      <TouchableOpacity style={s.filterBtn} onPress={() => adjust(-step)}>
        <Text style={s.filterBtnText}>-</Text>
      </TouchableOpacity>
      <TextInput 
        style={s.filterInput} 
        placeholderTextColor={t.textSecondary} 
        placeholder={placeholder} 
        keyboardType="numeric" 
        value={value} 
        onChangeText={(v) => setValue(sanitizeNumeric(v))} 
        onBlur={handleBlur}
      />
      <TouchableOpacity style={s.filterBtn} onPress={() => adjust(step)}>
        <Text style={s.filterBtnText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function FeedScreen() {
  // Allow only digits and a single decimal point
  const sanitizeNumeric = (v: string) => {
    let s = v.replace(/[^0-9.]/g, '');
    const parts = s.split('.');
    if (parts.length > 2) s = parts[0] + '.' + parts.slice(1).join('');
    return s;
  };

  const [query, setQuery] = useState('');
  const [strictPantry, setStrictPantry] = useState(false);
  const [likedOnly, setLikedOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [optionsExpanded, setOptionsExpanded] = useState(false);
  const [minKcal, setMinKcal] = useState('');
  const [maxKcal, setMaxKcal] = useState('');
  const [minProtein, setMinProtein] = useState('');
  const [maxProtein, setMaxProtein] = useState('');
  const [minCarbs, setMinCarbs] = useState('');
  const [maxCarbs, setMaxCarbs] = useState('');
  const [minFat, setMinFat] = useState('');
  const [maxFat, setMaxFat] = useState('');
  const [results, setResults] = useState<{ id: string, title: string, image_url: string | null, totalKcal: number, totalProtein: number }[]>([]);
  const isDarkMode = useThemeStore((s) => s.isDarkMode);
  const t = getTheme(isDarkMode);
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const handleScroll = (event: any) => {
    setShowScrollTop(event.nativeEvent.contentOffset.y > 100);
  };

  const scrollToTop = () => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  // Re-run search whenever screen is focused OR query/filter changes
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      async function searchDatabase() {
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id || 'none';
        const q = `%${query}%`;

        let sqlStr = `
          SELECT 
            r.id, r.title, r.image_url,
            COALESCE(SUM(i.calories * ri.amount / 100), 0) as totalKcal,
            COALESCE(SUM(i.protein * ri.amount / 100), 0) as totalProtein,
            COALESCE(SUM(i.carbs * ri.amount / 100), 0) as totalCarbs,
            COALESCE(SUM(i.fat * ri.amount / 100), 0) as totalFat
          FROM recipes r
          LEFT JOIN recipe_ingredients ri ON r.id = ri.recipe_id
          LEFT JOIN ingredients i ON ri.ingredient_id = i.id
          WHERE r.title LIKE ?
            AND (r.isDeleted = 0 OR r.isDeleted IS NULL)
            AND (r.user_id = ? OR r.user_id IS NULL)
        `;
        
        const params: any[] = [q, userId];

        if (strictPantry) {
          sqlStr += `
            AND EXISTS (SELECT 1 FROM recipe_ingredients ri2 WHERE ri2.recipe_id = r.id)
            AND NOT EXISTS (
              SELECT 1 FROM recipe_ingredients ri2
              LEFT JOIN user_pantry up ON up.ingredient_id = ri2.ingredient_id
              WHERE ri2.recipe_id = r.id
                AND (up.ingredient_id IS NULL OR COALESCE(up.amount, 0) < ri2.amount)
            )
          `;
        }

        if (likedOnly) {
          sqlStr += ` AND EXISTS (SELECT 1 FROM recipe_likes rl WHERE rl.recipe_id = r.id AND rl.user_id = ?) `;
          params.push(userId);
        }

        sqlStr += ` GROUP BY r.id HAVING 1=1 `;

        const mnKcal = parseFloat(minKcal);
        if (!isNaN(mnKcal)) { sqlStr += ` AND totalKcal >= ? `; params.push(mnKcal); }
        const mxKcal = parseFloat(maxKcal);
        if (!isNaN(mxKcal)) { sqlStr += ` AND totalKcal <= ? `; params.push(mxKcal); }

        const mnProt = parseFloat(minProtein);
        if (!isNaN(mnProt)) { sqlStr += ` AND totalProtein >= ? `; params.push(mnProt); }
        const mxProt = parseFloat(maxProtein);
        if (!isNaN(mxProt)) { sqlStr += ` AND totalProtein <= ? `; params.push(mxProt); }

        const mnCarb = parseFloat(minCarbs);
        if (!isNaN(mnCarb)) { sqlStr += ` AND totalCarbs >= ? `; params.push(mnCarb); }
        const mxCarb = parseFloat(maxCarbs);
        if (!isNaN(mxCarb)) { sqlStr += ` AND totalCarbs <= ? `; params.push(mxCarb); }

        const mnFat = parseFloat(minFat);
        if (!isNaN(mnFat)) { sqlStr += ` AND totalFat >= ? `; params.push(mnFat); }
        const mxFat = parseFloat(maxFat);
        if (!isNaN(mxFat)) { sqlStr += ` AND totalFat <= ? `; params.push(mxFat); }

        sqlStr += ` ORDER BY r.createdAt DESC LIMIT 50 `;

        const records = await expoDb.getAllAsync<{ id: string, title: string, image_url: string | null, totalKcal: number, totalProtein: number }>(sqlStr, params);
        if (!cancelled) setResults(records);
      }

      const timeout = setTimeout(searchDatabase, 80);
      return () => { cancelled = true; clearTimeout(timeout); };
    }, [query, strictPantry, likedOnly, minKcal, maxKcal, minProtein, maxProtein, minCarbs, maxCarbs, minFat, maxFat])
  );


  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg, paddingTop: insets.top },
    headerTitle: { color: t.textPrimary, fontSize: 24, fontWeight: 'bold', marginHorizontal: 16, marginBottom: 16 },
    controlDeck: { flex: 1, backgroundColor: t.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16 },
    headerRow: { flexDirection: 'row', alignItems: 'stretch', gap: 10, marginBottom: 16 },
    searchInput: { flex: 1, backgroundColor: t.bg, color: t.textPrimary, padding: 16, borderRadius: 12, fontSize: 16, minHeight: 60, borderWidth: 1, borderColor: t.border },
    iconToggle: {
      backgroundColor: t.bg,
      flex: 1, height: 60, borderRadius: 12,
      justifyContent: 'center', alignItems: 'center',
      borderWidth: 1, borderColor: t.border,
    },
    iconToggleActive: {
      backgroundColor: t.accentSoft,
      borderColor: t.accent,
    },
    filterBox: { backgroundColor: t.surface, padding: 16, borderRadius: 12, marginBottom: 16, borderColor: t.border, borderWidth: 1 },
    filterGroup: { marginBottom: 16 },
    filterGroupTitle: { color: t.textPrimary, fontWeight: 'bold', marginBottom: 8, textTransform: 'uppercase', fontSize: 12, letterSpacing: 0.5 },
    filterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    toText: { color: t.textSecondary, fontSize: 14, fontWeight: 'bold' },
    filterBtn: { backgroundColor: t.bg, borderWidth: 1, borderColor: t.border, borderRadius: 8, paddingHorizontal: 10, height: 36, justifyContent: 'center', alignItems: 'center' },
    filterBtnText: { color: t.textPrimary, fontSize: 16, fontWeight: 'bold' },
    filterInputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
    filterInput: { flex: 1, backgroundColor: t.bg, color: t.textPrimary, height: 36, borderRadius: 8, fontSize: 14, borderWidth: 1, borderColor: t.border, textAlign: 'center', padding: 0 },
    recipeCard: { backgroundColor: t.bg, borderRadius: 16, marginBottom: 16, minHeight: 200, justifyContent: 'flex-end', borderWidth: 1, borderColor: t.border, overflow: 'hidden' },
    cardOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.2)' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 2, backgroundColor: isDarkMode ? t.surface : '#F4EBE1', padding: 16 },
    recipeTitle: { color: t.textPrimary, fontSize: 26, fontWeight: 'bold', fontFamily: 'serif', flex: 1, marginRight: 8 },
    macroPill: { color: '#fff', fontSize: 12, fontWeight: 'bold', backgroundColor: t.accent, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, overflow: 'hidden' },
    emptyText: { color: t.textSecondary, textAlign: 'center', marginTop: 20 },
    fab: { position: 'absolute', bottom: 24, right: 24, width: 64, height: 64, borderRadius: 32, backgroundColor: t.accent, justifyContent: 'center', alignItems: 'center', elevation: 8 },
  });

  return (
    <View style={s.container}>
      <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 16, marginBottom: 16}}>
        <Text style={[s.headerTitle, {marginHorizontal: 0, marginBottom: 0}]}>Recipes</Text>
        <TouchableOpacity style={{padding: 8}} onPress={() => { router.push('/chat'); }}>
           <MaterialCommunityIcons name="robot-outline" size={28} color={t.accent} />
        </TouchableOpacity>
      </View>
      <View style={s.controlDeck}>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
          <View style={{ flex: 1 }}>
            <TextInput
              style={s.searchInput}
              placeholder="Search recipes..."
              placeholderTextColor={t.textSecondary}
              value={query}
              onChangeText={setQuery}
            />
          </View>
          <TouchableOpacity 
            style={[s.iconToggle, { flex: undefined, width: 60, height: 60 }]} 
            onPress={() => setOptionsExpanded(!optionsExpanded)}
          >
            <MaterialCommunityIcons name={optionsExpanded ? 'chevron-up' : 'chevron-down'} size={28} color={t.textSecondary} />
          </TouchableOpacity>
        </View>

        {optionsExpanded && (
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
            <TouchableOpacity style={[s.iconToggle, showFilters && s.iconToggleActive]} onPress={() => { setShowFilters(v => !v); }}>
              <MaterialCommunityIcons name="filter-variant" size={28} color={showFilters ? t.accent : t.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={[s.iconToggle, strictPantry && s.iconToggleActive]} onPress={() => { setStrictPantry(v => !v); }}>
              <MaterialCommunityIcons name={strictPantry ? "fridge" : "fridge-outline"} size={28} color={strictPantry ? t.accent : t.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={[s.iconToggle, likedOnly && s.iconToggleActive]} onPress={() => { setLikedOnly(v => !v); }}>
              <MaterialCommunityIcons name={likedOnly ? "heart" : "heart-outline"} size={28} color={likedOnly ? t.accent : t.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={s.iconToggle} onPress={() => router.push('/playlists')}>
              <MaterialCommunityIcons name="bookshelf" size={28} color={t.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        {showFilters && (
          <View style={s.filterBox}>
            <View style={s.filterGroup}>
              <Text style={s.filterGroupTitle}>Calories</Text>
              <View style={s.filterRow}>
                <FilterInput value={minKcal} setValue={setMinKcal} placeholder="Min" step={50} s={s} t={t} />
                <Text style={s.toText}>to</Text>
                <FilterInput value={maxKcal} setValue={setMaxKcal} placeholder="Max" step={50} s={s} t={t} />
              </View>
            </View>

            <View style={s.filterGroup}>
              <Text style={s.filterGroupTitle}>Protein (g)</Text>
              <View style={s.filterRow}>
                <FilterInput value={minProtein} setValue={setMinProtein} placeholder="Min" step={5} s={s} t={t} />
                <Text style={s.toText}>to</Text>
                <FilterInput value={maxProtein} setValue={setMaxProtein} placeholder="Max" step={5} s={s} t={t} />
              </View>
            </View>

            <View style={s.filterGroup}>
              <Text style={s.filterGroupTitle}>Carbs (g)</Text>
              <View style={s.filterRow}>
                <FilterInput value={minCarbs} setValue={setMinCarbs} placeholder="Min" step={5} s={s} t={t} />
                <Text style={s.toText}>to</Text>
                <FilterInput value={maxCarbs} setValue={setMaxCarbs} placeholder="Max" step={5} s={s} t={t} />
              </View>
            </View>

            <View style={[s.filterGroup, { marginBottom: 0 }]}>
              <Text style={s.filterGroupTitle}>Fat (g)</Text>
              <View style={s.filterRow}>
                <FilterInput value={minFat} setValue={setMinFat} placeholder="Min" step={5} s={s} t={t} />
                <Text style={s.toText}>to</Text>
                <FilterInput value={maxFat} setValue={setMaxFat} placeholder="Max" step={5} s={s} t={t} />
              </View>
            </View>
          </View>
        )}

        <FlatList
          ref={listRef}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          indicatorStyle={isDarkMode ? 'white' : 'black'}
          scrollIndicatorInsets={{ right: 2 }}
          style={{ marginHorizontal: -16 }}
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
          renderItem={({ item }) => {
            const hash = titleHash(item.title);
            const gradient = CARD_GRADIENTS[hash % CARD_GRADIENTS.length];
            const icon = CARD_ICONS[hash % CARD_ICONS.length] as any;
            return (
              <TouchableOpacity style={s.recipeCard} onPress={() => router.push(`/recipe/${item.id}`)}>
                {item.image_url ? (
                  <Image source={{ uri: item.image_url }} style={StyleSheet.absoluteFillObject} />
                ) : (
                  <View style={[StyleSheet.absoluteFillObject, { backgroundColor: t.accent, borderRadius: 16, justifyContent: 'flex-start', alignItems: 'flex-end', padding: 16 }]}>
                    <MaterialCommunityIcons name={icon} size={64} color="rgba(255,255,255,0.15)" />
                  </View>
                )}
                <View style={s.cardOverlay} />
                <View style={s.cardHeader}>
                  <Text style={s.recipeTitle}>{item.title}</Text>
                  <Text style={s.macroPill}>{item.totalKcal.toFixed(0)} kcal | P:{item.totalProtein.toFixed(0)}g</Text>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={<Text style={s.emptyText}>No recipes found.</Text>}
        />

        {showScrollTop && (
          <TouchableOpacity style={[s.fab, { bottom: 100, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border }]} onPress={scrollToTop}>
            <MaterialCommunityIcons name="chevron-up" size={32} color={t.textPrimary} />
          </TouchableOpacity>
        )}

        <TouchableOpacity style={s.fab} onPress={async () => {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) router.push('/profile'); else router.push('/recipe/create');
        }}>
          <MaterialCommunityIcons name="plus" size={32} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
