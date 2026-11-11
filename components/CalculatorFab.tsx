import { useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { router, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fabBottomOffset } from '@/lib/calculator/fabLayout';
import { supabase } from '@/lib/supabase';
import { useKeyboardHeight } from '@/lib/ui/useKeyboardHeight';

const HIDDEN_PATHS = ['/calculator', '/login', '/settings', '/scan'];

export default function CalculatorFab() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [signedIn, setSignedIn] = useState(false);
  const keyboardHeight = useKeyboardHeight();

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (active) setSignedIn(!!session);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(!!session);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  if (!signedIn || HIDDEN_PATHS.includes(pathname)) return null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open calculator"
      onPress={() => router.push('/calculator')}
      style={[styles.fab, { bottom: fabBottomOffset(insets.bottom, keyboardHeight), right: 16 + insets.right }]}
    >
      <Ionicons name="calculator" size={24} color="#0F172A" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
});
