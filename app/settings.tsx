import { useEffect, useState } from 'react';
import { Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Hero from '@/components/ui/Hero';
import HeroTitle from '@/components/ui/HeroTitle';
import HeroButton, { heroRowStyle } from '@/components/ui/HeroButton';
import { colors, fonts, space, shape } from '@/lib/ui/theme';
import { keyboardClearance, useKeyboardHeight } from '@/lib/ui/useKeyboardHeight';
import { supabase } from '@/lib/supabase';
import { DEFAULT_GEMINI_MODEL, getGeminiConfig, setGeminiKey, setGeminiModel } from '@/lib/gemini/config';

const isErrorStatus = (s: string) => s.startsWith('Could not');

export default function Settings() {
  const insets = useSafeAreaInsets();
  // Shrink the screen above the keyboard so the focused field is never covered.
  const keyboardPad = keyboardClearance(useKeyboardHeight(), insets.bottom);
  const [key, setKey] = useState('');
  const [model, setModel] = useState(DEFAULT_GEMINI_MODEL);
  const [show, setShow] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    getGeminiConfig()
      .then((c) => {
        setHasKey(!!c.apiKey);
        setModel(c.model);
      })
      .catch(() => setStatus('Could not read saved settings.'));
  }, []);

  const save = async () => {
    Keyboard.dismiss();
    try {
      if (key.trim()) await setGeminiKey(key);
      await setGeminiModel(model);
      setKey('');
      setShow(false);
      const c = await getGeminiConfig();
      setHasKey(!!c.apiKey);
      setModel(c.model);
      setStatus(c.apiKey ? 'Saved.' : 'Saved. No API key set.');
    } catch {
      setStatus('Could not save settings.');
    }
  };

  const removeKey = async () => {
    try {
      await setGeminiKey('');
      setKey('');
      setHasKey(false);
      setStatus('Key removed.');
    } catch {
      setStatus('Could not remove the key.');
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) setStatus('Could not sign out. Try again.');
  };

  return (
    <View style={[styles.container, { paddingBottom: keyboardPad }]}>
      <Hero height={210}>
        <View style={styles.heroRow}>
          <HeroButton icon="back" accessibilityLabel="Back" onPress={() => { Keyboard.dismiss(); router.back(); }} />
        </View>
        <View style={styles.heroText}>
          <HeroTitle style={styles.title} accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.4} maxFontSizeMultiplier={1.2}>settings</HeroTitle>
        </View>
      </Hero>
      <ScrollView
        contentContainerStyle={{ padding: space.gutter, paddingBottom: insets.bottom + 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.section}>Gemini</Text>
          <Text style={styles.hint}>
            Your own API key, stored only on this device. {hasKey ? 'A key is saved.' : 'No key saved yet.'}
          </Text>

          <Text style={styles.label}>API key</Text>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={key}
              onChangeText={setKey}
              secureTextEntry={!show}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder={hasKey ? 'Key saved (hidden)' : 'Paste your Gemini API key'}
              placeholderTextColor={colors.sub}
              accessibilityLabel="Gemini API key"
            />
            <Pressable accessibilityRole="button" accessibilityLabel={show ? 'Hide API key' : 'Show API key'} onPress={() => setShow((s) => !s)} style={styles.toggle}>
              <Text style={styles.link}>{show ? 'Hide' : 'Show'}</Text>
            </Pressable>
          </View>

          <Text style={styles.label}>Model</Text>
          <TextInput
            style={styles.input}
            value={model}
            onChangeText={setModel}
            autoCapitalize="none"
            autoCorrect={false}
            placeholderTextColor={colors.sub}
            accessibilityLabel="Gemini model"
          />

          <Pressable accessibilityRole="button" onPress={save} style={styles.primary}>
            <Text style={styles.primaryText}>Save</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={removeKey} style={styles.secondary}>
            <Text style={styles.secondaryText}>Remove key</Text>
          </Pressable>
          {!!status && <Text style={[styles.status, isErrorStatus(status) && styles.statusError]} accessibilityLiveRegion="polite">{status}</Text>}
        </View>

        <View style={styles.card}>
          <Text style={styles.section}>Account</Text>
          <Pressable accessibilityRole="button" onPress={signOut} style={styles.secondary}>
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heroRow: heroRowStyle,
  heroText: { position: 'absolute', left: space.gutter, right: space.gutter, bottom: 30 },
  title: { color: colors.onHero, fontFamily: fonts.display, fontSize: 100, lineHeight: 94, textAlign: 'center', textTransform: 'uppercase' },
  card: { backgroundColor: colors.surface, borderRadius: shape.card, padding: 16, marginBottom: 12 },
  link: { color: colors.accent, fontFamily: fonts.bodyBold, fontSize: 15 },
  section: { color: colors.text, fontFamily: fonts.heading, fontSize: 18, marginBottom: 6 },
  hint: { color: colors.sub, fontFamily: fonts.body, fontSize: 14, marginBottom: 8 },
  label: { color: colors.sub, fontFamily: fonts.bodyBold, fontSize: 13, marginBottom: 6, marginTop: 12 },
  row: { flexDirection: 'row', alignItems: 'center' },
  input: {
    backgroundColor: colors.surface2,
    borderRadius: shape.lg,
    color: colors.text,
    fontFamily: fonts.body,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 16,
  },
  toggle: { paddingHorizontal: 12, minHeight: 48, justifyContent: 'center' },
  primary: { backgroundColor: colors.accent, borderRadius: shape.lg, minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  primaryText: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 16 },
  secondary: {
    backgroundColor: colors.surface2,
    borderRadius: shape.lg,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  secondaryText: { color: colors.text, fontFamily: fonts.bodyBold, fontSize: 16 },
  signOutText: { color: colors.dangerText, fontFamily: fonts.bodyBold, fontSize: 16 },
  status: { color: colors.sage, fontFamily: fonts.body, marginTop: 12, fontSize: 14 },
  statusError: { color: colors.dangerText },
});
