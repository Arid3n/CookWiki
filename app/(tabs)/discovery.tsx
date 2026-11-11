import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { findMissingLinkRecipes, MissingLinkResult } from '@/db/discovery';
import { supabase } from '@/lib/supabase';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeStore } from '@/store/themeStore';
import { getTheme } from '@/lib/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DiscoveryTab() {
  const insets = useSafeAreaInsets();
  const isDarkMode = useThemeStore((s) => s.isDarkMode);
  const t = getTheme(isDarkMode);
  
  const [results, setResults] = useState<MissingLinkResult[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDiscoveries = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || null;
      
      const records = await findMissingLinkRecipes(userId);
      setResults(records);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDiscoveries();
    }, [])
  );

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg },
    headerBox: { paddingTop: insets.top + 24, paddingHorizontal: 24, paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: t.border, backgroundColor: t.surface },
    headerTitle: { color: t.textPrimary, fontSize: 24, fontWeight: 'bold', marginTop: 12 },
    headerSubtitle: { color: t.textSecondary, fontSize: 14, marginTop: 4 },
    listContent: { padding: 16, paddingBottom: 100 },
    card: { backgroundColor: t.surface, padding: 24, borderRadius: 16, marginBottom: 16, elevation: 4, borderWidth: 1, borderColor: t.border },
    promptText: { color: t.textSecondary, fontSize: 16, lineHeight: 24 },
    highlight: { color: t.accent, fontWeight: 'bold' },
    recipeTitle: { color: t.textPrimary, fontSize: 22, fontWeight: 'bold', marginTop: 12 },
    emptyText: { color: t.textSecondary, textAlign: 'center', marginTop: 40, lineHeight: 24 }
  });

  return (
    <View style={styles.container}>
      <View style={styles.headerBox}>
        <MaterialCommunityIcons name="compass-outline" size={32} color={t.accent} />
        <Text style={styles.headerTitle}>Algorithmic Discovery</Text>
        <Text style={styles.headerSubtitle}>Math Engine isolated these exact limits.</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={t.accent} size="large" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.recipe_id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.card}
              onPress={() => router.push(`/recipe/${item.recipe_id}`)}
            >
              <MaterialCommunityIcons name="link-variant" size={24} color={t.accent} style={{ marginBottom: 16 }} />
              <Text style={styles.promptText}>
                You only need <Text style={styles.highlight}>{item.missing_amount}g</Text> of <Text style={styles.highlight}>{item.missing_ingredient_name}</Text> to mathematically unlock:
              </Text>
              <Text style={styles.recipeTitle}>{item.recipe_title}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No single-node gaps mathematically generated against your local pantry scope.</Text>
          }
        />
      )}
    </View>
  );
}
