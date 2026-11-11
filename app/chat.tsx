import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, FlatList, KeyboardAvoidingView, Pressable, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  GeminiBlockedError, GeminiContent, GeminiHttpError, MissingKeyError, callGemini,
} from '@/lib/gemini/client';
import {
  InvalidSaveError, SAVE_FOOD_TOOL, SaveFoodArgs, buildChatSystemPrompt, parseSaveFoodArgs,
} from '@/lib/gemini/chatTools';
import { OfflineError } from '@/lib/library/errors';
import { listFoods } from '@/lib/library/repository';
import { saveFromChat } from '@/lib/library/saveFromChat';
import type { Food } from '@/lib/library/types';

type Action =
  | { kind: 'open'; foodId: string }
  | { kind: 'duplicate'; foodId: string; args: SaveFoodArgs }
  | { kind: 'settings' };

interface Bubble {
  id: number;
  role: 'user' | 'model' | 'notice';
  text: string;
  action?: Action;
}

class LibraryReadError extends Error {
  constructor() {
    super('Could not read your library, so nothing was saved. Please try again.');
    this.name = 'LibraryReadError';
  }
}

const TOOLS = [{ functionDeclarations: [SAVE_FOOD_TOOL] }];

function errorBubble(e: unknown): { text: string; action?: Action } {
  if (e instanceof MissingKeyError) {
    return { text: 'No Gemini API key is set. Add your key in Settings to use the chat.', action: { kind: 'settings' } };
  }
  if (e instanceof OfflineError) return { text: 'You need internet to save to your library. Nothing was saved.' };
  if (e instanceof InvalidSaveError || e instanceof LibraryReadError) return { text: e.message };
  if (e instanceof GeminiHttpError || e instanceof GeminiBlockedError) return { text: e.message };
  if (e instanceof Error && (e.name === 'AbortError' || /network request failed|failed to fetch/i.test(e.message))) {
    return { text: 'Could not reach Gemini. Check your internet connection and try again.' };
  }
  console.warn('Chat failed', e);
  return { text: 'Something went wrong. Nothing was saved. Please try again.' };
}

export default function Chat() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ q?: string; foodId?: string }>();
  const q = Array.isArray(params.q) ? params.q[0] : params.q;
  const foodId = Array.isArray(params.foodId) ? params.foodId[0] : params.foodId;

  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const mounted = useRef(true);
  const abort = useRef<AbortController | null>(null);
  const history = useRef<GeminiContent[]>([]);
  const nextId = useRef(1);
  const started = useRef(false);
  const busyRef = useRef(false);
  const listRef = useRef<FlatList<Bubble>>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      abort.current?.abort();
    };
  }, []);

  const add = useCallback((b: Omit<Bubble, 'id'>) => {
    if (!mounted.current) return;
    setBubbles((prev) => [...prev, { ...b, id: nextId.current++ }]);
  }, []);

  // A failed read must not silently skip duplicate detection: callers show an error and save nothing.
  const readFoods = useCallback(async (): Promise<Food[]> => {
    try {
      return await listFoods();
    } catch (e) {
      console.warn('Failed to read local library', e);
      throw new LibraryReadError();
    }
  }, []);

  const savedBubble = (outcome: { type: string; food: Food }, args: SaveFoodArgs): Omit<Bubble, 'id'> => {
    const label = outcome.type === 'variant-added' && args.variantLabel ? ` (${args.variantLabel})` : '';
    const where = outcome.type === 'variant-added' && !args.variantLabel ? ' as a new variant' : '';
    return {
      role: 'notice',
      text: `Saved ${outcome.food.name}${label}${where}`,
      action: { kind: 'open', foodId: outcome.food.id },
    };
  };

  const send = useCallback(async (raw: string) => {
    const content = raw.trim();
    if (!content || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setText('');
    add({ role: 'user', text: content });
    const userTurn: GeminiContent = { role: 'user', parts: [{ text: content }] };
    const controller = new AbortController();
    abort.current = controller;
    // The user turn stays in history even if the call fails, so context is kept on retry.
    const turns: GeminiContent[] = [userTurn];
    try {
      const foods = await readFoods();
      const focus = foodId ? foods.find((f) => f.id === foodId) : undefined;
      const system = buildChatSystemPrompt(foods.map((f) => f.name), focus);
      const ask = () =>
        callGemini({ system, contents: [...history.current, ...turns], tools: TOOLS, signal: controller.signal });

      let res = await ask();
      if (res.functionCall) {
        const fc = res.functionCall;
        turns.push({ role: 'model', parts: [{ functionCall: fc }] });
        let response: Record<string, unknown>;
        let confirm = false;
        if (fc.name !== 'save_food') {
          // Keep call/response pairing valid without confirming anything.
          response = { error: `Unknown function ${fc.name}`, saved: false };
          add({ role: 'notice', text: 'The assistant asked for something this app cannot do. Nothing was saved.' });
        } else {
          try {
            const args = parseSaveFoodArgs(fc.args);
            const outcome = await saveFromChat(args, foods, { focusFoodId: focus?.id });
            if (outcome.type === 'duplicate') {
              add({
                role: 'notice',
                text: 'Already in your library',
                action: { kind: 'duplicate', foodId: outcome.existing.id, args },
              });
              response = { result: 'duplicate', existingName: outcome.existing.name, saved: false };
            } else {
              add(savedBubble(outcome, args));
              response = { result: outcome.type, name: outcome.food.name, saved: true };
            }
            confirm = true;
          } catch (e) {
            const b = errorBubble(e);
            add({ role: 'notice', ...b });
            response = { error: b.text, saved: false };
          }
        }
        turns.push({ role: 'user', parts: [{ functionResponse: { name: fc.name, response } }] });
        if (confirm) {
          // The write already happened; a failed confirmation must not claim otherwise.
          try {
            res = await ask();
            if (res.text) {
              turns.push({ role: 'model', parts: [{ text: res.text }] });
              add({ role: 'model', text: res.text });
            }
          } catch {
            add({ role: 'notice', text: 'Saved, but the assistant reply failed.' });
          }
        }
      } else if (res.text) {
        turns.push({ role: 'model', parts: [{ text: res.text }] });
        add({ role: 'model', text: res.text });
      } else {
        add({ role: 'notice', text: 'The assistant sent an empty reply. Please try again.' });
      }
    } catch (e) {
      if (mounted.current) add({ role: 'notice', ...errorBubble(e) });
    } finally {
      history.current = [...history.current, ...turns];
      busyRef.current = false;
      if (mounted.current) setBusy(false);
    }
  }, [add, foodId, readFoods]);

  // Text typed in the library ChatBar arrives as ?q= and is sent once.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (q && q.trim()) send(q);
  }, [q, send]);

  const [done, setDone] = useState<Record<number, boolean>>({});

  const saveFromDuplicate = useCallback(async (bubbleId: number, existingId: string, args: SaveFoodArgs, asNew: boolean) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const foods = await readFoods();
      const a = asNew ? args : { ...args, variantLabel: args.variantLabel ?? 'Variation' };
      const outcome = await saveFromChat(a, foods, asNew ? { forceNew: true } : { focusFoodId: existingId });
      if (outcome.type !== 'duplicate') {
        add(savedBubble(outcome, a));
        if (mounted.current) setDone((d) => ({ ...d, [bubbleId]: true }));
      }
    } catch (e) {
      add({ role: 'notice', ...errorBubble(e) });
    } finally {
      busyRef.current = false;
      if (mounted.current) setBusy(false);
    }
  }, [add, readFoods]);

  const renderItem = ({ item }: { item: Bubble }) => (
    <View style={[styles.bubble, item.role === 'user' ? styles.user : item.role === 'model' ? styles.model : styles.notice]}>
      <Text style={styles.bubbleText}>{item.text}</Text>
      {item.action?.kind === 'open' && (
        <Btn label="Open" onPress={() => router.push(`/food/${(item.action as { foodId: string }).foodId}`)} />
      )}
      {item.action?.kind === 'settings' && <Btn label="Open Settings" onPress={() => router.push('/settings')} />}
      {item.action?.kind === 'duplicate' && (
        <View style={styles.row}>
          <Btn label="Open" onPress={() => router.push(`/food/${(item.action as { foodId: string }).foodId}`)} />
          <Btn
            label={done[item.id] ? 'Saved' : 'Save as variant'}
            disabled={busy || !!done[item.id]}
            onPress={() => {
              const a = item.action as { foodId: string; args: SaveFoodArgs };
              saveFromDuplicate(item.id, a.foodId, a.args, false);
            }}
          />
          <Btn
            label="Save as new food"
            disabled={busy || !!done[item.id]}
            onPress={() => {
              const a = item.action as { foodId: string; args: SaveFoodArgs };
              saveFromDuplicate(item.id, a.foodId, a.args, true);
            }}
          />
        </View>
      )}
    </View>
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button" accessibilityLabel="Back" style={styles.back}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/library'))}
        >
          <Ionicons name="chevron-back" size={24} color="#F1F5F9" />
        </Pressable>
        <Text style={styles.title}>Chat</Text>
      </View>
      <FlatList
        ref={listRef}
        data={bubbles}
        keyExtractor={(b) => String(b.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <Text style={styles.empty}>
            Ask about a food or dish (values are per 100 g). Say "save it" to add it to your library.
          </Text>
        }
        ListFooterComponent={busy ? <ActivityIndicator color="#10B981" style={styles.spinner} /> : null}
      />
      <KeyboardAvoidingView behavior="padding">
        <View style={[styles.bar, { paddingBottom: 8 + insets.bottom }]}>
          <TextInput
            accessibilityLabel="Message"
            style={styles.input}
            value={text}
            onChangeText={setText}
            onSubmitEditing={() => send(text)}
            placeholder="Ask about a food..."
            placeholderTextColor="#94A3B8"
            returnKeyType="send"
          />
          <Pressable
            accessibilityRole="button" accessibilityLabel="Send message" disabled={busy || !text.trim()}
            onPress={() => send(text)} style={[styles.send, (busy || !text.trim()) && styles.disabled]}
          >
            <Ionicons name="send" size={20} color="#0F172A" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function Btn({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress}
      style={[styles.btn, disabled && styles.disabled]}
    >
      <Text style={styles.btnText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0F172A' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, height: 56 },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#F1F5F9', fontSize: 18, fontWeight: '600' },
  // Bottom padding keeps the last bubble clear of the calculator FAB that floats above the input bar.
  list: { padding: 12, gap: 8, paddingBottom: 72, flexGrow: 1 },
  empty: { color: '#94A3B8', textAlign: 'center', marginTop: 48, paddingHorizontal: 24, fontSize: 15 },
  spinner: { marginVertical: 8 },
  bubble: { maxWidth: '85%', borderRadius: 16, padding: 12, gap: 8 },
  user: { alignSelf: 'flex-end', backgroundColor: '#065F46' },
  model: { alignSelf: 'flex-start', backgroundColor: '#1E293B' },
  notice: { alignSelf: 'flex-start', backgroundColor: '#334155' },
  bubbleText: { color: '#F1F5F9', fontSize: 16 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  btn: {
    minHeight: 44, paddingHorizontal: 16, borderRadius: 22, backgroundColor: '#10B981',
    alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start',
  },
  btnText: { color: '#0F172A', fontSize: 15, fontWeight: '600' },
  disabled: { opacity: 0.5 },
  bar: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 8, paddingHorizontal: 12,
    backgroundColor: '#0F172A', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#1E293B',
  },
  input: {
    flex: 1, height: 48, borderRadius: 24, paddingHorizontal: 16, backgroundColor: '#1E293B',
    color: '#F1F5F9', fontSize: 16,
  },
  send: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center' },
});
