import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { colors, fonts, sizes, space, shape, type } from '@/lib/ui/theme';
import { useKeyboardHeight } from '@/lib/ui/useKeyboardHeight';
import Hero from '@/components/ui/Hero';
import Icon from '@/components/ui/Icon';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const keyboardHeight = useKeyboardHeight();

  async function signInWithEmail() {
    if (loading) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) Alert.alert('Login Failed', error.message);
    else { router.replace('/'); }
    setLoading(false);
  }

  async function signUpWithEmail() {
    if (loading) return;
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) Alert.alert('Registration Failed', error.message);
    else {
      if (data.session) { router.replace('/'); }
      else { Alert.alert('Check your inbox', 'Please verify your email to continue.'); }
    }
    setLoading(false);
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingBottom: keyboardHeight + space.gutter }}
      keyboardShouldPersistTaps="handled"
    >
      <Hero height={sizes.loginHero}>
        <View style={styles.heroText}>
          <Text style={styles.title} maxFontSizeMultiplier={1.2}>sign in</Text>
        </View>
      </Hero>
      <View style={styles.form}>
        <Text style={styles.label}>Email</Text>
        <View style={styles.field}>
          <Icon name="mail" size={18} color={colors.sub} />
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="you@mail.com"
            placeholderTextColor={colors.sub}
            accessibilityLabel="Email"
          />
        </View>
        <Text style={[styles.label, styles.labelNext]}>Password</Text>
        <View style={styles.field}>
          <Icon name="lock" size={18} color={colors.sub} />
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            placeholder="Password"
            placeholderTextColor={colors.sub}
            accessibilityLabel="Password"
            returnKeyType="go"
            onSubmitEditing={signInWithEmail}
          />
          <Pressable
            onPress={() => setShowPassword((v) => !v)}
            hitSlop={14}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
          >
            <Icon name="eye" size={18} color={colors.sub} />
          </Pressable>
        </View>
        <Pressable
          onPress={signInWithEmail}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel={loading ? 'Signing in…' : 'Sign in'}
          style={({ pressed }) => [styles.goPill, (loading || pressed) && styles.goDim]}
        >
          <Text style={styles.goLabel}>{loading ? 'Signing in…' : 'Sign in'}</Text>
          <Icon name="arrow" size={20} color={colors.ink} />
        </Pressable>
        <Pressable onPress={signUpWithEmail} disabled={loading} accessibilityRole="button" hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }} style={styles.altWrap}>
          <Text style={styles.alt}>
            No account? <Text style={styles.altBold}>Register</Text>
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  heroText: { position: 'absolute', left: space.gutter, right: space.gutter, bottom: 30 },
  title: { fontFamily: fonts.display, fontSize: 104, lineHeight: 92, color: colors.onHero, marginTop: 6 },
  form: { paddingHorizontal: space.gutter, paddingTop: 8 },
  label: { fontFamily: fonts.bodyBold, fontSize: type.label, color: colors.text, marginBottom: 2 },
  labelNext: { marginTop: 14 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 52,
    paddingHorizontal: 14,
    backgroundColor: colors.surface2,
    borderTopLeftRadius: shape.md,
    borderTopRightRadius: shape.md,
    borderBottomWidth: 2,
    borderBottomColor: colors.accent,
  },
  input: { flex: 1, fontFamily: fonts.body, fontSize: type.body, color: colors.text, paddingVertical: 8 },
  goPill: {
    height: 56, borderRadius: shape.lg, marginTop: 20, backgroundColor: colors.accent, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  goDim: { opacity: 0.6 },
  goLabel: { fontFamily: fonts.heading, fontSize: 18, color: colors.ink },
  altWrap: { alignSelf: 'center', marginTop: 12, paddingVertical: 8 },
  alt: { fontFamily: fonts.body, fontSize: type.small, color: colors.sub, textAlign: 'center' },
  altBold: { fontFamily: fonts.bodyBold, color: colors.accent },
});
