import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { db, expoDb } from '@/db';
import { recipes, recipeIngredients, ingredients as ingredientsTable } from '@/db/schema';
import { supabase } from '@/lib/supabase';
import * as crypto from 'expo-crypto';
import { like, eq, and, or, isNull } from 'drizzle-orm';
import { useThemeStore } from '@/store/themeStore';
import { getTheme } from '@/lib/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRecipeDraftStore } from '@/store/recipeDraftStore';

interface LocalIngredient {
  id: string;
  name: string;
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
}

interface SelectedIngredient extends LocalIngredient {
  amount: number;
  unit: string;
}

// Allow only digits and a single decimal point
function sanitizeDecimal(value: string): string {
  let sanitized = value.replace(/[^0-9.]/g, '');
  const parts = sanitized.split('.');
  if (parts.length > 2) sanitized = parts[0] + '.' + parts.slice(1).join('');
  return sanitized;
}

// Allow only letters and common unit characters (no digits)
function sanitizeUnit(value: string): string {
  return value.replace(/[^a-zA-Z\/]/g, '');
}

function computeTotals(selected: SelectedIngredient[]) {
  return selected.reduce(
    (acc, item) => {
      const factor = item.amount / 100;
      acc.protein += item.protein * factor;
      acc.carbs += item.carbs * factor;
      acc.fat += item.fat * factor;
      acc.calories += item.calories * factor;
      return acc;
    },
    { protein: 0, carbs: 0, fat: 0, calories: 0 }
  );
}

export default function CreateRecipeScreen() {
  const isDarkMode = useThemeStore((s) => s.isDarkMode);
  const t = getTheme(isDarkMode);
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [servings, setServings] = useState<number>(1);
  // Step-by-step instructions
  const [steps, setSteps] = useState<string[]>(['']);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { forkId } = useLocalSearchParams();

  useEffect(() => {
    async function loadFork() {
      if (!forkId) return;
      try {
        const result = await db.select().from(recipes).where(eq(recipes.id, forkId as string)).limit(1);
        if (result.length > 0) {
          const rec = result[0];
          setTitle(rec.title + ' (Fork)');
          setDescription(rec.description || '');
          setServings(rec.servings || 1);
          if (rec.instructions) {
            const lines = rec.instructions.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            const numbered = lines.every(l => /^\d+\.\s/.test(l));
            const parsed = numbered ? lines.map(l => l.replace(/^\d+\.\s*/, '')) : [rec.instructions.trim()];
            setSteps(parsed.length > 0 ? parsed : ['']);
          }
          if (rec.imageUrl) setImageUri(rec.imageUrl);
          
          const sql = `SELECT ri.ingredient_id as id, ri.amount, ri.unit, i.name, i.protein, i.carbs, i.fat, i.calories 
                       FROM recipe_ingredients ri 
                       JOIN ingredients i ON ri.ingredient_id = i.id 
                       WHERE ri.recipe_id = ? AND (ri.isDeleted = 0 OR ri.isDeleted IS NULL)`;
          const records = await expoDb.getAllAsync<SelectedIngredient>(sql, [forkId as string]);
          setSelected(records);
        }
      } catch (err) {
        console.error('Fork load error:', err);
      }
    }
    loadFork();
  }, [forkId]);

  // Ingredient search
  const [ingQuery, setIngQuery] = useState('');
  const [ingResults, setIngResults] = useState<LocalIngredient[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  // Selected candidate before confirming amount
  const [pending, setPending] = useState<LocalIngredient | null>(null);
  const [pendingAmount, setPendingAmount] = useState('');
  const [pendingUnit, setPendingUnit] = useState('g');

  // Confirmed ingredient list
  const [selected, setSelected] = useState<SelectedIngredient[]>([]);

  // When returning from ingredient creation, pick up the newly created ingredient
  useFocusEffect(
    useCallback(() => {
      const newIng = useRecipeDraftStore.getState().pendingIngredient;
      if (newIng) {
        setPending(newIng);
        setIngQuery(newIng.name);
        setPendingAmount('');
        setPendingUnit('g');
        setShowDropdown(false);
        setIngResults([]);
        useRecipeDraftStore.getState().setPendingIngredient(null);
      }
    }, [])
  );

  // Search local DB as user types — skip if an ingredient is already pending
  useEffect(() => {
    // If user already picked an ingredient, don't re-open the dropdown
    if (pending !== null) {
      setShowDropdown(false);
      return;
    }
    if (ingQuery.trim().length < 2) {
      setIngResults([]);
      setShowDropdown(false);
      return;
    }
    const timer = setTimeout(async () => {
      const rows = await db
        .select()
        .from(ingredientsTable)
        .where(and(like(ingredientsTable.name, `%${ingQuery}%`), or(eq(ingredientsTable.isDeleted, false), isNull(ingredientsTable.isDeleted))))
        .limit(10);
      setIngResults(rows as LocalIngredient[]);
      setShowDropdown(true);
    }, 120);
    return () => clearTimeout(timer);
  }, [ingQuery, pending]);

  const selectIngredient = useCallback((item: LocalIngredient) => {
    setPending(item);
    setIngQuery(item.name);
    setShowDropdown(false);
    setIngResults([]);
    setPendingAmount('');
    setPendingUnit('g');
  }, []);

  const addIngredient = useCallback(() => {
    if (!pending) return;
    const amt = parseFloat(pendingAmount);
    if (!pendingAmount || isNaN(amt) || amt <= 0) {
      Alert.alert('Invalid Amount', 'Enter a positive number for the amount.');
      return;
    }
    if (!pendingUnit.trim()) {
      Alert.alert('Missing Unit', 'Enter a unit (e.g. g, ml, tbsp).');
      return;
    }
    setSelected((prev) => {
      const without = prev.filter((x) => x.id !== pending.id);
      return [...without, { ...pending, amount: amt, unit: pendingUnit.trim() }];
    });
    setPending(null);
    setIngQuery('');
    setPendingAmount('');
    setPendingUnit('g');
  }, [pending, pendingAmount, pendingUnit]);

  const removeIngredient = useCallback((id: string) => {
    setSelected((prev) => prev.filter((x) => x.id !== id));
  }, []);

  // Steps management
  const addStep = useCallback(() => {
    setSteps((prev) => [...prev, '']);
  }, []);

  const updateStep = useCallback((index: number, value: string) => {
    setSteps((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }, []);

  const removeStep = useCallback((index: number) => {
    setSteps((prev) => {
      if (prev.length === 1) return [''];
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const totals = computeTotals(selected);

  const handleSave = async () => {
    if (isSaving) return;
    if (!title.trim()) {
      Alert.alert('Validation Error', 'Title is required.');
      return;
    }
    if (selected.length === 0) {
      Alert.alert('Validation Error', 'Add at least one ingredient.');
      return;
    }

    setIsSaving(true);

    // Build instructions string from numbered steps, filtering blank steps
    const filledSteps = steps.map((s) => s.trim()).filter((s) => s.length > 0);
    const instructions = filledSteps.map((s, i) => `${i + 1}. ${s}`).join('\n');

    const finalServings = servings;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id ?? null;

      const newId = crypto.randomUUID();
      const now = Date.now();

      let uploadedImageUrl: string | null = null;
      if (imageUri && userId) {
        try {
          const extension = imageUri.split('.').pop() || 'jpg';
          const formData = new FormData();
          formData.append('file', {
            uri: imageUri,
            name: `photo.${extension}`,
            type: `image/${extension === 'png' ? 'png' : 'jpeg'}`
          } as any);

          const { data, error } = await supabase.storage.from('recipe-images').upload(`${newId}.${extension}`, formData);
          if (!error && data) {
            uploadedImageUrl = supabase.storage.from('recipe-images').getPublicUrl(data.path).data.publicUrl;
          }
        } catch (e) {
          console.log('Image upload error:', e);
        }
      }

      // 1. Insert recipe locally
      await db.insert(recipes).values({
        id: newId,
        userId,
        title: title.trim(),
        description: description.trim(),
        instructions,
        imageUrl: uploadedImageUrl,
        servings: finalServings,
        isGlobal: false,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      }).execute();

      // 2. Insert recipe_ingredients locally
      const riRows = selected.map((ing) => ({
        id: crypto.randomUUID(),
        recipeId: newId,
        ingredientId: ing.id,
        userId,
        amount: ing.amount,
        unit: ing.unit,
        isGlobal: false,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      }));

      for (const row of riRows) {
        await db.insert(recipeIngredients).values(row).execute();
      }

      // 3. Push to Supabase (best-effort; sync will catch up if offline)
      if (userId) {
        await supabase.from('recipes').upsert({
          id: newId,
          user_id: userId,
          title: title.trim(),
          description: description.trim(),
          instructions,
          image_url: uploadedImageUrl,
          servings: finalServings,
          isGlobal: false,
          isDeleted: false,
          createdAt: now,
          updatedAt: now,
        });

        await supabase.from('recipe_ingredients').insert(
          riRows.map((r) => ({
            id: r.id,
            recipe_id: r.recipeId,
            ingredient_id: r.ingredientId,
            user_id: r.userId,
            amount: r.amount,
            unit: r.unit,
            isGlobal: false,
            isDeleted: false,
          }))
        );
      }

      if (forkId) {
        router.navigate('/(tabs)/');
        setTimeout(() => {
          router.push(`/recipe/${newId}`);
        }, 100);
      } else {
        router.replace(`/recipe/${newId}`);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
      setIsSaving(false);
    }
  };

  const s = StyleSheet.create({
    outer: { flex: 1, backgroundColor: t.bg, paddingTop: insets.top },
    navBar: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
    backBtn: { padding: 4 },
    navTitle: { color: t.textPrimary, fontSize: 20, fontWeight: 'bold' },
    scroll: { flex: 1, padding: 16 },
    section: { marginBottom: 24 },
    label: { color: t.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
    input: { backgroundColor: t.surface, color: t.textPrimary, padding: 14, borderRadius: 12, fontSize: 16, borderWidth: 1, borderColor: t.border, marginBottom: 12 },
    textArea: { minHeight: 100, textAlignVertical: 'top' },
    imageBtn: { borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: t.border, borderStyle: 'dashed', backgroundColor: t.surface, height: 250, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    imageBtnText: { color: t.textSecondary, marginTop: 8 },
    imagePreview: { width: '100%', height: '100%', resizeMode: 'cover' },
    imagePlaceholder: { justifyContent: 'center', alignItems: 'center' },
    dropdownItem: { padding: 14, borderBottomWidth: 1, borderColor: t.border, backgroundColor: t.surface },
    dropdownText: { color: t.textPrimary, fontSize: 15 },
    pendingCard: { backgroundColor: t.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: t.accent, marginBottom: 12 },
    pendingName: { color: t.accent, fontWeight: 'bold', fontSize: 15, marginBottom: 10 },
    amountRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
    amountInput: { flex: 2, backgroundColor: t.bg, color: t.textPrimary, padding: 12, borderRadius: 10, fontSize: 15, borderWidth: 1, borderColor: t.border },
    unitInput: { flex: 1, backgroundColor: t.bg, color: t.textPrimary, padding: 12, borderRadius: 10, fontSize: 15, borderWidth: 1, borderColor: t.border },
    addBtn: { flex: 1, backgroundColor: t.accent, borderRadius: 10, padding: 12, alignItems: 'center', justifyContent: 'center' },
    addBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
    selectedRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: t.surface, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: t.border },
    selectedName: { flex: 1, color: t.textPrimary, fontWeight: '600', fontSize: 14 },
    selectedMeta: { color: t.textSecondary, fontSize: 12 },
    removeBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: t.bg, borderWidth: 1, borderColor: t.border, justifyContent: 'center', alignItems: 'center' },
    // Step styles
    stepRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, gap: 10 },
    stepBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: t.accent, justifyContent: 'center', alignItems: 'center', marginTop: 11 },
    stepBadgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
    stepInput: { flex: 1, backgroundColor: t.surface, color: t.textPrimary, padding: 12, borderRadius: 10, fontSize: 15, borderWidth: 1, borderColor: t.border, minHeight: 48, textAlignVertical: 'top' },
    stepRemoveBtn: { padding: 6, marginTop: 8 },
    addStepBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: t.accent, borderStyle: 'dashed', alignSelf: 'flex-start', marginTop: 4 },
    addStepBtnText: { color: t.accent, fontWeight: 'bold', fontSize: 14 },
    servingsStepper: { flexDirection: 'row', alignItems: 'center', gap: 16, alignSelf: 'flex-start', backgroundColor: t.surface, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: t.border, marginBottom: 12 },
    stepperBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: t.bg, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: t.border },
    stepperText: { color: t.textPrimary, fontSize: 16, fontWeight: 'bold', minWidth: 20, textAlign: 'center' },
    totalsCard: { backgroundColor: t.surface, borderRadius: 12, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: t.border },
    totalsTitle: { color: t.textSecondary, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
    macroRow: { flexDirection: 'row', gap: 10 },
    macroChip: { flex: 1, backgroundColor: t.accentSoft, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, alignItems: 'center' },
    macroLabel: { color: t.textSecondary, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
    macroValue: { color: t.accent, fontSize: 14, fontWeight: 'bold' },
    saveBtn: { backgroundColor: t.accent, padding: 16, borderRadius: 14, alignItems: 'center', marginBottom: 8 },
    saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16, letterSpacing: 0.5 },
    cancelBtn: { padding: 14, alignItems: 'center', marginBottom: insets.bottom + 24 },
    cancelBtnText: { color: t.textSecondary, fontWeight: 'bold', fontSize: 14 },
  });

  return (
    <View style={s.outer}>
      {/* Nav */}
      <View style={s.navBar}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={t.textPrimary} />
        </TouchableOpacity>
        <Text style={s.navTitle}>New Recipe</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'padding'} keyboardVerticalOffset={Platform.OS === 'ios' ? 70 : 0}>
        <ScrollView style={s.scroll} keyboardShouldPersistTaps="handled">

          {/* Image Upload */}
          <View style={s.section}>
            <Text style={s.label}>Recipe Photo</Text>
            <TouchableOpacity
              style={s.imageBtn}
              onPress={async () => {
                let result = await ImagePicker.launchImageLibraryAsync({
                  mediaTypes: ImagePicker.MediaTypeOptions.Images,
                  allowsEditing: true,
                  quality: 0.8,
                });
                if (!result.canceled) setImageUri(result.assets[0].uri);
              }}
            >
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={s.imagePreview} />
              ) : (
                <View style={s.imagePlaceholder}>
                  <MaterialCommunityIcons name="camera-plus" size={32} color={t.textSecondary} />
                  <Text style={s.imageBtnText}>Add a Photo</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Basic Info */}
          <View style={s.section}>
            <Text style={s.label}>Recipe Name</Text>
            <TextInput
              style={s.input}
              placeholder="e.g. Grandma's Spaghetti"
              placeholderTextColor={t.textSecondary}
              value={title}
              onChangeText={setTitle}
            />
            <Text style={s.label}>Description</Text>
            <TextInput
              style={[s.input, s.textArea]}
              placeholder="A brief description..."
              placeholderTextColor={t.textSecondary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
            />
            <Text style={s.label}>Servings</Text>
            <View style={s.servingsStepper}>
              <TouchableOpacity style={s.stepperBtn} onPress={() => setServings(Math.max(1, servings - 1))}>
                <MaterialCommunityIcons name="minus" size={18} color={t.textPrimary} />
              </TouchableOpacity>
              <Text style={s.stepperText}>{servings}</Text>
              <TouchableOpacity style={s.stepperBtn} onPress={() => setServings(servings + 1)}>
                <MaterialCommunityIcons name="plus" size={18} color={t.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Step-by-step Instructions */}
          <View style={s.section}>
            <Text style={s.label}>Instructions</Text>
            {steps.map((step, index) => (
              <View key={index} style={s.stepRow}>
                <View style={s.stepBadge}>
                  <Text style={s.stepBadgeText}>{index + 1}</Text>
                </View>
                <TextInput
                  style={s.stepInput}
                  placeholder={`Step ${index + 1}...`}
                  placeholderTextColor={t.textSecondary}
                  value={step}
                  onChangeText={(v) => updateStep(index, v)}
                  multiline
                />
                {steps.length > 1 && (
                  <TouchableOpacity style={s.stepRemoveBtn} onPress={() => removeStep(index)}>
                    <MaterialCommunityIcons name="close-circle-outline" size={20} color={t.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity style={s.addStepBtn} onPress={addStep}>
              <MaterialCommunityIcons name="plus" size={18} color={t.accent} />
              <Text style={s.addStepBtnText}>Add Step</Text>
            </TouchableOpacity>
          </View>

          {/* Ingredient Search */}
          <View style={s.section}>
            <Text style={s.label}>Add Ingredients</Text>
            <TextInput
              style={s.input}
              placeholder="Search an ingredient..."
              placeholderTextColor={t.textSecondary}
              value={ingQuery}
              onChangeText={(v) => {
                // Clearing the pending state when user edits the search box
                setPending(null);
                setIngQuery(v);
              }}
            />

            {showDropdown && (
              <View style={{ borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: t.border, marginBottom: 12 }}>
                {ingResults.map((item) => (
                  <TouchableOpacity key={item.id} style={s.dropdownItem} onPress={() => selectIngredient(item)}>
                    <Text style={s.dropdownText}>{item.name}</Text>
                    <Text style={s.selectedMeta}>{item.calories} kcal | P: {item.protein}g C: {item.carbs}g F: {item.fat}g</Text>
                  </TouchableOpacity>
                ))}
                {ingResults.length === 0 && ingQuery.trim().length >= 2 && (
                  <TouchableOpacity
                    style={[s.dropdownItem, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}
                    onPress={() => {
                      setShowDropdown(false);
                      router.push(`/ingredient/create?initialName=${encodeURIComponent(ingQuery)}&fromRecipe=true`);
                    }}
                  >
                    <MaterialCommunityIcons name="plus-circle-outline" size={18} color={t.accent} />
                    <Text style={[s.dropdownText, { color: t.accent, fontWeight: 'bold' }]}>Add "{ingQuery}"</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {pending && (
              <View style={s.pendingCard}>
                <Text style={s.pendingName}>{pending.name}</Text>
                <View style={s.amountRow}>
                  <TextInput
                    style={s.amountInput}
                    placeholder="Amount"
                    placeholderTextColor={t.textSecondary}
                    value={pendingAmount}
                    onChangeText={(v) => setPendingAmount(sanitizeDecimal(v))}
                    keyboardType="decimal-pad"
                  />
                  <TextInput
                    style={s.unitInput}
                    placeholder="Unit"
                    placeholderTextColor={t.textSecondary}
                    value={pendingUnit}
                    onChangeText={(v) => setPendingUnit(sanitizeUnit(v))}
                  />
                  <TouchableOpacity style={s.addBtn} onPress={addIngredient}>
                    <Text style={s.addBtnText}>Add</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {selected.map((ing) => (
              <View key={ing.id} style={s.selectedRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.selectedName}>{ing.name}</Text>
                  <Text style={s.selectedMeta}>{ing.amount} {ing.unit} — {(ing.calories * ing.amount / 100).toFixed(0)} kcal</Text>
                </View>
                <TouchableOpacity style={s.removeBtn} onPress={() => removeIngredient(ing.id)}>
                  <MaterialCommunityIcons name="trash-can-outline" size={22} color={t.textSecondary} />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* Nutritional Totals */}
          {selected.length > 0 && (
            <View style={s.totalsCard}>
              <Text style={s.totalsTitle}>Nutritional Totals</Text>
              <View style={s.macroRow}>
                <View style={s.macroChip}>
                  <Text style={s.macroLabel}>Calories</Text>
                  <Text style={s.macroValue}>{totals.calories.toFixed(0)}</Text>
                </View>
                <View style={s.macroChip}>
                  <Text style={s.macroLabel}>Protein</Text>
                  <Text style={s.macroValue}>{totals.protein.toFixed(1)}g</Text>
                </View>
                <View style={s.macroChip}>
                  <Text style={s.macroLabel}>Carbs</Text>
                  <Text style={s.macroValue}>{totals.carbs.toFixed(1)}g</Text>
                </View>
                <View style={s.macroChip}>
                  <Text style={s.macroLabel}>Fat</Text>
                  <Text style={s.macroValue}>{totals.fat.toFixed(1)}g</Text>
                </View>
              </View>
            </View>
          )}

          <TouchableOpacity
            style={[s.saveBtn, isSaving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={isSaving}
          >
            <Text style={s.saveBtnText}>{isSaving ? 'Creating...' : 'Create Recipe'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.cancelBtn} onPress={() => router.back()} disabled={isSaving}>
            <Text style={s.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
