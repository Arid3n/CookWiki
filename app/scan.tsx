import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { InvalidSaveError, SaveFoodArgs } from '@/lib/gemini/chatTools';
import { GeminiBlockedError, GeminiHttpError, MissingKeyError } from '@/lib/gemini/client';
import { scanLabel } from '@/lib/gemini/scanLabel';
import { OfflineError } from '@/lib/library/errors';
import { listFoods, updateFood } from '@/lib/library/repository';
import { saveFromChat } from '@/lib/library/saveFromChat';
import type { Food, FoodKind } from '@/lib/library/types';
import Hero from '@/components/ui/Hero';
import HeroTitle from '@/components/ui/HeroTitle';
import PopIn from '@/components/ui/PopIn';
import HeroButton, { heroRowStyle } from '@/components/ui/HeroButton';
import Icon from '@/components/ui/Icon';
import { colors, fonts, space, shape } from '@/lib/ui/theme';

type Result =
  | { type: 'saved'; food: Food; variant: boolean }
  | { type: 'duplicate'; existing: Food; args: SaveFoodArgs }
  | { type: 'error'; text: string; settings?: boolean; permission?: boolean };

const GENERIC = 'Something went wrong. Nothing was saved. Please try again.';

function errorResult(e: unknown): Extract<Result, { type: 'error' }> {
  if (e instanceof MissingKeyError) {
    return { type: 'error', text: 'No Gemini API key is set. Add your key in Settings to scan labels.', settings: true };
  }
  if (e instanceof OfflineError) return { type: 'error', text: 'You need internet to save to your library. Nothing was saved.' };
  if (e instanceof InvalidSaveError || e instanceof GeminiHttpError || e instanceof GeminiBlockedError) {
    return { type: 'error', text: e.message };
  }
  if (e instanceof Error && (e.name === 'AbortError' || /network request failed|failed to fetch/i.test(e.message))) {
    return { type: 'error', text: 'Could not reach Gemini. Check your internet connection and try again.' };
  }
  console.warn('Scan failed', e);
  return { type: 'error', text: GENERIC };
}

export default function Scan() {
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [moved, setMoved] = useState<FoodKind | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  const mounted = useRef(true);
  const busyRef = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Runs one guarded async action: no double submit, no state updates after unmount.
  const run = useCallback(async (job: () => Promise<Result | null>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    let r: Result | null;
    try {
      r = await job();
    } catch (e) {
      r = errorResult(e);
    } finally {
      busyRef.current = false;
    }
    if (!mounted.current) return;
    setBusy(false);
    if (r) {
      setResult(r);
      setMoved(null);
      setMoveError(null);
    }
  }, []);

  const takePhoto = useCallback(
    () =>
      run(async () => {
        // The photo is only held in memory as base64 for this one request; it is never saved or uploaded.
        const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], base64: true, quality: 0.6 };
        let picked: ImagePicker.ImagePickerResult;
        if (Platform.OS === 'web') {
          picked = await ImagePicker.launchImageLibraryAsync(options);
        } else {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) {
            return {
              type: 'error',
              text: 'CookWiki needs camera access to scan a label. Allow the camera in your phone settings and try again.',
              permission: true,
            };
          }
          picked = await ImagePicker.launchCameraAsync(options);
        }
        if (picked.canceled) return null;
        const asset = picked.assets[0];
        if (!asset?.base64) return { type: 'error', text: 'The photo could not be read. Please try again.' };
        const args = await scanLabel(asset.base64, asset.mimeType ?? 'image/jpeg');
        const foods = await listFoods();
        const outcome = await saveFromChat(args, foods);
        return outcome.type === 'duplicate'
          ? { type: 'duplicate', existing: outcome.existing, args }
          : { type: 'saved', food: outcome.food, variant: outcome.type === 'variant-added' };
      }),
    [run],
  );

  const saveDuplicate = useCallback(
    (existing: Food, args: SaveFoodArgs, asNew: boolean) =>
      run(async () => {
        const foods = await listFoods();
        const a = asNew ? args : { ...args, variantLabel: args.variantLabel ?? 'Variation' };
        const outcome = await saveFromChat(a, foods, asNew ? { forceNew: true } : { focusFoodId: existing.id });
        if (outcome.type === 'duplicate') {
          return { type: 'error', text: 'This food is still flagged as a duplicate, so nothing was saved. Try again or open the existing food.' };
        }
        return { type: 'saved', food: outcome.food, variant: outcome.type === 'variant-added' };
      }),
    [run],
  );

  const move = useCallback(
    async (food: Food, kind: FoodKind) => {
      if (busyRef.current) return;
      busyRef.current = true;
      setBusy(true);
      try {
        await updateFood(food.id, { kind });
        if (mounted.current) {
          setMoved(kind);
          setMoveError(null);
        }
      } catch (e) {
        // The food is already saved: keep its card and show the failure beside it.
        const text =
          e instanceof OfflineError
            ? 'You need internet to move it. The food is saved, but it was not moved.'
            : errorResult(e).text.replace('Nothing was saved.', 'The food is saved, but it was not moved.');
        if (mounted.current) setMoveError(text);
      } finally {
        busyRef.current = false;
        if (mounted.current) setBusy(false);
      }
    },
    [],
  );

  const kindOf = (f: Food): FoodKind => moved ?? f.kind;
  const otherKind = (f: Food): FoodKind => (kindOf(f) === 'dish' ? 'single' : 'dish');
  const kindLabel = (k: FoodKind) => (k === 'dish' ? 'Dishes' : 'Single foods');

  return (
    <View style={styles.screen}>
      <Hero height={270}>
        <View style={styles.header}>
          <HeroButton icon="back" accessibilityLabel="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/library'))} />
        </View>
        <View style={styles.heroText}>
          <HeroTitle style={styles.title} accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.4} maxFontSizeMultiplier={1.2}>scan</HeroTitle>
        </View>
      </Hero>
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: 110 + insets.bottom }]}>
        <View style={styles.viewfinder} accessibilityLabel="Label scanner">
          <View style={[styles.corner, styles.tl]} />
          <View style={[styles.corner, styles.tr]} />
          <View style={[styles.corner, styles.bl]} />
          <View style={[styles.corner, styles.br]} />
          {busy ? (
            <ActivityIndicator color={colors.accent} size="large" />
          ) : (
            <View style={styles.camCircle}>
              <Icon name="camera" size={30} color={colors.accent} />
            </View>
          )}
          <Text style={styles.vfText}>{busy ? 'Reading the label…' : 'Frame the nutrition table'}</Text>
        </View>
        <Text style={styles.hint}>Values are saved per 100 g. The photo is not stored.</Text>

        {result?.type === 'error' && (
          <View style={styles.card} accessibilityLiveRegion="polite">
            <Text style={styles.errorText}>{result.text}</Text>
            {result.settings && <Btn label="Open Settings" onPress={() => router.push('/settings')} />}
            {result.permission && <Btn label="Open phone settings" onPress={() => Linking.openSettings()} />}
          </View>
        )}

        {result?.type === 'saved' && (
          <PopIn style={styles.card} accessibilityLiveRegion="polite">
            <Text style={styles.text}>
              {result.variant ? `Saved as a new variant of ${result.food.name}` : `Saved ${result.food.name}`}
            </Text>
            <View style={styles.row}>
              <Btn label="Open" onPress={() => router.push(`/food/${result.food.id}`)} />
              {!result.variant && (
                <Btn
                  label={`Move to ${kindLabel(otherKind(result.food))}`}
                  disabled={busy}
                  onPress={() => move(result.food, otherKind(result.food))}
                />
              )}
            </View>
            {moveError && <Text style={styles.errorText}>{moveError}</Text>}
          </PopIn>
        )}

        {result?.type === 'duplicate' && (
          <View style={styles.card} accessibilityLiveRegion="polite">
            <Text style={styles.text}>Already in your library as {result.existing.name}</Text>
            <View style={styles.row}>
              <Btn label="Open" onPress={() => router.push(`/food/${result.existing.id}`)} />
              <Btn label="Save as variant" disabled={busy} onPress={() => saveDuplicate(result.existing, result.args, false)} />
              <Btn label="Save as new food" disabled={busy} onPress={() => saveDuplicate(result.existing, result.args, true)} />
            </View>
          </View>
        )}
      </ScrollView>
      <View style={[styles.bottom, { paddingBottom: insets.bottom + space.gutter }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Take photo"
          disabled={busy}
          onPress={takePhoto}
          style={({ pressed }) => [styles.pill, (busy || pressed) && styles.disabled]}
        >
          <Icon name="camera" size={20} color={colors.ink} />
          <Text style={styles.pillText}>{busy ? 'Working...' : 'Take photo'}</Text>
        </Pressable>
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
  header: heroRowStyle,
  heroText: { position: 'absolute', left: space.gutter, right: space.gutter, bottom: 30 },
  title: { color: colors.onHero, fontFamily: fonts.display, fontSize: 100, lineHeight: 94, textAlign: 'center', textTransform: 'uppercase' },
  body: { padding: space.gutter, gap: 16 },
  text: { color: colors.text, fontFamily: fonts.body, fontSize: 16 },
  errorText: { color: colors.dangerText, fontFamily: fonts.body, fontSize: 16 },
  viewfinder: {
    height: 220, borderRadius: shape.xl, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', gap: 14,
  },
  corner: { position: 'absolute', width: 30, height: 30, borderColor: colors.accent },
  tl: { top: 14, left: 14, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 12 },
  tr: { top: 14, right: 14, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 12 },
  bl: { bottom: 14, left: 14, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 12 },
  br: { bottom: 14, right: 14, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 12 },
  camCircle: {
    width: 64, height: 64, borderRadius: shape.xl, backgroundColor: colors.accentContainer, alignItems: 'center', justifyContent: 'center',
  },
  vfText: { color: colors.sub, fontFamily: fonts.body, fontSize: 14 },
  hint: { color: colors.sub, fontFamily: fonts.body, fontSize: 13, textAlign: 'center' },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.gutter, paddingTop: 12, backgroundColor: colors.bg },
  pill: {
    height: 56, borderRadius: shape.lg, backgroundColor: colors.accent, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 10,
  },
  pillText: { color: colors.ink, fontFamily: fonts.heading, fontSize: 17 },
  card: { backgroundColor: colors.surface, borderRadius: shape.card, padding: 14, gap: 12 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  btn: {
    minHeight: 44, paddingHorizontal: 18, borderRadius: shape.lg, backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start',
  },
  btnText: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 15 },
  disabled: { opacity: 0.5 },
});
