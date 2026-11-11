import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fabBottomOffset } from '@/lib/calculator/fabLayout';
import { supabase } from '@/lib/supabase';
import { useKeyboardHeight } from '@/lib/ui/useKeyboardHeight';
import { colors, sizes, space } from '@/lib/ui/theme';
import RingButton from '@/components/ui/RingButton';

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
    <View
      style={[styles.fab, { bottom: fabBottomOffset(insets.bottom, keyboardHeight), right: space.gutter + insets.right }]}
    >
      <RingButton
        kind="calc"
        size={sizes.fab}
        icon="calc"
        accessibilityLabel="Open calculator"
        onPress={() => router.push('/calculator')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    width: sizes.fab,
    height: sizes.fab,
    borderRadius: sizes.fab / 2,
    backgroundColor: colors.ringFill,
    elevation: 6,
    shadowColor: colors.shadow,
    shadowOpacity: 0.5,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
});
