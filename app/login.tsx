import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { colors, fonts, sizes, space } from '@/lib/ui/theme';
import { useKeyboardHeight } from '@/lib/ui/useKeyboardHeight';
import Hero from '@/components/ui/Hero';
import Icon from '@/components/ui/Icon';
import RingButton from '@/components/ui/RingButton';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const keyboardHeight = useKeyboardHeight();

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

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingBottom: keyboardHeight + space.gutter }}
      keyboardShouldPersistTaps="handled"
    >
      <Hero height={sizes.loginHero} seed={1}>
        <View style={styles.heroText}>
          <Text style={styles.tag}>CookWiki · your food, per 100 g</Text>
          <Text style={styles.title}>sign in</Text>
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
          />
          <Pressable
            onPress={() => setShowPassword((v) => !v)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
          >
            <Icon name="eye" size={18} color={colors.sub} />
          </Pressable>
        </View>
        <View style={styles.goRow}>
          <Text style={styles.goLabel}>Sign in</Text>
          <RingButton
            kind="signIn"
            size={sizes.signRing}
            icon="arrow"
            onPress={signInWithEmail}
            disabled={loading}
            accessibilityLabel={loading ? 'Signing in…' : 'Sign in'}
          />
        </View>
        <Pressable onPress={signUpWithEmail} disabled={loading} accessibilityRole="button" style={styles.altWrap}>
          <Text style={styles.alt}>
            No account? <Text style={styles.altBold}>Register</Text>
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  heroText: { position: 'absolute', left: space.gutter, right: space.gutter, bottom: 34 },
  tag: { fontFamily: fonts.name, fontSize: 11, color: colors.peach },
  title: { fontFamily: fonts.display, fontSize: 104, lineHeight: 84, color: colors.text, marginTop: 6 },
  form: { paddingHorizontal: space.gutter, paddingTop: 8 },
  label: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.text, marginBottom: 2 },
  labelNext: { marginTop: 14 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 44,
    borderBottomWidth: 2,
    borderBottomColor: colors.surface2,
  },
  input: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.text, paddingVertical: 8 },
  goRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  goLabel: { fontFamily: fonts.heading, fontSize: 18, color: colors.text },
  altWrap: { alignSelf: 'center', marginTop: 12, paddingVertical: 8 },
  alt: { fontFamily: fonts.body, fontSize: 12, color: colors.sub, textAlign: 'center' },
  altBold: { fontFamily: fonts.bodyBold, color: colors.peach },
});
