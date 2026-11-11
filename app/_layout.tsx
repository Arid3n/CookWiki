import { Stack, router } from "expo-router";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import CalculatorFab from "@/components/CalculatorFab";
import { syncFromSupabase } from "@/lib/library/repository";
import { clearLocalLibrary } from "@/lib/library/localDb";

// A failed sync is silent: the library keeps showing the local copy.
const syncQuietly = () => {
  syncFromSupabase().catch(() => {});
};

export default function RootLayout() {
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) syncQuietly();
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        clearLocalLibrary().catch(() =>
          clearLocalLibrary().catch((e) =>
            console.warn('Failed to clear local library on sign-out', e),
          ),
        );
        // Drop the previous user's screens so back-navigation cannot reach them.
        if (router.canDismiss()) router.dismissAll();
        router.replace('/login');
      } else if (event === 'SIGNED_IN') {
        syncQuietly();
        router.replace('/library');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#0F172A' }}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0F172A' } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="library" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="calculator" options={{ presentation: "modal", headerShown: false }} />
      </Stack>
      <CalculatorFab />
    </GestureHandlerRootView>
  );
}
