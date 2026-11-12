import { useEffect, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fabBottomOffset } from '@/lib/calculator/fabLayout';
import { supabase } from '@/lib/supabase';
import { useKeyboardLift } from '@/lib/ui/useKeyboardHeight';
import { sizes, space } from '@/lib/ui/theme';
import RoundButton from '@/components/ui/RoundButton';

const HIDDEN_PATHS = ['/calculator', '/login', '/settings', '/scan'];

/** Calculator button: the same spot on every screen, bottom right, level with the chat bar. It never moves. */
export default function CalculatorFab() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [signedIn, setSignedIn] = useState(false);
  const { style: liftStyle } = useKeyboardLift();

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
    <Animated.View style={[styles.fab, { bottom: fabBottomOffset(insets.bottom), right: space.gutter + insets.right }]}>
      <Animated.View style={liftStyle}>
        <RoundButton
          size={sizes.fab}
          icon="calc"
          accessibilityLabel="Open calculator"
          onPress={() => router.push('/calculator')}
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    width: sizes.fab,
    height: sizes.fab,
  },
});
