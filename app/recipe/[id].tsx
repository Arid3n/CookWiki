import { useLocalSearchParams, router } from 'expo-router';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Image, Modal, FlatList, useWindowDimensions, TextInput } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as crypto from 'expo-crypto';
import { db, expoDb } from '@/db';
import { recipes, recipeLikes, recipeLogs, recipeIngredients, playlists, playlistRecipes } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { updatePantryAmount, getPantryIngredientIds } from '@/db/pantry';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import * as ScreenOrientation from 'expo-screen-orientation';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '@/store/themeStore';
import { getTheme } from '@/lib/theme';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

/**
 * Parse instructions stored as "1. step\n2. step\n..." into an array of step strings.
 * Falls back gracefully to a single-item array for old free-text recipes.
 */
function parseSteps(raw: string | null | undefined): string[] {
  if (!raw || !raw.trim()) return [];
  const lines = raw.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  // Check if lines follow numbered format ("1. ", "2. ", …)
  const numbered = lines.every(l => /^\d+\.\s/.test(l));
  if (numbered) return lines.map(l => l.replace(/^\d+\.\s*/, ''));
  // Legacy free-text: return as a single step
  return [raw.trim()];
}

export default function RecipeScreen() {
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const isDarkMode = useThemeStore((s) => s.isDarkMode);
  const t = getTheme(isDarkMode);
  const [recipe, setRecipe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [recipeIngredientsList, setRecipeIngredientsList] = useState<any[]>([]);
  const [isLiked, setIsLiked] = useState(false);
  const [localPantry, setLocalPantry] = useState<Map<string, number>>(new Map());
  const [desiredServings, setDesiredServings] = useState<number>(1);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isLandscape = windowWidth > windowHeight;
  const [isCooking, setIsCooking] = useState(false);

  // Substitution state
  const [subTarget, setSubTarget] = useState<any>(null);
  const [subLoading, setSubLoading] = useState(false);
  const [subResult, setSubResult] = useState<{ name: string; reason: string; protein: number; carbs: number; fat: number; calories: number } | null>(null);
  const [overrides, setOverrides] = useState<Map<string, any>>(new Map());
  const [macroExpanded, setMacroExpanded] = useState(false);
  const [macroMode, setMacroMode] = useState<'serving' | '100g'>('serving');
  const [stepListWidth, setStepListWidth] = useState<number>(0);

  // Playlist State
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [userPlaylists, setUserPlaylists] = useState<any[]>([]);
  const [activePlaylists, setActivePlaylists] = useState<Set<string>>(new Set());
  const [newPlaylistName, setNewPlaylistName] = useState('');

  useEffect(() => {
    if (isCooking) {
      activateKeepAwakeAsync().catch(() => {});
      ScreenOrientation.unlockAsync().catch(() => {});
    } else {
      deactivateKeepAwake().catch(() => {});
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    }
    return () => { 
      deactivateKeepAwake().catch(() => {}); 
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    };
  }, [isCooking]);

  const handleSubstitute = async (item: any) => {
    setSubTarget(item);
    setSubResult(null);
    setSubLoading(true);

    try {
      const apiKey = await SecureStore.getItemAsync('openai_api_key');
      const modelName = (await SecureStore.getItemAsync('ai_model_name')) || 'gemini-2.5-flash';

      if (!apiKey) {
        Alert.alert('No API Key', 'Please set your API key in the Chat settings.');
        setSubLoading(false);
        return;
      }

      const prompt = `You are a culinary assistant. The recipe calls for "${item.name}" (${(item.amount).toFixed(1)} ${item.unit}).
Suggest ONE common pantry substitute that would work in this dish. Respond ONLY with a JSON object in this exact format (no extra text):
{
  "name": "Substitute Name",
  "reason": "One sentence explanation of why it works as a substitute",
  "protein": 0,
  "carbs": 0,
  "fat": 0,
  "calories": 0
}
The macros should be per 100g of the substitute.`;

      let rawText: string | null = null;

      if (apiKey.startsWith('AIza')) {
        // Gemini via Google API
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }] }),
          }
        );
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
      } else {
        // OpenAI-compatible (OpenAI, OpenRouter, etc.)
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: modelName.startsWith('gemini') ? 'gpt-3.5-turbo' : modelName,
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' },
          }),
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        rawText = data.choices?.[0]?.message?.content ?? null;
      }

      if (rawText) {
        // Strip markdown code fences if present
        const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || rawText.match(/(\{[\s\S]*\})/);
        const parsed = JSON.parse(jsonMatch ? jsonMatch[1] : rawText);
        setSubResult(parsed);
      } else {
        Alert.alert('Error', 'Could not get a suggestion. Try again.');
        setSubTarget(null);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
      setSubTarget(null);
    } finally {
      setSubLoading(false);
    }
  };

  const applySubstitute = () => {
    if (!subTarget || !subResult) return;
    const newItem = {
      ...subTarget,
      name: subResult.name,
      protein: subResult.protein,
      carbs: subResult.carbs,
      fat: subResult.fat,
      calories: subResult.calories,
      _substituted: true,
    };
    setOverrides(prev => new Map(prev).set(subTarget.ingredient_id, newItem));
    setSubTarget(null);
    setSubResult(null);
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUser(data.user?.id || null);
    });
  }, []);

  const loadIngredients = useCallback(async () => {
    if (!id) return;
    const sql = `SELECT ri.ingredient_id, ri.amount, ri.unit, i.name, i.protein, i.carbs, i.fat, i.calories 
                 FROM recipe_ingredients ri 
                 JOIN ingredients i ON ri.ingredient_id = i.id 
                 WHERE ri.recipe_id = ? AND (ri.isDeleted = 0 OR ri.isDeleted IS NULL)`;
    const records = await expoDb.getAllAsync<{
      ingredient_id: string; amount: number; unit: string; name: string;
      protein: number; carbs: number; fat: number; calories: number;
    }>(sql, [id as string]);
    setRecipeIngredientsList(records);
  }, [id]);

  useEffect(() => {
    async function locateRecipe() {
      if (!id) return;
      try {
        const result = await db.select().from(recipes).where(eq(recipes.id, id as string)).limit(1);
        if (result.length > 0) {
          setRecipe(result[0]);
          setDesiredServings(result[0].servings || 1);
        }
        await loadIngredients();

        const pantryMap = await getPantryIngredientIds();
        setLocalPantry(pantryMap);

        const { data: authData } = await supabase.auth.getUser();
        if (authData.user) {
          const uId = authData.user.id;
          const likeRecord = await db.select().from(recipeLikes).where(and(eq(recipeLikes.recipeId, id as string), eq(recipeLikes.userId, uId))).limit(1);
          setIsLiked(likeRecord.length > 0);

          const pRecords = await db.select().from(playlists).where(eq(playlists.userId, uId)).execute();
          setUserPlaylists(pRecords);

          const prRecords = await db
            .select({ playlistId: playlistRecipes.playlistId })
            .from(playlistRecipes)
            .innerJoin(playlists, eq(playlists.id, playlistRecipes.playlistId))
            .where(eq(playlistRecipes.recipeId, id as string))
            .execute();
            
          setActivePlaylists(new Set(prRecords.map(pr => pr.playlistId)));
        }
      } catch (err) {
        console.error('Recipe load error:', err);
      } finally {
        setLoading(false);
      }
    }
    locateRecipe();
  }, [id, loadIngredients]);

  const handleTogglePlaylist = async (playlistId: string) => {
    if (!id || !currentUser) return;
    const isAdded = activePlaylists.has(playlistId);
    try {
      if (isAdded) {
        await db.delete(playlistRecipes).where(and(eq(playlistRecipes.recipeId, id as string), eq(playlistRecipes.playlistId, playlistId))).execute();
        await supabase.from('playlist_recipes').delete().eq('recipe_id', id as string).eq('playlist_id', playlistId);
        const next = new Set(activePlaylists);
        next.delete(playlistId);
        setActivePlaylists(next);
      } else {
        await db.insert(playlistRecipes).values({ playlistId, recipeId: id as string, addedAt: Date.now() }).execute();
        await supabase.from('playlist_recipes').insert({ playlist_id: playlistId, recipe_id: id as string, added_at: Date.now() });
        const next = new Set(activePlaylists);
        next.add(playlistId);
        setActivePlaylists(next);
      }
    } catch(e) {}
  };

  const handleCreatePlaylist = async () => {
    if (!currentUser || !newPlaylistName.trim()) return;
    try {
      const pid = crypto.randomUUID();
      await db.insert(playlists).values({
        id: pid,
        userId: currentUser,
        name: newPlaylistName.trim(),
        createdAt: Date.now(),
        updatedAt: Date.now()
      }).execute();
      await supabase.from('playlists').insert({
        id: pid,
        user_id: currentUser,
        name: newPlaylistName.trim(),
        created_at: Date.now(),
        updated_at: Date.now()
      });
      
      await db.insert(playlistRecipes).values({
        playlistId: pid,
        recipeId: id as string,
        addedAt: Date.now()
      }).execute();
      await supabase.from('playlist_recipes').insert({
        playlist_id: pid,
        recipe_id: id as string,
        added_at: Date.now()
      });
      
      const pRecords = await db.select().from(playlists).where(eq(playlists.userId, currentUser)).execute();
      setUserPlaylists(pRecords);
      const next = new Set(activePlaylists);
      next.add(pid);
      setActivePlaylists(next);
      
      setNewPlaylistName('');
    } catch(e) {}
  };

  const isOwner = currentUser && recipe?.userId === currentUser;

  const handleLike = async () => {
    if (!id || !currentUser) return;
    try {
      if (isLiked) {
        await db.delete(recipeLikes).where(and(eq(recipeLikes.recipeId, id as string), eq(recipeLikes.userId, currentUser))).execute();
        setIsLiked(false);
      } else {
        await db.insert(recipeLikes).values({ recipeId: id as string, userId: currentUser, createdAt: Date.now() }).execute();
        setIsLiked(true);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleMadeThis = async () => {
    if (!id || !currentUser) return;

    const baseServings = recipe?.servings || 1;
    const ratio = desiredServings / baseServings;

    let insufficient = false;
    for (const item of recipeIngredientsList) {
      const have = localPantry.get(item.ingredient_id) || 0;
      const needed = item.amount * ratio;
      if (have < needed) {
        insufficient = true;
        break;
      }
    }

    const logAndDiminish = async () => {
      try {
        await db.insert(recipeLogs).values({ recipeId: id as string, userId: currentUser, createdAt: Date.now() }).execute();
        for (const item of recipeIngredientsList) {
          const currentAmount = localPantry.get(item.ingredient_id) || 0;
          const needed = item.amount * ratio;
          const newAmount = Math.max(0, currentAmount - needed);
          await updatePantryAmount(item.ingredient_id, newAmount);
          setLocalPantry(prev => { const n = new Map(prev); n.set(item.ingredient_id, newAmount); return n; });
        }
        Alert.alert('Success', 'Recipe logged!');
      } catch (e: any) {
        Alert.alert('Error', 'Failed to log recipe.');
      }
    };

    if (insufficient) {
      Alert.alert('Hold on!', 'Are you sure you cooked this? Your pantry does not have enough ingredients.', [
        { text: 'No', style: 'cancel' },
        { text: 'Yes', onPress: logAndDiminish }
      ]);
    } else {
      logAndDiminish();
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('recipe_ingredients').delete().eq('recipe_id', id as string);
        const { error } = await supabase.from('recipes').delete().eq('id', id as string);
        if (error) {
           Alert.alert("Cloud Error", error.message);
        }
      }

      await db.delete(recipeLogs).where(eq(recipeLogs.recipeId, id as string)).execute();
      await db.delete(recipeLikes).where(eq(recipeLikes.recipeId, id as string)).execute();
      await db.delete(recipeIngredients).where(eq(recipeIngredients.recipeId, id as string)).execute();
      await db.delete(recipes).where(eq(recipes.id, id as string)).execute();
      
      router.replace('/(tabs)/');
    } catch (e: any) {
      console.error(e);
      Alert.alert("Error", e.message);
    }
  };

  const baseServings = recipe?.servings || 1;
  const ratio = recipe ? desiredServings / baseServings : 1;

  // Apply any in-memory overrides from the substitutor
  const displayIngredients = recipeIngredientsList.map(item => overrides.get(item.ingredient_id) ?? item);

  const totalWeight = displayIngredients.reduce((acc, item) => acc + (item.amount * ratio), 0);

  const rawTotals = displayIngredients.reduce((acc, item) => ({
    calories: acc.calories + (item.calories * item.amount * ratio / 100),
    protein: acc.protein + (item.protein * item.amount * ratio / 100),
    carbs: acc.carbs + (item.carbs * item.amount * ratio / 100),
    fat: acc.fat + (item.fat * item.amount * ratio / 100),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  const totals = macroMode === '100g' 
    ? {
        calories: totalWeight > 0 ? (rawTotals.calories / totalWeight) * 100 : 0,
        protein: totalWeight > 0 ? (rawTotals.protein / totalWeight) * 100 : 0,
        carbs: totalWeight > 0 ? (rawTotals.carbs / totalWeight) * 100 : 0,
        fat: totalWeight > 0 ? (rawTotals.fat / totalWeight) * 100 : 0,
      }
    : rawTotals;

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg },
    navBar: { paddingTop: Math.max(insets.top, 16), paddingBottom: 16, paddingHorizontal: 20, backgroundColor: t.surface, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: t.border },
    backButton: { padding: 8, marginRight: 16, minHeight: 48, justifyContent: 'center' },
    headerTitle: { color: t.textPrimary, fontSize: 18, fontWeight: 'bold', flex: 1 },
    scrollContent: { padding: 24, paddingBottom: 100 },
    title: { color: t.textPrimary, fontSize: 32, fontWeight: 'bold', fontFamily: 'serif', marginBottom: 16 },
    description: { color: t.textSecondary, fontSize: 16, lineHeight: 24, marginBottom: 32 },
    heroImage: { width: '100%', height: 300, borderRadius: 16, marginBottom: 24, resizeMode: 'cover' },
    
    // Custom Macro display
    macrosRoot: { flexDirection: 'row', gap: 16, marginBottom: 32 },
    kcalBox: { flex: 1, backgroundColor: t.accentSoft, borderRadius: 16, padding: 16, justifyContent: 'center', alignItems: 'center' },
    kcalVal: { color: t.accent, fontSize: 32, fontWeight: 'bold' },
    kcalLbl: { color: t.textSecondary, fontSize: 14, fontWeight: 'bold', textTransform: 'uppercase' },
    
    macroList: { flex: 1.5, backgroundColor: t.surface, borderRadius: 16, padding: 16, borderColor: t.border, borderWidth: 1, gap: 12, justifyContent: 'center' },
    macroRow: { flexDirection: 'row', justifyContent: 'space-between' },
    macroLblNode: { color: t.textSecondary, fontWeight: 'bold' },
    macroValNode: { color: t.textPrimary, fontWeight: 'bold' },

    ingredientsList: { backgroundColor: t.surface, padding: 24, borderRadius: 16, marginBottom: 20 },
    sectionTitle: { color: t.accent, fontSize: 14, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 },
    ingredientRow: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: t.border, paddingVertical: 12 },
    ingredientNameText: { color: t.textPrimary, fontSize: 16 },
    ingredientAmountText: { color: t.accent, fontSize: 16, fontWeight: 'bold' },
    instructionsContainer: { backgroundColor: t.surface, padding: 24, borderRadius: 16 },
    stepItem: { flexDirection: 'row', gap: 14, marginBottom: 20, alignItems: 'stretch' },
    stepLeft: { alignItems: 'center', width: 28 },
    stepBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: t.accent, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
    stepBar: { width: 2, flex: 1, backgroundColor: t.accent, opacity: 0.25, marginTop: 6, borderRadius: 2 },
    stepNumberText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
    stepText: { flex: 1, color: t.textPrimary, fontSize: 16, lineHeight: 26, paddingTop: 1 },
    errorText: { color: t.destructive, textAlign: 'center', marginTop: 50, fontSize: 16 },
    servingsStepper: { flexDirection: 'row', alignItems: 'center', gap: 16, alignSelf: 'flex-start', backgroundColor: t.surface, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: t.border, marginBottom: 24 },
    stepperBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: t.bg, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: t.border },
    stepperText: { color: t.textPrimary, fontSize: 16, fontWeight: 'bold', minWidth: 20, textAlign: 'center' },
    stepperLabel: { color: t.textSecondary, fontSize: 14, fontWeight: '600' }
  });

  return (
    <View style={s.container}>
      <View style={s.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={s.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={t.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Recipe</Text>
        {!loading && recipe && (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity style={{ padding: 8, marginRight: currentUser || isOwner ? 8 : 0 }} onPress={() => router.push(`/recipe/create?forkId=${id}`)}>
              <MaterialCommunityIcons name="source-fork" size={26} color={t.textPrimary} />
            </TouchableOpacity>
            {currentUser && (
              <TouchableOpacity style={{ padding: 8, marginRight: 8 }} onPress={() => setShowPlaylistModal(true)}>
                <MaterialCommunityIcons name={activePlaylists.size > 0 ? "bookmark" : "bookmark-outline"} size={26} color={activePlaylists.size > 0 ? t.accent : t.textPrimary} />
              </TouchableOpacity>
            )}
            {currentUser && (
              <TouchableOpacity style={{ padding: 8, marginRight: isOwner ? 8 : 0 }} onPress={handleLike}>
                <MaterialCommunityIcons name={isLiked ? "heart" : "heart-outline"} size={26} color={t.accent} />
              </TouchableOpacity>
            )}
            {isOwner && (
              <TouchableOpacity style={{ padding: 8 }} onPress={handleDelete}>
                <MaterialCommunityIcons name="trash-can" size={26} color={t.destructive} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color={t.accent} size="large" style={{ marginTop: 50 }} />
      ) : recipe ? (
        <ScrollView contentContainerStyle={s.scrollContent}>
          {!!recipe.imageUrl && (
            <Image source={{ uri: recipe.imageUrl }} style={s.heroImage} />
          )}
          <Text style={s.title}>{recipe.title}</Text>
          {!!recipe.description && (
            <Text style={s.description}>{recipe.description}</Text>
          )}

          {recipeIngredientsList.length > 0 && (
            <View style={{ marginBottom: 16, flexDirection: 'row', justifyContent: 'flex-end' }}>
              <View style={{ flexDirection: 'row', backgroundColor: t.surface, borderRadius: 8, padding: 4, borderWidth: 1, borderColor: t.border }}>
                <TouchableOpacity onPress={() => setMacroMode('serving')} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: macroMode === 'serving' ? t.accent : 'transparent' }}>
                  <Text style={{ color: macroMode === 'serving' ? '#fff' : t.textSecondary, fontSize: 12, fontWeight: 'bold' }}>Per Serving</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setMacroMode('100g')} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: macroMode === '100g' ? t.accent : 'transparent' }}>
                  <Text style={{ color: macroMode === '100g' ? '#fff' : t.textSecondary, fontSize: 12, fontWeight: 'bold' }}>Per 100g</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {recipeIngredientsList.length > 0 && (
            <View style={s.macrosRoot}>
              <View style={s.kcalBox}>
                <Text style={s.kcalVal}>{totals.calories.toFixed(0)}</Text>
                <Text style={s.kcalLbl}>kcal</Text>
              </View>
              <View style={s.macroList}>
                <View style={s.macroRow}>
                  <Text style={s.macroLblNode}>Protein</Text>
                  <Text style={s.macroValNode}>{totals.protein.toFixed(1)}g</Text>
                </View>
                <View style={s.macroRow}>
                  <Text style={s.macroLblNode}>Carbs</Text>
                  <Text style={s.macroValNode}>{totals.carbs.toFixed(1)}g</Text>
                </View>
                <View style={s.macroRow}>
                  <Text style={s.macroLblNode}>Fat</Text>
                  <Text style={s.macroValNode}>{totals.fat.toFixed(1)}g</Text>
                </View>
              </View>
            </View>
          )}

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', zIndex: 2, marginBottom: macroExpanded ? 0 : 20, gap: 12 }}>
            <View style={[s.servingsStepper, { 
              marginBottom: 0, 
              flex: 1, 
              height: 48,
              justifyContent: 'space-between', 
              borderRadius: 16, 
              paddingHorizontal: 16,
              paddingVertical: 0
            }]}>
              <Text style={[s.stepperLabel, { fontSize: 13 }]}>Servings:</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <TouchableOpacity onPress={() => setDesiredServings(Math.max(1, desiredServings - 1))}>
                  <MaterialCommunityIcons name="minus" size={16} color={t.textPrimary} />
                </TouchableOpacity>
                <Text style={s.stepperText}>{desiredServings}</Text>
                <TouchableOpacity onPress={() => setDesiredServings(desiredServings + 1)}>
                  <MaterialCommunityIcons name="plus" size={16} color={t.textPrimary} />
                </TouchableOpacity>
              </View>
            </View>

            {recipeIngredientsList.length > 0 && (
              <TouchableOpacity 
                style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  backgroundColor: t.surface,
                  height: 48,
                  paddingHorizontal: 16,
                  borderTopLeftRadius: 16,
                  borderTopRightRadius: 16,
                  borderBottomLeftRadius: 16,
                  borderBottomRightRadius: 16,
                  borderWidth: 1,
                  borderColor: t.border,
                  flex: 1,
                }} 
                onPress={() => setMacroExpanded(v => !v)}
              >
                <Text style={{ color: t.accent, fontSize: 13, fontWeight: 'bold', flexShrink: 1 }} numberOfLines={1}>Macro Breakdown</Text>
                <MaterialCommunityIcons name={macroExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={t.accent} />
              </TouchableOpacity>
            )}
          </View>

          {(() => {
            if (!macroExpanded || recipeIngredientsList.length === 0) return null;
            const MACRO_COLORS = [t.accent, '#10b981', '#3b82f6', '#f59e0b', '#8B5CF6', '#EC4899', '#14B8A6'];
            const ingredientColorMap = new Map();
            recipeIngredientsList.forEach((ing, idx) => {
              ingredientColorMap.set(ing.ingredient_id, MACRO_COLORS[idx % MACRO_COLORS.length]);
            });

            return (
              <View style={{ 
                backgroundColor: t.surface, 
                padding: 24, 
                borderRadius: 16,
                marginTop: 12,
                marginBottom: 20
              }}>
                {['protein', 'carbs', 'fat'].map((macroKey) => {
                    const dataKey = macroKey as 'protein' | 'carbs' | 'fat';
                    const total = rawTotals[dataKey];
                    if (total <= 0) return null;

                    const sorted = [...recipeIngredientsList].sort((a, b) => {
                      const aVal = a[dataKey] * a.amount / 100;
                      const bVal = b[dataKey] * b.amount / 100;
                      return bVal - aVal;
                    });

                    const segments: any[] = [];
                    sorted.forEach((item) => {
                      const val = item[dataKey] * item.amount * ratio / 100;
                      if (val > 0) {
                        segments.push({ name: item.name, val, color: ingredientColorMap.get(item.ingredient_id) });
                      }
                    });

                    return (
                    <View key={macroKey} style={{ marginBottom: 20 }}>
                      <Text style={{ color: t.textPrimary, fontWeight: 'bold', marginBottom: 8, textTransform: 'uppercase', fontSize: 12, letterSpacing: 1 }}>{macroKey}</Text>
                      
                      <View style={{ flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', backgroundColor: t.border, marginBottom: 12 }}>
                        {segments.map((seg, idx) => (
                          <View key={idx} style={{ width: `${(seg.val / total) * 100}%`, backgroundColor: seg.color }} />
                        ))}
                      </View>

                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                        {segments.map((seg, idx) => (
                          <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: seg.color }} />
                            <Text style={{ color: t.textSecondary, fontSize: 12 }}>{seg.name} ({((seg.val / total) * 100).toFixed(0)}%)</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  );
                })}
              </View>
            );
          })()}

          {recipeIngredientsList.length > 0 && (
            <>
              <View style={s.ingredientsList}>
                <Text style={[s.sectionTitle, { marginBottom: 4 }]}>Ingredients</Text>
                <Text style={{ color: t.textSecondary, fontSize: 12, marginBottom: 12 }}>Tap an ingredient to find a substitute</Text>
                {displayIngredients.map((item, idx) => (
                  <TouchableOpacity key={`${item.ingredient_id}-${idx}`} style={[s.ingredientRow, item._substituted && { backgroundColor: t.accentSoft }]} onPress={() => handleSubstitute(item)}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.ingredientNameText}>{item.name}</Text>
                      {item._substituted && <Text style={{ color: t.accent, fontSize: 11, fontWeight: 'bold', marginTop: 2 }}>↺ Substituted</Text>}
                    </View>
                    <Text style={[s.ingredientAmountText, { marginRight: 8 }]}>{(item.amount * ratio).toFixed(1).replace(/\.0$/, '')} {item.unit}</Text>
                    <MaterialCommunityIcons name="swap-horizontal" size={18} color={item._substituted ? t.accent : t.textSecondary} />
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {!!recipe.instructions && (() => {
            const parsedSteps = parseSteps(recipe.instructions);
            return parsedSteps.length > 0 ? (
              <View style={[s.instructionsContainer, { marginBottom: 20 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <Text style={[s.sectionTitle, { marginBottom: 0 }]}>Instructions</Text>
                  <TouchableOpacity style={{ padding: 4 }} onPress={() => setIsCooking(true)}>
                    <MaterialCommunityIcons name="arrow-expand" size={28} color={t.accent} />
                  </TouchableOpacity>
                </View>
                {parsedSteps.map((step, idx) => (
                  <View key={idx} style={s.stepItem}>
                    <View style={s.stepLeft}>
                      <View style={s.stepBadge}>
                        <Text style={s.stepNumberText}>{idx + 1}</Text>
                      </View>
                      <View style={s.stepBar} />
                    </View>
                    <Text style={s.stepText}>{step}</Text>
                  </View>
                ))}
              </View>
            ) : null;
          })()}
          {currentUser && (
            <TouchableOpacity style={{ backgroundColor: t.accent, padding: 16, borderRadius: 16, marginTop: 24, alignItems: 'center' }} onPress={handleMadeThis}>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', textTransform: 'uppercase' }}>I Made This!</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      ) : (
        <Text style={s.errorText}>Recipe not found.</Text>
      )}

      {/* Playlist Management Bottom Sheet */}
      <Modal visible={showPlaylistModal} animationType="fade" transparent statusBarTranslucent onRequestClose={() => setShowPlaylistModal(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-start', paddingTop: Math.max(insets.top, 24) }} activeOpacity={1} onPress={() => setShowPlaylistModal(false)}>
          <View style={{ backgroundColor: t.surface, borderRadius: 28, marginHorizontal: 16, padding: 24, maxHeight: '80%', elevation: 10, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10 }} onStartShouldSetResponder={() => true}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: 'bold' }}>Save to Playlist</Text>
              <TouchableOpacity onPress={() => setShowPlaylistModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color={t.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flexShrink: 1, marginBottom: 20 }}>
              {userPlaylists.length === 0 ? (
                <Text style={{ color: t.textSecondary, textAlign: 'center', paddingVertical: 20 }}>No playlists yet. Create one below!</Text>
              ) : (
                userPlaylists.map(pl => (
                  <TouchableOpacity 
                    key={pl.id} 
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: t.border }}
                    onPress={() => handleTogglePlaylist(pl.id)}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Text style={{ color: t.textPrimary, fontSize: 16 }}>{pl.name}</Text>
                    </View>
                    <MaterialCommunityIcons 
                      name={activePlaylists.has(pl.id) ? "check-circle" : "circle-outline"} 
                      size={24} 
                      color={activePlaylists.has(pl.id) ? t.accent : t.border} 
                    />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            <View style={{ backgroundColor: t.bg, padding: 16, borderRadius: 16 }}>
              <Text style={{ color: t.textSecondary, fontSize: 12, textTransform: 'uppercase', fontWeight: 'bold', marginBottom: 12 }}>Create New Playlist</Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TextInput
                  style={{ flex: 1, backgroundColor: t.surface, color: t.textPrimary, paddingHorizontal: 16, borderRadius: 12 }}
                  placeholder="Playlist Name"
                  placeholderTextColor={t.textSecondary}
                  value={newPlaylistName}
                  onChangeText={setNewPlaylistName}
                />
                <TouchableOpacity 
                  style={{ backgroundColor: newPlaylistName.trim() ? t.accent : t.border, width: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' }}
                  disabled={!newPlaylistName.trim()}
                  onPress={handleCreatePlaylist}
                >
                  <MaterialCommunityIcons name="plus" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Ingredient Substitutor Bottom Sheet */}
      <Modal visible={!!subTarget} animationType="slide" transparent statusBarTranslucent>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ backgroundColor: t.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, paddingBottom: Math.max(insets.bottom + 16, 32) }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ color: t.textPrimary, fontSize: 18, fontWeight: 'bold' }}>Ingredient Substitute</Text>
              <TouchableOpacity onPress={() => { setSubTarget(null); setSubResult(null); }}>
                <MaterialCommunityIcons name="close" size={24} color={t.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={{ color: t.textSecondary, fontSize: 14, marginBottom: 20 }}>
              Finding a substitute for <Text style={{ color: t.accent, fontWeight: 'bold' }}>{subTarget?.name}</Text>
            </Text>

            {subLoading && (
              <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                <ActivityIndicator color={t.accent} size="large" />
                <Text style={{ color: t.textSecondary, marginTop: 12 }}>Asking the AI Sous-Chef...</Text>
              </View>
            )}

            {subResult && !subLoading && (
              <View>
                <View style={{ backgroundColor: t.bg, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: t.border, marginBottom: 20 }}>
                  <Text style={{ color: t.accent, fontSize: 22, fontWeight: 'bold', marginBottom: 8 }}>{subResult.name}</Text>
                  <Text style={{ color: t.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 16 }}>{subResult.reason}</Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    {([['Protein', `${subResult.protein}g`], ['Carbs', `${subResult.carbs}g`], ['Fat', `${subResult.fat}g`], ['Kcal', `${subResult.calories}`]] as [string,string][]).map(([label, val]) => (
                      <View key={label} style={{ flex: 1, backgroundColor: t.surface, borderRadius: 10, padding: 10, alignItems: 'center' }}>
                        <Text style={{ color: t.textSecondary, fontSize: 10, textTransform: 'uppercase', fontWeight: 'bold' }}>{label}</Text>
                        <Text style={{ color: t.textPrimary, fontWeight: 'bold', marginTop: 4 }}>{val}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                <TouchableOpacity onPress={applySubstitute} style={{ backgroundColor: t.accent, padding: 16, borderRadius: 14, alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Use This Substitute</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={isCooking} animationType="fade" presentationStyle="fullScreen" statusBarTranslucent={true}>
        {isCooking && <StatusBar hidden={true} />}
        <View style={{ flex: 1, backgroundColor: t.bg }}>
          <View style={{ flex: 1, backgroundColor: t.accentSoft, paddingTop: insets.top, paddingBottom: insets.bottom }}>
            {/* Exit Button - Absolute to not affect flex centering */}
            <View style={{ position: 'absolute', top: insets.top + 24, right: Math.max(insets.right, 24), zIndex: 10 }}>
              <TouchableOpacity onPress={() => setIsCooking(false)}>
                <MaterialCommunityIcons name="arrow-collapse" size={32} color={t.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={{ flex: 1, flexDirection: isLandscape ? 'row' : 'column' }}>
              
              {/* Ingredients Panel */}
              <View style={{ 
                 flex: 1, 
                 padding: 24, 
                 justifyContent: isLandscape ? 'center' : 'flex-end', 
                 alignItems: isLandscape ? 'flex-end' : 'center',
                 ...(isLandscape ? { paddingRight: 40 } : { paddingBottom: 40 }) 
              }}>
                 <View style={{ width: '100%', maxWidth: 400, flexShrink: 1 }}>
                   <Text style={{ fontSize: 28, fontWeight: 'bold', color: t.textPrimary, marginBottom: 20 }}>Ingredients</Text>
                   <ScrollView showsVerticalScrollIndicator={false} style={{ flexShrink: 1 }}>
                     {recipeIngredientsList.map(item => (
                        <View key={item.ingredient_id} style={{ marginBottom: 12, flexDirection: 'row' }}>
                           <Text style={{ fontSize: 20, color: t.accent, fontWeight: 'bold', width: 80 }}>{(item.amount * ratio).toFixed(1).replace(/\.0$/, '')} {item.unit}</Text>
                           <Text style={{ fontSize: 20, color: t.textPrimary, flex: 1 }}>{item.name}</Text>
                        </View>
                     ))}
                   </ScrollView>
                 </View>
              </View>

              {/* Centered Separator */}
              <View style={{ 
                 backgroundColor: t.accent + '40', 
                 ...(isLandscape 
                     ? { width: 2, height: '80%', alignSelf: 'center', borderRadius: 1 } 
                     : { height: 2, width: '80%', alignSelf: 'center', borderRadius: 1 }
                 )
              }} />

              {/* Steps Panel */}
              <View 
                style={{ flex: 1, ...(isLandscape ? { paddingLeft: 40 } : { paddingTop: 40 }) }}
                onLayout={(e) => setStepListWidth(e.nativeEvent.layout.width)}
              >
                <FlatList
                  style={{ flex: 1 }}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  snapToInterval={stepListWidth > 0 ? stepListWidth : (isLandscape ? (windowWidth - 2) / 2 - 40 : windowWidth)}
                  snapToAlignment="start"
                  decelerationRate="fast"
                  data={parseSteps(recipe?.instructions)}
                  keyExtractor={(item, idx) => idx.toString()}
                  renderItem={({ item, index }) => {
                    const stepWidth = stepListWidth > 0 ? stepListWidth : (isLandscape ? (windowWidth - 2) / 2 - 40 : windowWidth);
                    return (
                      <View style={{ width: stepWidth, paddingHorizontal: 32, justifyContent: isLandscape ? 'center' : 'flex-start', alignItems: isLandscape ? 'flex-start' : 'center' }}>
                         <View style={{ width: '100%', maxWidth: 400 }}>
                           <Text style={{ fontSize: 16, color: t.accent, fontWeight: 'bold', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 2 }}>Step {index + 1} of {parseSteps(recipe?.instructions).length}</Text>
                           <Text style={{ fontSize: isLandscape ? 32 : 28, color: t.textPrimary, lineHeight: isLandscape ? 48 : 42, fontWeight: '500' }}>{item}</Text>
                         </View>
                      </View>
                    );
                  }}
                />
              </View>

            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
