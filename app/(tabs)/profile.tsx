import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Switch, Alert, Modal, ScrollView } from 'react-native';
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';
import LoginScreen from '@/app/login';
import { db, expoDb } from '@/db';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ingredients, recipes, recipeIngredients } from '@/db/schema';
import * as SecureStore from 'expo-secure-store';
import { runBackgroundSync } from '@/db/sync';
import { useThemeStore } from '@/store/themeStore';
import { getTheme } from '@/lib/theme';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [manualVisible, setManualVisible] = useState(false);
  const [recipeLogs, setRecipeLogs] = useState<{ title: string; createdAt: number }[]>([]);
  const [thisWeekNutrition, setThisWeekNutrition] = useState<{ kcal: number; protein: number; carbs: number; fat: number } | null>(null);
  const [lastWeekNutrition, setLastWeekNutrition] = useState<{ kcal: number; protein: number; carbs: number; fat: number } | null>(null);
  const { isDarkMode, toggleTheme } = useThemeStore();
  const t = getTheme(isDarkMode);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setSession(session);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!session) return;
      const fetchLogs = async () => {
        try {
          const logs = await expoDb.getAllAsync<{ title: string; createdAt: number }>(`
            SELECT r.title, l.createdAt 
            FROM recipe_logs l
            JOIN recipes r ON r.id = l.recipe_id
            WHERE l.user_id = ?
            ORDER BY l.createdAt DESC
            LIMIT 10
          `, [session.user.id]);
          setRecipeLogs(logs);

          // Nutrition aggregation helpers
          const now = Date.now();
          const dayMs = 86400000;
          const startOfToday = new Date(); startOfToday.setHours(0,0,0,0);
          const dayOfWeek = startOfToday.getDay(); // 0=Sun
          const monday = new Date(startOfToday); monday.setDate(startOfToday.getDate() - ((dayOfWeek + 6) % 7));
          const thisWeekStart = monday.getTime();
          const lastWeekStart = thisWeekStart - 7 * dayMs;
          const lastWeekEnd = thisWeekStart;

          const nutritionQuery = `
            SELECT
              COALESCE(SUM(i.calories * ri.amount / 100), 0) as kcal,
              COALESCE(SUM(i.protein * ri.amount / 100), 0) as protein,
              COALESCE(SUM(i.carbs * ri.amount / 100), 0) as carbs,
              COALESCE(SUM(i.fat * ri.amount / 100), 0) as fat
            FROM recipe_logs l
            JOIN recipe_ingredients ri ON ri.recipe_id = l.recipe_id
            JOIN ingredients i ON i.id = ri.ingredient_id
            WHERE l.user_id = ? AND l.createdAt >= ? AND l.createdAt < ?
          `;

          const [thisWeek] = await expoDb.getAllAsync<{ kcal: number; protein: number; carbs: number; fat: number }>(nutritionQuery, [session.user.id, thisWeekStart, now + dayMs]);
          const [lastWeek] = await expoDb.getAllAsync<{ kcal: number; protein: number; carbs: number; fat: number }>(nutritionQuery, [session.user.id, lastWeekStart, lastWeekEnd]);
          setThisWeekNutrition(thisWeek ?? null);
          setLastWeekNutrition(lastWeek ?? null);
        } catch (e) {
          console.error(e);
        }
      };
      fetchLogs();
    }, [session])
  );

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={t.accent} />
      </View>
    );
  }

  if (!session) return <LoginScreen />;

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg, paddingTop: insets.top },
    scrollContent: { paddingHorizontal: 16, paddingBottom: 48 },
    navRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    title: { color: t.textPrimary, fontSize: 24, fontWeight: 'bold' },
    iconBtn: { padding: 8 },
    logItem: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: t.border },
    logTitle: { color: t.textPrimary, fontSize: 16 },
    logDate: { color: t.textSecondary, fontSize: 12 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { backgroundColor: t.surface, width: '90%', height: '80%', borderRadius: 16, padding: 24, paddingBottom: 10 },
    card: { backgroundColor: t.surface, padding: 20, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: t.border },
    label: { color: t.textSecondary, fontSize: 12, marginBottom: 4, textTransform: 'uppercase', fontWeight: 'bold' },
    value: { color: t.textPrimary, fontSize: 18, fontWeight: 'bold' },
    themeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    logoutBtn: { backgroundColor: t.surface, padding: 16, borderRadius: 8, minHeight: 60, justifyContent: 'center', marginTop: 16, borderWidth: 1, borderColor: `${t.destructive}40` },
    logoutText: { color: t.destructive, fontWeight: 'bold', fontSize: 16, textAlign: 'center' },
  });

  return (
    <ScrollView style={s.container} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={s.navRow}>
        <Text style={s.title}>Profile</Text>
        <TouchableOpacity style={s.iconBtn} onPress={() => setManualVisible(true)}>
          <MaterialCommunityIcons name="help-circle-outline" size={28} color={t.textPrimary} />
        </TouchableOpacity>
      </View>

      <View style={s.card}>
        <Text style={s.label}>Email</Text>
        <Text style={s.value}>{session.user.email}</Text>
      </View>

      <View style={s.card}>
        <View style={s.themeRow}>
          <Text style={s.label}>Dark Mode</Text>
          <Switch
            value={isDarkMode}
            onValueChange={() => { toggleTheme(); }}
            trackColor={{ false: t.border, true: t.accent }}
            thumbColor="#fff"
          />
        </View>
      </View>



      <TouchableOpacity onPress={() => { supabase.auth.signOut(); }} style={s.logoutBtn}>
        <Text style={s.logoutText}>Logout</Text>
      </TouchableOpacity>

      {/* Nutrition Diary */}
      <Text style={[s.title, { marginTop: 32, marginBottom: 12, fontSize: 20 }]}>Nutrition Diary</Text>

      {/* This Week — big card */}
      <View style={[s.card, { flexDirection: 'row', alignItems: 'stretch', gap: 12, padding: 0, overflow: 'hidden' }]}>
        <View style={{ backgroundColor: t.accent, padding: 20, justifyContent: 'center', alignItems: 'center', minWidth: 110, borderTopLeftRadius: 12, borderBottomLeftRadius: 12 }}>
          <Text style={{ color: '#fff', fontSize: 28, fontWeight: 'bold' }}>{(thisWeekNutrition?.kcal ?? 0).toFixed(0)}</Text>
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 4 }}>kcal</Text>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, marginTop: 2 }}>This week</Text>
        </View>
        <View style={{ flex: 1, padding: 16, justifyContent: 'center', gap: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={s.label}>Protein</Text>
            <Text style={s.value}>{(thisWeekNutrition?.protein ?? 0).toFixed(1)}g</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={s.label}>Carbs</Text>
            <Text style={s.value}>{(thisWeekNutrition?.carbs ?? 0).toFixed(1)}g</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={s.label}>Fat</Text>
            <Text style={s.value}>{(thisWeekNutrition?.fat ?? 0).toFixed(1)}g</Text>
          </View>
        </View>
      </View>

      {/* Last Week — compact line */}
      <View style={[s.card, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 }]}>
        <Text style={[s.label, { marginBottom: 0, marginRight: 8 }]}>Last week</Text>
        <Text style={{ color: t.textPrimary, fontSize: 13 }}>
          {(lastWeekNutrition?.kcal ?? 0).toFixed(0)} kcal{'  '}P:{(lastWeekNutrition?.protein ?? 0).toFixed(0)}g{'  '}C:{(lastWeekNutrition?.carbs ?? 0).toFixed(0)}g{'  '}F:{(lastWeekNutrition?.fat ?? 0).toFixed(0)}g
        </Text>
      </View>

      <Text style={[s.title, { marginTop: 16, marginBottom: 16, fontSize: 20 }]}>Recipe Logs</Text>
      <View style={s.card}>
        {recipeLogs.length > 0 ? (
          recipeLogs.map((log, i) => (
            <View key={i} style={s.logItem}>
              <Text style={s.logTitle}>{log.title}</Text>
              <Text style={s.logDate}>{new Date(log.createdAt).toLocaleString()}</Text>
            </View>
          ))
        ) : (
           <Text style={s.label}>No recipes logged yet.</Text>
        )}
      </View>

      <Modal visible={manualVisible} transparent={true} animationType="fade" statusBarTranslucent>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
             <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16}}>
                <Text style={[s.title, { marginBottom: 0 }]}>User Manual</Text>
             </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              <Text style={[s.logTitle, { marginTop: 12, fontWeight: 'bold', color: t.accent, fontSize: 18 }]}>1. Recipes Feed & Playlists</Text>
              <Text style={[s.logTitle, { marginTop: 6, lineHeight: 22 }]}>The Recipes Feed is your discovery hub. Use the advanced filter deck to constrain recipes by macronutrients or calories, or toggle "Pantry Only" to see only what you can cook right now. You can also organize your favorite recipes by adding them to custom Playlists for quick access.</Text>
              
              <Text style={[s.logTitle, { marginTop: 18, fontWeight: 'bold', color: t.accent, fontSize: 18 }]}>2. Smart Cooking Viewer</Text>
              <Text style={[s.logTitle, { marginTop: 6, lineHeight: 22 }]}>When viewing a recipe, you can dynamically scale the servings—macros will update automatically and can be toggled between "Per Serving" and "Per 100g". Ready to cook? Tap the expand icon next to Instructions for a distraction-free, landscape Fullscreen Cooking Mode. If you want to modify a recipe, simply tap the "Fork" icon to duplicate and edit it!</Text>

              <Text style={[s.logTitle, { marginTop: 18, fontWeight: 'bold', color: t.accent, fontSize: 18 }]}>3. Pantry & Ingredient Substitutions</Text>
              <Text style={[s.logTitle, { marginTop: 6, lineHeight: 22 }]}>Your Pantry mirrors your kitchen inventory. Missing an ingredient? Tap on any ingredient in a recipe to ask the AI Sous-Chef for a seamless substitute, updating the macros instantly! When you finish cooking, tap "I Made This!"—the app will check your stock and automatically deduct the ingredients from your Pantry.</Text>

              <Text style={[s.logTitle, { marginTop: 18, fontWeight: 'bold', color: t.accent, fontSize: 18 }]}>4. AI Sous-Chef Chat</Text>
              <Text style={[s.logTitle, { marginTop: 6, lineHeight: 22 }]}>Tap the robot icon on the top right to summon your AI Assistant! Ask for meal-prepping advice or let it generate a complete recipe directly from your pantry items. (Requires an OpenAI/Gemini API key in the chat settings).</Text>

              <Text style={[s.logTitle, { marginTop: 18, fontWeight: 'bold', color: t.accent, fontSize: 18 }]}>5. Profile & Nutrition Tracking</Text>
              <Text style={[s.logTitle, { marginTop: 6, lineHeight: 22 }]}>Below this manual, track your weekly nutritional intake via the Nutrition Diary. Every time you log a cooked recipe, its macros are aggregated to help you stay on top of your diet goals.</Text>
            </ScrollView>
            <TouchableOpacity onPress={() => setManualVisible(false)} style={[s.logoutBtn, { borderColor: t.border, marginTop: 8 }]}>
               <Text style={[s.logoutText, { color: t.textPrimary }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
