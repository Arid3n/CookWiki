import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  GeminiBlockedError, GeminiContent, GeminiHttpError, MissingKeyError, callGemini,
} from '@/lib/gemini/client';
import {
  InvalidSaveError, SAVE_FOOD_TOOL, SaveFoodArgs, buildChatSystemPrompt, parseSaveFoodArgs,
} from '@/lib/gemini/chatTools';
import { OfflineError } from '@/lib/library/errors';
import { findSavedMentioned } from '@/lib/library/duplicates';
import { listFoods } from '@/lib/library/repository';
import { saveFromChat } from '@/lib/library/saveFromChat';
import type { Food } from '@/lib/library/types';
import Hero from '@/components/ui/Hero';
import HeroTitle from '@/components/ui/HeroTitle';
import PopIn from '@/components/ui/PopIn';
import HeroButton, { heroRowStyle } from '@/components/ui/HeroButton';
import Icon from '@/components/ui/Icon';
import RoundButton from '@/components/ui/RoundButton';
import { colors, fonts, sizes, space, shape } from '@/lib/ui/theme';
import { dockRightReserve } from '@/lib/calculator/fabLayout';
import { keyboardClearance, useKeyboardHeight } from '@/lib/ui/useKeyboardHeight';

type Action =
  | { kind: 'open'; foodId: string }
  | { kind: 'duplicate'; foodId: string; args: SaveFoodArgs }
  | { kind: 'saved'; foodId: string; message: string }
  | { kind: 'settings' };

interface Bubble {
  id: number;
  role: 'user' | 'model' | 'notice';
  text: string;
  action?: Action;
  error?: boolean;
}

class LibraryReadError extends Error {
  constructor() {
    super('Could not read your library, so nothing was saved. Please try again.');
    this.name = 'LibraryReadError';
  }
}

const HERO_HEIGHT = 210;

const TOOLS = [{ functionDeclarations: [SAVE_FOOD_TOOL] }];

function errorBubble(e: unknown): { text: string; action?: Action; error: true } {
  if (e instanceof MissingKeyError) {
    return { text: 'No Gemini API key is set. Add your key in Settings to use the chat.', action: { kind: 'settings' }, error: true };
  }
  if (e instanceof OfflineError) return { text: 'You need internet to save to your library. Nothing was saved.', error: true };
  if (e instanceof InvalidSaveError || e instanceof LibraryReadError) return { text: e.message, error: true };
  if (e instanceof GeminiHttpError || e instanceof GeminiBlockedError) return { text: e.message, error: true };
  if (e instanceof Error && (e.name === 'AbortError' || /network request failed|failed to fetch/i.test(e.message))) {
    return { text: 'Could not reach Gemini. Check your internet connection and try again.', error: true };
  }
  console.warn('Chat failed', e);
  return { text: 'Something went wrong. Nothing was saved. Please try again.', error: true };
}

export default function Chat() {
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardHeight();
  // Shrink the screen above the keyboard so the list resizes instead of sitting under the lifted dock.
  const keyboardPad = keyboardClearance(keyboard, insets.bottom);
  const params = useLocalSearchParams<{ q?: string; foodId?: string }>();
  const q = Array.isArray(params.q) ? params.q[0] : params.q;
  const foodId = Array.isArray(params.foodId) ? params.foodId[0] : params.foodId;

  const [bubbles, setBubbles] = useState<Bubble[]>([]);
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

  const send = useCallback(async (raw: string, skipCheck = false, echo = true) => {
    const content = raw.trim();
    if (!content || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    if (echo) add({ role: 'user', text: content });
    const userTurn: GeminiContent = { role: 'user', parts: [{ text: content }] };
    const controller = new AbortController();
    abort.current = controller;
    // The user turn stays in history even if the call fails, so context is kept on retry.
    const turns: GeminiContent[] = [userTurn];
    try {
      const foods = await readFoods();
      const focus = foodId ? foods.find((f) => f.id === foodId) : undefined;
      if (!focus && !skipCheck) {
        // Local check before any Gemini call: a saved food is not estimated again.
        const hit = findSavedMentioned(content, foods)[0];
        if (hit) {
          add({
            role: 'notice',
            text: `Already in your library: ${hit.name}`,
            action: { kind: 'saved', foodId: hit.id, message: content },
          });
          turns.length = 0;
          return;
        }
      }
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
          add({ role: 'notice', text: 'The assistant asked for something this app cannot do. Nothing was saved.', error: true });
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
            add({ role: 'notice', text: 'Saved, but the assistant reply failed.', error: true });
          }
        }
      } else if (res.text) {
        turns.push({ role: 'model', parts: [{ text: res.text }] });
        add({ role: 'model', text: res.text });
      } else {
        add({ role: 'notice', text: 'The assistant sent an empty reply. Please try again.', error: true });
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

  const askAnyway = useCallback((bubbleId: number, message: string) => {
    if (busyRef.current) return;
    setDone((d) => ({ ...d, [bubbleId]: true }));
    send(message, true, false);
  }, [send]);

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

  const renderItem = useCallback(({ item }: { item: Bubble }) => {
    if (item.role === 'notice' && item.action?.kind === 'open') {
      const id = item.action.foodId;
      return (
        <PopIn style={styles.saved}>
          <PopIn style={styles.check} delay={120}>
            <Icon name="check" size={16} color={colors.ink} />
          </PopIn>
          <Text style={styles.savedName} numberOfLines={2}>{item.text}</Text>
          <Pressable
            accessibilityRole="button" accessibilityLabel="Open" hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
            onPress={() => router.push(`/food/${id}`)} style={styles.open}
          >
            <Text style={styles.openText}>Open</Text>
          </Pressable>
        </PopIn>
      );
    }
    return (
      <View style={[styles.bubble, item.role === 'user' ? styles.user : item.role === 'model' ? styles.model : styles.notice]}>
        <Text style={[styles.bubbleText, item.role === 'user' && styles.userText, item.error && styles.errorText]}>{item.text}</Text>
        {item.action?.kind === 'saved' && (
          <View style={styles.row}>
            <Btn label="Open" onPress={() => router.push(`/food/${(item.action as { foodId: string }).foodId}`)} />
            <Btn
              label="Ask anyway"
              disabled={busy || !!done[item.id]}
              onPress={() => askAnyway(item.id, (item.action as { message: string }).message)}
            />
          </View>
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
  }, [busy, done, askAnyway, saveFromDuplicate]);

  const sendText = useCallback((t: string) => { send(t); }, [send]);

  return (
    <View style={[styles.screen, { paddingBottom: keyboardPad }]}>
      <Hero height={HERO_HEIGHT}>
        <View style={styles.heroRow}>
          <HeroButton icon="back" accessibilityLabel="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/library'))} />
        </View>
        <View style={styles.heroText}>
          <HeroTitle style={styles.title} accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.4} maxFontSizeMultiplier={1.2}>chat</HeroTitle>
        </View>
      </Hero>
      <FlatList
        ref={listRef}
        data={bubbles}
        keyExtractor={(b) => String(b.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <Text style={styles.empty}>
            Ask about a food or dish (values are per 100 g). Say "save it" to add it to your library.
          </Text>
        }
        ListFooterComponent={busy ? <ActivityIndicator color={colors.accent} style={styles.spinner} /> : null}
      />
      <ChatDock busy={busy} onSend={sendText} bottomInset={insets.bottom} />
    </View>
  );
}

/** Input bar with its own text state, so typing does not re-render the message list. */
function ChatDock({ busy, onSend, bottomInset }: { busy: boolean; onSend: (text: string) => void; bottomInset: number }) {
  const [text, setText] = useState('');
  const submit = () => {
    if (busy || !text.trim()) return;
    onSend(text);
    setText('');
  };
  return (
    <View>
      <View style={[styles.bar, { paddingBottom: 8 + bottomInset }]}>
        <View style={styles.dock}>
          <TextInput
            accessibilityLabel="Message"
            style={styles.input}
            value={text}
            onChangeText={setText}
            onSubmitEditing={submit}
            placeholder="Ask about a food..."
            placeholderTextColor={colors.sub}
            returnKeyType="send"
          />
          <RoundButton
            size={sizes.send} icon="send" accessibilityLabel="Send message"
            disabled={busy || !text.trim()} onPress={submit}
          />
        </View>
      </View>
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
  screen: { flex: 1 },
  heroRow: heroRowStyle,
  heroText: { position: 'absolute', left: space.gutter, right: space.gutter, bottom: 30 },
  title: { color: colors.onHero, fontFamily: fonts.display, fontSize: 100, lineHeight: 94, textAlign: 'center', textTransform: 'uppercase' },
  list: { padding: space.gutter, gap: 8, flexGrow: 1 },
  empty: { color: colors.sub, fontFamily: fonts.body, textAlign: 'center', marginTop: 48, paddingHorizontal: 24, fontSize: 15 },
  spinner: { marginVertical: 8 },
  bubble: { maxWidth: '85%', borderRadius: 20, padding: 12, gap: 8 },
  user: { alignSelf: 'flex-end', backgroundColor: colors.accent, borderBottomRightRadius: 4 },
  model: { alignSelf: 'flex-start', backgroundColor: colors.surface, borderBottomLeftRadius: 4 },
  notice: { alignSelf: 'flex-start', backgroundColor: colors.surface2 },
  bubbleText: { color: colors.text, fontFamily: fonts.body, fontSize: 16, lineHeight: 22 },
  errorText: { color: colors.dangerText },
  userText: { color: colors.ink },
  saved: {
    alignSelf: 'flex-start', width: '92%', flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12,
    borderRadius: shape.card, backgroundColor: colors.sageContainer,
  },
  check: { width: 30, height: 30, borderRadius: 10, backgroundColor: colors.sage, alignItems: 'center', justifyContent: 'center' },
  savedName: { flex: 1, color: colors.text, fontFamily: fonts.name, fontSize: 15 },
  open: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 16, backgroundColor: colors.accent },
  openText: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 12 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  btn: {
    minHeight: 44, paddingHorizontal: 16, borderRadius: shape.lg, backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start',
  },
  btnText: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 15 },
  disabled: { opacity: 0.5 },
  bar: { paddingLeft: space.gutter, paddingRight: dockRightReserve(space.gutter, sizes.fab), paddingTop: 8, backgroundColor: colors.bg },
  dock: {
    minHeight: sizes.dock, borderRadius: shape.bar, backgroundColor: colors.surface2,
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 16, paddingRight: 3,
    elevation: 8, shadowColor: colors.shadow, shadowOpacity: 0.5, shadowRadius: 11, shadowOffset: { width: 0, height: 8 },
  },
  input: { flex: 1, minHeight: 44, color: colors.text, fontFamily: fonts.body, fontSize: 16 },
});
