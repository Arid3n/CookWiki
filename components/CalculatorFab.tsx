import { useEffect, useState } from 'react';
import { Keyboard, Pressable, StyleSheet } from 'react-native';
import { router, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';

// ChatBar is 64pt + bottom inset tall; FAB bottom edge sits 96 + inset up, i.e. 32pt clear above it.
const HIDDEN_PATHS = ['/calculator', '/login'];

export default function CalculatorFab() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [signedIn, setSignedIn] = useState(false);
  const [keyboardUp, setKeyboardUp] = useState(false);

  // The ChatBar rides above the keyboard; hide the FAB so it never covers the send button.
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardUp(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardUp(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

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

  if (!signedIn || HIDDEN_PATHS.includes(pathname) || keyboardUp) return null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open calculator"
      onPress={() => router.push('/calculator')}
      style={[styles.fab, { bottom: 96 + insets.bottom, right: 16 + insets.right }]}
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
