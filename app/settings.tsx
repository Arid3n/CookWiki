import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
        setKey(c.apiKey ?? '');
        setHasKey(!!c.apiKey);
        setModel(c.model);
      })
      .catch(() => setStatus('Could not read saved settings.'));
  }, []);

  const save = async () => {
    try {
      await setGeminiKey(key);
      await setGeminiModel(model);
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
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 20, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} hitSlop={10}>
          <Text style={styles.link}>‹ Back</Text>
        </Pressable>
        <Text style={styles.title}>Settings</Text>
      </View>

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
          placeholder="Paste your Gemini API key"
          placeholderTextColor="#64748B"
          accessibilityLabel="Gemini API key"
        />
        <Pressable accessibilityRole="button" onPress={() => setShow((s) => !s)} style={styles.toggle}>
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
        placeholderTextColor="#64748B"
        accessibilityLabel="Gemini model"
      />

      <Pressable accessibilityRole="button" onPress={save} style={styles.primary}>
        <Text style={styles.primaryText}>Save</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={removeKey} style={styles.secondary}>
        <Text style={styles.secondaryText}>Remove key</Text>
      </Pressable>
      {!!status && <Text style={styles.status} accessibilityLiveRegion="polite">{status}</Text>}

      <Text style={[styles.section, { marginTop: 36 }]}>Account</Text>
      <Pressable accessibilityRole="button" onPress={signOut} style={styles.secondary}>
        <Text style={styles.secondaryText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  title: { color: '#F1F5F9', fontSize: 22, fontWeight: 'bold' },
  link: { color: '#10B981', fontSize: 16 },
  section: { color: '#F1F5F9', fontSize: 18, fontWeight: '600', marginBottom: 6 },
  hint: { color: '#94A3B8', fontSize: 14, marginBottom: 16 },
  label: { color: '#CBD5E1', fontSize: 14, marginBottom: 6, marginTop: 12 },
  row: { flexDirection: 'row', alignItems: 'center' },
  input: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 10,
    color: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  toggle: { paddingHorizontal: 12, paddingVertical: 10 },
  primary: { backgroundColor: '#10B981', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
  primaryText: { color: '#0F172A', fontSize: 16, fontWeight: '700' },
  secondary: {
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  secondaryText: { color: '#F1F5F9', fontSize: 16 },
  status: { color: '#10B981', marginTop: 12, fontSize: 14 },
});
