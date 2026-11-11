import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { db } from '@/db';
import { ingredients } from '@/db/schema';
import * as Crypto from 'expo-crypto';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useThemeStore } from '@/store/themeStore';
import { getTheme } from '@/lib/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRecipeDraftStore } from '@/store/recipeDraftStore';

// Allow only digits and a single decimal point
function sanitizeDecimal(value: string): string {
  let s = value.replace(/[^0-9.]/g, '');
  const parts = s.split('.');
  if (parts.length > 2) s = parts[0] + '.' + parts.slice(1).join('');
  return s;
}

export default function CreateIngredientScreen() {
  const { initialName, fromRecipe } = useLocalSearchParams();
  const isDarkMode = useThemeStore((s) => s.isDarkMode);
  const t = getTheme(isDarkMode);
  const insets = useSafeAreaInsets();

  const [name, setName] = useState(typeof initialName === 'string' ? initialName : '');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [calories, setCalories] = useState('');
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Missing Name', 'Please enter an ingredient name.');
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Not logged in', 'You must be logged in to add ingredients.');
        return;
      }

      const newId = Crypto.randomUUID();
      const now = Date.now();
      const payload = {
        id: newId,
        name: name.trim(),
        protein: parseFloat(protein) || 0,
        carbs: parseFloat(carbs) || 0,
        fat: parseFloat(fat) || 0,
        calories: parseFloat(calories) || 0,
        isGlobal: false,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      };

      // 1. Save locally (no userId in local ingredients schema)
      await db.insert(ingredients).values(payload).execute();


      // 2. Push to Supabase
      const { error } = await supabase.from('ingredients').insert({
        ...payload,
        user_id: user.id,
      });
      if (error) throw error;

      if (fromRecipe === 'true') {
        useRecipeDraftStore.getState().setPendingIngredient(payload);
        router.back();
      } else {
        Alert.alert('Saved!', `"${payload.name}" has been added to your ingredients.`, [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to save ingredient.');
    } finally {
      setSaving(false);
    }
  };

  const s = StyleSheet.create({
    outer: { flex: 1, backgroundColor: t.bg, paddingTop: insets.top },
    navBar: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: t.border },
    navTitle: { color: t.textPrimary, fontSize: 20, fontWeight: 'bold' },
    scroll: { flex: 1, padding: 20 },
    label: { color: t.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
    input: { backgroundColor: t.surface, color: t.textPrimary, padding: 14, borderRadius: 12, fontSize: 16, borderWidth: 1, borderColor: t.border, marginBottom: 20 },
    row: { flexDirection: 'row', gap: 12, marginBottom: 0 },
    half: { flex: 1 },
    hint: { color: t.textSecondary, fontSize: 13, marginBottom: 28, lineHeight: 20 },
    saveBtn: { backgroundColor: t.accent, padding: 16, borderRadius: 14, alignItems: 'center', marginBottom: 12, opacity: saving ? 0.7 : 1 },
    saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16, letterSpacing: 0.5 },
    cancelBtn: { padding: 14, alignItems: 'center' },
    cancelBtnText: { color: t.textSecondary, fontWeight: 'bold', fontSize: 14 },
  });

  return (
    <KeyboardAvoidingView style={s.outer} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.navBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={t.textPrimary} />
        </TouchableOpacity>
        <Text style={s.navTitle}>Add Ingredient</Text>
      </View>

      <ScrollView style={s.scroll} keyboardShouldPersistTaps="handled">
        <Text style={s.hint}>
          Add a custom ingredient to your private collection. Nutritional values should be entered
          per 100 g or 100 ml.
        </Text>

        <Text style={s.label}>Name</Text>
        <TextInput
          style={s.input}
          placeholder="e.g. Oat Bran"
          placeholderTextColor={t.textSecondary}
          value={name}
          onChangeText={setName}
        />

        <Text style={s.label}>Calories (kcal per 100 g)</Text>
        <TextInput
          style={s.input}
          placeholder="0"
          placeholderTextColor={t.textSecondary}
          value={calories}
          onChangeText={(v) => setCalories(sanitizeDecimal(v))}
          keyboardType="decimal-pad"
        />

        <Text style={s.label}>Protein (g)</Text>
        <TextInput
          style={s.input}
          placeholder="0"
          placeholderTextColor={t.textSecondary}
          value={protein}
          onChangeText={(v) => setProtein(sanitizeDecimal(v))}
          keyboardType="decimal-pad"
        />

        <Text style={s.label}>Carbs (g)</Text>
        <TextInput
          style={s.input}
          placeholder="0"
          placeholderTextColor={t.textSecondary}
          value={carbs}
          onChangeText={(v) => setCarbs(sanitizeDecimal(v))}
          keyboardType="decimal-pad"
        />

        <Text style={s.label}>Fat (g)</Text>
        <TextInput
          style={s.input}
          placeholder="0"
          placeholderTextColor={t.textSecondary}
          value={fat}
          onChangeText={(v) => setFat(sanitizeDecimal(v))}
          keyboardType="decimal-pad"
        />

        <TouchableOpacity style={s.saveBtn} onPress={handleCreate} disabled={saving}>
          <Text style={s.saveBtnText}>{saving ? 'Saving…' : 'Save Ingredient'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.cancelBtn} onPress={() => router.back()}>
          <Text style={s.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
