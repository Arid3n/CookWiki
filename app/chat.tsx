import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Modal, ActivityIndicator, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useThemeStore } from '@/store/themeStore';
import { getTheme } from '@/lib/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db } from '@/db';
import { ingredients, recipes, recipeIngredients, userPantry } from '@/db/schema';
import { eq, like, gt } from 'drizzle-orm';
import { supabase } from '@/lib/supabase';

type Role = 'user' | 'assistant';
interface Message {
  role: Role;
  text: string;
  recipeData?: ParsedRecipe | null;
}

interface RecipeIngredientAI {
  name: string;
  amount_g: number;
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
}

interface ParsedRecipe {
  title: string;
  description?: string;
  servings?: number;
  steps: string[];
  ingredients: RecipeIngredientAI[];
}

const RECIPE_PROMPT = `You are a culinary assistant. The user wants a recipe. Respond ONLY with a valid JSON block in this exact format (no extra text before or after, just the JSON):
{
  "title": "Recipe Name",
  "description": "Short one-sentence description",
  "servings": 2,
  "steps": ["Step 1...", "Step 2...", "Step 3..."],
  "ingredients": [
    { "name": "Ingredient Name", "amount_g": 100, "protein": 20, "carbs": 5, "fat": 2, "calories": 120 }
  ]
}
All macros and calories are per the full amount_g used in this recipe (not per 100g). Be precise.`;

function tryParseRecipe(text: string): ParsedRecipe | null {
  try {
    // Try to extract JSON from markdown code block or raw text
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || text.match(/(\{[\s\S]*\})/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[1]);
    if (parsed.title && Array.isArray(parsed.ingredients) && Array.isArray(parsed.steps)) {
      return parsed as ParsedRecipe;
    }
    return null;
  } catch {
    return null;
  }
}

export default function ChatScreen() {
  const isDarkMode = useThemeStore((s) => s.isDarkMode);
  const t = getTheme(isDarkMode);
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', text: "Hello! I'm your AI Sous-Chef 👨‍🍳\n\nHere's what I can do:\n• 💬 Type anything to ask me a culinary question\n• 🍲 Tap the pan icon to generate a full recipe you can save directly to your cookbook\n• 🧊 Tap the fridge icon to generate a recipe using only the ingredients in your pantry\n\nMake sure to set your API key in ⚙️ Settings before getting started!" }
  ]);
  const [inputStr, setInputStr] = useState('');
  const [loading, setLoading] = useState(false);
  const [savingRecipe, setSavingRecipe] = useState<string | null>(null); // holds recipeTitle being saved

  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [tempKey, setTempKey] = useState('');
  const [modelName, setModelName] = useState('gemini-2.5-flash');
  const [tempModel, setTempModel] = useState('gemini-2.5-flash');
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    SecureStore.getItemAsync('openai_api_key').then((stored) => {
      if (stored) { setApiKey(stored); setTempKey(stored); }
    });
    SecureStore.getItemAsync('ai_model_name').then((stored) => {
      if (stored) { setModelName(stored); setTempModel(stored); }
    });
  }, []);

  const handleSaveKey = async () => {
    await SecureStore.setItemAsync('openai_api_key', tempKey.trim());
    await SecureStore.setItemAsync('ai_model_name', tempModel.trim());
    setApiKey(tempKey.trim());
    setModelName(tempModel.trim());
    setShowSettings(false);
  };

  const callAI = async (logsToSend: Message[]): Promise<string> => {
    if (apiKey.startsWith('AIza')) {
      const payload = JSON.stringify({
        contents: logsToSend.map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.text }]
        }))
      });
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("No response generated.");
      return text;
    } else {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: modelName.startsWith('gemini') ? 'gpt-3.5-turbo' : modelName,
          messages: logsToSend.map(m => ({ role: m.role, content: m.text }))
        })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      const text = data.choices?.[0]?.message?.content;
      if (!text) throw new Error("No response generated.");
      return text;
    }
  };

  const handleSend = async () => {
    const txt = inputStr.trim();
    if (!txt) return;
    const newLogs: Message[] = [...messages, { role: 'user', text: txt }];
    setMessages(newLogs);
    setInputStr('');
    if (!apiKey) {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Please enter a valid API key.' }]);
      return;
    }
    setLoading(true);
    try {
      const text = await callAI(newLogs);
      setMessages(prev => [...prev, { role: 'assistant', text }]);
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'assistant', text: `Network Error: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateRecipe = async () => {
    const dish = inputStr.trim();
    const prompt = dish ? `Give me a complete recipe for: ${dish}` : 'Give me a complete recipe for any dish you recommend.';
    const systemMsg: Message = { role: 'user', text: RECIPE_PROMPT + '\n\n' + prompt };
    const newLogs: Message[] = [...messages, { role: 'user', text: dish ? `🍳 Generate recipe: ${dish}` : '🍳 Generate a recipe for me' }];
    setMessages(newLogs);
    setInputStr('');
    if (!apiKey) {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Please enter a valid API key.' }]);
      return;
    }
    setLoading(true);
    try {
      // Send with system prompt but display without it
      const logsForAI = [...messages, systemMsg];
      const text = await callAI(logsForAI);
      const parsed = tryParseRecipe(text);
      const displayText = parsed
        ? `**${parsed.title}**\n\n**Ingredients:**\n${parsed.ingredients.map(i => `• ${i.name} — ${i.amount_g}g`).join('\n')}\n\n**Steps:**\n${parsed.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`
        : text;
      setMessages(prev => [...prev, { role: 'assistant', text: displayText, recipeData: parsed }]);
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'assistant', text: `Network Error: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handlePantryRecipe = async () => {
    if (!apiKey) {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Please enter a valid API key.' }]);
      return;
    }

    // Fetch pantry items with amount > 0 joined to ingredient names
    const pantryRows = await db
      .select({ name: ingredients.name, amount: userPantry.amount })
      .from(userPantry)
      .innerJoin(ingredients, eq(ingredients.id, userPantry.ingredientId))
      .where(gt(userPantry.amount, 0));

    if (pantryRows.length === 0) {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Your pantry is empty! Add some ingredients to the Pantry first.' }]);
      return;
    }

    const ingredientList = pantryRows.map(r => `${r.name} (${r.amount}g)`).join(', ');
    const dish = inputStr.trim();
    const extraRequest = dish ? ` The user prefers something like: ${dish}.` : '';
    const prompt = `${RECIPE_PROMPT}

IMPORTANT: You MUST use ONLY ingredients from this list (you may use a subset, do not add anything else): ${ingredientList}.${extraRequest}`;

    const displayLabel = dish ? `🧊 Pantry recipe: ${dish}` : '🧊 What can I cook from my pantry?';
    const newLogs: Message[] = [...messages, { role: 'user', text: displayLabel }];
    setMessages(newLogs);
    setInputStr('');
    setLoading(true);
    try {
      const logsForAI: Message[] = [...messages, { role: 'user' as Role, text: prompt }];
      const text = await callAI(logsForAI);
      const parsed = tryParseRecipe(text);
      const displayText = parsed
        ? `**${parsed.title}**\n\n**Ingredients:**\n${parsed.ingredients.map(i => `• ${i.name} — ${i.amount_g}g`).join('\n')}\n\n**Steps:**\n${parsed.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`
        : text;
      setMessages(prev => [...prev, { role: 'assistant', text: displayText, recipeData: parsed }]);
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'assistant', text: `Network Error: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRecipe = async (recipe: ParsedRecipe) => {
    setSavingRecipe(recipe.title);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || null;
      const now = Date.now();

      // Step 1: Resolve or create all ingredients
      const resolvedIngredients: { id: string; amount: number }[] = [];

      for (const ing of recipe.ingredients) {
        // Search local DB (case-insensitive via LIKE)
        const existing = await db.select().from(ingredients)
          .where(like(ingredients.name, ing.name))
          .limit(1);

        let ingredientId: string;

        if (existing.length > 0) {
          ingredientId = existing[0].id;
        } else {
          // Auto-create with AI-estimated macros. isGlobal=false so user can delete later.
          const [created] = await db.insert(ingredients).values({
            name: ing.name,
            protein: ing.protein,
            carbs: ing.carbs,
            fat: ing.fat,
            calories: ing.calories,
            isGlobal: false,
            isDeleted: false,
            createdAt: now,
            updatedAt: now,
          }).returning();
          ingredientId = created.id;

          // Also push to Supabase if logged in
          if (userId) {
            await supabase.from('ingredients').insert({
              id: ingredientId,
              name: ing.name,
              protein: ing.protein,
              carbs: ing.carbs,
              fat: ing.fat,
              calories: ing.calories,
              isGlobal: false,
              isDeleted: false,
              createdAt: now,
              updatedAt: now,
            });
          }
        }

        resolvedIngredients.push({ id: ingredientId, amount: ing.amount_g });
      }

      // Step 2: Create the recipe
      const [newRecipe] = await db.insert(recipes).values({
        userId,
        title: recipe.title,
        description: recipe.description || '',
        instructions: recipe.steps.map((s, i) => `${i + 1}. ${s.replace(/^\d+\.\s*/, '').trim()}`).join('\n'),
        imageUrl: null,
        servings: recipe.servings || 1,
        isGlobal: false,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      }).returning();

      if (userId) {
        await supabase.from('recipes').insert({
          id: newRecipe.id,
          user_id: userId,
          title: recipe.title,
          description: recipe.description || '',
          instructions: recipe.steps.map((s, i) => `${i + 1}. ${s.replace(/^\d+\.\s*/, '').trim()}`).join('\n'),
          image_url: null,
          servings: recipe.servings || 1,
          isGlobal: false,
          isDeleted: false,
          createdAt: now,
          updatedAt: now,
        });
      }

      // Step 3: Create recipe_ingredients links
      for (const ri of resolvedIngredients) {
        await db.insert(recipeIngredients).values({
          recipeId: newRecipe.id,
          ingredientId: ri.id,
          userId,
          amount: ri.amount,
          unit: 'g',
          isGlobal: false,
          isDeleted: false,
          createdAt: now,
          updatedAt: now,
        });
      }

      Alert.alert('Recipe Saved! 🎉', `"${recipe.title}" has been added to your cookbook. Any new ingredients were auto-created and can be edited in the Ingredients page.`, [
        { text: 'View Recipe', onPress: () => router.replace(`/recipe/${newRecipe.id}`) },
        { text: 'Stay Here', style: 'cancel' }
      ]);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSavingRecipe(null);
    }
  };

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: t.surface, paddingTop: insets.top },
    navBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: t.surface, borderBottomWidth: 1, borderBottomColor: t.border },
    navTitle: { color: t.textPrimary, fontSize: 18, fontWeight: 'bold' },
    chatArea: { flex: 1, paddingHorizontal: 16, backgroundColor: t.bg },
    bubbleUser: { backgroundColor: t.accent, alignSelf: 'flex-end', padding: 12, borderRadius: 16, borderBottomRightRadius: 4, marginVertical: 6, maxWidth: '80%' },
    bubbleAssistant: { alignSelf: 'flex-start', marginVertical: 6, maxWidth: '88%' },
    bubbleAssistantInner: { backgroundColor: t.surface, padding: 12, borderRadius: 16, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: t.border },
    textUser: { color: '#fff', fontSize: 15, lineHeight: 22 },
    textAssistant: { color: t.textPrimary, fontSize: 15, lineHeight: 22 },
    saveRecipeBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, backgroundColor: t.accentSoft, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: t.accent },
    saveRecipeBtnText: { color: t.accent, fontWeight: 'bold', fontSize: 14 },
    inputContainer: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: t.surface, borderTopWidth: 1, borderTopColor: t.border, paddingBottom: Math.max(insets.bottom, 12), gap: 8 },
    textInput: { flex: 1, backgroundColor: t.bg, color: t.textPrimary, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, borderWidth: 1, borderColor: t.border },
    sendBtn: { justifyContent: 'center', alignItems: 'center', backgroundColor: t.accent, width: 44, height: 44, borderRadius: 22 },
    chefBtn: { justifyContent: 'center', alignItems: 'center', backgroundColor: t.surface, width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: t.accent },
    pantryBtn: { justifyContent: 'center', alignItems: 'center', backgroundColor: t.surface, width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: t.accent },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { backgroundColor: t.surface, width: '85%', borderRadius: 16, padding: 24, borderWidth: 1, borderColor: t.border },
    modalTitle: { color: t.textPrimary, fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
    modalInput: { backgroundColor: t.bg, color: t.textPrimary, padding: 12, borderRadius: 12, fontSize: 15, borderWidth: 1, borderColor: t.border, marginBottom: 20 },
    modalBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
    btnSave: { backgroundColor: t.accent, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
    btnCancel: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  });

  return (
    <View style={s.container}>
      <View style={s.navBar}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <MaterialCommunityIcons name="arrow-left" size={26} color={t.textPrimary} />
        </TouchableOpacity>
        <Text style={s.navTitle}>AI Chef Chat</Text>
        <TouchableOpacity onPress={() => setShowSettings(true)} style={{ padding: 4 }}>
          <MaterialCommunityIcons name="cog-outline" size={26} color={t.textPrimary} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'padding'} keyboardVerticalOffset={Platform.OS === 'ios' ? 70 : 0}>
        <ScrollView
          style={s.chatArea}
          contentContainerStyle={{ paddingVertical: 16 }}
          ref={scrollViewRef}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((m, idx) => (
            <View key={idx}>
              {m.role === 'user' ? (
                <View style={s.bubbleUser}>
                  <Text style={s.textUser}>{m.text}</Text>
                </View>
              ) : (
                <View style={s.bubbleAssistant}>
                  <View style={s.bubbleAssistantInner}>
                    <Text style={s.textAssistant}>{m.text}</Text>
                  </View>
                  {m.recipeData && (
                    <TouchableOpacity
                      style={s.saveRecipeBtn}
                      disabled={savingRecipe === m.recipeData.title}
                      onPress={() => handleSaveRecipe(m.recipeData!)}
                    >
                      {savingRecipe === m.recipeData.title ? (
                        <ActivityIndicator size="small" color={t.accent} />
                      ) : (
                        <MaterialCommunityIcons name="book-plus-outline" size={20} color={t.accent} />
                      )}
                      <Text style={s.saveRecipeBtnText}>
                        {savingRecipe === m.recipeData.title ? 'Saving...' : 'Save to My Cookbook'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          ))}
          {loading && (
            <View style={s.bubbleAssistant}>
              <View style={s.bubbleAssistantInner}>
                <ActivityIndicator color={t.accent} size="small" />
              </View>
            </View>
          )}
        </ScrollView>

        <View style={s.inputContainer}>
          <TextInput
            style={s.textInput}
            placeholder="Ask me anything..."
            placeholderTextColor={t.textSecondary}
            value={inputStr}
            onChangeText={setInputStr}
          />
          <TouchableOpacity style={s.pantryBtn} onPress={handlePantryRecipe} disabled={loading}>
            <MaterialCommunityIcons name="fridge-outline" size={22} color={t.accent} />
          </TouchableOpacity>
          <TouchableOpacity style={s.chefBtn} onPress={handleGenerateRecipe} disabled={loading}>
            <MaterialCommunityIcons name="pot-steam-outline" size={22} color={t.accent} />
          </TouchableOpacity>
          <TouchableOpacity style={[s.sendBtn, !inputStr.trim() && { opacity: 0.5 }]} onPress={handleSend} disabled={!inputStr.trim() || loading}>
            <MaterialCommunityIcons name="send" size={20} color="#fff" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={showSettings} transparent={true} animationType="fade" statusBarTranslucent>
        <View style={s.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.modalContent}>
            <Text style={s.modalTitle}>AI Configuration</Text>
            <Text style={{ color: t.textSecondary, fontSize: 13, marginBottom: 16, lineHeight: 18 }}>
              To use this chat, you need an API key from an AI provider. Create an account with your preferred provider, navigate to their developer or API dashboard, generate a new secret key, and paste it below. Keys are stored securely on your local device.
            </Text>
            <TextInput
              style={[s.modalInput, { marginBottom: 12 }]}
              placeholder="API Model (e.g. gemini-2.5-flash)"
              placeholderTextColor={t.textSecondary}
              value={tempModel}
              onChangeText={setTempModel}
              autoCapitalize="none"
            />
            <TextInput
              style={s.modalInput}
              placeholder="Enter your API key..."
              placeholderTextColor={t.textSecondary}
              value={tempKey}
              onChangeText={setTempKey}
              secureTextEntry
              autoCapitalize="none"
            />
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.btnCancel} onPress={() => { setShowSettings(false); setTempKey(apiKey); setTempModel(modelName); }}>
                <Text style={{ color: t.textSecondary, fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.btnSave} onPress={handleSaveKey}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}
