import { View, Text, StyleSheet, FlatList, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { db } from '@/db';
import { playlists, playlistRecipes, recipes } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { useThemeStore } from '@/store/themeStore';
import { getTheme } from '@/lib/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PlaylistsScreen() {
  const isDarkMode = useThemeStore((s) => s.isDarkMode);
  const t = getTheme(isDarkMode);
  const insets = useSafeAreaInsets();
  const [userPlaylists, setUserPlaylists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      async function loadPlaylists() {
        setLoading(true);
        try {
          const { data: authData } = await supabase.auth.getUser();
          if (!authData.user) {
            setUserPlaylists([]);
            return;
          }
          
          const uid = authData.user.id;
          
          // Get all playlists
          const pRecords = await db.select().from(playlists).where(eq(playlists.userId, uid)).execute();
          
          // Count recipes in each
          const prRecords = await db.select().from(playlistRecipes).execute();
          const countMap = new Map();
          for (const pr of prRecords) {
            countMap.set(pr.playlistId, (countMap.get(pr.playlistId) || 0) + 1);
          }
          
          const enriched = pRecords.map(p => ({
            ...p,
            recipeCount: countMap.get(p.id) || 0
          }));
          
          setUserPlaylists(enriched);
        } catch(e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      }
      loadPlaylists();
    }, [])
  );

  return (
    <View style={[s.container, { backgroundColor: t.bg, paddingTop: Math.max(insets.top, 24) }]}>
      <Text style={[s.header, { color: t.textPrimary }]}>Playlists</Text>
      
      {loading ? null : userPlaylists.length === 0 ? (
        <View style={s.emptyState}>
          <MaterialCommunityIcons name="bookshelf" size={64} color={t.border} />
          <Text style={[s.emptyText, { color: t.textSecondary }]}>No playlists yet.</Text>
          <Text style={[s.emptySub, { color: t.textSecondary }]}>Save recipes to playlists to see them here.</Text>
        </View>
      ) : (
        <FlatList
          data={userPlaylists}
          keyExtractor={item => item.id}
          contentContainerStyle={s.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[s.card, { backgroundColor: t.surface, borderColor: t.border }]}
              onPress={() => router.push(`/playlist/${item.id}`)}
            >
              <View style={s.cardLeft}>
                <View>
                  <Text style={[s.cardTitle, { color: t.textPrimary }]}>{item.name}</Text>
                  <Text style={[s.cardSub, { color: t.textSecondary }]}>{item.recipeCount} {item.recipeCount === 1 ? 'recipe' : 'recipes'}</Text>
                </View>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color={t.textSecondary} />
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { fontSize: 32, fontWeight: 'bold', paddingHorizontal: 24, paddingBottom: 16 },
  listContent: { padding: 24, gap: 16 },
  card: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 20, borderWidth: 1 },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  cardSub: { fontSize: 14 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 20, fontWeight: 'bold', marginTop: 16, marginBottom: 8 },
  emptySub: { fontSize: 16, textAlign: 'center', lineHeight: 24 }
});
