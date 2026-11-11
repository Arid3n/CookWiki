import { useEffect, useState } from 'react';
import { Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Hero from '@/components/ui/Hero';
import Icon from '@/components/ui/Icon';
import { colors, fonts, space } from '@/lib/ui/theme';
import { supabase } from '@/lib/supabase';
import { DEFAULT_GEMINI_MODEL, getGeminiConfig, setGeminiKey, setGeminiModel } from '@/lib/gemini/config';

export default function Settings() {
  const insets = useSafeAreaInsets();
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
    <View style={styles.container}>
      <Hero height={132} seed={5}>
        <View style={styles.heroRow}>
          <Pressable
            accessibilityRole="button" accessibilityLabel="Back" hitSlop={6} style={styles.round}
            onPress={() => { Keyboard.dismiss(); router.back(); }}
          >
            <Icon name="back" size={18} color={colors.text} />
          </Pressable>
          <Text style={styles.title} accessibilityRole="header">settings</Text>
          <View style={styles.spacer} />
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
          {!!status && <Text style={styles.status} accessibilityLiveRegion="polite">{status}</Text>}
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
  container: { flex: 1, backgroundColor: colors.bg },
  heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.gutter, paddingTop: 12 },
  round: {
    width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.scrim,
  },
  spacer: { width: 36, height: 36 },
  title: { color: colors.text, fontFamily: fonts.display, fontSize: 44, lineHeight: 48, textTransform: 'uppercase' },
  card: { backgroundColor: colors.surface, borderRadius: 18, padding: 16, marginBottom: 12 },
  link: { color: colors.peach, fontFamily: fonts.bodyBold, fontSize: 15 },
  section: { color: colors.text, fontFamily: fonts.heading, fontSize: 18, marginBottom: 6 },
  hint: { color: colors.sub, fontFamily: fonts.body, fontSize: 14, marginBottom: 8 },
  label: { color: colors.sub, fontFamily: fonts.bodyBold, fontSize: 13, marginBottom: 6, marginTop: 12 },
  row: { flexDirection: 'row', alignItems: 'center' },
  input: {
    backgroundColor: colors.surface2,
    borderRadius: 14,
    color: colors.text,
    fontFamily: fonts.body,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 16,
  },
  toggle: { paddingHorizontal: 12, paddingVertical: 10 },
  primary: { backgroundColor: colors.peach, borderRadius: 24, minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  primaryText: { color: colors.ink, fontFamily: fonts.bodyBold, fontSize: 16 },
  secondary: {
    backgroundColor: colors.surface2,
    borderRadius: 24,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  secondaryText: { color: colors.text, fontFamily: fonts.bodyBold, fontSize: 16 },
  signOutText: { color: colors.dangerText, fontFamily: fonts.bodyBold, fontSize: 16 },
  status: { color: colors.sage, fontFamily: fonts.body, marginTop: 12, fontSize: 14 },
});
