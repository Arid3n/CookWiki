import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList, TouchableOpacity, SectionList } from 'react-native';
import { db } from '@/db';
import { ingredients } from '@/db/schema';
import { like, eq, and, asc } from 'drizzle-orm';
import { updatePantryAmount, getPantryIngredientIds } from '@/db/pantry';
import { useThemeStore } from '@/store/themeStore';
import { getTheme } from '@/lib/theme';
import { useFocusEffect, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function PantryScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ id: string, name: string }[]>([]);
  const [localPantry, setLocalPantry] = useState<Map<string, number>>(new Map());
  const isDarkMode = useThemeStore((s) => s.isDarkMode);
  const t = getTheme(isDarkMode);
  const listRef = useRef<SectionList>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const handleScroll = (event: any) => {
    setShowScrollTop(event.nativeEvent.contentOffset.y > 100);
  };

  const scrollToTop = () => {
    listRef.current?.scrollToLocation({ sectionIndex: 0, itemIndex: 0, animated: true });
  };

  const loadPantry = async () => {
    const map = await getPantryIngredientIds();
    setLocalPantry(map);
  };

  useFocusEffect(
    useCallback(() => {
      loadPantry();
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      async function searchDatabase() {
         const records = query.trim() === ''
           ? await db.select().from(ingredients).where(eq(ingredients.isDeleted, false)).orderBy(asc(ingredients.name))
           : await db.select().from(ingredients).where(and(like(ingredients.name, `%${query}%`), eq(ingredients.isDeleted, false))).orderBy(asc(ingredients.name));
         if (!cancelled) setResults(records);
      }
      const timeout = setTimeout(searchDatabase, 80);
      return () => { cancelled = true; clearTimeout(timeout); };
    }, [query])
  );

  const handleUpdateAmount = async (ingredientId: string, amount: number) => {
    await updatePantryAmount(ingredientId, amount);
    await loadPantry();
  };

  const inPantryCount = localPantry.size;

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg, paddingTop: insets.top },
    headerTitle: { color: t.textPrimary, fontSize: 24, fontWeight: 'bold', marginHorizontal: 16, marginBottom: 16 },
    countBadge: { color: t.accent, fontWeight: 'bold', fontSize: 14 },
    controlDeck: { flex: 1, padding: 16, backgroundColor: t.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
    searchInput: { backgroundColor: t.bg, color: t.textPrimary, padding: 16, borderRadius: 12, fontSize: 16, marginBottom: 16, borderWidth: 1, borderColor: t.border, minHeight: 60 },
    card: { backgroundColor: t.bg, padding: 20, borderRadius: 12, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 60, borderWidth: 1, borderColor: t.border },
    cardActive: { backgroundColor: t.accentSoft, borderColor: t.accent },
    cardName: { color: t.textPrimary, fontSize: 18, fontWeight: 'bold', flex: 1 },
    statusText: { color: t.accent, fontWeight: 'bold', fontSize: 18, paddingHorizontal: 14 },
    emptyText: { color: t.textSecondary, textAlign: 'center', marginTop: 20 },
    amountBtn: { backgroundColor: t.bg, borderWidth: 1, borderColor: t.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4 },
    amountBtnText: { color: t.textPrimary, fontSize: 18, fontWeight: 'bold' },
    amountInput: { color: t.textPrimary, fontSize: 16, fontWeight: 'bold', marginHorizontal: 4, textAlign: 'center', minWidth: 50, borderWidth: 1, borderColor: t.border, borderRadius: 8, padding: 4, backgroundColor: t.bg },
    addBtn: { backgroundColor: t.bg, borderWidth: 1, borderColor: t.border, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    fab: { position: 'absolute', bottom: 24, right: 24, width: 64, height: 64, borderRadius: 32, backgroundColor: t.surface, justifyContent: 'center', alignItems: 'center', elevation: 8, borderWidth: 1, borderColor: t.border },
  });

  const PantryItemRow = ({ item, amount }: { item: any, amount: number }) => {
    const [inp, setInp] = useState(amount.toString());
    useEffect(() => { setInp(amount.toString()); }, [amount]);

    return (
      <View style={[s.card, amount > 0 && s.cardActive]}>
        <Text style={s.cardName}>{item.name}</Text>
        {amount > 0 ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <TouchableOpacity onPress={() => handleUpdateAmount(item.id, amount - 50)} style={s.amountBtn}>
              <Text style={s.amountBtnText}>-</Text>
            </TouchableOpacity>
            <TextInput
              style={s.amountInput}
              keyboardType="numeric"
              value={inp}
              onChangeText={setInp}
              onEndEditing={() => {
                const parsed = parseInt(inp);
                if (!isNaN(parsed)) handleUpdateAmount(item.id, parsed);
                else setInp(amount.toString());
              }}
            />
            <TouchableOpacity onPress={() => handleUpdateAmount(item.id, amount + 50)} style={s.amountBtn}>
              <Text style={s.amountBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={() => handleUpdateAmount(item.id, 100)} style={s.addBtn}>
            <Text style={s.statusText}>+</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={s.container}>
      <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 16, marginBottom: 16}}>
        <Text style={[s.headerTitle, {marginHorizontal: 0, marginBottom: 0}]}>Pantry</Text>
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
        <SectionList
          ref={listRef}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          indicatorStyle={isDarkMode ? 'white' : 'black'}
          scrollIndicatorInsets={{ right: 2 }}
          style={{ marginHorizontal: -16 }}
          sections={[
            { title: `My items (${inPantryCount})`, data: results.filter(i => (localPantry.get(i.id) || 0) > 0), isMyItems: true },
            { title: 'Other Ingredients', data: results.filter(i => (localPantry.get(i.id) || 0) === 0), isMyItems: false }
          ]}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 60 }}
          renderSectionHeader={({ section }) => {
            if (section.isMyItems) {
               return <Text style={{ color: t.accent, marginTop: 16, marginBottom: 8, fontWeight: 'bold', fontSize: 16, textTransform: 'uppercase' }}>{section.title}</Text>;
            } else {
               if (section.data.length === 0) return null;
               return (
                 <View>
                   <View style={{ height: 1, backgroundColor: t.border, marginVertical: 16 }} />
                   <Text style={{ color: t.accent, marginBottom: 8, fontWeight: 'bold', fontSize: 16, textTransform: 'uppercase' }}>{section.title}</Text>
                 </View>
               );
            }
          }}
          renderItem={({ item }) => {
            const amount = localPantry.get(item.id) || 0;
            return <PantryItemRow item={item} amount={amount} />;
          }}
          ListEmptyComponent={<Text style={s.emptyText}>No ingredients found.</Text>}
        />
        {showScrollTop && (
          <TouchableOpacity style={s.fab} onPress={scrollToTop}>
            <MaterialCommunityIcons name="chevron-up" size={32} color={t.textPrimary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
