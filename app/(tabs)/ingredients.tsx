import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { db } from '@/db';
import { ingredients, recipeIngredients, userPantry } from '@/db/schema';
import { like, eq, and, asc, or, isNull } from 'drizzle-orm';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useThemeStore } from '@/store/themeStore';
import { getTheme } from '@/lib/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function IngredientsScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ id: string, name: string, protein: number, carbs: number, fat: number, calories: number, isGlobal: boolean }[]>([]);
  const isDarkMode = useThemeStore((s) => s.isDarkMode);
  const t = getTheme(isDarkMode);
  const listRef = useRef<FlatList>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const handleScroll = (event: any) => {
    setShowScrollTop(event.nativeEvent.contentOffset.y > 100);
  };

  const scrollToTop = () => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      async function searchDatabase() {
         let records;
         if (query.trim() === '') {
            records = await db.select().from(ingredients).where(or(eq(ingredients.isDeleted, false), isNull(ingredients.isDeleted))).orderBy(asc(ingredients.name));
         } else {
            records = await db.select().from(ingredients).where(and(like(ingredients.name, `%${query}%`), or(eq(ingredients.isDeleted, false), isNull(ingredients.isDeleted)))).orderBy(asc(ingredients.name));
         }
         if (!cancelled) setResults(records as any);
      }
      const timeout = setTimeout(searchDatabase, 80);
      return () => { cancelled = true; clearTimeout(timeout); };
    }, [query])
  );

  const handleDelete = async (id: string, name: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('user_pantry').delete().eq('ingredient_id', id);
        await supabase.from('recipe_ingredients').delete().eq('ingredient_id', id);
        const { error } = await supabase.from('ingredients').delete().eq('id', id);
        if (error) {
           Alert.alert("Cloud Error", error.message);
        }
      }

      await db.delete(userPantry).where(eq(userPantry.ingredientId, id)).execute();
      await db.delete(recipeIngredients).where(eq(recipeIngredients.ingredientId, id)).execute();
      await db.delete(ingredients).where(eq(ingredients.id, id)).execute();

      setQuery(q => q + ' ');
      setTimeout(() => setQuery(q => q.trim()), 10);
    } catch (e: any) {
      console.error(e);
      Alert.alert("Error", e.message);
    }
  };

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg, paddingTop: insets.top },
    headerTitle: { color: t.textPrimary, fontSize: 24, fontWeight: 'bold', marginHorizontal: 16, marginBottom: 16 },
    controlDeck: { flex: 1, padding: 16, backgroundColor: t.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
    searchInput: { backgroundColor: t.bg, color: t.textPrimary, padding: 16, borderRadius: 12, fontSize: 16, marginBottom: 16, borderWidth: 1, borderColor: t.border, minHeight: 60 },
    ingredientCard: { backgroundColor: t.bg, padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: t.border, flexDirection: 'row', alignItems: 'center' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    ingredientName: { color: t.textPrimary, fontSize: 18, fontWeight: 'bold' },
    macroRow: { flexDirection: 'row', gap: 10 },
    macroChip: { backgroundColor: t.accentSoft, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6 },
    macroText: { color: t.accent, fontSize: 11, fontWeight: 'bold' },
    emptyText: { color: t.textSecondary, textAlign: 'center', marginTop: 20 },
    fab: { position: 'absolute', bottom: 24, right: 24, width: 64, height: 64, borderRadius: 32, backgroundColor: t.accent, justifyContent: 'center', alignItems: 'center', elevation: 8 },

  });

  return (
    <View style={s.container}>
      <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 16, marginBottom: 16}}>
        <Text style={[s.headerTitle, {marginHorizontal: 0, marginBottom: 0}]}>Ingredients</Text>
        <TouchableOpacity style={{padding: 8}} onPress={() => { router.push('/chat'); }}>
           <MaterialCommunityIcons name="robot-outline" size={28} color={t.accent} />
        </TouchableOpacity>
      </View>
      <View style={s.controlDeck}>
        <TextInput
          style={s.searchInput}
          placeholder="Search ingredients..."
          placeholderTextColor={t.textSecondary}
          value={query}
          onChangeText={setQuery}
        />
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
          renderItem={({ item }) => (
            <TouchableOpacity style={s.ingredientCard}>
              <View style={{ flex: 1 }}>
                <View style={s.cardHeader}>
                  <Text style={s.ingredientName}>{item.name}</Text>
                </View>
                <View style={s.macroRow}>
                  <View style={s.macroChip}><Text style={s.macroText}>P: {item.protein ?? 0}g</Text></View>
                  <View style={s.macroChip}><Text style={s.macroText}>C: {item.carbs ?? 0}g</Text></View>
                  <View style={s.macroChip}><Text style={s.macroText}>F: {item.fat ?? 0}g</Text></View>
                  <View style={s.macroChip}><Text style={s.macroText}>{item.calories ?? 0} kcal</Text></View>
                </View>
              </View>
              {!item.isGlobal && (
                <TouchableOpacity
                  style={{ width: 42, height: 42, borderRadius: 10, backgroundColor: t.bg, borderWidth: 1, borderColor: t.border, justifyContent: 'center', alignItems: 'center', marginLeft: 12 }}
                  onPress={() => handleDelete(item.id, item.name)}
                >
                  <MaterialCommunityIcons name="trash-can-outline" size={24} color={t.textSecondary} />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={s.emptyText}>No ingredients found.</Text>}
        />
        {showScrollTop && (
          <TouchableOpacity style={[s.fab, { bottom: 100, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border }]} onPress={scrollToTop}>
            <MaterialCommunityIcons name="chevron-up" size={32} color={t.textPrimary} />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={s.fab} onPress={async () => {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) router.push('/profile'); else router.push('/ingredient/create');
        }}>
          <MaterialCommunityIcons name="plus" size={32} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
