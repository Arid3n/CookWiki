import { useLocalSearchParams, router } from 'expo-router';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, useWindowDimensions, Alert } from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { db } from '@/db';
import { playlists, playlistRecipes, recipes } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { useThemeStore } from '@/store/themeStore';
import { getTheme } from '@/lib/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PlaylistDetailScreen() {
  const { id } = useLocalSearchParams();
  const isDarkMode = useThemeStore((s) => s.isDarkMode);
  const t = getTheme(isDarkMode);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  
  const [playlist, setPlaylist] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      async function loadData() {
        setLoading(true);
        try {
          const pRecords = await db.select().from(playlists).where(eq(playlists.id, id as string)).limit(1);
          if (pRecords.length === 0) return;
          setPlaylist(pRecords[0]);

          const joinRecords = await db
            .select({
              recipe: recipes
            })
            .from(playlistRecipes)
            .innerJoin(recipes, eq(playlistRecipes.recipeId, recipes.id))
            .where(eq(playlistRecipes.playlistId, id as string))
            .execute();
            
          setItems(joinRecords.map(r => r.recipe).filter(r => r.isDeleted === false));
        } catch(e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      }
      loadData();
    }, [id])
  );

  const numColumns = width > 600 ? 3 : 2;

  const handleDelete = () => {
    Alert.alert('Delete Playlist', 'Are you sure you want to delete this playlist?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await db.delete(playlistRecipes).where(eq(playlistRecipes.playlistId, id as string)).execute();
          await db.delete(playlists).where(eq(playlists.id, id as string)).execute();
          
          await supabase.from('playlist_recipes').delete().eq('playlist_id', id as string);
          await supabase.from('playlists').delete().eq('id', id as string);
          
          router.back();
        } catch (e) {}
      }}
    ]);
  };

  return (
    <View style={[s.container, { backgroundColor: t.bg }]}>
      <View style={[s.navBar, { paddingTop: Math.max(insets.top, 16) }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={t.textPrimary} />
        </TouchableOpacity>
        {playlist && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={[s.headerTitle, { color: t.textPrimary }]}>{playlist.name}</Text>
          </View>
        )}
        {playlist ? (
          <TouchableOpacity onPress={handleDelete} style={{ padding: 8 }}>
            <MaterialCommunityIcons name="trash-can" size={24} color={t.destructive} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {!loading && items.length === 0 ? (
        <View style={s.emptyState}>
          <MaterialCommunityIcons name="file-document-outline" size={64} color={t.border} />
          <Text style={[s.emptyText, { color: t.textSecondary }]}>This playlist is empty.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => item.id}
          numColumns={numColumns}
          key={`col-${numColumns}`}
          contentContainerStyle={s.listContent}
          columnWrapperStyle={s.columnWrapper}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[s.recipeCard, { backgroundColor: t.surface, borderColor: t.border, width: (width - 48 - (numColumns - 1) * 16) / numColumns }]}
              onPress={() => router.push(`/recipe/${item.id}`)}
            >
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={s.cardImage} />
              ) : (
                <View style={[s.placeholderImage, { backgroundColor: t.bg }]}>
                  <MaterialCommunityIcons name="silverware-fork-knife" size={24} color={t.textSecondary} />
                </View>
              )}
              <View style={s.cardContent}>
                <Text style={[s.cardTitle, { color: t.textPrimary }]} numberOfLines={2}>{item.title}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  navBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 16 },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  listContent: { padding: 24, gap: 16 },
  columnWrapper: { gap: 16 },
  recipeCard: { borderRadius: 20, overflow: 'hidden', borderWidth: 1 },
  cardImage: { width: '100%', aspectRatio: 1 },
  placeholderImage: { width: '100%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center' },
  cardContent: { padding: 12 },
  cardTitle: { fontSize: 16, fontWeight: 'bold' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 18, marginTop: 16, textAlign: 'center' }
});
