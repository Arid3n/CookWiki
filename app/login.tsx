import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { useThemeStore } from '@/store/themeStore';
import { getTheme } from '@/lib/theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const isDarkMode = useThemeStore((s) => s.isDarkMode);
  const t = getTheme(isDarkMode);

  async function signInWithEmail() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) Alert.alert('Login Failed', error.message);
    else { router.replace('/'); }
    setLoading(false);
  }

  async function signUpWithEmail() {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) Alert.alert('Registration Failed', error.message);
    else {
      if (data.session) { router.replace('/'); }
      else { Alert.alert('Check your inbox', 'Please verify your email to continue.'); }
    }
    setLoading(false);
  }

  const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg, justifyContent: 'center', padding: 24 },
    title: { fontSize: 24, color: t.textPrimary, marginBottom: 40, fontWeight: 'bold', textAlign: 'center' },
    input: {
      backgroundColor: t.surface, color: t.textPrimary, padding: 16, borderRadius: 8,
      marginBottom: 16, borderWidth: 1, borderColor: t.border, fontSize: 16,
    },
    button: { backgroundColor: t.accent, padding: 16, borderRadius: 8, marginTop: 8 },
    buttonText: { color: '#fff', fontWeight: 'bold', textAlign: 'center', fontSize: 16 },
  });

  return (
    <View style={s.container}>
      <Text style={s.title}>Welcome to CookWiki</Text>
      <TextInput
        style={s.input}
        placeholder="Email"
        placeholderTextColor={t.textSecondary}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={s.input}
        placeholder="Password"
        placeholderTextColor={t.textSecondary}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TouchableOpacity style={s.button} onPress={signInWithEmail} disabled={loading}>
        <Text style={s.buttonText}>{loading ? 'Signing in...' : 'Sign In'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[s.button, { backgroundColor: t.border, marginTop: 12 }]} onPress={signUpWithEmail} disabled={loading}>
        <Text style={[s.buttonText, { color: t.textPrimary }]}>{loading ? 'Registering...' : 'Register'}</Text>
      </TouchableOpacity>
    </View>
  );
}
